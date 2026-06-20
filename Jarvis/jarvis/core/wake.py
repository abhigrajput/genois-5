"""Wake-word detection for Jarvis using openWakeWord.

Listens continuously on the default mic for the phrase "hey jarvis" and
returns as soon as it is detected. Uses the bundled pre-trained "hey_jarvis"
model — no API key, runs on CPU.

Like ear.py, we capture at the input device's native sample rate and resample
to 16 kHz rather than opening the stream at 16 kHz directly: some mic drivers
(e.g. Intel Smart Sound) hand back slowed-down/distorted audio when opened at
16 kHz, which makes openWakeWord score a flat zero and the wake word never
fires.
"""

import math

import numpy as np
import sounddevice as sd
from scipy.signal import resample_poly
import openwakeword
from openwakeword.model import Model

SAMPLE_RATE = 16000          # openWakeWord expects 16 kHz mono
FRAME_SAMPLES = 1280         # 80 ms per frame at 16 kHz (the model's chunk size)
CAPTURE_SECONDS = 0.12       # length of each native-rate block we read
WAKE_MODEL = "hey_jarvis"

# Score (0..1) above which we consider the wake word spoken. Raise it if you
# get false triggers, lower it if "hey jarvis" is sometimes missed.
THRESHOLD = 0.5


def _load_model() -> Model:
    """Download (once) and load the 'hey_jarvis' model on the ONNX runtime."""
    # No-op if the models are already cached locally.
    openwakeword.utils.download_models([WAKE_MODEL])
    model = Model(wakeword_models=[WAKE_MODEL], inference_framework="onnx")
    print("[wake] Loaded openWakeWord 'hey_jarvis' model.")
    return model


# Load once at import time.
_model = _load_model()


def _native_sample_rate() -> int:
    """Return the default input device's native sample rate in Hz.

    Mirrors ear.py: mic arrays run at 44100/48000 Hz natively, and opening a
    stream at 16 kHz makes some drivers hand back slowed-down audio.
    """
    info = sd.query_devices(kind="input")
    rate = int(round(info["default_samplerate"]))
    return rate if rate > 0 else SAMPLE_RATE


def _resample_to_16k(audio: np.ndarray, src_rate: int) -> np.ndarray:
    """Resample float32 mono audio from src_rate down to 16 kHz."""
    if audio.size == 0 or src_rate == SAMPLE_RATE:
        return audio.astype(np.float32, copy=False)
    g = math.gcd(src_rate, SAMPLE_RATE)
    resampled = resample_poly(audio, SAMPLE_RATE // g, src_rate // g)
    return resampled.astype(np.float32, copy=False)


def wait_for_wake_word() -> None:
    """Block until 'hey jarvis' is detected on the microphone."""
    print("[wake] Say 'hey jarvis' to start...")

    # Clear any leftover audio state so a previous turn can't re-trigger.
    try:
        _model.reset()
    except Exception:  # noqa: BLE001 - older versions may lack reset()
        pass

    native_rate = _native_sample_rate()
    block_size = int(native_rate * CAPTURE_SECONDS)
    # Resampled 16 kHz samples awaiting a full FRAME_SAMPLES prediction chunk.
    pending = np.zeros(0, dtype=np.float32)

    with sd.InputStream(
        samplerate=native_rate,
        channels=1,
        dtype="float32",
        blocksize=block_size,
    ) as stream:
        while True:
            block, _overflowed = stream.read(block_size)
            chunk = _resample_to_16k(np.asarray(block).reshape(-1), native_rate)
            pending = np.concatenate([pending, chunk])

            # Feed the model in exact 80 ms (1280-sample) frames at 16 kHz.
            while pending.size >= FRAME_SAMPLES:
                frame = pending[:FRAME_SAMPLES]
                pending = pending[FRAME_SAMPLES:]
                pcm16 = (np.clip(frame, -1.0, 1.0) * 32767.0).astype(np.int16)

                scores = _model.predict(pcm16)
                # Only one model is loaded, so the highest score is its score.
                score = max(scores.values()) if scores else 0.0

                if score >= THRESHOLD:
                    print(f"[wake] Detected (score={score:.2f}).")
                    return


if __name__ == "__main__":
    # Quick manual test: python -m core.wake
    wait_for_wake_word()
    print("Wake word detected!")
