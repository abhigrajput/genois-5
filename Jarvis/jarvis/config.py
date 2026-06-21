"""Loads API keys and settings from a .env file.

All other modules import their configuration from here so there is a single
place that touches the environment.
"""

import os

from dotenv import load_dotenv

# Load the .env that sits next to this file, regardless of the current
# working directory the app was launched from.
_ENV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
load_dotenv(_ENV_PATH)


# --- Claude (Anthropic) ---
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

# --- MiniMax M3 ---
MINIMAX_API_KEY = os.getenv("MINIMAX_API_KEY", "")
MINIMAX_BASE_URL = os.getenv("MINIMAX_BASE_URL", "https://api.minimax.io/v1")
MINIMAX_GROUP_ID = os.getenv("MINIMAX_GROUP_ID", "")

# --- Supabase (accountability mentor store, Phase 3) ---
# The mentor brain persists commitments, facts, and check-ins to Supabase. Use
# the SERVICE key (not the anon key): Jarvis is a trusted local app, and the
# service key bypasses row-level security so reads/writes just work. Mentor
# features degrade gracefully (no-op) when these are blank — see core/mentor.py.
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

# --- Speech-to-text (Whisper) ---
# Language Whisper transcribes in. Auto-detect is unreliable on short int8 CPU
# clips (it once mislabelled clean speech as Malayalam), so we pin it. Use "en"
# for English/Hinglish, "hi" for mostly-Hindi speech, or any Whisper code.
WHISPER_LANGUAGE = os.getenv("WHISPER_LANGUAGE", "en")

# --- Model IDs ---
CLAUDE_MODEL = "claude-opus-4-8"
# Fast, cheap model used by core/intent.py to classify every turn (chat vs. PC
# action). Routing runs on every input, so latency/cost matter more than depth.
INTENT_MODEL = os.getenv("INTENT_MODEL", "claude-haiku-4-5-20251001")
# Model id as served by NVIDIA NIM (the OpenAI-compatible endpoint in MINIMAX_BASE_URL).
MINIMAX_MODEL = os.getenv("MINIMAX_MODEL", "minimaxai/minimax-m3")


def mentor_enabled() -> bool:
    """True if Supabase is configured, so the Phase 3 mentor store can be used.

    Mentor features are optional: when this is False, core/mentor.py degrades to
    safe no-ops so Phase 1+2 (chat and PC control) keep working without keys.
    """
    return bool(SUPABASE_URL and SUPABASE_SERVICE_KEY)


def validate() -> list[str]:
    """Return a list of human-readable problems with the current config.

    An empty list means everything required is present. Supabase is intentionally
    NOT checked here — the mentor is an optional add-on, so missing Supabase keys
    must not block the assistant from starting.
    """
    problems: list[str] = []
    if not ANTHROPIC_API_KEY:
        problems.append("ANTHROPIC_API_KEY is missing (needed for Claude).")
    if not MINIMAX_API_KEY:
        problems.append("MINIMAX_API_KEY is missing (needed for MiniMax M3).")
    return problems
