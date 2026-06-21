"""Jarvis's 'hands' — actions that control the Windows PC.

Each public function does one thing (open an app, search the web, type, change
volume, take a screenshot) and returns a SHORT spoken confirmation string in
Hinglish that main.py speaks back. Nothing here is risky: no shutdown, no file
deletion, no messaging. Those come in a later phase behind confirmation prompts.

`run(function, args)` is the single dispatch entry point intent.py / main.py
use, so the LLM's chosen function name is validated against a whitelist before
anything executes.
"""

import os
import subprocess
import webbrowser
from datetime import datetime

# pyautogui imports a screenshot/GUI stack that can be slow and, on a headless
# box, can fail at import. Import it lazily inside the functions that need it so
# simply importing `hands` (e.g. for open_app/web_search) never pays that cost
# or crashes.

# Where screenshots land, next to the jarvis package regardless of CWD.
_SCREENSHOT_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "screenshots",
)

# Friendly app name -> the token `start` resolves (via PATH or the registry's
# App Paths). Aliases included so the LLM can say "calc" or "files".
_APPS = {
    "chrome": "chrome",
    "browser": "chrome",
    "notepad": "notepad",
    "calculator": "calc",
    "calc": "calc",
    "vscode": "code",
    "code": "code",
    "explorer": "explorer",
    "files": "explorer",
    "spotify": "spotify",
}


def open_app(name: str) -> str:
    """Launch a known desktop app by friendly name."""
    key = (name or "").strip().lower()
    target = _APPS.get(key)
    if not target:
        known = ", ".join(sorted(set(_APPS)))
        return f"Mujhe '{name}' app nahi pata. Main {known} khol sakta hoon."

    try:
        # `start "" <target>` lets Windows resolve browsers/Store apps the same
        # way the Run dialog does. The empty "" is the (ignored) window title,
        # which `start` otherwise steals from a quoted first argument.
        subprocess.Popen(["cmd", "/c", "start", "", target], shell=False)
    except OSError as exc:
        print(f"[hands] open_app({name!r}) failed: {exc}")
        return f"Sorry, main {name} khol nahi paaya."
    return f"{name.capitalize()} khol diya."


def web_search(query: str) -> str:
    """Open the default browser on a Google search for `query`."""
    query = (query or "").strip()
    if not query:
        return "Kya search karoon? Mujhe query nahi mili."
    from urllib.parse import quote_plus

    webbrowser.open(f"https://www.google.com/search?q={quote_plus(query)}")
    return f"'{query}' search kar diya."


def play_youtube(query: str) -> str:
    """Search YouTube for `query` and play the first result in the browser."""
    query = (query or "").strip()
    if not query:
        return "Kya play karoon? Mujhe naam nahi mila."
    try:
        import pywhatkit

        # log=False keeps pywhatkit from printing its own banner to the console.
        pywhatkit.playonyt(query)
    except Exception as exc:  # noqa: BLE001 - pywhatkit raises broadly; just fall back
        print(f"[hands] play_youtube({query!r}) failed: {exc}")
        # Fall back to a plain YouTube search so the user still gets results.
        from urllib.parse import quote_plus

        webbrowser.open(
            f"https://www.youtube.com/results?search_query={quote_plus(query)}"
        )
    return f"YouTube par '{query}' chala diya."


def type_text(text: str) -> str:
    """Type `text` at the current cursor position."""
    text = text or ""
    if not text:
        return "Kya type karoon? Mujhe text nahi mila."
    try:
        import pyautogui

        pyautogui.write(text, interval=0.02)
    except Exception as exc:  # noqa: BLE001 - GUI backend can fail; surface it
        print(f"[hands] type_text failed: {exc}")
        return "Sorry, main type nahi kar paaya."
    return "Type kar diya."


def set_volume(direction: str) -> str:
    """Change the system volume: 'up', 'down', or 'mute'."""
    direction = (direction or "").strip().lower()
    try:
        import pyautogui

        if direction in ("up", "increase", "louder"):
            pyautogui.press("volumeup", presses=5)
            return "Volume badha diya."
        if direction in ("down", "decrease", "lower", "quieter"):
            pyautogui.press("volumedown", presses=5)
            return "Volume kam kar diya."
        if direction in ("mute", "unmute", "silent"):
            pyautogui.press("volumemute")
            return "Volume mute toggle kar diya."
    except Exception as exc:  # noqa: BLE001 - key send can fail; surface it
        print(f"[hands] set_volume({direction!r}) failed: {exc}")
        return "Sorry, volume change nahi ho paaya."
    return "Volume up, down, ya mute — inme se ek boliye."


def take_screenshot() -> str:
    """Save a screenshot to screenshots/ with a timestamped filename."""
    try:
        import pyautogui

        os.makedirs(_SCREENSHOT_DIR, exist_ok=True)
        stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        path = os.path.join(_SCREENSHOT_DIR, f"screenshot_{stamp}.png")
        pyautogui.screenshot(path)
    except Exception as exc:  # noqa: BLE001 - screen grab can fail; surface it
        print(f"[hands] take_screenshot failed: {exc}")
        return "Sorry, screenshot nahi le paaya."
    print(f"[hands] Screenshot saved: {path}")
    return "Screenshot le liya."


# function name -> callable. Also the whitelist `run()` validates against, so
# only these can ever be invoked from a model-produced intent.
_DISPATCH = {
    "open_app": open_app,
    "web_search": web_search,
    "play_youtube": play_youtube,
    "type_text": type_text,
    "set_volume": set_volume,
    "take_screenshot": take_screenshot,
}

# Each action's expected argument name (None = takes no args). Used to pull the
# single argument out of the intent's `args` dict by position-independent name.
_ARG_NAMES = {
    "open_app": "name",
    "web_search": "query",
    "play_youtube": "query",
    "type_text": "text",
    "set_volume": "direction",
    "take_screenshot": None,
}


def run(function: str, args: dict | None = None) -> str:
    """Dispatch a validated action and return its spoken confirmation.

    `function` must be one of the whitelisted names; `args` is the dict from the
    intent JSON. Unknown functions or bad arguments fall back to a safe message
    instead of raising, so a stray LLM response can never crash the assistant.
    """
    func = _DISPATCH.get(function)
    if func is None:
        print(f"[hands] Unknown action: {function!r}")
        return "Sorry, ye kaam main abhi nahi kar sakta."

    args = args or {}
    arg_name = _ARG_NAMES.get(function)
    try:
        if arg_name is None:
            return func()
        # Be forgiving about the exact key the model used.
        value = args.get(arg_name)
        if value is None and len(args) == 1:
            value = next(iter(args.values()))
        return func(value)
    except Exception as exc:  # noqa: BLE001 - last-resort guard around any action
        print(f"[hands] run({function!r}, {args!r}) crashed: {exc}")
        return "Sorry, kuch gadbad ho gayi."


if __name__ == "__main__":
    # Quick manual test: python -m core.hands
    print(run("open_app", {"name": "notepad"}))
    print(run("web_search", {"query": "weather in Bangalore"}))
    print(run("take_screenshot", {}))
