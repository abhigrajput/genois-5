# Jarvis — Voice Assistant

A wake-word voice assistant for Windows. **Voice in → AI → voice out**, plus PC
control, an accountability mentor, and timed background automation.

- **Wake** — wake-word detection with [openWakeWord](https://github.com/dscripka/openWakeWord) using the bundled pre-trained **"hey jarvis"** model. No API key, runs on CPU.
- **Ear** — speech-to-text with [faster-whisper](https://github.com/SYSTRAN/faster-whisper) (`small` model, CPU int8). The language is **pinned** via `WHISPER_LANGUAGE` (default `en` for English/Hinglish) because auto-detect is unreliable on short CPU clips.
- **Mouth** — text-to-speech with [edge-tts](https://github.com/rany2/edge-tts) using the `hi-IN-SwaraNeural` voice (female, Indian), handling Hindi / English / Hinglish.
- **Brain** — a router with two backends:
  - **MiniMax M3** (served via [NVIDIA NIM](https://build.nvidia.com)) for fast, simple replies (chit-chat, short factual questions).
  - **Claude (`claude-opus-4-8`)** for complex reasoning, advice, planning, and mentoring.
- **Hands** *(Phase 2)* — controls the PC: open apps, web/YouTube search, type text, change volume, take screenshots. Every turn is first classified by a cheap intent router.
- **Mentor** *(Phase 3)* — a brutally honest accountability partner that holds you to your **own** past commitments, backed by a [Supabase](https://supabase.com) store. Optional — chat + PC control work without it.
- **Scheduler** *(Phase 4)* — runs jobs on a timer in the background (morning briefing, app launch, work nudges, evening check-in) while the main loop stays responsive.

> Runs **entirely on CPU** — no GPU/CUDA required (Whisper uses the `small` int8 model).

---

## Requirements

- **Windows** with a working microphone and speakers.
- **Python 3.11**.
- API keys for **Anthropic (Claude)** and **NVIDIA** (the `nvapi-` key that serves MiniMax M3 via NVIDIA NIM).
- *Optional:* a **Supabase** project for the accountability mentor (Phase 3). Without it, chat and PC control still work.

---

## Setup

Run these from the `jarvis/` folder.

### 1. Create and activate a virtual environment

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
```

If PowerShell blocks the activate script, run once:
`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

### 2. Install dependencies

```powershell
pip install -r requirements.txt
```

Whisper runs on the **CPU** (`small` model, int8) — no CUDA or GPU setup needed.

### 3. Configure API keys

```powershell
copy .env.example .env
```

Then open `.env` and fill in:

- `ANTHROPIC_API_KEY` — your Claude API key. Used for reasoning/mentoring **and** to classify every turn (intent routing).
- `INTENT_MODEL` — fast, cheap model for that per-turn classification (default `claude-haiku-4-5-20251001`).
- `MINIMAX_API_KEY` — your NVIDIA API key (`nvapi-…`), which serves MiniMax M3 via NVIDIA NIM.
- `MINIMAX_BASE_URL` — the NVIDIA NIM OpenAI-compatible endpoint (default already set).
- `MINIMAX_MODEL` — the model id served by that endpoint (default `minimaxai/minimax-m3`).
- `MINIMAX_GROUP_ID` — only needed by MiniMax's own API; leave blank for NVIDIA NIM.
- `WHISPER_LANGUAGE` — transcription language: `en` for English/Hinglish, `hi` for mostly-Hindi, or any Whisper code.
- `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` — *optional*, for the Phase 3 mentor store. Use the **service role** key (not the anon key). Leave blank to run without the mentor.

The first run downloads the Whisper `small` model (~460 MB) — a one-time download.

### 4. (Optional) Set up the mentor store

If you filled in the Supabase keys, create the mentor tables once by applying the
migration in `supabase/migrations/` — run `supabase db push`, or paste the SQL into
the Supabase SQL editor.

---

## Run

```powershell
python main.py
```

Then:

1. Say **"hey jarvis"** to start talking.
2. Speak your request — recording stops automatically after ~2 seconds of silence.
3. Jarvis classifies the turn (chat / PC command / mentor), then transcribes, thinks, and speaks the reply.
4. Repeat (say "hey jarvis" again). Press **Ctrl+C** to quit.

> The first run downloads the small openWakeWord models (a few MB) — a one-time download.
> Tune `THRESHOLD` in `core/wake.py` if you get false triggers (raise it) or missed wake words (lower it).

### Text mode (no microphone)

To test the brain/routing without a mic — skipping wake-word and Whisper entirely:

```powershell
python main.py --text          # type input, replies are spoken and printed
python main.py --text --mute   # type input, replies printed only (no audio)
python main.py --forget        # erase saved conversation history, then start
```

Type your message at the `You:` prompt. Enter `quit` or `exit` (or press **Ctrl+C**)
to leave. `--text` never loads the Whisper model, so it starts instantly.

### Quick commands (no LLM round-trip)

Some phrases are handled instantly, in both voice and text mode:

- **Time** — "what's the time", "kitne baje".
- **Your name** — "what's my name" (Jarvis remembers it when you say "my name is …").
- **Briefing** — "brief me", "mujhe brief karo" → the mentor's accountability briefing.
- **Forget** — "forget everything", "sab bhool jao" → wipes conversation history and your name.
- **Snooze the mentor** — "stop confronting me", "confront mat karo" → silences the startup confrontation for the day.
- **Scheduler** — "pause schedule" / "schedule band karo" and "resume schedule" / "schedule chalu karo".

---

## PC control (Phase 2)

Every turn is first sent to a cheap intent classifier (`core/intent.py`,
`INTENT_MODEL`) that returns one of `chat`, `action`, or `mentor`. Anything
classified as an **action** is dispatched through a whitelist in `core/hands.py`
— the model can never run code outside this set:

| Action | Example |
| --- | --- |
| `open_app` | "open chrome", "notepad kholo" (chrome, notepad, calculator, vscode, explorer, spotify) |
| `web_search` | "search for the weather in Bangalore" |
| `play_youtube` | "play tum hi ho on youtube" |
| `type_text` | "type hello world" |
| `set_volume` | "volume up", "mute karo" |
| `take_screenshot` | "le ek screenshot" |

When in doubt between chat and an action, the router chooses chat, so ordinary
conversation is never hijacked. Actions are intentionally safe — no shutdown,
file deletion, or messaging.

---

## Accountability mentor (Phase 3)

In **mentor** mode, Jarvis is a brutally honest accountability partner for its
owner — not a yes-man. It holds you to your **own** past commitments (pulled live
from Supabase each turn) instead of handing out generic motivation, and pushes
back on vague or over-ambitious plans.

- **Commitments** you state ("I'll onboard 5 GENOIS users by Friday") are parsed by the intent router and stored with a category (`genois` / `ms_prep` / `discipline`) and resolved due date.
- **Briefing** — "brief me" reads back overdue items first, then due-today, then the rest.
- **Startup confrontation** — if anything is overdue when Jarvis launches, the mentor opens by naming it and demanding an explanation (at most once per day; snooze with "stop confronting me").

All mentor features degrade gracefully to no-ops when Supabase isn't configured,
so Phases 1–2 keep working without keys.

---

## Scheduled automation (Phase 4)

Jarvis also acts on a **timer**, not just on command. A background scheduler
([APScheduler](https://apscheduler.readthedocs.io/)) runs jobs on their own
thread, so the voice/text loop keeps accepting input while they fire. Each job
**speaks** its output through the `mouth` so you hear it. It starts
automatically (in both voice and text mode) right after the startup
confrontation — nothing extra to launch.

### Jobs

| Job | When | What it does |
| --- | --- | --- |
| `morning_briefing` | `morning_briefing_time` | Speaks the daily accountability briefing (`mentor.daily_briefing()`). |
| `morning_apps` | `morning_apps_time` | Opens each app in `morning_apps` via `hands.open_app()`. |
| `work_nudge` | every `work_nudge_interval_hours` between `work_nudge_start` and `work_nudge_end` | Speaks a short, brutal "what did you ship in the last couple of hours?" nudge. |
| `evening_checkin` | `evening_checkin_time` | Asks what you shipped today and what tomorrow's plan is. |

### Configuration — `schedule.json`

Cadence lives in `schedule.json` next to `main.py`. It's created from a sane
default on first run, and is **gitignored** (it may hold personal times) — the
tracked `schedule.example.json` is the template. Times are 24-hour `"HH:MM"`.

```json
{
  "morning_briefing_time": "08:00",
  "morning_apps": ["chrome"],
  "morning_apps_time": "08:05",
  "work_nudge_interval_hours": 2,
  "work_nudge_start": "10:00",
  "work_nudge_end": "20:00",
  "evening_checkin_time": "21:00",
  "enabled": true
}
```

Set `"enabled": false` to start with the scheduler paused. Missing keys are
backfilled from the default, so a partial file won't break startup.

### Pause / resume by voice or text

You can turn the scheduler off and on mid-conversation; the new state is
persisted to `schedule.json`:

- **Pause** — say/type `pause schedule` (or `schedule band karo`).
- **Resume** — say/type `resume schedule` (or `schedule chalu karo`).

---

## Test the pieces individually

```powershell
python -m core.wake      # wait for the "hey jarvis" wake word
python -m core.ear       # record + transcribe one utterance
python -m core.mouth     # speak a test sentence
python -m core.brain     # route two sample prompts through the LLMs
python -m core.intent    # classify a batch of sample inputs (chat/action/mentor)
python -m core.hands     # run a couple of PC actions (opens notepad, etc.)
python -m core.scheduler # register the timed jobs and print their next run times
python -m core.mentor    # writes a sample commitment to Supabase, then prints a briefing
```

> `core.mentor` and any committed actions touch real state (Supabase / your PC) —
> run them deliberately.

---

## Project layout

```
jarvis/
  main.py                # main loop: wake -> listen -> classify -> act/think -> speak
  config.py              # loads API keys and settings from .env
  .env.example           # template for your keys
  requirements.txt       # pinned dependencies
  schedule.example.json  # template cadence for the Phase 4 scheduler
  core/
    wake.py          # wake-word detection (openWakeWord, "hey jarvis")
    ear.py           # speech-to-text (faster-whisper, CPU int8)
    mouth.py         # text-to-speech (edge-tts)
    brain.py         # LLM router (MiniMax M3 + Claude)
    intent.py        # per-turn classifier: chat / action / mentor
    hands.py         # PC control actions (Phase 2)
    mentor.py        # Supabase commitments/facts store (Phase 3)
    mentor_brain.py  # accountability-mentor LLM voice (Phase 3)
    scheduler.py     # timed background jobs (Phase 4)
    history.py       # persists conversation history
    profile.py       # tiny persistent profile (name, confrontation snooze)
  supabase/          # mentor table migrations
  README.md
```

---

## How routing works

Each turn goes through **two** stages:

1. **Intent** — `intent.classify()` asks a fast, cheap model (`INTENT_MODEL`) to label the turn as `action`, `mentor`, or `chat`, returning strict JSON. Any parse/API failure safely degrades to `chat`. Actions run via `hands.run()`; mentor turns go to `mentor_brain.mentor_reply()` (storing any parsed commitment first).
2. **Brain** — for a `chat` turn, `brain.think()` then routes to **Claude** when it looks like reasoning, planning, or advice (keyword cues such as *why / how / plan / suggest / kaise / kyun*, long inputs, or multi-sentence requests) and to **MiniMax M3** otherwise (greetings, short factual questions, small talk).

Conversation history is kept in a list and passed to the backends so context
carries across turns. A handful of quick commands (time, name, briefing, forget,
snooze, schedule pause/resume) are answered before either stage, with no LLM call.
