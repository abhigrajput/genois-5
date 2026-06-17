"""Speech-to-text for Jarvis using faster-whisper.

Records from the default microphone until ~2 seconds of silence, then
transcribes. Language is auto-detected so Hindi, English, and Hinglish all
work without configuration.
"""

import sys

import numpy as np
import sounddevice as sd
from faster_whisper import WhisperModel

# --- Recording parameters ---
SAMPLE_RATE = 16000          # Whisper expects 16 kHz mono
CHANNELS = 1
BLOCK_SECONDS = 0.1          # length of each captured audio block
SILENCE_SECONDS = 2.0        # stop after this much trailing silence
MAX_SECONDS = 30.0           # hard cap so we never record forever
START_TIMEOUT_SECONDS = 10.0 # give up if the user never starts speaking

# RMS amplitude (float32, range -1..1) above which a block counts as speech.
# Tune up if a noisy room keeps triggering, down if soft speech is missed.
SILENCE_THRESHOLD = 0.01


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


def _record_until_silence() -> np.ndarray:
    """Capture mic audio until trailing silence and return a float32 array."""
    block_size = int(SAMPLE_RATE * BLOCK_SECONDS)
    silence_blocks_needed = int(SILENCE_SECONDS / BLOCK_SECONDS)
    max_blocks = int(MAX_SECONDS / BLOCK_SECONDS)
    start_timeout_blocks = int(START_TIMEOUT_SECONDS / BLOCK_SECONDS)

    chunks: list[np.ndarray] = []
    silent_run = 0
    speech_started = False
    blocks_seen = 0

    with sd.InputStream(
        samplerate=SAMPLE_RATE,
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
    return np.concatenate(chunks)


def listen() -> str:
    """Record one utterance and return the transcribed text.

    Returns an empty string if nothing intelligible was captured.
    """
    print("[ear] Listening...")
    audio = _record_until_silence()

    if audio.size == 0:
        print("[ear] No speech detected.")
        return ""

    # language=None -> auto-detect (handles Hindi / English / Hinglish).
    segments, info = _model.transcribe(audio, language=None, vad_filter=True)
    text = "".join(segment.text for segment in segments).strip()

    if text:
        print(f"[ear] ({info.language}, p={info.language_probability:.2f}) {text}")
    else:
        print("[ear] Heard audio but transcribed nothing.")
    return text


if __name__ == "__main__":
    # Quick manual test: python -m core.ear
    print("Say something...")
    print("You said:", listen())
    sys.exit(0)
