"""Jarvis — wake-word voice assistant.

Loop: say "hey jarvis" -> listen() -> think() -> speak().
Everything is printed to the console. Ctrl+C exits cleanly.

Run with --text to type input instead of using the mic (skips wake word
and Whisper). Add --mute to also skip speaking, for fast brain testing.
"""

import argparse
import sys

import config
from core import brain, mouth
# Note: `ear` and `wake` are imported lazily in voice mode only. Importing
# `ear` loads the Whisper model at import time, which we must avoid in --text.


def text_mode(mute: bool) -> int:
    """Typed-input loop for testing without a mic."""
    history: list[dict] = []

    print("=" * 56)
    print("  Jarvis is ready (text mode).")
    print("  Type your message. 'quit' or 'exit' to leave; Ctrl+C too.")
    print("=" * 56)

    try:
        while True:
            user_text = input("\nYou: ").strip()
            if user_text.lower() in ("quit", "exit"):
                print("[main] Goodbye!")
                return 0
            if not user_text:
                continue

            reply = brain.think(user_text, history)
            print(f"Jarvis: {reply}")
            if not mute:
                mouth.speak(reply)
    except KeyboardInterrupt:
        print("\n[main] Goodbye!")
        return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Jarvis voice assistant.")
    parser.add_argument(
        "--text",
        action="store_true",
        help="Type input instead of using the mic (skips wake word and Whisper).",
    )
    parser.add_argument(
        "--mute",
        action="store_true",
        help="With --text, print the reply but skip speaking it.",
    )
    args = parser.parse_args()

    problems = config.validate()
    if problems:
        print("Configuration problems:")
        for p in problems:
            print(f"  - {p}")
        print("\nCopy .env.example to .env and fill in your keys, then retry.")
        return 1

    if args.text:
        return text_mode(mute=args.mute)

    # Voice mode only — import here so --text never loads Whisper.
    from core import ear, wake

    history: list[dict] = []

    print("=" * 56)
    print("  Jarvis is ready.")
    print("  Say 'hey jarvis' to talk. Press Ctrl+C to quit.")
    print("=" * 56)

    try:
        while True:
            print("\n[main] Waiting for wake word...")
            wake.wait_for_wake_word()

            user_text = ear.listen()
            if not user_text:
                print("[main] Didn't catch that — try again.")
                continue

            print(f"You: {user_text}")
            reply = brain.think(user_text, history)
            print(f"Jarvis: {reply}")
            mouth.speak(reply)
    except KeyboardInterrupt:
        print("\n[main] Goodbye!")
        return 0


if __name__ == "__main__":
    sys.exit(main())
