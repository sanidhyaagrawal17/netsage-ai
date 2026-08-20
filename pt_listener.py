"""NetSage AI - Live Cisco Packet Tracer Clipboard Listener (Track A).

Monitors OS clipboard for Cisco IOS CLI output copied from Packet Tracer or terminal
sessions, validates network keywords, and atomically writes to live_cli_input.txt.
"""

from __future__ import annotations

import datetime
import os
import re
import sys
import time
from pathlib import Path

# Safe encoding for Windows consoles
if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

try:
    import pyperclip
except ImportError:
    pyperclip = None

BASE_DIR = Path(__file__).resolve().parent
LIVE_INPUT_FILE = BASE_DIR / "live_cli_input.txt"
POLL_INTERVAL_SEC = 0.8

CISCO_KEYWORDS = [
    r"\bshow\b",
    r"\binterface\b",
    r"\bip\b",
    r"\bvlan\b",
    r"\brouter\b",
    r"\bswitch\b",
    r"\baccess-list\b",
    r"\bgigabitethernet\b",
    r"\bfastethernet\b",
    r"\bospf\b",
    r"\bdhcp\b",
    r"\bnat\b",
    r"\bstandby\b",
    r"\bntp\b",
    r"\bspanning-tree\b",
    r"\betherchannel\b",
    r"\bipconfig\b",
    r"\bline protocol\b",
    r"\badministratively down\b",
    r"%",
    r"#",
    r">",
]

COMPILED_KEYWORDS = [re.compile(kw, re.IGNORECASE) for kw in CISCO_KEYWORDS]


def is_cisco_cli_content(text: str) -> bool:
    """Check if clipboard text matches Cisco IOS / Packet Tracer CLI patterns."""
    if not text or len(text.strip()) < 10:
        return False

    matches = 0
    for pattern in COMPILED_KEYWORDS:
        if pattern.search(text):
            matches += 1
            if matches >= 2:
                return True
    return False


def get_clipboard_text() -> str:
    """Safely fetch clipboard content via pyperclip or ctypes fallback."""
    if pyperclip is not None:
        try:
            return pyperclip.paste()
        except Exception:
            pass

    if sys.platform == "win32":
        try:
            import ctypes
            import ctypes.wintypes
            OpenClipboard = ctypes.windll.user32.OpenClipboard
            GetClipboardData = ctypes.windll.user32.GetClipboardData
            CloseClipboard = ctypes.windll.user32.CloseClipboard
            CF_UNICODETEXT = 13
            if OpenClipboard(None):
                h_data = GetClipboardData(CF_UNICODETEXT)
                if h_data:
                    data_ptr = ctypes.windll.kernel32.GlobalLock(h_data)
                    text = ctypes.c_wchar_p(data_ptr).value
                    ctypes.windll.kernel32.GlobalUnlock(h_data)
                    CloseClipboard()
                    return text or ""
                CloseClipboard()
        except Exception:
            pass

    return ""


def write_live_cli_input(cli_text: str) -> None:
    """Atomically write captured CLI text to live_cli_input.txt."""
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    header = f"# NetSage AI - Live Packet Tracer Capture [{timestamp}]\n\n"
    full_content = header + cli_text.strip() + "\n"

    temp_file = BASE_DIR / "live_cli_input.tmp"
    with open(temp_file, "w", encoding="utf-8") as f:
        f.write(full_content)
        f.flush()
        os.fsync(f.fileno())

    os.replace(temp_file, LIVE_INPUT_FILE)


def run_listener() -> None:
    """Start background polling loop for Packet Tracer clipboard capture."""
    print("=================================================================")
    print("[NETSAGE AI] Packet Tracer Live Clipboard Listener (Track A)")
    print(f"Target Output : {LIVE_INPUT_FILE}")
    print(f"Poll Interval : {POLL_INTERVAL_SEC}s")
    print("=================================================================")
    print("-> Copy any Cisco show-command or ipconfig output from Packet Tracer...")
    print("   Press Ctrl+C to stop.\n")

    last_captured = ""

    while True:
        try:
            current_clipboard = get_clipboard_text().strip()

            if current_clipboard and current_clipboard != last_captured:
                if is_cisco_cli_content(current_clipboard):
                    last_captured = current_clipboard
                    write_live_cli_input(current_clipboard)
                    now_str = datetime.datetime.now().strftime("%H:%M:%S")
                    line_count = len(current_clipboard.splitlines())
                    char_count = len(current_clipboard)
                    preview = current_clipboard.splitlines()[0][:60]
                    print(f"[{now_str}] [CAPTURED] ({line_count} lines, {char_count} chars): {preview}...")
            
            time.sleep(POLL_INTERVAL_SEC)

        except KeyboardInterrupt:
            print("\n[INFO] Listener stopped by user.")
            break
        except Exception as e:
            print(f"[WARN] Polling error: {e}")
            time.sleep(1.0)


if __name__ == "__main__":
    run_listener()
