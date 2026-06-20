"""Persistence for Jarvis conversation history.

The assistant keeps context in a list of {"role", "content"} dicts. Here we
save it to a JSON file after every turn and reload it on startup so the
conversation survives restarts.

Only the most recent MAX_MESSAGES are kept. This bounds API token cost and
context size, and — because turns are always appended in user/assistant pairs —
keeping an even number off the end preserves the "starts with user, alternates"
shape that the Claude backend requires.
"""

import json
import os
import tempfile

# Store the history file next to the jarvis package, regardless of the working
# directory the app was launched from (mirrors how config.py locates .env).
_HISTORY_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "conversation_history.json",
)

# Cap on retained messages. Each turn adds 2 (one user, one assistant), so this
# keeps roughly the last 20 exchanges. Must stay even (see module docstring).
MAX_MESSAGES = 40


def _is_message(m: object) -> bool:
    """True if `m` looks like a usable {"role", "content"} message dict."""
    return (
        isinstance(m, dict)
        and m.get("role") in ("user", "assistant")
        and isinstance(m.get("content"), str)
    )


def load_history() -> list[dict]:
    """Return the saved history (most recent MAX_MESSAGES), or [] if none."""
    try:
        with open(_HISTORY_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return []
    if not isinstance(data, list):
        return []
    return [m for m in data if _is_message(m)][-MAX_MESSAGES:]


def save_history(history: list[dict]) -> None:
    """Atomically persist the most recent MAX_MESSAGES of `history`."""
    trimmed = history[-MAX_MESSAGES:]
    directory = os.path.dirname(_HISTORY_PATH)
    # Write to a temp file in the same directory, then atomically replace, so a
    # crash mid-write can never corrupt the existing history file.
    fd, tmp = tempfile.mkstemp(suffix=".json", dir=directory)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(trimmed, f, ensure_ascii=False, indent=2)
        os.replace(tmp, _HISTORY_PATH)
    except OSError:
        try:
            os.remove(tmp)
        except OSError:
            pass


def clear_history() -> None:
    """Forget everything by deleting the saved history file."""
    try:
        os.remove(_HISTORY_PATH)
    except FileNotFoundError:
        pass
