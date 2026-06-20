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
from core.history import clear_history, load_history, save_history
# Note: `ear` and `wake` are imported lazily in voice mode only. Importing
# `ear` loads the Whisper model at import time, which we must avoid in --text.

# Spoken/typed phrases that make Jarvis wipe its memory mid-conversation.
# Substrings are matched against the lowercased input, so they catch longer
# sentences like "Jarvis, forget everything we talked about". Hinglish/Hindi
# variants are included since the assistant is bilingual. "forget it" is left
# out on purpose — it usually means "never mind", not "erase memory".
_FORGET_TRIGGERS = (
    "forget everything", "forget all", "forget our", "forget this conversation",
    "forget the conversation", "forget what we", "forget our chat",
    "clear history", "clear the history", "clear memory", "clear your memory",
    "erase history", "erase memory", "erase your memory", "reset memory",
    "start fresh", "start a new conversation", "new conversation",
    # Hinglish / Hindi
    "bhool jao", "bhool jaao", "bhula do", "sab bhool", "sab kuch bhool",
    "sabkuch bhool", "yaad mat rakhna", "history clear", "memory clear",
)

# What Jarvis says (and speaks) after wiping its memory.
_FORGET_REPLY = "Theek hai, maine sab kuch bhula diya. We're starting fresh!"


def _is_forget_command(text: str) -> bool:
    """True if `text` is a request to wipe the conversation memory."""
    lowered = text.lower()
    return any(trigger in lowered for trigger in _FORGET_TRIGGERS)


def _handle_forget(history: list[dict], speak: bool) -> None:
    """Wipe in-memory and on-disk history, then acknowledge."""
    history.clear()          # empties the list brain.think() shares
    clear_history()          # deletes the saved file
    print(f"Jarvis: {_FORGET_REPLY}")
    if speak:
        mouth.speak(_FORGET_REPLY)


def text_mode(mute: bool) -> int:
    """Typed-input loop for testing without a mic."""
    history = load_history()

    print("=" * 56)
    print("  Jarvis is ready (text mode).")
    if history:
        print(f"  Remembering {len(history) // 2} earlier exchange(s).")
    print("  Type your message. 'quit' or 'exit' to leave; Ctrl+C too.")
    print("=" * 56)

    try:
        while True:
            try:
                user_text = input("\nYou: ").strip()
            except EOFError:
                # stdin closed (e.g. piped input ran out) -> exit cleanly.
                print("\n[main] Goodbye!")
                return 0
            if user_text.lower() in ("quit", "exit"):
                print("[main] Goodbye!")
                return 0
            if not user_text:
                continue
            if _is_forget_command(user_text):
                _handle_forget(history, speak=not mute)
                continue

            reply = brain.think(user_text, history)
            save_history(history)
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
    parser.add_argument(
        "--forget",
        action="store_true",
        help="Erase the saved conversation history before starting fresh.",
    )
    args = parser.parse_args()

    if args.forget:
        clear_history()
        print("[main] Forgot the saved conversation history.")

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

    history = load_history()

    print("=" * 56)
    print("  Jarvis is ready.")
    if history:
        print(f"  Remembering {len(history) // 2} earlier exchange(s).")
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
            if _is_forget_command(user_text):
                _handle_forget(history, speak=True)
                continue

            reply = brain.think(user_text, history)
            save_history(history)
            print(f"Jarvis: {reply}")
            mouth.speak(reply)
    except KeyboardInterrupt:
        print("\n[main] Goodbye!")
        return 0


if __name__ == "__main__":
    sys.exit(main())
