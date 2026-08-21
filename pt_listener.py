"""NetSage AI - Live Cisco Packet Tracer CLI Clipboard Listener (Track A).

Continuously monitors the system clipboard exclusively for active Cisco Packet Tracer
CLI terminal text and IOS show-command outputs. Atomically feeds live_cli_input.txt.
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
POLL_INTERVAL_SEC = 0.6

# Cisco IOS Prompts: SW1#, Router0>, Core(config)#, HostA:~$
CISCO_PROMPT_PATTERN = re.compile(r"^[A-Za-z0-9_\-\.]{1,24}(\([A-Za-z0-9_\-]+\))?[#>]\s*", re.MULTILINE)

# Cisco CLI Commands & Syslog patterns
CISCO_SIGNATURES = [
    r"\bshow\s+(ip|interfaces|running-config|vlan|access-lists|mac|spanning-tree|version|route|standby|ntp|dhcp|etherchannel)",
    r"\binterface\s+(GigabitEthernet|FastEthernet|Ethernet|Serial|Vlan|Port-channel|Loopback)",
    r"\bip\s+(address|route|access-group|helper-address|nat|ospf|dhcp)",
    r"\bswitchport\s+(mode|access|trunk|nonegotiate)",
    r"\b(administratively down|line protocol is|Internet address is|MTU \d+ bytes)",
    r"\b(FastEthernet|GigabitEthernet)\d+(/\d+)*",
    r"\b(Ethernet0|Serial0|Vlan\d+)\b",
    r"%\w+-\d+-\w+",  # Syslog signatures e.g. %CDP-4-NATIVE_VLAN_MISMATCH, %LINK-3-UPDOWN
    r"\bipconfig\s*(/all)?\b",
    r"\bSubnet Mask[\s\.:]+",
    r"\bDefault Gateway[\s\.:]+",
    r"\bIPv4 Address[\s\.:]+",
]

COMPILED_SIGNATURES = [re.compile(sig, re.IGNORECASE) for sig in CISCO_SIGNATURES]


def is_active_cisco_cli(text: str) -> bool:
    """Verify if the clipboard contains authentic Cisco Packet Tracer / IOS CLI output.

    Must contain a valid prompt or match at least 2 distinct Cisco IOS signatures.
    """
    if not text or len(text.strip()) < 12:
        return False

    clean_text = text.strip()

    # Direct match: Prompt found
    if CISCO_PROMPT_PATTERN.search(clean_text):
        return True

    # Signature counter
    matches = sum(1 for p in COMPILED_SIGNATURES if p.search(clean_text))
    return matches >= 2


def get_clipboard_text() -> str:
    """Safely extract clipboard content via pyperclip or ctypes."""
    if pyperclip is not None:
        try:
            return pyperclip.paste()
        except Exception:
            pass

    if sys.platform == "win32":
        try:
            import ctypes
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
    """Atomically write valid Packet Tracer CLI text to live_cli_input.txt."""
    clean_text = cli_text.strip()
    temp_file = BASE_DIR / "live_cli_input.tmp"
    with open(temp_file, "w", encoding="utf-8") as f:
        f.write(clean_text + "\n")
        f.flush()
        os.fsync(f.fileno())

    os.replace(temp_file, LIVE_INPUT_FILE)


def run_listener() -> None:
    """Start background Packet Tracer clipboard watcher."""
    print("==========================================================================")
    print("⚡ NetSage AI - Live Packet Tracer CLI Listener")
    print(f"📁 Target Output : {LIVE_INPUT_FILE}")
    print(f"⏱️ Polling Speed : {POLL_INTERVAL_SEC}s")
    print("==========================================================================")
    print("👉 Listening for Cisco Packet Tracer CLI outputs only...")
    print("   (Copy CLI text inside Packet Tracer -> AI Copilot will ingest instantly)\n")

    last_captured = ""

    while True:
        try:
            raw_text = get_clipboard_text().strip()

            if raw_text and raw_text != last_captured:
                if is_active_cisco_cli(raw_text):
                    last_captured = raw_text
                    write_live_cli_input(raw_text)
                    now_str = datetime.datetime.now().strftime("%H:%M:%S")
                    lines = len(raw_text.splitlines())
                    first_line = raw_text.splitlines()[0][:60]
                    print(f"[{now_str}] 🟢 INGESTED Cisco CLI ({lines} lines): {first_line}...")
                else:
                    # Ignore non-Cisco clipboard data silently
                    pass

            time.sleep(POLL_INTERVAL_SEC)

        except KeyboardInterrupt:
            print("\n[INFO] Listener stopped by user.")
            break
        except Exception as e:
            time.sleep(1.0)


if __name__ == "__main__":
    run_listener()
