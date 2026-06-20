"""Speech-to-text for Jarvis using faster-whisper.

Records from the default microphone until ~2 seconds of silence, then
transcribes. Language is auto-detected so Hindi, English, and Hinglish all
work without configuration.
"""

import math
import sys
import wave

import numpy as np
import sounddevice as sd
from faster_whisper import WhisperModel
from scipy.signal import resample_poly

# --- Recording parameters ---
WHISPER_RATE = 16000         # Whisper expects 16 kHz mono
SAMPLE_RATE = WHISPER_RATE   # backwards-compatible alias for the target rate
CHANNELS = 1
BLOCK_SECONDS = 0.1          # length of each captured audio block
SILENCE_SECONDS = 2.0        # stop after this much trailing silence
MAX_SECONDS = 30.0           # hard cap so we never record forever
START_TIMEOUT_SECONDS = 10.0 # give up if the user never starts speaking

# RMS amplitude (float32, range -1..1) above which a block counts as speech.
# Tune up if a noisy room keeps triggering, down if soft speech is missed.
SILENCE_THRESHOLD = 0.01

# Transcription language. Auto-detect (None) is unreliable on short clips with
# the int8 CPU model — it once mislabelled Hindi speech as Malayalam — so we
# pin it. Whisper still transcribes Hinglish (mixed English words) under "hi".
LANGUAGE = "hi"


def _load_model() -> WhisperModel:
    """Load the 'medium' model on CUDA if available, else CPU."""
    try:
        model = WhisperModel("medium", device="cuda", compute_type="float16")
        print("[ear] Loaded Whisper 'medium' on CUDA (float16).")
        return model
    except Exception as exc:  # noqa: BLE001 - any CUDA/driver issue -> fall back
        print(f"[ear] CUDA unavailable ({exc}); loading on CPU.")
        model = WhisperModel("medium", device="cpu", compute_type="int8")
        print("[ear] Loaded Whisper 'medium' on CPU (int8).")
        return model


# Load once at import time — model loading is slow and should not repeat.
_model = _load_model()


def _native_sample_rate(device: int | None = None) -> int:
    """Return the input device's native default sample rate in Hz.

    Mic arrays (e.g. Intel Smart Sound) run at 44100/48000 Hz natively.
    Opening a stream at 16 kHz makes some drivers hand back slowed-down
    audio, so we always capture at the device's own rate and resample.
    """
    info = sd.query_devices(kind="input") if device is None \
        else sd.query_devices(device)
    rate = int(round(info["default_samplerate"]))
    return rate if rate > 0 else WHISPER_RATE


def _resample_to_whisper(audio: np.ndarray, src_rate: int) -> np.ndarray:
    """Resample float32 mono audio from src_rate down to 16 kHz for Whisper."""
    if audio.size == 0 or src_rate == WHISPER_RATE:
        return audio.astype(np.float32, copy=False)
    g = math.gcd(src_rate, WHISPER_RATE)
    up = WHISPER_RATE // g
    down = src_rate // g
    resampled = resample_poly(audio, up, down)
    return resampled.astype(np.float32, copy=False)


def _record_until_silence() -> np.ndarray:
    """Capture mic audio until trailing silence and return a float32 array.

    Records at the input device's native sample rate and resamples the
    result to 16 kHz so Whisper receives speech at the correct pitch/speed.
    """
    native_rate = _native_sample_rate()
    block_size = int(native_rate * BLOCK_SECONDS)
    silence_blocks_needed = int(SILENCE_SECONDS / BLOCK_SECONDS)
    max_blocks = int(MAX_SECONDS / BLOCK_SECONDS)
    start_timeout_blocks = int(START_TIMEOUT_SECONDS / BLOCK_SECONDS)

    chunks: list[np.ndarray] = []
    silent_run = 0
    speech_started = False
    blocks_seen = 0

    with sd.InputStream(
        samplerate=native_rate,
        channels=CHANNELS,
        dtype="float32",
        blocksize=block_size,
    ) as stream:
        while True:
            block, _overflowed = stream.read(block_size)
            block = block.reshape(-1)  # (block_size, 1) -> (block_size,)
            blocks_seen += 1

            rms = float(np.sqrt(np.mean(np.square(block))))
            is_speech = rms >= SILENCE_THRESHOLD

            if is_speech:
                speech_started = True
                silent_run = 0
                chunks.append(block.copy())
            elif speech_started:
                # Keep the trailing silence so words aren't clipped.
                silent_run += 1
                chunks.append(block.copy())
                if silent_run >= silence_blocks_needed:
                    break

            if not speech_started and blocks_seen >= start_timeout_blocks:
                break  # nobody spoke
            if blocks_seen >= max_blocks:
                break  # safety cap

    if not chunks:
        return np.zeros(0, dtype=np.float32)
    return _resample_to_whisper(np.concatenate(chunks), native_rate)


def listen() -> str:
    """Record one utterance and return the transcribed text.

    Returns an empty string if nothing intelligible was captured.
    """
    print("[ear] Listening...")
    audio = _record_until_silence()

    if audio.size == 0:
        print("[ear] No speech detected.")
        return ""

    segments, info = _model.transcribe(audio, language=LANGUAGE, vad_filter=True)
    text = "".join(segment.text for segment in segments).strip()

    if text:
        print(f"[ear] ({info.language}, p={info.language_probability:.2f}) {text}")
    else:
        print("[ear] Heard audio but transcribed nothing.")
    return text


DIAG_SECONDS = 5.0           # fixed recording length for --diag
DIAG_WAV_PATH = "debug_mic.wav"


def _record_fixed(seconds: float, device: int | None = None) -> np.ndarray:
    """Record a fixed duration with no silence detection.

    device=None records from the default input; pass an index from the
    device list to capture from a specific mic. Captures at the device's
    native sample rate and resamples to 16 kHz for Whisper.
    """
    native_rate = _native_sample_rate(device)
    frames = int(native_rate * seconds)
    where = "the default mic" if device is None else f"device [{device}]"
    print(f"[diag] Recording {seconds:.0f}s from {where} at {native_rate} Hz"
          f" (-> {WHISPER_RATE} Hz)... speak now!")
    audio = sd.rec(
        frames, samplerate=native_rate, channels=CHANNELS, dtype="float32",
        device=device,
    )
    sd.wait()
    return _resample_to_whisper(audio.reshape(-1), native_rate)


def _save_wav(path: str, audio: np.ndarray) -> None:
    """Write a float32 (-1..1) mono array to a 16-bit PCM WAV file."""
    pcm = np.clip(audio, -1.0, 1.0)
    pcm = (pcm * 32767.0).astype("<i2")
    with wave.open(path, "wb") as wav:
        wav.setnchannels(CHANNELS)
        wav.setsampwidth(2)  # 16-bit
        wav.setframerate(SAMPLE_RATE)
        wav.writeframes(pcm.tobytes())


def diagnose(vad_filter: bool = True, device: int | None = None) -> None:
    """Run microphone + transcription diagnostics.

    Isolates whether bad transcription comes from mic capture (too quiet,
    wrong device) or from the silence-detection cutoff in listen().

    Pass vad_filter=False (--no-vad) to skip Whisper's voice-activity filter,
    which can strip quiet speech before transcription. Pass device=N
    (--device N) to record from a specific mic instead of the default.
    """
    # 1. List all input-capable audio devices.
    print("\n=== Input audio devices ===")
    try:
        default_input = sd.default.device[0]
    except Exception:  # noqa: BLE001
        default_input = None
    for idx, dev in enumerate(sd.query_devices()):
        if dev["max_input_channels"] > 0:
            marker = " <- default" if idx == default_input else ""
            print(f"  [{idx}] {dev['name']} "
                  f"({dev['max_input_channels']} ch @ {int(dev['default_samplerate'])} Hz)"
                  f"{marker}")

    # 2. Record a fixed 5 seconds (no silence detection).
    print("\n=== Recording ===")
    audio = _record_fixed(DIAG_SECONDS, device=device)

    # 3. Report signal level so we can see if the mic is too quiet.
    if audio.size == 0:
        print("[diag] No audio captured at all.")
        return
    if not np.all(np.isfinite(audio)):
        bad = int(np.count_nonzero(~np.isfinite(audio)))
        print("\n=== Signal level ===")
        print(f"  ERROR: device returned non-finite audio "
              f"({bad}/{audio.size} samples are NaN/inf).")
        print("  This is an unusable driver path (e.g. a kernel-streaming "
              "device handing back garbage) — try a different device index.")
        return
    rms = float(np.sqrt(np.mean(np.square(audio))))
    peak = float(np.max(np.abs(audio)))
    print("\n=== Signal level ===")
    print(f"  samples: {audio.size} ({audio.size / SAMPLE_RATE:.2f}s)")
    print(f"  RMS:  {rms:.5f}")
    print(f"  peak: {peak:.5f}")
    if peak < 0.01:
        print("  WARNING: signal is extremely quiet — mic likely muted, "
              "wrong device, or gain too low.")
    elif peak >= 0.99:
        print("  WARNING: signal is clipping — mic gain too high.")
    print(f"  (current SILENCE_THRESHOLD for listen() is {SILENCE_THRESHOLD})")

    # 4. Save the recording for playback.
    _save_wav(DIAG_WAV_PATH, audio)
    print(f"\n[diag] Saved recording to {DIAG_WAV_PATH} — play it back to verify.")

    # 5. Transcribe and report language + probability.
    print("\n=== Transcription ===")
    print(f"  vad_filter: {vad_filter}")
    segments, info = _model.transcribe(audio, language=LANGUAGE, vad_filter=vad_filter)
    text = "".join(segment.text for segment in segments).strip()
    print(f"  detected language: {info.language} (p={info.language_probability:.2f})")
    print(f"  text: {text!r}")
    if not text:
        print("  (transcribed nothing — check the saved WAV and signal level above)")


if __name__ == "__main__":
    args = sys.argv[1:]
    if "--diag" in args:
        device: int | None = None
        if "--device" in args:
            try:
                device = int(args[args.index("--device") + 1])
            except (IndexError, ValueError):
                print("error: --device requires an integer index "
                      "(see the device list from a plain --diag run)")
                sys.exit(2)
        diagnose(vad_filter="--no-vad" not in args, device=device)
        sys.exit(0)
    # Quick manual test: python -m core.ear
    print("Say something...")
    print("You said:", listen())
    sys.exit(0)
