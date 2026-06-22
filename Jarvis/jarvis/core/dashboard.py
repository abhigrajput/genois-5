"""Local web dashboard for Jarvis (Phase 6).

A tiny Flask control panel served on http://127.0.0.1:5000 so you can talk to
Jarvis, see your open commitments, and pause/resume the background scheduler from
a browser — without a mic. It's bound to localhost ONLY (never the network) and
needs no new accounts, tokens, or external CDNs.

Design notes:
  - Runs on a background daemon thread (start_dashboard), same pattern as the
    Phase 4 scheduler, so it never blocks the voice/text input loop.
  - To avoid a circular import (main imports core, core can't import main), the
    shared respond() and the live history list are PASSED IN by main.py rather
    than imported. Chat turns therefore share the exact same conversation as the
    voice/text/phone loops.
  - Every route swallows its own errors and returns JSON so a flaky Supabase read
    or a model hiccup shows up in the panel instead of crashing the server thread.
  - The HTML is a single inline string (CSS + JS, no external assets) so the
    panel works fully offline.
"""

from __future__ import annotations

import logging
import threading

from flask import Flask, jsonify, request

import config
from core import mentor, scheduler

# Module-level singletons so start_dashboard is idempotent (one server, one
# thread) and the routes can reach the respond function + shared history.
_app: Flask | None = None
_thread: threading.Thread | None = None
_respond_fn = None
_history: list[dict] | None = None


def _build_app() -> Flask:
    """Create the Flask app and register every route."""
    app = Flask(__name__)

    @app.route("/", methods=["GET"])
    def index():
        return _PAGE

    @app.route("/api/status", methods=["GET"])
    def api_status():
        """Scheduler/mentor state plus today's open & overdue commitment counts."""
        open_count = overdue_count = 0
        try:
            open_count = len(mentor.get_open_commitments())
            overdue_count = len(mentor.get_overdue_commitments())
        except Exception as exc:  # noqa: BLE001 - never let a read crash the panel
            print(f"[dashboard] status counts failed: {exc}")
        return jsonify(
            {
                "scheduler_running": scheduler.is_running(),
                "mentor_enabled": config.mentor_enabled(),
                "open_count": open_count,
                "overdue_count": overdue_count,
            }
        )

    @app.route("/api/commitments", methods=["GET"])
    def api_commitments():
        """All open commitments (the panel groups + flags overdue client-side)."""
        try:
            items = mentor.get_open_commitments()
        except Exception as exc:  # noqa: BLE001
            print(f"[dashboard] commitments fetch failed: {exc}")
            items = []
        return jsonify({"commitments": items})

    @app.route("/api/chat", methods=["POST"])
    def api_chat():
        """Route a typed message through the SAME respond()/history as voice."""
        data = request.get_json(silent=True) or {}
        message = (data.get("message") or "").strip()
        if not message:
            return jsonify({"reply": ""})
        if _respond_fn is None or _history is None:
            return jsonify({"reply": "Dashboard isn't wired to the brain yet."}), 503
        try:
            reply = _respond_fn(message, _history)
        except Exception as exc:  # noqa: BLE001 - surface the error, don't 500 hard
            print(f"[dashboard] chat failed: {exc}")
            return jsonify({"reply": f"(error: {exc})"}), 500
        return jsonify({"reply": reply})

    @app.route("/api/schedule/pause", methods=["POST"])
    def api_schedule_pause():
        scheduler.pause_scheduler()
        return jsonify({"scheduler_running": scheduler.is_running()})

    @app.route("/api/schedule/resume", methods=["POST"])
    def api_schedule_resume():
        scheduler.resume_scheduler()
        return jsonify({"scheduler_running": scheduler.is_running()})

    return app


def start_dashboard(respond_fn, history: list[dict]):
    """Start the dashboard on a background daemon thread. Idempotent.

    `respond_fn` is main.respond and `history` is the live conversation list, both
    passed in to dodge a circular import and so the panel shares one conversation
    with the voice/text/phone loops. No-op (returns None) when DASHBOARD_ENABLED is
    false. Returns the dashboard URL on success.
    """
    global _app, _thread, _respond_fn, _history

    if not config.DASHBOARD_ENABLED:
        print("[dashboard] Disabled (DASHBOARD_ENABLED=false).")
        return None

    url = f"http://{config.DASHBOARD_HOST}:{config.DASHBOARD_PORT}"

    if _thread is not None:
        return url

    _respond_fn = respond_fn
    _history = history
    _app = _build_app()

    # Quiet Flask's dev-server request logging so it doesn't spam the console the
    # voice/text loop shares; warnings/errors still get through.
    logging.getLogger("werkzeug").setLevel(logging.WARNING)

    def _serve() -> None:
        try:
            # use_reloader=False: the reloader forks a second process and only
            # works on the main thread — both break a backgrounded server.
            _app.run(
                host=config.DASHBOARD_HOST,
                port=config.DASHBOARD_PORT,
                debug=False,
                use_reloader=False,
                threaded=True,
            )
        except Exception as exc:  # noqa: BLE001 - a bind failure must not crash Jarvis
            print(f"[dashboard] Server thread stopped: {exc}")

    _thread = threading.Thread(target=_serve, name="jarvis-dashboard", daemon=True)
    _thread.start()
    print(f"[dashboard] Running at {url}")
    return url


# --- The single-file dashboard page (inline CSS + JS, no external CDNs). -------

_PAGE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>JARVIS</title>
<style>
  :root {
    --bg: #0b0d11; --panel: #14181f; --panel2: #1b212b; --line: #262d39;
    --text: #e6e9ef; --muted: #8b93a3; --accent: #4f9cff; --ok: #3ad29f;
    --bad: #ff5d5d; --warn: #ffb454;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--bg); color: var(--text);
    font: 14px/1.5 -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }
  header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 24px; border-bottom: 1px solid var(--line); background: var(--panel);
  }
  header h1 { margin: 0; font-size: 20px; letter-spacing: 4px; font-weight: 700; }
  header .sub { color: var(--muted); font-size: 12px; letter-spacing: 1px; }
  .status {
    display: flex; gap: 10px; flex-wrap: wrap; padding: 14px 24px;
    border-bottom: 1px solid var(--line); background: var(--panel2);
  }
  .pill {
    display: inline-flex; align-items: center; gap: 7px; padding: 5px 12px;
    border: 1px solid var(--line); border-radius: 999px; background: var(--panel);
    font-size: 12px; color: var(--muted);
  }
  .pill b { color: var(--text); font-weight: 600; }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--muted); }
  .dot.on { background: var(--ok); } .dot.off { background: var(--bad); }
  .pill.overdue b { color: var(--bad); }
  main { display: grid; grid-template-columns: 360px 1fr; gap: 20px; padding: 20px 24px; }
  @media (max-width: 820px) { main { grid-template-columns: 1fr; } }
  .card {
    background: var(--panel); border: 1px solid var(--line); border-radius: 12px;
    padding: 16px; display: flex; flex-direction: column; min-height: 0;
  }
  .card h2 {
    margin: 0 0 12px; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px;
    color: var(--muted); font-weight: 600;
  }
  .controls { display: flex; gap: 8px; margin-bottom: 14px; }
  button {
    cursor: pointer; border: 1px solid var(--line); background: var(--panel2);
    color: var(--text); padding: 8px 14px; border-radius: 8px; font-size: 13px;
  }
  button:hover { border-color: var(--accent); }
  button.primary { background: var(--accent); border-color: var(--accent); color: #061018; font-weight: 600; }
  .group-label {
    margin: 12px 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;
    color: var(--muted);
  }
  .commit {
    border: 1px solid var(--line); border-left: 3px solid var(--accent);
    border-radius: 8px; padding: 9px 11px; margin-bottom: 8px; background: var(--panel2);
  }
  .commit.overdue { border-left-color: var(--bad); }
  .commit .desc { font-size: 13px; }
  .commit .due { font-size: 11px; color: var(--muted); margin-top: 3px; }
  .commit.overdue .due { color: var(--bad); }
  .empty { color: var(--muted); font-size: 13px; padding: 8px 0; }
  .chat { grid-column: span 1; }
  #log {
    flex: 1; overflow-y: auto; min-height: 320px; max-height: 56vh;
    display: flex; flex-direction: column; gap: 10px; padding-right: 4px;
  }
  .msg { max-width: 80%; padding: 9px 12px; border-radius: 12px; white-space: pre-wrap; word-wrap: break-word; }
  .msg.you { align-self: flex-end; background: var(--accent); color: #061018; }
  .msg.jarvis { align-self: flex-start; background: var(--panel2); border: 1px solid var(--line); }
  .msg.sys { align-self: center; color: var(--muted); font-size: 12px; background: none; }
  .composer { display: flex; gap: 8px; margin-top: 12px; }
  #input { flex: 1; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--line);
           background: var(--panel2); color: var(--text); font-size: 14px; }
  #input:focus { outline: none; border-color: var(--accent); }
</style>
</head>
<body>
<header>
  <div><h1>JARVIS</h1></div>
  <div class="sub">LOCAL CONTROL PANEL · 127.0.0.1</div>
</header>

<div class="status" id="status">
  <span class="pill"><span class="dot" id="dot-sched"></span> Scheduler <b id="st-sched">…</b></span>
  <span class="pill"><span class="dot" id="dot-mentor"></span> Mentor <b id="st-mentor">…</b></span>
  <span class="pill">Open <b id="st-open">…</b></span>
  <span class="pill overdue">Overdue <b id="st-overdue">…</b></span>
</div>

<main>
  <section class="card">
    <h2>Commitments</h2>
    <div class="controls">
      <button onclick="schedule('pause')">Pause Schedule</button>
      <button onclick="schedule('resume')">Resume Schedule</button>
    </div>
    <div id="commits"><div class="empty">Loading…</div></div>
  </section>

  <section class="card chat">
    <h2>Chat</h2>
    <div id="log"></div>
    <div class="composer">
      <input id="input" placeholder="Talk to Jarvis…" autocomplete="off">
      <button class="primary" onclick="send()">Send</button>
    </div>
  </section>
</main>

<script>
const CATS = {
  genois: "GENOIS",
  ms_prep: "MS prep",
  discipline: "Discipline",
};
const todayISO = () => new Date().toISOString().slice(0, 10);

async function refreshStatus() {
  try {
    const r = await fetch("/api/status");
    const s = await r.json();
    setPill("sched", s.scheduler_running, s.scheduler_running ? "ON" : "OFF");
    setPill("mentor", s.mentor_enabled, s.mentor_enabled ? "ON" : "OFF");
    document.getElementById("st-open").textContent = s.open_count;
    document.getElementById("st-overdue").textContent = s.overdue_count;
  } catch (e) { /* leave last-known values on a hiccup */ }
}

function setPill(key, on, label) {
  document.getElementById("st-" + key).textContent = label;
  const dot = document.getElementById("dot-" + key);
  dot.className = "dot " + (on ? "on" : "off");
}

async function refreshCommitments() {
  let items = [];
  try {
    const r = await fetch("/api/commitments");
    items = (await r.json()).commitments || [];
  } catch (e) { return; }
  const box = document.getElementById("commits");
  if (!items.length) {
    box.innerHTML = '<div class="empty">No open commitments.</div>';
    return;
  }
  const today = todayISO();
  const order = ["genois", "ms_prep", "discipline"];
  const groups = {};
  for (const it of items) {
    const cat = order.includes(it.category) ? it.category : "discipline";
    (groups[cat] = groups[cat] || []).push(it);
  }
  let html = "";
  for (const cat of order) {
    const list = groups[cat];
    if (!list || !list.length) continue;
    html += '<div class="group-label">' + (CATS[cat] || cat) + "</div>";
    for (const it of list) {
      const overdue = it.due_date && it.due_date < today;
      html += '<div class="commit' + (overdue ? " overdue" : "") + '">';
      html += '<div class="desc">' + esc(it.description || "(no description)") + "</div>";
      if (it.due_date) {
        html += '<div class="due">' + (overdue ? "OVERDUE · " : "due ") + esc(it.due_date) + "</div>";
      }
      html += "</div>";
    }
  }
  box.innerHTML = html;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function addMsg(text, cls) {
  const log = document.getElementById("log");
  const div = document.createElement("div");
  div.className = "msg " + cls;
  div.textContent = text;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
  return div;
}

async function send() {
  const input = document.getElementById("input");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  addMsg(text, "you");
  const pending = addMsg("…", "jarvis");
  try {
    const r = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
    const data = await r.json();
    pending.textContent = data.reply || "(no reply)";
  } catch (e) {
    pending.textContent = "(network error)";
  }
  document.getElementById("log").scrollTop = 1e9;
  refreshStatus();
  refreshCommitments();
}

async function schedule(action) {
  try {
    await fetch("/api/schedule/" + action, { method: "POST" });
  } catch (e) {}
  addMsg("Schedule " + action + "d.", "sys");
  refreshStatus();
}

document.getElementById("input").addEventListener("keydown", e => {
  if (e.key === "Enter") { e.preventDefault(); send(); }
});

refreshStatus();
refreshCommitments();
setInterval(refreshStatus, 10000);
setInterval(refreshCommitments, 30000);
</script>
</body>
</html>"""
