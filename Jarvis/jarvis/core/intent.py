"""Intent classifier for Jarvis.

Every turn is shown to Claude, which decides whether it's plain conversation, a
PC-control command, or an accountability/goals topic for the mentor, and returns
JSON only:

    {"type": "chat"}
    {"type": "action", "function": "open_app", "args": {"name": "chrome"}}
    {"type": "mentor"}
    {"type": "mentor", "commitment": {"category": "genois",
                                      "description": "onboard 5 GENOIS users",
                                      "due_date": "2026-06-26"}}

main.py routes "chat" to brain.think(), "action" to hands.run(), and "mentor" to
mentor_brain.mentor_reply() (storing any parsed commitment first). The function
list and argument shapes here MUST match core/hands.py. A fast, cheap model is
used so classifying every input adds minimal latency, and any parse failure
falls back to {"type": "chat"} so speech is never lost.
"""

import json
from datetime import date

import anthropic

import config

# Classifying runs on every turn, so use a tight timeout and degrade to chat.
INTENT_TIMEOUT = 12

_client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)

# The contract handed to Claude: the exact functions hands.run() can dispatch,
# their arguments, and the strict JSON shapes to return. The current date is
# appended at call time (see classify) so relative deadlines like "Friday"
# resolve to a real ISO date.
SYSTEM_PROMPT = """You are the intent router for Jarvis, a voice assistant that \
can control a Windows PC AND acts as an accountability mentor for its owner \
Abhishek. Classify the user's message into ONE of three kinds and reply with a \
single line of JSON and NOTHING else — no markdown, no code fence, no explanation.

1. If the message is a request to DO something on the computer, return:
  {"type": "action", "function": "<name>", "args": { ... }}

2. If it is about his goals, progress, plans, commitments, accountability, or \
discipline — anything to do with GENOIS (his startup), MS prep abroad (GRE/IELTS), \
daily habits/discipline, "brief me", "how am I doing", or statements of intent \
like "I will...", "I'll...", "I should...", "I need to..." — return:
  {"type": "mentor"}

3. Otherwise — a greeting, a general question, chit-chat, advice unrelated to his \
goals, information lookup that isn't a web search command — return:
  {"type": "chat"}

The available actions and their args are:

- open_app   -> args {"name": "<app>"}   app is one of: chrome, notepad, \
calculator, vscode, explorer, spotify
- web_search -> args {"query": "<text>"}  open a Google search in the browser
- play_youtube -> args {"query": "<text>"}  play a song/video on YouTube
- type_text  -> args {"text": "<text>"}   type the given text at the cursor
- set_volume -> args {"direction": "<dir>"}  dir is one of: up, down, mute
- take_screenshot -> args {}              capture the screen

COMMITMENTS: if a mentor message is a concrete commitment the user is making \
(e.g. "I'll onboard 5 GENOIS users by Friday", "main kal se roz 6 baje uthunga", \
"I will finish the GRE quant section this week"), enrich the mentor result with a \
"commitment" object:
  {"type": "mentor", "commitment": {"category": "<cat>", "description": "<text>", "due_date": "<YYYY-MM-DD or null>"}}
- category is exactly one of: "genois" (startup work), "ms_prep" (GRE/IELTS/MS \
abroad), "discipline" (habits, routine, health, focus).
- description is a short clean phrase of WHAT he committed to, without the time \
words (e.g. "onboard 5 GENOIS users").
- due_date is an ISO date (YYYY-MM-DD) resolved from any deadline he mentions \
relative to today's date given below; use null if he gave no deadline.
Questions ABOUT goals ("how am I doing?", "brief me") are mentor WITHOUT a \
commitment object.

Rules:
- Only choose "action" when the user clearly wants the computer to do that thing \
("open chrome", "chrome kholo", "search for X", "play despacito on youtube", \
"volume up", "le ek screenshot"). When in doubt between chat and action, choose chat.
- A factual question like "what is the capital of France" is "chat", NOT a \
web_search — only treat it as web_search when the user says to search/Google it.
- For play_youtube and web_search, put just the topic in the query, not the \
command words (e.g. "play tum hi ho on youtube" -> query "tum hi ho").
- The user may speak Hindi, English, or Hinglish. Understand all three.
- Output ONLY the JSON object."""

# Valid (function -> required arg) pairs, mirroring hands.py. Used to sanity-
# check the model's output before main.py acts on it.
_ACTION_ARGS = {
    "open_app": "name",
    "web_search": "query",
    "play_youtube": "query",
    "type_text": "text",
    "set_volume": "direction",
    "take_screenshot": None,
}

_CHAT = {"type": "chat"}

# Valid commitment categories, mirroring core/mentor.CATEGORIES.
_COMMITMENT_CATEGORIES = ("genois", "ms_prep", "discipline")


def _extract_json(raw: str) -> dict | None:
    """Pull a JSON object out of the model's text, tolerating stray wrapping."""
    raw = (raw or "").strip()
    if not raw:
        return None
    # Strip an accidental ```json ... ``` fence if the model added one.
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.lower().startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
    # Fall back to the first {...} span if there's leading/trailing prose.
    if not raw.startswith("{"):
        start, end = raw.find("{"), raw.rfind("}")
        if start == -1 or end <= start:
            return None
        raw = raw[start : end + 1]
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return None
    return data if isinstance(data, dict) else None


def _validate_due_date(value) -> str | None:
    """Return `value` if it's a real YYYY-MM-DD date string, else None."""
    if not isinstance(value, str):
        return None
    value = value.strip()
    try:
        date.fromisoformat(value)
    except ValueError:
        return None
    return value


def _validate_commitment(raw) -> dict | None:
    """Coerce a parsed commitment object into a clean shape, or None if unusable."""
    if not isinstance(raw, dict):
        return None
    description = raw.get("description")
    if not isinstance(description, str) or not description.strip():
        return None

    category = raw.get("category")
    if not isinstance(category, str) or category.strip().lower() not in _COMMITMENT_CATEGORIES:
        # mentor.add_commitment normalizes/defaults, but keep the router honest.
        category = "discipline"
    else:
        category = category.strip().lower()

    return {
        "category": category,
        "description": description.strip(),
        "due_date": _validate_due_date(raw.get("due_date")),
    }


def _validate(data: dict) -> dict:
    """Coerce a parsed intent into a known-good shape, defaulting to chat."""
    kind = data.get("type")

    if kind == "mentor":
        result = {"type": "mentor"}
        commitment = _validate_commitment(data.get("commitment"))
        if commitment is not None:
            result["commitment"] = commitment
        return result

    if kind != "action":
        return _CHAT

    function = data.get("function")
    if function not in _ACTION_ARGS:
        return _CHAT

    arg_name = _ACTION_ARGS[function]
    if arg_name is None:
        return {"type": "action", "function": function, "args": {}}

    args = data.get("args") or {}
    value = args.get(arg_name)
    # Be forgiving if the model used a different single key.
    if value is None and isinstance(args, dict) and len(args) == 1:
        value = next(iter(args.values()))
    if not isinstance(value, str) or not value.strip():
        return _CHAT

    return {"type": "action", "function": function, "args": {arg_name: value.strip()}}


def classify(user_text: str) -> dict:
    """Return {"type": "chat"} or a validated action intent for `user_text`.

    Never raises: any API or parsing problem degrades to chat so the assistant
    simply talks instead of silently dropping the turn.
    """
    user_text = (user_text or "").strip()
    if not user_text:
        return _CHAT

    # Tell the model today's date and weekday so it can turn "by Friday" /
    # "kal" / "this week" into a concrete ISO due_date.
    today = date.today()
    dated_prompt = (
        f"{SYSTEM_PROMPT}\n\nToday's date is {today.isoformat()} "
        f"({today.strftime('%A')}). Resolve all relative deadlines against this."
    )

    try:
        resp = _client.messages.create(
            model=config.INTENT_MODEL,
            max_tokens=200,
            system=dated_prompt,
            messages=[{"role": "user", "content": user_text}],
            timeout=INTENT_TIMEOUT,
        )
    except Exception as exc:  # noqa: BLE001 - classifying must never break the loop
        print(f"[intent] classify failed, treating as chat: {exc}")
        return _CHAT

    raw = "".join(b.text for b in resp.content if b.type == "text")
    data = _extract_json(raw)
    if data is None:
        print(f"[intent] Could not parse intent {raw!r}; treating as chat.")
        return _CHAT

    intent = _validate(data)
    print(f"[intent] {user_text!r} -> {intent}")
    return intent


if __name__ == "__main__":
    # Quick manual test: python -m core.intent
    for t in ["open chrome", "kaise ho?", "play tum hi ho on youtube",
              "volume up karo", "what's the capital of France", "le ek screenshot",
              "I'll onboard 5 GENOIS users by Friday", "brief me",
              "how am I doing on my MS prep?", "mujhe brief karo"]:
        print(f"{t!r:45} -> {classify(t)}")
