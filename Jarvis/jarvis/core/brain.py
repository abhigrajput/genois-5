"""LLM router for Jarvis.

Two backends:
  - MiniMax M3  -> fast, simple replies (chit-chat, short factual questions)
  - Claude      -> complex reasoning, advice, planning, multi-step, mentoring

`think(user_text, history)` picks a backend, calls it, appends the exchange to
`history`, and returns the reply text. `history` is a plain list of
{"role": ..., "content": ...} dicts that the caller owns and reuses.
"""

import re

import anthropic
from openai import OpenAI

import config

SYSTEM_PROMPT = (
    "You are Jarvis, a friendly bilingual voice assistant. The user may speak "
    "in Hindi, English, or a mix (Hinglish); reply naturally in whatever "
    "language and style they used. Keep spoken replies concise and clear — "
    "this text will be read aloud, so avoid markdown, bullet points, code "
    "blocks, and long lists. Be warm and conversational."
)

# Keywords that signal the user wants reasoning, planning, advice, or mentoring.
# These route to Claude. Hinglish/Hindi cues are included alongside English.
_COMPLEX_KEYWORDS = [
    "why", "how do i", "how should", "explain", "plan", "strategy",
    "advice", "advise", "suggest", "recommend", "compare", "pros and cons",
    "should i", "help me", "design", "debug", "analyze", "analyse",
    "step by step", "roadmap", "career", "mentor", "decide", "decision",
    # Note: bare "kaise" (how) is intentionally excluded — it appears in
    # chit-chat greetings ("kaise ho?" = how are you). Action cues like
    # "karu"/"karoon" still catch "kaise karu?" (how do I do X?).
    "kyun", "kyu", "samjha", "samjhao", "salah", "sujhav",
    "soch", "plan banao", "karu", "karoon",
]

# Initialize clients once.
_claude = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)
_minimax = OpenAI(api_key=config.MINIMAX_API_KEY, base_url=config.MINIMAX_BASE_URL)


def _is_complex(user_text: str) -> bool:
    """Heuristic: does this turn need Claude's reasoning, or is MiniMax enough?"""
    text = user_text.lower().strip()

    # Long inputs tend to be multi-step / detailed -> Claude.
    word_count = len(text.split())
    if word_count >= 30:
        return True

    # Keyword match -> Claude.
    if any(kw in text for kw in _COMPLEX_KEYWORDS):
        return True

    # Multiple sentences / questions usually means a richer request -> Claude.
    if len(re.findall(r"[.?!]", text)) >= 3:
        return True

    return False


def _ask_minimax(user_text: str, history: list[dict]) -> str:
    """Fast path: MiniMax M3 via the OpenAI-compatible chat endpoint."""
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages.extend(history)
    messages.append({"role": "user", "content": user_text})

    resp = _minimax.chat.completions.create(
        model=config.MINIMAX_MODEL,
        messages=messages,
        max_tokens=512,
    )
    return (resp.choices[0].message.content or "").strip()


def _ask_claude(user_text: str, history: list[dict]) -> str:
    """Reasoning path: Claude (claude-opus-4-8) via the Anthropic SDK."""
    messages = list(history)
    messages.append({"role": "user", "content": user_text})

    resp = _claude.messages.create(
        model=config.CLAUDE_MODEL,
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        thinking={"type": "adaptive"},
        messages=messages,
    )

    # Skip thinking blocks; return the visible text.
    parts = [block.text for block in resp.content if block.type == "text"]
    return "".join(parts).strip()


def think(user_text: str, history: list[dict]) -> str:
    """Route `user_text` to a backend, update `history`, return the reply.

    `history` is mutated in place with the user turn and the assistant reply so
    the conversation carries across calls.
    """
    user_text = (user_text or "").strip()
    if not user_text:
        return ""

    backend = "claude" if _is_complex(user_text) else "minimax"
    print(f"[brain] Routing to {backend}.")

    try:
        if backend == "claude":
            reply = _ask_claude(user_text, history)
        else:
            reply = _ask_minimax(user_text, history)
    except Exception as exc:  # noqa: BLE001 - surface backend errors to the user
        print(f"[brain] {backend} error: {exc}")
        reply = "Sorry, mujhe ek error aa gaya. Please try again."

    # Persist the exchange so context carries forward.
    history.append({"role": "user", "content": user_text})
    history.append({"role": "assistant", "content": reply})

    return reply


if __name__ == "__main__":
    # Quick manual test: python -m core.brain
    convo: list[dict] = []
    print("Jarvis:", think("Hi, what's your name?", convo))
    print("Jarvis:", think("How should I plan my final-year project?", convo))
