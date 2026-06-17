"""Text-to-speech for Jarvis using edge-tts.

Speaks text with the "hi-IN-SwaraNeural" voice (a female Indian voice that
handles both Hindi and English / Hinglish text well). Audio is synthesized to
a temporary mp3 and played back through pygame.
"""

import asyncio
import os
import tempfile

import edge_tts
import pygame

VOICE = "hi-IN-SwaraNeural"

# Initialize the audio mixer once.
pygame.mixer.init()


async def _synthesize(text: str, out_path: str) -> None:
    """Render `text` to an mp3 file at `out_path`."""
    communicate = edge_tts.Communicate(text, VOICE)
    await communicate.save(out_path)


def _play(path: str) -> None:
    """Play an mp3 file and block until it finishes."""
    pygame.mixer.music.load(path)
    pygame.mixer.music.play()
    while pygame.mixer.music.get_busy():
        pygame.time.Clock().tick(10)
    # Release the file handle so it can be deleted on Windows.
    pygame.mixer.music.unload()


def speak(text: str) -> None:
    """Speak `text` aloud. No-op for empty/whitespace input."""
    text = (text or "").strip()
    if not text:
        return

    print(f"[mouth] Speaking: {text}")

    # Use a named temp file we control so we can delete it after playback.
    fd, tmp_path = tempfile.mkstemp(suffix=".mp3")
    os.close(fd)
    try:
        asyncio.run(_synthesize(text, tmp_path))
        _play(tmp_path)
    finally:
        try:
            os.remove(tmp_path)
        except OSError:
            pass


if __name__ == "__main__":
    # Quick manual test: python -m core.mouth
    speak("Hello! Main Jarvis hoon. How can I help you today?")
