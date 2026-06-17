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

# --- Model IDs ---
CLAUDE_MODEL = "claude-opus-4-8"
# Model id as served by NVIDIA NIM (the OpenAI-compatible endpoint in MINIMAX_BASE_URL).
MINIMAX_MODEL = os.getenv("MINIMAX_MODEL", "minimaxai/minimax-m3")


def validate() -> list[str]:
    """Return a list of human-readable problems with the current config.

    An empty list means everything required is present.
    """
    problems: list[str] = []
    if not ANTHROPIC_API_KEY:
        problems.append("ANTHROPIC_API_KEY is missing (needed for Claude).")
    if not MINIMAX_API_KEY:
        problems.append("MINIMAX_API_KEY is missing (needed for MiniMax M3).")
    return problems
