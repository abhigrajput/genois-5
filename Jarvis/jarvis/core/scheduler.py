"""Scheduled background automation for Jarvis (Phase 4).

Runs jobs on a timer in a background thread so Jarvis does things on its own —
not just when spoken to — while the voice/text loop keeps accepting input. Built
on top of the existing mentor (accountability), hands (PC control), and mouth
(TTS) modules: every job SPEAKS its output via mouth.speak so Abhishek hears it.

Jobs (all read their times from schedule.json):
  1. morning_briefing  -> speak mentor.daily_briefing()
  2. morning_apps      -> open each listed app via hands.open_app()
  3. work_nudge        -> every N hours in a window, speak a short brutal nudge
  4. evening_checkin   -> ask what he shipped today and tomorrow's plan

Design notes:
  - APScheduler's BackgroundScheduler runs jobs on its own thread pool, so the
    main input loop never blocks waiting on a job.
  - Every job body is wrapped in try/except: one failing job (a flaky Supabase
    read, a TTS hiccup) must never tear down the scheduler or the assistant.
  - schedule.json is created from a sane default on first run. It MAY hold
    personal cadence, so it is gitignored; schedule.example.json is tracked.
  - When "enabled" is false the scheduler is built but started paused, so
    "resume schedule" can switch it on without a restart.
"""

from __future__ import annotations

import json
import os

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from core import hands, mentor, mentor_brain, mouth

# schedule.json lives next to the jarvis package (core/ -> jarvis/), independent
# of the current working directory the app was launched from.
_CONFIG_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "schedule.json",
)

# The default cadence written to schedule.json on first run. Mirrors
# schedule.example.json so a fresh checkout behaves identically.
_DEFAULT_CONFIG = {
    "morning_briefing_time": "08:00",
    "morning_apps": ["chrome"],
    "morning_apps_time": "08:05",
    "work_nudge_interval_hours": 2,
    "work_nudge_start": "10:00",
    "work_nudge_end": "20:00",
    "evening_checkin_time": "21:00",
    "enabled": True,
}

# Module-level singletons so start/reload/pause/resume all act on one scheduler.
_scheduler: BackgroundScheduler | None = None
_speak: bool = True


def _load_config() -> dict:
    """Read schedule.json, creating it from the default if it's missing/broken.

    Missing keys are backfilled from _DEFAULT_CONFIG so an old or hand-edited
    file never crashes the scheduler with a KeyError.
    """
    if not os.path.exists(_CONFIG_PATH):
        _write_config(_DEFAULT_CONFIG)
        return dict(_DEFAULT_CONFIG)
    try:
        with open(_CONFIG_PATH, "r", encoding="utf-8") as fh:
            data = json.load(fh)
    except (OSError, ValueError) as exc:
        print(f"[scheduler] Couldn't read schedule.json ({exc}); using defaults.")
        return dict(_DEFAULT_CONFIG)
    # Backfill any missing keys so partial files still work.
    merged = dict(_DEFAULT_CONFIG)
    if isinstance(data, dict):
        merged.update(data)
    return merged


def _write_config(cfg: dict) -> None:
    """Persist `cfg` to schedule.json (best-effort; never raises)."""
    try:
        with open(_CONFIG_PATH, "w", encoding="utf-8") as fh:
            json.dump(cfg, fh, indent=2)
    except OSError as exc:
        print(f"[scheduler] Couldn't write schedule.json: {exc}")


def _set_enabled(enabled: bool) -> None:
    """Flip the 'enabled' flag in schedule.json without disturbing other keys."""
    cfg = _load_config()
    cfg["enabled"] = enabled
    _write_config(cfg)


def _parse_hhmm(value: str, default: str) -> tuple[int, int]:
    """Parse 'HH:MM' into (hour, minute); fall back to `default` on bad input."""
    for candidate in (value, default):
        try:
            hh, mm = str(candidate).strip().split(":")
            return int(hh), int(mm)
        except (ValueError, AttributeError):
            continue
    return 0, 0


def _say(text: str) -> None:
    """Print a scheduled message and speak it (when speaking is enabled)."""
    text = (text or "").strip()
    if not text:
        return
    print(f"\n[scheduler] Jarvis: {text}")
    if _speak:
        mouth.speak(text)


# --- Job bodies. Each is self-contained and swallows its own errors so a single
# bad run can never crash the BackgroundScheduler thread. ---------------------

def _job_morning_briefing() -> None:
    try:
        _say(mentor.daily_briefing())
    except Exception as exc:  # noqa: BLE001
        print(f"[scheduler] morning_briefing job failed: {exc}")


def _job_morning_apps(apps: list[str]) -> None:
    for app in apps:
        try:
            result = hands.open_app(app)
            print(f"[scheduler] morning_apps: {result}")
        except Exception as exc:  # noqa: BLE001
            print(f"[scheduler] morning_apps job failed for {app!r}: {exc}")


def _job_work_nudge() -> None:
    try:
        _say(mentor_brain.work_nudge())
    except Exception as exc:  # noqa: BLE001
        print(f"[scheduler] work_nudge job failed: {exc}")


def _job_evening_checkin() -> None:
    try:
        _say(mentor_brain.evening_checkin())
    except Exception as exc:  # noqa: BLE001
        print(f"[scheduler] evening_checkin job failed: {exc}")


def _schedule_jobs(scheduler: BackgroundScheduler, cfg: dict) -> None:
    """(Re)register all four jobs on `scheduler` from `cfg`.

    Removes any existing jobs first so a reload reflects edited times cleanly.
    Each add is guarded so one malformed time doesn't drop the other jobs.
    """
    scheduler.remove_all_jobs()

    # 1. Morning briefing — speak the daily accountability briefing.
    bh, bm = _parse_hhmm(cfg.get("morning_briefing_time"), "08:00")
    scheduler.add_job(
        _job_morning_briefing,
        CronTrigger(hour=bh, minute=bm),
        id="morning_briefing",
        replace_existing=True,
    )

    # 2. Morning apps — open each configured app.
    ah, am = _parse_hhmm(cfg.get("morning_apps_time"), "08:05")
    apps = cfg.get("morning_apps") or []
    scheduler.add_job(
        _job_morning_apps,
        CronTrigger(hour=ah, minute=am),
        id="morning_apps",
        kwargs={"apps": list(apps)},
        replace_existing=True,
    )

    # 3. Work nudge — every N hours within [start, end]. A cron hour range like
    #    "10-20/2" fires at 10,12,...,20, naturally respecting the window.
    interval = cfg.get("work_nudge_interval_hours") or 2
    try:
        interval = max(1, int(interval))
    except (TypeError, ValueError):
        interval = 2
    sh, sm = _parse_hhmm(cfg.get("work_nudge_start"), "10:00")
    eh, _em = _parse_hhmm(cfg.get("work_nudge_end"), "20:00")
    hour_expr = f"{sh}-{eh}/{interval}" if eh > sh else str(sh)
    scheduler.add_job(
        _job_work_nudge,
        CronTrigger(hour=hour_expr, minute=sm),
        id="work_nudge",
        replace_existing=True,
    )

    # 4. Evening check-in — what shipped today, plan for tomorrow.
    eh2, em2 = _parse_hhmm(cfg.get("evening_checkin_time"), "21:00")
    scheduler.add_job(
        _job_evening_checkin,
        CronTrigger(hour=eh2, minute=em2),
        id="evening_checkin",
        replace_existing=True,
    )


def start_scheduler(speak: bool = True) -> BackgroundScheduler:
    """Build, register, and start the background scheduler. Idempotent.

    Called once after Jarvis finishes its startup confrontation, in both voice
    and text mode. `speak` controls whether jobs are spoken aloud (False under
    --mute, where they still print). If schedule.json has "enabled": false the
    scheduler starts paused, so "resume schedule" can turn it on live.
    """
    global _scheduler, _speak
    _speak = speak

    if _scheduler is not None:
        return _scheduler

    cfg = _load_config()
    scheduler = BackgroundScheduler(daemon=True)
    _schedule_jobs(scheduler, cfg)
    scheduler.start()

    if not cfg.get("enabled", True):
        scheduler.pause()
        print("[scheduler] Built but paused (schedule.json enabled=false).")
    else:
        print("[scheduler] Running. Jobs:", ", ".join(j.id for j in scheduler.get_jobs()))

    _scheduler = scheduler
    return scheduler


def reload_schedule() -> None:
    """Re-read schedule.json and re-register all jobs with the new times."""
    if _scheduler is None:
        print("[scheduler] reload requested but scheduler isn't running yet.")
        return
    cfg = _load_config()
    _schedule_jobs(_scheduler, cfg)
    if cfg.get("enabled", True):
        _scheduler.resume()
    else:
        _scheduler.pause()
    print("[scheduler] Reloaded schedule.json.")


def pause_scheduler() -> None:
    """Stop firing jobs and persist enabled=false so it stays off on restart."""
    _set_enabled(False)
    if _scheduler is not None:
        _scheduler.pause()
    print("[scheduler] Paused.")


def resume_scheduler() -> None:
    """Resume firing jobs and persist enabled=true."""
    _set_enabled(True)
    if _scheduler is not None:
        _scheduler.resume()
    print("[scheduler] Resumed.")


def is_running() -> bool:
    """True if the scheduler exists and is actively firing jobs (not paused)."""
    return _scheduler is not None and _scheduler.running and bool(_scheduler.get_jobs())


if __name__ == "__main__":
    # Quick manual smoke test: python -m core.scheduler
    # Prints each job's next fire time, then exits without blocking.
    sched = start_scheduler(speak=False)
    for job in sched.get_jobs():
        print(f"  {job.id}: next run -> {job.next_run_time}")
    sched.shutdown(wait=False)
