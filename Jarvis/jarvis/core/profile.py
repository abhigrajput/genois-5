"""Tiny persistent user profile for Jarvis (currently just the user's name).

Stored as JSON next to the package so Jarvis can answer quick questions like
"what's my name?" instantly, without an LLM round-trip. Kept separate from the
conversation history because it's a long-lived fact, not a chat turn.
"""

import json
import os
import tempfile
from datetime import date

# Store the profile next to the jarvis package, regardless of the working
# directory the app was launched from (mirrors config.py / history.py).
_PROFILE_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "user_profile.json",
)


def _load() -> dict:
    """Return the saved profile dict, or {} if missing/unreadable."""
    try:
        with open(_PROFILE_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return {}
    return data if isinstance(data, dict) else {}


def _save(data: dict) -> None:
    """Atomically persist `data` (temp file + replace) to avoid corruption."""
    fd, tmp = tempfile.mkstemp(suffix=".json", dir=os.path.dirname(_PROFILE_PATH))
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        os.replace(tmp, _PROFILE_PATH)
    except OSError:
        try:
            os.remove(tmp)
        except OSError:
            pass


def get_name() -> str | None:
    """Return the saved user name, or None if not set."""
    return _load().get("name") or None


def set_name(name: str) -> None:
    """Remember the user's name."""
    data = _load()
    data["name"] = name
    _save(data)


def is_confrontation_snoozed() -> bool:
    """True if the startup confrontation has been snoozed for today.

    The mentor confronts at most once per calendar day: once it fires (or the
    user snoozes it by hand), later restarts the same day stay silent so he isn't
    confronted on every relaunch. Resets automatically when the date rolls over.
    """
    return _load().get("confrontation_snoozed_on") == date.today().isoformat()


def snooze_confrontation() -> None:
    """Snooze the startup confrontation for the rest of today."""
    data = _load()
    data["confrontation_snoozed_on"] = date.today().isoformat()
    _save(data)


def clear_profile() -> None:
    """Forget the whole profile by deleting the file."""
    try:
        os.remove(_PROFILE_PATH)
    except FileNotFoundError:
        pass
