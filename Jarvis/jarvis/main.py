"""Jarvis — wake-word voice assistant.

Loop: say "hey jarvis" -> listen() -> think() -> speak().
Everything is printed to the console. Ctrl+C exits cleanly.

Run with --text to type input instead of using the mic (skips wake word
and Whisper). Add --mute to also skip speaking, for fast brain testing.
"""

import argparse
import re
import sys
from datetime import datetime

import config
from core import brain, hands, intent, mentor, mentor_brain, mouth, profile
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

# Phrases that ask Jarvis to recall the user's name -> answered instantly from
# the saved profile, no LLM call.
_NAME_QUERY_TRIGGERS = (
    "what's my name", "whats my name", "what is my name", "do you know my name",
    "tell me my name", "say my name", "who am i",
    "mera naam kya hai", "mera naam batao", "mera naam bata",
    "tum mera naam jaante ho", "kya tumhe mera naam pata",
)

# High-precision patterns for capturing the user's name when they state it.
# Deliberately narrow (no bare "I am ..."/"main ... hoon") to avoid grabbing
# words from "I am fine" / "main theek hoon".
_NAME_CAPTURE_PATTERNS = (
    re.compile(r"\bmy name is ([a-z][a-z'-]*)", re.IGNORECASE),
    re.compile(r"\bcall me ([a-z][a-z'-]*)", re.IGNORECASE),
    re.compile(r"\bmera naam ([a-z][a-z'-]*)", re.IGNORECASE),
)

# Never store these as a name (they show up right after "mera naam" in a
# question like "mera naam kya hai").
_NAME_STOPWORDS = {"kya", "what", "batao", "bata", "hai", "kaun", "who", "tum"}


def _quick_say(reply: str, speak: bool) -> None:
    """Print (and optionally speak) a reply that bypasses the LLM."""
    print(f"Jarvis: {reply}")
    if speak:
        mouth.speak(reply)


def _is_forget_command(text: str) -> bool:
    """True if `text` is a request to wipe the conversation memory."""
    lowered = text.lower()
    return any(trigger in lowered for trigger in _FORGET_TRIGGERS)


def _handle_forget(history: list[dict], speak: bool) -> None:
    """Wipe in-memory and on-disk history plus the profile, then acknowledge."""
    history.clear()          # empties the list brain.think() shares
    clear_history()          # deletes the saved history file
    profile.clear_profile()  # also forget the user's name
    _quick_say(_FORGET_REPLY, speak)


def _is_name_query(text: str) -> bool:
    """True if `text` is asking Jarvis to recall the user's name."""
    lowered = text.lower()
    return any(trigger in lowered for trigger in _NAME_QUERY_TRIGGERS)


def _name_reply() -> str:
    """The quick reply for 'what's my name?', from the saved profile."""
    name = profile.get_name()
    if name:
        return f"Aapka naam {name} hai!"
    return "Mujhe abhi aapka naam nahi pata. Bas kahiye 'my name is ...' aur main yaad rakhunga."


def _capture_name(text: str) -> None:
    """If `text` states the user's name, save it to the profile (silently)."""
    for pattern in _NAME_CAPTURE_PATTERNS:
        match = pattern.search(text)
        if match:
            candidate = match.group(1).strip()
            if candidate.lower() not in _NAME_STOPWORDS:
                profile.set_name(candidate.capitalize())
            return


# Phrases that ask for the current time -> answered instantly from the system
# clock, no LLM call.
_TIME_QUERY_TRIGGERS = (
    "what's the time", "whats the time", "what is the time", "what time is it",
    "tell me the time", "current time", "the time right now",
    "samay kya hai", "time kya hai", "kitne baje", "abhi kya time",
)


def _is_time_query(text: str) -> bool:
    """True if `text` is asking for the current time."""
    lowered = text.lower()
    return any(trigger in lowered for trigger in _TIME_QUERY_TRIGGERS)


def _time_reply() -> str:
    """The quick reply for 'what's the time?', from the system clock."""
    # 12-hour clock without a leading zero (e.g. "3:45 PM"), read-aloud friendly.
    now = datetime.now().strftime("%I:%M %p").lstrip("0")
    return f"Abhi {now} ho rahe hain."


# Phrases that ask the mentor for the daily accountability briefing -> answered
# directly from the Supabase store (core/mentor), no LLM call.
_BRIEF_TRIGGERS = (
    "brief me", "brief karo", "mujhe brief karo", "daily briefing", "give me a briefing",
    "what's on my plate", "whats on my plate", "my commitments", "what are my commitments",
    "mera briefing", "aaj ka briefing", "mujhe brief kar do",
)


def _is_brief_command(text: str) -> bool:
    """True if `text` is asking for the daily accountability briefing."""
    lowered = text.lower()
    return any(trigger in lowered for trigger in _BRIEF_TRIGGERS)


def _confront_on_startup(speak: bool) -> None:
    """Open with the mentor's confrontation if anything is overdue.

    Called once after Jarvis loads (voice and text mode), before waiting for any
    input. If a commitment is overdue, the mentor immediately speaks a short,
    brutal line naming it; otherwise this is silent and Jarvis starts normally.
    """
    opener = mentor_brain.startup_confrontation()
    if opener:
        _quick_say(opener, speak)


def _handle_input(user_text: str, history: list[dict], speak: bool) -> None:
    """Route a normal turn: a PC action runs via hands, else brain.think() talks.

    Quick replies (forget/name/time) are handled by the callers before this; by
    the time we get here the turn is either a computer command or conversation.
    """
    _capture_name(user_text)

    decision = intent.classify(user_text)
    if decision["type"] == "action":
        # Run the command, then speak a short confirmation. History is left
        # untouched — actions aren't conversation turns.
        reply = hands.run(decision["function"], decision.get("args"))
    elif decision["type"] == "mentor":
        # Store any concrete commitment FIRST so the mentor's context (pulled
        # fresh inside mentor_reply) already reflects what he just promised.
        commitment = decision.get("commitment")
        if commitment:
            mentor.add_commitment(
                commitment["category"],
                commitment["description"],
                commitment.get("due_date"),
            )
        reply = mentor_brain.mentor_reply(user_text, history)
        save_history(history)
    else:
        reply = brain.think(user_text, history)
        save_history(history)

    print(f"Jarvis: {reply}")
    if speak:
        mouth.speak(reply)


def text_mode(mute: bool) -> int:
    """Typed-input loop for testing without a mic."""
    history = load_history()

    print("=" * 56)
    print("  Jarvis is ready (text mode).")
    if history:
        print(f"  Remembering {len(history) // 2} earlier exchange(s).")
    print("  Type your message. 'quit' or 'exit' to leave; Ctrl+C too.")
    print("=" * 56)

    _confront_on_startup(speak=not mute)

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
            if _is_name_query(user_text):
                _quick_say(_name_reply(), speak=not mute)
                continue
            if _is_time_query(user_text):
                _quick_say(_time_reply(), speak=not mute)
                continue
            if _is_brief_command(user_text):
                _quick_say(mentor.daily_briefing(), speak=not mute)
                continue

            _handle_input(user_text, history, speak=not mute)
    except KeyboardInterrupt:
        print("\n[main] Goodbye!")
        return 0


def main() -> int:
    # Windows consoles default to cp1252, which raises UnicodeEncodeError when a
    # reply contains Hinglish/Devanagari/emoji characters. Force UTF-8 so any
    # reply prints safely instead of crashing the assistant.
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

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

    _confront_on_startup(speak=True)

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
            if _is_name_query(user_text):
                _quick_say(_name_reply(), speak=True)
                continue
            if _is_time_query(user_text):
                _quick_say(_time_reply(), speak=True)
                continue
            if _is_brief_command(user_text):
                _quick_say(mentor.daily_briefing(), speak=True)
                continue

            _handle_input(user_text, history, speak=True)
    except KeyboardInterrupt:
        print("\n[main] Goodbye!")
        return 0


if __name__ == "__main__":
    sys.exit(main())
