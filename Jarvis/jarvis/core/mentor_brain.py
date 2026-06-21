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


def _fallback_confrontation(overdue: list[dict]) -> str:
    """A terse, non-LLM confrontation naming the overdue items.

    Used when the Claude call for the startup opener fails, so the confrontation
    still happens (the whole point is to not let an overdue item slide silently).
    """
    descs = ", ".join((c.get("description") or "commitment") for c in overdue[:3])
    extra = " aur baaki bhi." if len(overdue) > 3 else ""
    return f"Abhishek, ye overdue hai: {descs}{extra} Kya hua? Explain karo."


def startup_confrontation() -> str:
    """One-shot mentor opener for when Jarvis launches, or "" if nothing's overdue.

    If any commitment is overdue, returns a short, brutal line that names the
    overdue item(s) and demands an explanation — the mentor confronting Abhishek
    the moment Jarvis starts, before he says anything. When nothing is overdue
    (or the store is disabled/unconfigured) returns "" so the caller stays silent
    and starts normally.

    Deliberately does NOT touch conversation history: persisting a lone assistant
    turn would break the user-first message ordering mentor_reply/brain.think
    expect. The overdue context is re-pulled every turn anyway, so a reply to this
    opener still lands with full context.
    """
    overdue = mentor.get_overdue_commitments()
    if not overdue:
        return ""

    # Same persona + a freshly-pulled commitments block (which already lists the
    # overdue items), plus a one-off directive to OPEN the conversation unprompted.
    instruction = (
        "Jarvis just started up and Abhishek has not said anything yet. Open the "
        "conversation YOURSELF with one or two short, brutally direct sentences "
        "that name his overdue commitment(s) and demand an explanation. No "
        "greeting, no preamble, no softening. For example: \"Abhishek, kal ka "
        "GENOIS target miss hua. 5 users. Kya hua?\""
    )
    system = [
        {"type": "text", "text": MENTOR_SYSTEM_PROMPT},
        {"type": "text", "text": _format_context()},
    ]
    messages = [{"role": "user", "content": instruction}]

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
    except Exception as exc:  # noqa: BLE001 - never let the opener crash startup
        print(f"[mentor_brain] startup confrontation failed: {exc}")
        return _fallback_confrontation(overdue)

    # An empty model reply still means there's something overdue — fall back so
    # the confrontation isn't silently dropped.
    return reply or _fallback_confrontation(overdue)


def _short_mentor_line(instruction: str, fallback: str) -> str:
    """Generate ONE short, spoken mentor line for a background nudge.

    Used by the scheduler (Phase 4) for fire-and-forget prompts — a work nudge
    or an evening check-in — that Jarvis speaks unprompted. Like
    startup_confrontation, this deliberately does NOT touch conversation history
    (a lone assistant turn would break the user-first ordering the chat/mentor
    brains expect) and pulls the live commitments context so the line references
    real deadlines. `max_tokens` is small to keep it to a sentence or two; any
    failure degrades to `fallback` so a scheduled job still says something.
    """
    system = [
        {"type": "text", "text": MENTOR_SYSTEM_PROMPT},
        {"type": "text", "text": _format_context()},
    ]
    messages = [{"role": "user", "content": instruction}]
    try:
        resp = _client.messages.create(
            model=config.CLAUDE_MODEL,
            max_tokens=200,
            system=system,
            thinking={"type": "adaptive"},
            messages=messages,
            timeout=API_TIMEOUT,
        )
        reply = "".join(b.text for b in resp.content if b.type == "text").strip()
    except Exception as exc:  # noqa: BLE001 - never let a background nudge crash
        print(f"[mentor_brain] short mentor line failed: {exc}")
        return fallback
    return reply or fallback


def work_nudge() -> str:
    """A SHORT, brutal work-in-progress nudge for the periodic scheduler job.

    One or two sentences asking what he has actually shipped recently, naming an
    overdue/open commitment if there is one. Spoken unprompted mid-day.
    """
    instruction = (
        "Jarvis is interrupting Abhishek mid-work to keep him honest. Say ONE or "
        "TWO short, brutally direct sentences asking what he has actually shipped "
        "in the last couple of hours. If something is overdue or open, name it. "
        "No greeting, no preamble. For example: \"Abhishek, pichhle 2 ghante mein "
        "kya ship kiya? Numbers do, excuses nahi.\""
    )
    fallback = "Abhishek, pichhle 2 ghante mein kya ship kiya? Numbers do, excuses nahi."
    return _short_mentor_line(instruction, fallback)


def evening_checkin() -> str:
    """A SHORT end-of-day check-in line for the evening scheduler job.

    Asks what he shipped today and what tomorrow's plan is, in one or two spoken
    sentences. Naming open commitments is fine; keep it tight.
    """
    instruction = (
        "It is evening and Jarvis is doing an end-of-day check-in with Abhishek. "
        "In ONE or TWO short sentences, ask him directly what he actually shipped "
        "today and what his concrete plan for tomorrow is. If commitments are open "
        "or overdue, reference them. No greeting, no preamble, no fluff."
    )
    fallback = "Abhishek, aaj kya ship kiya, sach bata. Aur kal ka plan kya hai? Concrete bol."
    return _short_mentor_line(instruction, fallback)


if __name__ == "__main__":
    # Quick manual test: python -m core.mentor_brain
    convo: list[dict] = []
    print("Mentor:", mentor_reply("How am I doing on my goals?", convo))
