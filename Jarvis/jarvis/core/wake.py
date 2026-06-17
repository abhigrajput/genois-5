"""Wake-word detection for Jarvis using openWakeWord.

Listens continuously on the default mic for the phrase "hey jarvis" and
returns as soon as it is detected. Uses the bundled pre-trained "hey_jarvis"
model — no API key, runs on CPU.
"""

import numpy as np
import sounddevice as sd
import openwakeword
from openwakeword.model import Model

SAMPLE_RATE = 16000          # openWakeWord expects 16 kHz mono
FRAME_SAMPLES = 1280         # 80 ms per frame at 16 kHz (the model's chunk size)
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


def wait_for_wake_word() -> None:
    """Block until 'hey jarvis' is detected on the microphone."""
    print("[wake] Say 'hey jarvis' to start...")

    # Clear any leftover audio state so a previous turn can't re-trigger.
    try:
        _model.reset()
    except Exception:  # noqa: BLE001 - older versions may lack reset()
        pass

    with sd.InputStream(
        samplerate=SAMPLE_RATE,
        channels=1,
        dtype="int16",
        blocksize=FRAME_SAMPLES,
    ) as stream:
        while True:
            frame, _overflowed = stream.read(FRAME_SAMPLES)
            frame = np.asarray(frame).reshape(-1)

            scores = _model.predict(frame)
            # Only one model is loaded, so the highest score is its score.
            score = max(scores.values()) if scores else 0.0

            if score >= THRESHOLD:
                print(f"[wake] Detected (score={score:.2f}).")
                return


if __name__ == "__main__":
    # Quick manual test: python -m core.wake
    wait_for_wake_word()
    print("Wake word detected!")
