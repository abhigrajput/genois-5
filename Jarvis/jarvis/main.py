"""Jarvis — wake-word voice assistant.

Loop: say "hey jarvis" -> listen() -> think() -> speak().
Everything is printed to the console. Ctrl+C exits cleanly.

Run with --text to type input instead of using the mic (skips wake word
and Whisper). Add --mute to also skip speaking, for fast brain testing.
"""

import argparse
import re
import sys
import threading
from datetime import datetime

import config
from core import brain, dashboard, hands, intent, mentor, mentor_brain, mouth, phone, profile, scheduler
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


# Phrases that snooze the startup confrontation for the rest of the day. Kept
# specific (not a bare "baad mein") so ordinary "main baad mein karunga" chatter
# doesn't accidentally silence the mentor.
_SNOOZE_TRIGGERS = (
    "snooze", "stop confronting me", "stop confronting", "don't confront me",
    "dont confront me", "no confrontation", "confront mat karo",
    "confront mat kar", "aaj confront mat", "mujhe baad mein confront",
)

# What Jarvis says when it snoozes the confrontation — acknowledges but doesn't
# let him off the hook for tomorrow.
_SNOOZE_REPLY = "Theek hai, aaj ke liye chhod raha hoon. Par kal jawab dena padega — kaam karo."


def _is_snooze_command(text: str) -> bool:
    """True if `text` asks to snooze the startup confrontation for today."""
    lowered = text.lower()
    return any(trigger in lowered for trigger in _SNOOZE_TRIGGERS)


# Phrases that turn the Phase 4 background scheduler off / on. Specific enough
# not to fire on ordinary "thoda pause karo" chatter.
_PAUSE_SCHEDULE_TRIGGERS = (
    "pause schedule", "pause the schedule", "stop schedule", "stop the schedule",
    "schedule band karo", "schedule band kar do", "schedule band",
)
_RESUME_SCHEDULE_TRIGGERS = (
    "resume schedule", "resume the schedule", "start schedule", "start the schedule",
    "schedule chalu karo", "schedule chalu kar do", "schedule chalu",
)

_PAUSE_SCHEDULE_REPLY = "Schedule band kar diya. Background nudges ab nahi aayenge."
_RESUME_SCHEDULE_REPLY = "Schedule chalu kar diya. Ab main time pe nudge karunga."


def _is_pause_schedule_command(text: str) -> bool:
    """True if `text` asks to disable the background scheduler."""
    lowered = text.lower()
    return any(trigger in lowered for trigger in _PAUSE_SCHEDULE_TRIGGERS)


def _is_resume_schedule_command(text: str) -> bool:
    """True if `text` asks to (re-)enable the background scheduler."""
    lowered = text.lower()
    return any(trigger in lowered for trigger in _RESUME_SCHEDULE_TRIGGERS)


def _confront_on_startup(speak: bool) -> None:
    """Open with the mentor's confrontation if anything is overdue.

    Called once after Jarvis loads (voice and text mode), before waiting for any
    input. If a commitment is overdue, the mentor immediately speaks a short,
    brutal line naming it; otherwise this is silent and Jarvis starts normally.

    Fires at most once per calendar day: after it shows (or once Abhishek snoozes
    it by hand), later restarts the same day stay silent so a string of relaunches
    doesn't re-confront him. The snooze resets automatically the next day.
    """
    if profile.is_confrontation_snoozed():
        return
    opener = mentor_brain.startup_confrontation()
    if opener:
        _quick_say(opener, speak)
        profile.snooze_confrontation()


# Serializes turn handling so a phone (Telegram) turn on the polling thread and a
# local voice/text turn can never mutate the shared history — or hit the LLMs —
# at the same time.
_turn_lock = threading.Lock()


def respond(user_text: str, history: list[dict]) -> str:
    """Produce Jarvis's reply for one turn, performing any side effects.

    This is the single routing brain shared by the local voice/text loops AND the
    Telegram phone bridge. It handles the quick commands (forget / name / time /
    briefing / snooze / schedule) first, then classifies the turn into a PC action,
    a mentor turn, or plain chat. It returns the reply TEXT only — callers decide
    whether to print it, speak it, and/or send it to the phone. Serialized so
    phone and local turns can't interleave on the shared history.
    """
    user_text = (user_text or "").strip()
    if not user_text:
        return ""

    with _turn_lock:
        # --- Quick commands: answered directly, no intent/LLM round-trip. ---
        if _is_forget_command(user_text):
            history.clear()          # empties the list brain.think() shares
            clear_history()          # deletes the saved history file
            profile.clear_profile()  # also forget the user's name
            return _FORGET_REPLY
        if _is_name_query(user_text):
            return _name_reply()
        if _is_time_query(user_text):
            return _time_reply()
        if _is_brief_command(user_text):
            return mentor.daily_briefing()
        if _is_snooze_command(user_text):
            profile.snooze_confrontation()
            return _SNOOZE_REPLY
        if _is_pause_schedule_command(user_text):
            scheduler.pause_scheduler()
            return _PAUSE_SCHEDULE_REPLY
        if _is_resume_schedule_command(user_text):
            scheduler.resume_scheduler()
            return _RESUME_SCHEDULE_REPLY

        # --- Normal turn: PC action via hands, mentor, or chat via brain. ---
        _capture_name(user_text)
        decision = intent.classify(user_text)
        if decision["type"] == "action":
            # Run the command and return its short confirmation. History is left
            # untouched — actions aren't conversation turns.
            return hands.run(decision["function"], decision.get("args"))
        if decision["type"] == "mentor":
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
            return reply
        reply = brain.think(user_text, history)
        save_history(history)
        return reply


def _handle_input(user_text: str, history: list[dict], speak: bool) -> None:
    """Local-turn wrapper: route via respond(), then print and optionally speak."""
    reply = respond(user_text, history)
    if reply:
        print(f"Jarvis: {reply}")
        if speak:
            mouth.speak(reply)


def _start_phone_bridge(history: list[dict]) -> None:
    """Start the Telegram bridge so phone messages route through respond().

    The reply is sent back to the phone (and echoed to the console) but NOT spoken
    on the PC — phone turns are for when you're away. No-op if Telegram is unset.
    """
    def handle(text: str) -> str:
        reply = respond(text, history)
        if reply:
            print(f"[phone] Jarvis: {reply}")
        return reply

    if phone.start_phone(handle):
        print("[main] Phone bridge active (Telegram).")


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
    # Start the background scheduler AFTER the startup confrontation so the two
    # don't talk over each other on launch. Jobs run on their own thread, so the
    # input loop below keeps accepting typing while they fire.
    scheduler.start_scheduler(speak=not mute)
    # Bridge the phone (Telegram) onto the SAME history, so phone and typed turns
    # share one conversation. Runs on its own polling thread; no-op if unset.
    _start_phone_bridge(history)
    # Start the local web dashboard on its own daemon thread, sharing respond()
    # and this history. Non-blocking; no-op if DASHBOARD_ENABLED is false.
    url = dashboard.start_dashboard(respond, history)
    if url:
        print(f"[main] Dashboard: open {url} in your browser.")

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
            # respond() (inside _handle_input) handles quick commands + routing.
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
    # Start the background scheduler AFTER the startup confrontation. Jobs fire
    # on their own thread, so the wake-word loop below is never blocked by them.
    scheduler.start_scheduler(speak=True)
    # Bridge the phone (Telegram) onto the SAME history as voice turns. Runs on
    # its own polling thread; no-op if Telegram isn't configured.
    _start_phone_bridge(history)
    # Start the local web dashboard on its own daemon thread, sharing respond()
    # and this history. Non-blocking; no-op if DASHBOARD_ENABLED is false.
    url = dashboard.start_dashboard(respond, history)
    if url:
        print(f"[main] Dashboard: open {url} in your browser.")

    try:
        while True:
            print("\n[main] Waiting for wake word...")
            wake.wait_for_wake_word()

            user_text = ear.listen()
            if not user_text:
                print("[main] Didn't catch that — try again.")
                continue

            print(f"You: {user_text}")
            # respond() (inside _handle_input) handles quick commands + routing.
            _handle_input(user_text, history, speak=True)
    except KeyboardInterrupt:
        print("\n[main] Goodbye!")
        return 0


if __name__ == "__main__":
    sys.exit(main())
