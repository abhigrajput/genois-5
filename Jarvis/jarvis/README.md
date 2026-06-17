# Jarvis — Voice Assistant (Foundation)

A wake-word voice assistant for Windows. **Voice in → AI → voice out.**

- **Wake** — wake-word detection with [openWakeWord](https://github.com/dscripka/openWakeWord) using the bundled pre-trained **"hey jarvis"** model. No API key, runs on CPU.
- **Ear** — speech-to-text with [faster-whisper](https://github.com/SYSTRAN/faster-whisper) (`medium` model, CUDA if available else CPU). Auto-detects Hindi / English / Hinglish.
- **Mouth** — text-to-speech with [edge-tts](https://github.com/rany2/edge-tts) using the `hi-IN-SwaraNeural` voice (female, Indian).
- **Brain** — a router with two backends:
  - **MiniMax M3** (served via [NVIDIA NIM](https://build.nvidia.com)) for fast, simple replies (chit-chat, short factual questions).
  - **Claude (`claude-opus-4-8`)** for complex reasoning, advice, planning, and mentoring.

> Scope: this is the foundation only. No PC control, memory, or phone integration yet.

---

## Requirements

- **Windows** with a working microphone and speakers.
- **Python 3.11**.
- API keys for **Anthropic (Claude)** and **NVIDIA** (the `nvapi-` key that serves MiniMax M3 via NVIDIA NIM).
- Optional but recommended: an **NVIDIA GPU with CUDA** for faster transcription. Without it, Whisper runs on CPU (slower but works).

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

**GPU note:** `faster-whisper` needs CUDA + cuDNN libraries on `PATH` to use the GPU. If they aren't present, Jarvis automatically falls back to CPU — no action needed. To use the GPU, install the [NVIDIA CUDA 12 / cuDNN 9 runtime](https://github.com/SYSTRAN/faster-whisper#gpu).

### 3. Configure API keys

```powershell
copy .env.example .env
```

Then open `.env` and fill in:

- `ANTHROPIC_API_KEY` — your Claude API key.
- `MINIMAX_API_KEY` — your NVIDIA API key (`nvapi-…`), which serves MiniMax M3 via NVIDIA NIM.
- `MINIMAX_BASE_URL` — the NVIDIA NIM OpenAI-compatible endpoint (default already set).
- `MINIMAX_MODEL` — the model id served by that endpoint (default `minimaxai/minimax-m3`).
- `MINIMAX_GROUP_ID` — only needed by MiniMax's own API; leave blank for NVIDIA NIM.

The first run downloads the Whisper `medium` model (~1.5 GB) — this is a one-time download.

---

## Run

```powershell
python main.py
```

Then:

1. Say **"hey jarvis"** to start talking.
2. Speak your request — recording stops automatically after ~2 seconds of silence.
3. Jarvis transcribes, thinks, and speaks the reply.
4. Repeat (say "hey jarvis" again). Press **Ctrl+C** to quit.

> The first run downloads the small openWakeWord models (a few MB) — a one-time download.
> Tune `THRESHOLD` in `core/wake.py` if you get false triggers (raise it) or missed wake words (lower it).

### Text mode (no microphone)

To test the brain/routing without a mic — skipping wake-word and Whisper entirely:

```powershell
python main.py --text          # type input, replies are spoken and printed
python main.py --text --mute   # type input, replies printed only (no audio)
```

Type your message at the `You:` prompt. Enter `quit` or `exit` (or press **Ctrl+C**)
to leave. `--text` never loads the Whisper model, so it starts instantly.

---

## Test the pieces individually

```powershell
python -m core.wake     # wait for the "hey jarvis" wake word
python -m core.ear      # record + transcribe one utterance
python -m core.mouth    # speak a test sentence
python -m core.brain    # route two sample prompts through the LLMs
```

---

## Project layout

```
jarvis/
  main.py            # wake-word loop: "hey jarvis" -> listen -> think -> speak
  config.py          # loads API keys from .env
  .env.example       # template for your keys
  requirements.txt   # pinned dependencies
  core/
    wake.py          # wake-word detection (openWakeWord, "hey jarvis")
    ear.py           # speech-to-text (faster-whisper)
    mouth.py         # text-to-speech (edge-tts)
    brain.py         # LLM router (MiniMax M3 + Claude)
  README.md
```

---

## How routing works

`brain.think()` sends a turn to **Claude** when it looks like reasoning,
planning, advice, or mentoring (keyword cues such as *why / how / plan /
suggest / kaise / kyun*, long inputs, or multi-sentence requests). Everything
else — greetings, short factual questions, small talk — goes to **MiniMax M3**
for a fast reply. Conversation history is kept in a list and passed to both
backends so context carries across turns.
