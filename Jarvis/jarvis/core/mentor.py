"""Supabase-backed store for Jarvis's accountability mentor (Phase 3).

Holds Abhishek's commitments, facts about him, and check-ins so the mentor brain
can hold him accountable using his OWN past words instead of generic motivation.

Tables (commitments, facts, check_ins) are defined in the migration
supabase/migrations/20260620000000_create_mentor_tables.sql — apply it with
`supabase db push` or paste it into the Supabase SQL editor before first use.

Everything here degrades gracefully when Supabase isn't configured: reads return
empty, writes log and no-op. That keeps Phase 1+2 (chat + PC control) working
even without keys. Nothing raises out of this module — a flaky network or a
missing table must never crash the assistant mid-conversation.
"""

from __future__ import annotations

import difflib
from datetime import date

import config

# The three valid commitment buckets. add_commitment normalizes onto these and
# falls back to "discipline" for anything unrecognized.
CATEGORIES = ("genois", "ms_prep", "discipline")
_DEFAULT_CATEGORY = "discipline"

# Human-friendly category labels for the spoken briefing.
_CATEGORY_LABELS = {
    "genois": "GENOIS",
    "ms_prep": "MS prep (GRE/IELTS)",
    "discipline": "Discipline",
}

# Lazily-created Supabase client, cached after first use. None until built (or if
# the SDK import / connection fails). Pair with _client_ready so a failed build
# isn't retried on every single call.
_client = None
_client_ready = False


def _get_client():
    """Return a cached Supabase client, or None if unconfigured/unavailable."""
    global _client, _client_ready
    if _client_ready:
        return _client

    _client_ready = True  # only attempt the (slow) build once
    if not config.mentor_enabled():
        print("[mentor] Supabase not configured; mentor store is disabled.")
        return None
    try:
        from supabase import create_client

        _client = create_client(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY)
    except Exception as exc:  # noqa: BLE001 - never let store setup crash the app
        print(f"[mentor] Could not initialize Supabase client: {exc}")
        _client = None
    return _client


def _normalize_category(category: str) -> str:
    """Coerce a free-form category onto one of CATEGORIES."""
    key = (category or "").strip().lower().replace(" ", "_").replace("-", "_")
    if key in CATEGORIES:
        return key
    # Common aliases the LLM might emit.
    if key in ("ms", "gre", "ielts", "study", "abroad"):
        return "ms_prep"
    if key in ("startup", "company", "product"):
        return "genois"
    return _DEFAULT_CATEGORY


def add_commitment(category: str, description: str, due_date: str | None = None) -> dict | None:
    """Insert a commitment and return the stored row (or None on failure).

    `category` is normalized to genois | ms_prep | discipline. `due_date` is an
    ISO date string ("YYYY-MM-DD") or None.
    """
    description = (description or "").strip()
    if not description:
        return None

    client = _get_client()
    if client is None:
        return None

    row = {
        "category": _normalize_category(category),
        "description": description,
        "due_date": (due_date or None),
        "status": "open",
    }
    try:
        resp = client.table("commitments").insert(row).execute()
    except Exception as exc:  # noqa: BLE001 - surface, don't crash
        print(f"[mentor] add_commitment failed: {exc}")
        return None
    data = resp.data or []
    print(f"[mentor] Stored commitment: {row['category']} / {description!r} due {due_date}")
    return data[0] if data else row


def get_open_commitments() -> list[dict]:
    """Return all commitments with status 'open' (oldest first)."""
    client = _get_client()
    if client is None:
        return []
    try:
        resp = (
            client.table("commitments")
            .select("*")
            .eq("status", "open")
            .order("created_at")
            .execute()
        )
    except Exception as exc:  # noqa: BLE001
        print(f"[mentor] get_open_commitments failed: {exc}")
        return []
    return resp.data or []


def get_overdue_commitments() -> list[dict]:
    """Return open commitments whose due_date is before today (rows with no
    due_date are never overdue)."""
    client = _get_client()
    if client is None:
        return []
    today = date.today().isoformat()
    try:
        resp = (
            client.table("commitments")
            .select("*")
            .eq("status", "open")
            .lt("due_date", today)  # NULL due_dates are excluded by `lt`
            .order("due_date")
            .execute()
        )
    except Exception as exc:  # noqa: BLE001
        print(f"[mentor] get_overdue_commitments failed: {exc}")
        return []
    return resp.data or []


def mark_commitment(description_match: str, status: str) -> dict | None:
    """Find the closest open commitment by description and set its status.

    `status` should be 'done' or 'missed'. Matching is fuzzy (difflib) so the
    user can say "I onboarded those users" and we still find "onboard 5 GENOIS
    users by Friday". Returns the updated row, or None if nothing matched.
    """
    status = (status or "").strip().lower()
    if status not in ("done", "missed"):
        print(f"[mentor] mark_commitment: invalid status {status!r}")
        return None

    query = (description_match or "").strip().lower()
    if not query:
        return None

    open_items = get_open_commitments()
    if not open_items:
        return None

    # Score every open commitment; pick the best fuzzy match above a low floor.
    best, best_score = None, 0.0
    for item in open_items:
        desc = (item.get("description") or "").lower()
        score = difflib.SequenceMatcher(None, query, desc).ratio()
        # Boost when the query words are a subset of the description (or vice
        # versa) — handles "onboard users" vs "onboard 5 GENOIS users by Friday".
        if query in desc or desc in query:
            score = max(score, 0.8)
        if score > best_score:
            best, best_score = item, score

    if best is None or best_score < 0.4:
        print(f"[mentor] mark_commitment: no close match for {description_match!r}")
        return None

    client = _get_client()
    if client is None:
        return None
    try:
        resp = (
            client.table("commitments")
            .update({"status": status})
            .eq("id", best["id"])
            .execute()
        )
    except Exception as exc:  # noqa: BLE001
        print(f"[mentor] mark_commitment update failed: {exc}")
        return None
    data = resp.data or []
    print(f"[mentor] Marked {best.get('description')!r} as {status}.")
    return data[0] if data else best


def _format_commitment(item: dict, *, with_due: bool = True) -> str:
    """One-line bullet for a commitment in the spoken briefing."""
    desc = item.get("description") or "(no description)"
    due = item.get("due_date")
    if with_due and due:
        return f"- {desc} (due {due})"
    return f"- {desc}"


def daily_briefing() -> str:
    """Return a plain-text, Hinglish-friendly accountability briefing.

    Overdue items first, then due today, then the rest of the open commitments
    grouped by category. Built for reading aloud, so no markdown beyond simple
    dashes.
    """
    if not config.mentor_enabled():
        return (
            "Mentor store abhi setup nahi hai. Supabase keys add karo .env mein, "
            "phir main aapke commitments track kar paaunga."
        )

    open_items = get_open_commitments()
    if not open_items:
        return (
            "Abhi koi open commitment nahi hai. Koi naya goal set karo — "
            "bas bolo, jaise 'I'll onboard 5 GENOIS users by Friday'."
        )

    today = date.today().isoformat()
    overdue = [c for c in open_items if c.get("due_date") and c["due_date"] < today]
    due_today = [c for c in open_items if c.get("due_date") == today]
    accounted = {c["id"] for c in overdue} | {c["id"] for c in due_today}
    remaining = [c for c in open_items if c["id"] not in accounted]

    lines: list[str] = ["Aaj ka briefing:"]

    if overdue:
        lines.append("")
        lines.append(f"OVERDUE ({len(overdue)}) — inko pehle dekho:")
        lines.extend(_format_commitment(c) for c in overdue)

    if due_today:
        lines.append("")
        lines.append("Aaj due hai:")
        lines.extend(_format_commitment(c, with_due=False) for c in due_today)

    if remaining:
        lines.append("")
        lines.append("Baaki open commitments:")
        for cat in CATEGORIES:
            in_cat = [c for c in remaining if c.get("category") == cat]
            if not in_cat:
                continue
            lines.append(f"{_CATEGORY_LABELS[cat]}:")
            lines.extend(_format_commitment(c) for c in in_cat)
        # Any commitment with an unexpected category still gets listed.
        leftover = [c for c in remaining if c.get("category") not in CATEGORIES]
        if leftover:
            lines.append("Other:")
            lines.extend(_format_commitment(c) for c in leftover)

    return "\n".join(lines)


def remember_fact(key: str, value: str) -> None:
    """Upsert a fact (key -> value) into the facts table."""
    key = (key or "").strip()
    value = (value or "").strip()
    if not key or not value:
        return
    client = _get_client()
    if client is None:
        return
    try:
        # on_conflict=key turns this into an upsert keyed by the primary key.
        client.table("facts").upsert({"key": key, "value": value}, on_conflict="key").execute()
    except Exception as exc:  # noqa: BLE001
        print(f"[mentor] remember_fact failed: {exc}")
        return
    print(f"[mentor] Remembered fact {key!r}.")


def get_facts() -> dict:
    """Return all stored facts as a {key: value} dict."""
    client = _get_client()
    if client is None:
        return {}
    try:
        resp = client.table("facts").select("key, value").execute()
    except Exception as exc:  # noqa: BLE001
        print(f"[mentor] get_facts failed: {exc}")
        return {}
    return {row["key"]: row["value"] for row in (resp.data or []) if row.get("key")}


if __name__ == "__main__":
    # Quick manual smoke test: python -m core.mentor
    print("mentor_enabled:", config.mentor_enabled())
    add_commitment("genois", "onboard 5 GENOIS users", "2026-06-26")
    print(daily_briefing())
