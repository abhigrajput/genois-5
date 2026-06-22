"""Telegram phone integration for Jarvis (Phase 5).

A two-way bridge between Jarvis and your phone via a Telegram bot:
  - Inbound:  messages you DM the bot are routed through the SAME quick-command /
              intent / brain / mentor / hands pipeline as a local turn, and the
              reply is sent back to your phone.
  - Outbound: the Phase 4 scheduler's briefings and nudges are delivered to your
              phone (in addition to being spoken on the PC).

Built on pyTelegramBotAPI (telebot) with long-polling on a background thread, so
it needs NO public URL or webhook — it works behind any home network. Everything
here degrades to a safe no-op when TELEGRAM_BOT_TOKEN is unset, so Phases 1-4
keep working without a bot. Nothing raises out of this module: a flaky network
or Telegram outage must never crash the assistant or the scheduler.

Security: only messages from the configured TELEGRAM_CHAT_ID (you) are acted on.
Anything from another chat is refused, and the sender's chat id is logged so you
can copy your own id into .env the first time you message the bot.
"""

from __future__ import annotations

import threading
from typing import Callable

import config

# Lazily-built telebot.TeleBot, cached after first use. None until built (or if
# the SDK import / token is missing). _bot_ready guards against rebuilding on
# every send when it's unconfigured.
_bot = None
_bot_ready = False
_poll_thread: threading.Thread | None = None


def _get_bot():
    """Return a cached TeleBot, or None if Telegram is unconfigured/unavailable."""
    global _bot, _bot_ready
    if _bot_ready:
        return _bot

    _bot_ready = True  # only attempt the build once
    if not config.telegram_enabled():
        print("[phone] Telegram not configured; phone integration disabled.")
        return None
    try:
        import telebot

        # threaded=False: process updates sequentially. A turn can take a few
        # seconds (LLM call); we'd rather queue messages than fan out worker
        # threads that race on the shared history.
        _bot = telebot.TeleBot(config.TELEGRAM_BOT_TOKEN, threaded=False)
    except Exception as exc:  # noqa: BLE001 - never let bot setup crash the app
        print(f"[phone] Could not initialize Telegram bot: {exc}")
        _bot = None
    return _bot


def _authorized(chat_id) -> bool:
    """True only for the configured owner chat id."""
    owner = str(config.TELEGRAM_CHAT_ID).strip()
    return bool(owner) and str(chat_id) == owner


def send(text: str) -> None:
    """Send `text` to the owner's phone. Best-effort; never raises.

    No-op if Telegram isn't configured or TELEGRAM_CHAT_ID is unset (we don't
    know where to send). Used by the scheduler for outbound briefings/nudges.
    """
    text = (text or "").strip()
    if not text:
        return
    bot = _get_bot()
    if bot is None or not str(config.TELEGRAM_CHAT_ID).strip():
        return
    try:
        bot.send_message(config.TELEGRAM_CHAT_ID, text)
    except Exception as exc:  # noqa: BLE001 - outbound must never crash a job
        print(f"[phone] send failed: {exc}")


def start_phone(handle_message: Callable[[str], str]) -> bool:
    """Start Telegram long-polling on a daemon thread. Idempotent.

    `handle_message(text) -> str` produces Jarvis's reply for one inbound message
    (the local loops pass a closure over the shared history). Only the owner chat
    is served; other senders are refused and their chat id logged for onboarding.
    Returns True if polling started, False if Telegram is off/already running.
    """
    global _poll_thread
    bot = _get_bot()
    if bot is None:
        return False
    if _poll_thread is not None:
        return False

    @bot.message_handler(func=lambda m: True, content_types=["text"])
    def _on_message(message):  # noqa: ANN001 - telebot Message
        chat_id = message.chat.id
        text = (message.text or "").strip()

        if not _authorized(chat_id):
            print(
                f"[phone] Refused message from unauthorized chat id {chat_id}. "
                f"Set TELEGRAM_CHAT_ID={chat_id} in .env to authorize yourself."
            )
            try:
                bot.send_message(
                    chat_id,
                    f"Not authorized. Your chat id is {chat_id} — set "
                    f"TELEGRAM_CHAT_ID to this in Jarvis's .env to enable.",
                )
            except Exception:  # noqa: BLE001
                pass
            return

        if not text:
            return
        print(f"[phone] Inbound: {text!r}")
        try:
            reply = handle_message(text) or ""
        except Exception as exc:  # noqa: BLE001 - a bad turn must not kill polling
            print(f"[phone] handler crashed: {exc}")
            reply = "Sorry, kuch gadbad ho gayi."
        if reply:
            try:
                bot.send_message(chat_id, reply)
            except Exception as exc:  # noqa: BLE001
                print(f"[phone] reply send failed: {exc}")

    def _poll() -> None:
        print("[phone] Telegram bot polling started — DM your bot to talk to Jarvis.")
        try:
            # non_stop keeps polling alive across transient network errors.
            bot.infinity_polling(timeout=20, long_polling_timeout=20)
        except Exception as exc:  # noqa: BLE001
            print(f"[phone] polling stopped: {exc}")

    _poll_thread = threading.Thread(target=_poll, name="telegram-poll", daemon=True)
    _poll_thread.start()
    return True


def phone_enabled() -> bool:
    """True if the Telegram bot is configured and built successfully."""
    return _get_bot() is not None


if __name__ == "__main__":
    # Quick manual smoke test: python -m core.phone
    # Echoes inbound messages; sends a hello if TELEGRAM_CHAT_ID is set.
    print("telegram_enabled:", config.telegram_enabled())
    if start_phone(lambda t: f"echo: {t}"):
        send("Jarvis phone bridge online (test).")
        print("Polling... press Ctrl+C to stop.")
        try:
            threading.Event().wait()
        except KeyboardInterrupt:
            print("\nStopped.")
