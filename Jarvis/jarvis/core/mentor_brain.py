"""The accountability-mentor brain for Jarvis (Phase 3).

`mentor_reply(user_text, history)` calls Claude (Opus, claude-opus-4-8) with a
MENTOR system prompt and the user's CURRENT commitments + overdue items injected
as live context. Unlike core/brain.py (a friendly general assistant), this voice
is a brutally honest accountability partner that holds Abhishek to his OWN past
words instead of handing out generic motivation.

Mirrors core/brain.py's conventions: its own anthropic client, adaptive thinking,
a hard per-request timeout, and mutating `history` in place so the conversation
carries across turns the same way the chat brain does.
"""

from __future__ import annotations

import anthropic

import config
from core import mentor

# Same hard ceiling as core/brain.py so a stalled backend can't hang Jarvis.
API_TIMEOUT = 30

_client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)

# The mentor persona. Deliberately NOT a yes-man: it pushes back, names overdue
# items, and stays warm without flattering. It must never claim to perform PC
# actions (that's core/hands.py's job) and its replies are spoken aloud, so no
# markdown, bullets, or code blocks.
MENTOR_SYSTEM_PROMPT = (
    "You are Jarvis in MENTOR mode — a brutally honest accountability mentor for "
    "Abhishek, a solo founder building GENOIS, prepping for an MS abroad "
    "(GRE/IELTS), and working on daily discipline. "
    "Your job is to hold him accountable using HIS OWN past commitments, which "
    "are provided to you as context below — NOT generic motivational quotes. "
    "Reference his actual commitments and deadlines by name. If something is "
    "overdue, say so directly and ask what happened. Push back on weak, vague, or "
    "over-ambitious plans; make him sharpen them. Refuse to be a yes-man — if a "
    "plan is bad, say it's bad and why. "
    "Be warm and on his side, but do NOT flatter or hand out empty praise; he has "
    "to earn it. Speak in natural Hinglish (Hindi-English mix), the way a sharp "
    "Indian founder-friend would. "
    "Keep replies concise and conversational — they are read aloud, so use no "
    "markdown, no bullet points, no code blocks, and no long lists. "
    "You CANNOT perform any actions on his computer and must never claim to; you "
    "only talk, hold him accountable, and help him think. "
    "When he states a new commitment, acknowledge it crisply and, if it's vague "
    "or lacks a deadline, press him to make it concrete."
)


def _format_context() -> str:
    """Build the live commitments context block injected into the system prompt.

    Pulls overdue and open commitments straight from the store each turn so the
    mentor is always reacting to current reality, not a stale snapshot.
    """
    overdue = mentor.get_overdue_commitments()
    open_items = mentor.get_open_commitments()
    overdue_ids = {c["id"] for c in overdue}
    # "Open but not overdue", so the two lists don't double-count the same item.
    upcoming = [c for c in open_items if c["id"] not in overdue_ids]

    if not overdue and not upcoming:
        return (
            "CONTEXT — Abhishek has no commitments on record yet. If he states one "
            "in this turn, it will be saved; encourage him to commit to something "
            "concrete with a deadline."
        )

    def line(c: dict) -> str:
        desc = c.get("description") or "(no description)"
        cat = c.get("category") or "?"
        due = c.get("due_date") or "no deadline"
        return f"- [{cat}] {desc} (due: {due})"

    parts = ["CONTEXT — Abhishek's current commitments (use these, by name):"]
    if overdue:
        parts.append(f"OVERDUE ({len(overdue)}):")
        parts.extend(line(c) for c in overdue)
    if upcoming:
        parts.append("OPEN:")
        parts.extend(line(c) for c in upcoming)
    return "\n".join(parts)


def mentor_reply(user_text: str, history: list[dict]) -> str:
    """Generate the mentor's reply, updating `history` in place.

    `history` is the same shared list core/brain.py uses, so mentor and chat
    turns interleave in one conversation. Never raises: any backend error
    degrades to a short spoken apology so the assistant keeps talking.
    """
    user_text = (user_text or "").strip()
    if not user_text:
        return ""

    # The frozen persona plus a freshly-pulled commitments snapshot. Kept as two
    # blocks so the persona could be cached later while context varies per turn.
    system = [
        {"type": "text", "text": MENTOR_SYSTEM_PROMPT},
        {"type": "text", "text": _format_context()},
    ]

    messages = list(history)
    messages.append({"role": "user", "content": user_text})

    try:
        resp = _client.messages.create(
            model=config.CLAUDE_MODEL,
            max_tokens=1024,
            system=system,
            thinking={"type": "adaptive"},
            messages=messages,
            timeout=API_TIMEOUT,
        )
        reply = "".join(b.text for b in resp.content if b.type == "text").strip()
    except Exception as exc:  # noqa: BLE001 - surface, but keep the loop alive
        print(f"[mentor_brain] Claude call failed: {exc}")
        reply = "Sorry, abhi mentor brain mein error aa gaya. Thodi der baad try karo."

    history.append({"role": "user", "content": user_text})
    history.append({"role": "assistant", "content": reply})
    return reply


if __name__ == "__main__":
    # Quick manual test: python -m core.mentor_brain
    convo: list[dict] = []
    print("Mentor:", mentor_reply("How am I doing on my goals?", convo))
