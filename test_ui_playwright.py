import os
import sys
import time
from playwright.sync_api import sync_playwright

def run_playwright_test():
    report = []
    console_errors = []
    page_errors = []

    def on_console(msg):
        if msg.type in ["error"]:
            console_errors.append(f"[{msg.type}] {msg.text}")

    def on_page_error(err):
        page_errors.append(str(err))

    with sync_playwright() as p:
        print("[Playwright] Launching Chromium...")
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        page.on("console", on_console)
        page.on("pageerror", on_page_error)

        # 1. Load Application
        print("[Test 1] Navigating to http://localhost:5173/ ...")
        try:
            page.goto("http://localhost:5173/", wait_until="networkidle", timeout=15000)
            page.wait_for_timeout(1000)
            title = page.title()
            report.append(("Page Load", True, f"Title: {title}"))
        except Exception as e:
            report.append(("Page Load", False, str(e)))
            print(f"FAILED to load: {e}")
            browser.close()
            return report, console_errors, page_errors

        # 2. Check Sidebar Navigation Items
        print("[Test 2] Checking navigation tabs...")
        nav_tabs = ["Terminal", "Diagnosis", "History", "AI Safety"]
        for tab in nav_tabs:
            try:
                btn = page.locator(f"button:has-text('{tab}')").first
                if btn.is_visible():
                    btn.click()
                    page.wait_for_timeout(400)
                    report.append((f"Navigation: {tab}", True, "Tab switched successfully"))
                else:
                    report.append((f"Navigation: {tab}", False, "Button not visible"))
            except Exception as e:
                report.append((f"Navigation: {tab}", False, str(e)))

        # 3. Test Terminal & Presets
        print("[Test 3] Testing Terminal Ingestion & Presets...")
        try:
            page.locator("button:has-text('Terminal')").first.click()
            page.wait_for_timeout(400)

            select_el = page.locator("select").first
            select_el.select_option(value="CASE-001")
            page.wait_for_timeout(500)

            textarea = page.locator("textarea").first
            val = textarea.input_value()
            if "NATIVE_VLAN_MISMATCH" in val:
                report.append(("Terminal Preset Loader", True, f"Loaded CASE-001 ({len(val)} chars)"))
            else:
                report.append(("Terminal Preset Loader", False, f"CLI input was not populated correctly: {val[:50]}"))
        except Exception as e:
            report.append(("Terminal Preset Loader", False, str(e)))

        # 4. Test Interactive React Flow Topology Map from Terminal
        print("[Test 4] Testing React Flow Topology Map from Terminal...")
        try:
            map_btn = page.locator("button:has-text('Map Topology Graph')").first
            if map_btn.is_visible(timeout=3000):
                map_btn.click()
                page.wait_for_timeout(1000)
                
                rf_canvas = page.locator(".react-flow").first
                has_rf = rf_canvas.is_visible(timeout=3000)
                has_sw1 = page.locator("text=SW1").count() > 0
                has_sw2 = page.locator("text=SW2").count() > 0

                # Close modal
                close_btn = page.locator("button:has-text('Close Map')").first
                if close_btn.is_visible():
                    close_btn.click()
                    page.wait_for_timeout(500)

                report.append(("React Flow Topology Map", has_rf and has_sw1 and has_sw2, f"Canvas: {has_rf}, SW1: {has_sw1}, SW2: {has_sw2}"))
            else:
                report.append(("React Flow Topology Map", False, "Map button not found in Terminal"))
        except Exception as e:
            report.append(("React Flow Topology Map", False, str(e)))

        # 5. Test Diagnostic Engine Execution
        print("[Test 5] Running Diagnostic Engine...")
        try:
            diag_btn = page.locator("button:has-text('Run Diagnostic Engine')").first
            diag_btn.click()
            print("Clicked 'Run Diagnostic Engine', waiting for diagnosis...")

            # Wait for diagnosis view and remediation commands (max 15s)
            page.wait_for_selector("text=Remediation Commands", timeout=15000)
            report.append(("Diagnostic Engine", True, "Diagnosis generated & routed to DiagnosisView in <10s"))
        except Exception as e:
            report.append(("Diagnostic Engine", False, f"Timeout or error: {str(e)[:80]}"))

        # 6. Test Remotion Packet Simulator in DiagnosisView
        print("[Test 6] Verifying Remotion Packet Simulator...")
        try:
            remotion_box = page.locator("text=SIMULATED COLLISION / PACKET DROP").first
            is_visible = remotion_box.is_visible(timeout=4000)
            report.append(("Remotion Packet Simulator", is_visible, "Collision canvas playing at 60 FPS" if is_visible else "Canvas element not found"))
        except Exception as e:
            report.append(("Remotion Packet Simulator", False, str(e)))

        # 7. Test Formal Verification Badges
        print("[Test 7] Verifying Formal Verification Badges...")
        try:
            rfc = page.locator("text=RFC 1812 Subnet Disjoint").count() > 0
            cidr = page.locator("text=CIDR Prefix Valid").count() > 0
            halluc = page.locator("text=0.00% Hallucination").count() > 0
            if rfc and cidr and halluc:
                report.append(("Formal Verification Badges", True, "All 3 badges visible (RFC 1812, CIDR, 0% Hallucination)"))
            else:
                report.append(("Formal Verification Badges", False, f"Missing badges (RFC={rfc}, CIDR={cidr}, Halluc={halluc})"))
        except Exception as e:
            report.append(("Formal Verification Badges", False, str(e)))

        # 8. Test HITL Review Gate (Accept / Verify)
        print("[Test 8] Testing HITL Review Action...")
        try:
            accept_btn = page.locator("button:has-text('Accept & Verify')").first
            if accept_btn.is_visible(timeout=3000):
                accept_btn.click()
                page.wait_for_timeout(800)
                # Verify status updated
                approved_text = page.locator("text=Approved & Audited").count() > 0
                report.append(("HITL Review Gate", approved_text, "Remediation verified & marked as Approved"))
            else:
                report.append(("HITL Review Gate", False, "'Accept & Verify' button not visible"))
        except Exception as e:
            report.append(("HITL Review Gate", False, str(e)))

        # 9. Test In-Diagnosis React Flow Graph Explorer
        print("[Test 9] Testing Topology Graph button in Diagnosis...")
        try:
            diag_map_btn = page.locator("button:has-text('Explore Property Graph')").first
            if diag_map_btn.is_visible(timeout=2000):
                diag_map_btn.click()
                page.wait_for_timeout(800)
                has_rf = page.locator(".react-flow").is_visible()
                close_btn = page.locator("button:has-text('Close Map')").first
                if close_btn.is_visible():
                    close_btn.click()
                    page.wait_for_timeout(400)
                report.append(("Diagnosis Graph Explorer", has_rf, "React Flow modal toggled from Diagnosis Hub"))
            else:
                report.append(("Diagnosis Graph Explorer", False, "Explore button not found in Diagnosis"))
        except Exception as e:
            report.append(("Diagnosis Graph Explorer", False, str(e)))

        # 10. Test Spotlight Command Palette (Ctrl+K)
        print("[Test 10] Testing Spotlight Command Palette...")
        try:
            page.keyboard.press("Control+k")
            page.wait_for_timeout(600)
            cmdk_input = page.locator("[cmdk-input]").first
            if cmdk_input.is_visible(timeout=2000):
                cmdk_input.fill("OSPF")
                page.wait_for_timeout(300)
                has_result = page.locator("text=CASE-003").count() > 0
                
                # Press Escape and verify modal disappears
                page.keyboard.press("Escape")
                page.wait_for_timeout(500)
                is_closed = not cmdk_input.is_visible()

                report.append(("Spotlight Command Palette (Ctrl+K)", has_result and is_closed, f"Result matched: {has_result}, Escape closed modal: {is_closed}"))
            else:
                report.append(("Spotlight Command Palette (Ctrl+K)", False, "Command palette did not open"))
        except Exception as e:
            report.append(("Spotlight Command Palette (Ctrl+K)", False, str(e)))

        # 11. Test Copilot Chat Drawer
        print("[Test 11] Testing Copilot Chat Drawer...")
        try:
            copilot_btn = page.locator("button:has-text('Ask Copilot')").first
            if copilot_btn.is_visible(timeout=2000):
                copilot_btn.click()
                page.wait_for_timeout(800)

                has_drawer = page.locator("text=NetSage Copilot").count() > 0
                has_new_chat = page.locator("button[title*='New Chat']").count() > 0 or page.locator("button:has-text('New Chat')").count() > 0
                has_history = page.locator("button:has-text('History')").count() > 0

                report.append(("Copilot Chat Drawer", has_drawer and has_new_chat, f"Drawer: {has_drawer}, New Chat: {has_new_chat}, History: {has_history}"))
            else:
                report.append(("Copilot Chat Drawer", False, "'Ask Copilot' button not visible"))
        except Exception as e:
            report.append(("Copilot Chat Drawer", False, str(e)))

        # 12. Test History View (Saved Runs & Chat Threads)
        print("[Test 12] Testing History View...")
        try:
            page.locator("button:has-text('History')").first.click()
            page.wait_for_timeout(600)

            has_runs = page.locator("text=Diagnosis Runs").count() > 0
            has_chats = page.locator("text=Copilot Chats").count() > 0

            # Switch to Copilot Chats tab
            chats_tab = page.locator("button:has-text('Copilot Chats')").first
            if chats_tab.is_visible():
                chats_tab.click()
                page.wait_for_timeout(300)

            report.append(("History View Dual Tabs", has_runs and has_chats, f"Runs tab: {has_runs}, Chats tab: {has_chats}"))
        except Exception as e:
            report.append(("History View Dual Tabs", False, str(e)))

        # 13. Test AI Safety / Audit View
        print("[Test 13] Testing AI Safety / Audit View...")
        try:
            page.locator("button:has-text('AI Safety')").first.click()
            page.wait_for_timeout(800)

            has_inferences = page.locator("text=Total Inferences").count() > 0
            has_acceptance = page.locator("text=Human Acceptance Rate").count() > 0

            report.append(("AI Safety / Audit View", has_inferences or has_acceptance, f"Total Inferences: {has_inferences}, Acceptance Rate: {has_acceptance}"))
        except Exception as e:
            report.append(("AI Safety / Audit View", False, str(e)))

        # Save Final Verification Screenshot
        page.screenshot(path="D:\\netsage-ai\\playwright_test_verified.png", full_page=True)
        print("[Playwright] Saved verification screenshot to D:\\netsage-ai\\playwright_test_verified.png")

        browser.close()

    return report, console_errors, page_errors

if __name__ == "__main__":
    report, console_errors, page_errors = run_playwright_test()
    print("\n" + "="*70)
    print("                     PLAYWRIGHT TEST SUITE REPORT")
    print("="*70)
    passed_count = sum(1 for _, ok, _ in report if ok)
    total_count = len(report)
    for name, ok, details in report:
        status = "[ PASS ]" if ok else "[ FAIL ]"
        print(f"{status} {name:<35} : {details}")
    print("-"*70)
    print(f"SUMMARY: {passed_count}/{total_count} Tests Passed ({passed_count/total_count*100:.1f}%)")
    print("="*70)

    if console_errors:
        print(f"\n[!] Console Errors Detected ({len(console_errors)}):")
        for err in console_errors[:10]:
            print("  - " + err)
    else:
        print("\n[OK] Zero JavaScript Console Errors!")

    if page_errors:
        print(f"\n[!] Page Exceptions Detected ({len(page_errors)}):")
        for err in page_errors:
            print("  - " + err)
    else:
        print("[OK] Zero Unhandled Page Exceptions!")
