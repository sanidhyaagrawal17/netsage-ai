"""NetSage AI - Student-Centric AIOps Lab Copilot & Packet Tracer Assistant.

Designed for network students and lab engineers with:
- Live Packet Tracer Sync Indicator (pulsing real-time radar badge)
- Student-friendly plain English diagnostic explanations
- Copyable Cisco IOS fix commands & verification steps
- Simple 1-click Human-in-the-Loop approval
- Collapsible Advanced Research & Telemetry mode for instructors
"""

from __future__ import annotations

import datetime
import json
import os
import time
from pathlib import Path
from typing import Any, Dict, List

import pandas as pd
import streamlit as st

# Local modules
from checker import run_all_checks
from llm_engine import log_telemetry_and_audit, query_local_slm

# --- App Configuration ---
st.set_page_config(
    page_title="NetSage AI - Network Lab Copilot",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Custom Student-Friendly & High-Contrast CSS
st.markdown(
    """
    <style>
    /* Global Fonts & Theme */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Fira+Code:wght@400;500;600&display=swap');
    
    html, body, [class*="css"] {
        font-family: 'Inter', sans-serif;
    }
    
    .copilot-header {
        background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 50%, #6366F1 100%);
        color: white;
        padding: 1.5rem 1.8rem;
        border-radius: 14px;
        margin-bottom: 1.2rem;
        box-shadow: 0 4px 14px rgba(37, 99, 235, 0.15);
    }
    .copilot-title {
        font-size: 2.0rem;
        font-weight: 800;
        margin: 0;
        letter-spacing: -0.02em;
    }
    .copilot-subtitle {
        font-size: 1.0rem;
        color: #E0E7FF;
        margin-top: 0.3rem;
        font-weight: 500;
    }

    /* Live Sync Radar Indicator */
    .live-status-card {
        background: #F0FDF4;
        border: 2px solid #86EFAC;
        border-radius: 12px;
        padding: 1rem 1.3rem;
        margin-bottom: 1.2rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
    .live-status-offline {
        background: #F8FAFC;
        border: 2px solid #E2E8F0;
        border-radius: 12px;
        padding: 1rem 1.3rem;
        margin-bottom: 1.2rem;
    }
    .pulse-dot {
        display: inline-block;
        width: 12px;
        height: 12px;
        background-color: #22C55E;
        border-radius: 50%;
        margin-right: 8px;
        box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
        animation: pulse 1.6s infinite;
    }
    @keyframes pulse {
        0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
        70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); }
        100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
    }

    /* Friendly Solution Cards */
    .diagnosis-card {
        background: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 12px;
        padding: 1.4rem;
        margin-bottom: 1rem;
        box-shadow: 0 2px 6px rgba(0,0,0,0.03);
    }
    .section-tag {
        display: inline-block;
        font-weight: 700;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding: 0.25rem 0.6rem;
        border-radius: 6px;
        margin-bottom: 0.5rem;
    }
    .tag-cause { background: #FEE2E2; color: #991B1B; }
    .tag-fix { background: #DCFCE7; color: #166534; }
    .tag-verify { background: #DBEAFE; color: #1E40AF; }
    .tag-tip { background: #FEF3C7; color: #92400E; }
    
    .cli-box {
        background-color: #0F172A;
        color: #38BDF8;
        font-family: 'Fira Code', monospace;
        font-size: 0.9rem;
        padding: 1rem;
        border-radius: 8px;
        line-height: 1.5;
        overflow-x: auto;
    }
    
    .step-item {
        background: #F8FAFC;
        border-left: 4px solid #3B82F6;
        padding: 0.7rem 1rem;
        border-radius: 0 8px 8px 0;
        margin-bottom: 0.6rem;
    }
    </style>
    """,
    unsafe_allow_html=True,
)

BASE_DIR = Path(__file__).resolve().parent
CASES_FILE = BASE_DIR / "cases.csv"
PROMPT_FILE = BASE_DIR / "diagnose_prompt.md"
LIVE_INPUT_FILE = BASE_DIR / "live_cli_input.txt"
RESPONSIBLE_LOG_FILE = BASE_DIR / "responsible_ai_log.csv"
BENCHMARK_LOG_FILE = BASE_DIR / "benchmark_paper_results.csv"

FAILURE_TAXONOMY = [
    "None / Valid AI Diagnosis",
    "Hallucinated CLI Evidence (Model quoted line not in show output)",
    "Missed Subnet Mask Boundary (Model miscalculated host/subnet alignment)",
    "Wrong OSI Layer Identification (e.g., tagged L2 issue as L3)",
    "Unsafe / Invalid Remediation Step (CLI command syntax invalid in Cisco IOS)",
    "Incorrect Root Cause Diagnosis (Misattributed fault)",
]


@st.cache_data
def load_cases_data() -> pd.DataFrame:
    """Load practice cases."""
    if not CASES_FILE.exists():
        return pd.DataFrame()
    return pd.read_csv(CASES_FILE)


def load_prompt_template() -> str:
    """Load prompt template."""
    if not PROMPT_FILE.exists():
        return "Diagnose case: {{case_id}} {{show_outputs}}"
    return PROMPT_FILE.read_text(encoding="utf-8")


def read_live_cli_buffer() -> Dict[str, Any]:
    """Inspect the live CLI buffer written by pt_listener.py."""
    if not LIVE_INPUT_FILE.exists():
        return {"exists": False, "content": "", "mtime": None, "age_sec": 99999, "is_fresh": False}

    st_stat = LIVE_INPUT_FILE.stat()
    mtime = datetime.datetime.fromtimestamp(st_stat.st_mtime)
    age_sec = (datetime.datetime.now() - mtime).total_seconds()
    try:
        content = LIVE_INPUT_FILE.read_text(encoding="utf-8").strip()
        is_fresh = age_sec < 180  # Considered fresh if captured in last 3 mins
        return {
            "exists": True,
            "content": content,
            "mtime": mtime,
            "age_sec": age_sec,
            "is_fresh": is_fresh,
        }
    except Exception:
        return {"exists": False, "content": "", "mtime": None, "age_sec": 99999, "is_fresh": False}


# Initialize Session State
if "reviews" not in st.session_state:
    st.session_state.reviews = {}
if "diagnoses" not in st.session_state:
    st.session_state.diagnoses = {}
if "rule_findings" not in st.session_state:
    st.session_state.rule_findings = {}

df_cases = load_cases_data()
live_buffer = read_live_cli_buffer()

# --- TOP HEADER ---
st.markdown(
    """
    <div class="copilot-header">
        <div class="copilot-title">⚡ NetSage AI — Network Lab Copilot</div>
        <div class="copilot-subtitle">Your intelligent assistant for Packet Tracer labs, Cisco show-commands, and instant root-cause fixes.</div>
    </div>
    """,
    unsafe_allow_html=True,
)

# --- SIDEBAR CONTROLS ---
st.sidebar.markdown("### 🎯 Choose Practice Mode")
mode_selection = st.sidebar.radio(
    "How do you want to troubleshoot?",
    options=["⚡ Live Packet Tracer Copilot", "📚 30 Guided Lab Scenarios"],
    index=0,
)

model_choice = st.sidebar.selectbox(
    "AI Model",
    options=["qwen2.5-coder:3b", "llama3.2:3b", "qwen2.5:7b"],
    index=0,
)
ollama_url = "http://localhost:11434"

# --- CASE RESOLUTION BASED ON MODE ---
if mode_selection == "⚡ Live Packet Tracer Copilot":
    active_case_id = "LIVE-PACKET-TRACER"
    
    # Active live feed case structure
    live_content = live_buffer["content"] if live_buffer["exists"] else ""
    if not live_content:
        live_content = (
            "# Waiting for Packet Tracer CLI capture...\n"
            "# 1. Make sure 'python pt_listener.py' is running.\n"
            "# 2. Copy any output inside Packet Tracer (e.g., 'show ip int brief' or 'show logging')."
        )

    active_case = {
        "case_id": active_case_id,
        "symptom": "Live Packet Tracer lab issue captured directly from your Cisco terminal session.",
        "topology_note": "Cisco Packet Tracer live lab session.",
        "show_outputs": live_content,
        "expected_fault": "Live network anomaly investigation",
        "osi_layer": "Auto-Detect",
        "severity": "Active",
        "concept_tag": "live_packet_tracer",
    }

else:
    # 30 Guided Lab Cases Mode
    st.sidebar.markdown("---")
    st.sidebar.markdown("### 🔍 Select Lab Scenario")
    layers = ["All Layers"] + sorted(df_cases["osi_layer"].unique().tolist())
    layer_filter = st.sidebar.selectbox("Filter by Topic", options=layers, index=0)
    
    filtered_cases = df_cases if layer_filter == "All Layers" else df_cases[df_cases["osi_layer"] == layer_filter]
    case_ids = filtered_cases["case_id"].tolist()
    
    selected_id = st.sidebar.selectbox(
        "Choose a Problem",
        options=case_ids,
        format_func=lambda cid: f"{cid}: {df_cases[df_cases['case_id'] == cid]['symptom'].iloc[0][:38]}...",
    )
    active_case_id = selected_id
    active_case = df_cases[df_cases["case_id"] == selected_id].iloc[0].to_dict()

# --- LIVE STATUS RADAR INDICATOR ---
if mode_selection == "⚡ Live Packet Tracer Copilot":
    if live_buffer["exists"] and live_buffer["is_fresh"]:
        time_str = live_buffer["mtime"].strftime("%H:%M:%S")
        st.markdown(
            f"""
            <div class="live-status-card">
                <div>
                    <span class="pulse-dot"></span>
                    <strong style="color: #166534; font-size: 1.05rem;">LIVE PACKET TRACER SYNC: ACTIVE</strong>
                    <div style="color: #15803D; font-size: 0.88rem; margin-top: 0.2rem;">
                        NetSage AI is monitoring your clipboard. Capturing Cisco CLI text exclusively.
                    </div>
                </div>
                <div style="text-align: right; color: #166534; font-size: 0.85rem; font-family: monospace;">
                    Last CLI Capture: <b>{time_str}</b> ({int(live_buffer['age_sec'])}s ago)
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )
    else:
        st.markdown(
            """
            <div class="live-status-offline">
                <strong style="color: #475569; font-size: 1.05rem;">📡 Packet Tracer Listener Ready</strong>
                <div style="color: #64748B; font-size: 0.88rem; margin-top: 0.2rem;">
                    Run <code>python pt_listener.py</code> in a terminal, then copy any CLI output in Packet Tracer (e.g. <code>show ip int brief</code>). The AI will auto-detect it!
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )

# --- MAIN INTERACTIVE WORKSPACE (Clean 3-Step Student Flow) ---

col_left, col_right = st.columns([1, 1.2], gap="medium")

# LEFT COLUMN: What's Happening in the Network
with col_left:
    st.markdown("### 1️⃣ Network Symptoms & CLI Output")
    
    with st.container():
        st.markdown(
            f"""
            <div class="diagnosis-card">
                <span class="section-tag tag-tip">🚨 Observed Problem</span>
                <p style="font-size: 0.98rem; font-weight: 500; color: #1E293B; margin-top: 0.4rem;">
                    {active_case.get('symptom')}
                </p>
                <span class="section-tag tag-verify">🗺️ Lab Topology Note</span>
                <p style="font-size: 0.88rem; color: #475569; margin-top: 0.2rem;">
                    {active_case.get('topology_note')}
                </p>
            </div>
            """,
            unsafe_allow_html=True,
        )

    st.markdown("#### 💻 Captured CLI Data from Packet Tracer")
    st.code(active_case.get("show_outputs", ""), language="text")

    # One-Click Big Diagnose Button
    btn_diagnose = st.button("🚀 Ask NetSage AI to Diagnose & Fix", type="primary", use_container_width=True)
    if btn_diagnose:
        with st.spinner("AI is analyzing Cisco CLI outputs and running deterministic sanity checks..."):
            prompt_template = load_prompt_template()
            findings = run_all_checks(active_case.get("show_outputs", ""))
            st.session_state.rule_findings[active_case_id] = findings
            
            diagnosis = query_local_slm(
                prompt_template=prompt_template,
                case_data=active_case,
                model_name=model_choice,
                ollama_host=ollama_url,
                deterministic_findings=findings,
            )
            st.session_state.diagnoses[active_case_id] = diagnosis
            st.rerun()

# RIGHT COLUMN: Plain-English AI Diagnosis & Actionable Fix
with col_right:
    st.markdown("### 2️⃣ NetSage AI Diagnosis & Fix")

    diag = st.session_state.diagnoses.get(active_case_id, None)

    if diag is None:
        st.info("👆 Click **'Ask NetSage AI to Diagnose & Fix'** to inspect this problem and generate exact Cisco IOS commands.")
    else:
        root_cause = diag.get("root_cause", "Anomaly identified in network configuration.")
        layer = diag.get("osi_layer", active_case.get("osi_layer", "Network"))
        conf = diag.get("confidence_score", 0.90) * 100
        fixes = diag.get("fix_steps", [])
        vcmds = diag.get("verification_commands", [])
        quote = diag.get("cli_evidence_quote", "")

        # 1. Root Cause in Plain English
        st.markdown(
            f"""
            <div class="diagnosis-card" style="border-left: 5px solid #EF4444;">
                <span class="section-tag tag-cause">Root Cause Explained</span>
                <h4 style="color: #991B1B; margin: 0.3rem 0;">{root_cause}</h4>
                <div style="font-size: 0.85rem; color: #64748B; margin-top: 0.4rem;">
                    <b>Layer:</b> {layer} &nbsp;|&nbsp; <b>AI Confidence:</b> {conf:.0f}%
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )

        # 2. Evidence Quote
        if quote and quote != "N/A":
            with st.expander("🔍 See Exact CLI Evidence Quoted by AI", expanded=True):
                st.markdown(f"```text\n{quote}\n```")

        # 3. Exact Fix Steps with Copyable Commands
        st.markdown("#### 🛠️ Step-by-Step Fix (Copy & Paste to Packet Tracer)")
        for idx, step in enumerate(fixes, 1):
            st.markdown(
                f"""
                <div class="step-item">
                    <strong style="color: #1E40AF;">Step {idx}:</strong>
                </div>
                """,
                unsafe_allow_html=True,
            )
            st.code(step, language="bash")

        # 4. Verification Commands
        if vcmds:
            with st.expander("🧪 How to Verify Your Fix in Packet Tracer", expanded=True):
                for v in vcmds:
                    st.code(v, language="bash")

        # 5. Human-in-the-Loop Review Controls (Simple & Empowering)
        st.markdown("---")
        st.markdown("### 3️⃣ Student Approval Gate (HITL)")
        st.caption("As a network engineer, do you approve this fix before applying it?")

        col_a1, col_a2, col_a3 = st.columns(3)
        with col_a1:
            if st.button("👍 Looks Good (Apply Fix)", key=f"btn_acc_{active_case_id}", use_container_width=True):
                review_entry = {
                    "case_id": active_case_id,
                    "osi_layer": layer,
                    "severity": active_case.get("severity", "Medium"),
                    "concept_tag": active_case.get("concept_tag", "N/A"),
                    "model_used": model_choice,
                    "is_simulated": diag.get("_is_simulated", True),
                    "decision": "Accepted",
                    "failure_category": "None / Valid AI Diagnosis",
                    "root_cause": root_cause,
                    "fix_steps": "\n".join(fixes),
                    "rule_agreement": diag.get("deterministic_agreement", True),
                    "engineer_notes": "Student verified fix in Packet Tracer.",
                    "telemetry": diag.get("telemetry", {}),
                    "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                }
                st.session_state.reviews[active_case_id] = review_entry
                log_telemetry_and_audit(review_entry, str(RESPONSIBLE_LOG_FILE))
                st.success("✅ Fix Approved & Logged!")

        with col_a2:
            with st.popover("✏️ Adjust Fix"):
                st.markdown("##### Modify AI Fix Steps")
                custom_fix = st.text_area("Edit Commands", value="\n".join(fixes), height=100)
                notes = st.text_input("Why are you adjusting?", placeholder="e.g. Added no shutdown")
                if st.button("Save Adjusted Fix", use_container_width=True):
                    review_entry = {
                        "case_id": active_case_id,
                        "osi_layer": layer,
                        "severity": active_case.get("severity", "Medium"),
                        "concept_tag": active_case.get("concept_tag", "N/A"),
                        "model_used": model_choice,
                        "is_simulated": diag.get("_is_simulated", True),
                        "decision": "Edited",
                        "failure_category": "Unsafe / Invalid Remediation Step (CLI command syntax invalid in Cisco IOS)",
                        "root_cause": root_cause,
                        "fix_steps": custom_fix,
                        "rule_agreement": diag.get("deterministic_agreement", True),
                        "engineer_notes": notes,
                        "telemetry": diag.get("telemetry", {}),
                        "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    }
                    st.session_state.reviews[active_case_id] = review_entry
                    log_telemetry_and_audit(review_entry, str(RESPONSIBLE_LOG_FILE))
                    st.info("Fix Updated & Logged!")

        with col_a3:
            with st.popover("👎 Report Issue"):
                st.markdown("##### Report AI Diagnosis Error")
                fail_reason = st.selectbox("What was wrong?", options=FAILURE_TAXONOMY[1:])
                reason_notes = st.text_input("Details", placeholder="e.g. Quoted wrong subnet")
                if st.button("Submit Report", use_container_width=True):
                    review_entry = {
                        "case_id": active_case_id,
                        "osi_layer": layer,
                        "severity": active_case.get("severity", "Medium"),
                        "concept_tag": active_case.get("concept_tag", "N/A"),
                        "model_used": model_choice,
                        "is_simulated": diag.get("_is_simulated", True),
                        "decision": "Rejected",
                        "failure_category": fail_reason,
                        "root_cause": root_cause,
                        "fix_steps": "\n".join(fixes),
                        "rule_agreement": diag.get("deterministic_agreement", True),
                        "engineer_notes": reason_notes,
                        "telemetry": diag.get("telemetry", {}),
                        "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    }
                    st.session_state.reviews[active_case_id] = review_entry
                    log_telemetry_and_audit(review_entry, str(RESPONSIBLE_LOG_FILE))
                    st.warning("Feedback Recorded in Responsible AI Log!")

# --- COLLAPSIBLE ADVANCED LAB & RESEARCH TELEMETRY (For Instructors / Evaluation) ---
st.markdown("---")
with st.expander("🔬 Instructor / Advanced Research Telemetry & Rules"):
    st.markdown("#### Deterministic Rule Engine Anomalies Triggered")
    active_findings = st.session_state.rule_findings.get(active_case_id, [])
    if not active_findings:
        st.write("No deterministic anomalies triggered for this case.")
    else:
        for f in active_findings:
            st.markdown(f"- **[{f.get('rule_id')}] {f.get('title')}** (Layer: {f.get('layer')} | Severity: {f.get('severity')})")
            st.caption(f"Evidence: `{f.get('evidence_snippet')}`")

    if diag and "telemetry" in diag:
        tel = diag["telemetry"]
        st.markdown("#### Empirical Inference Telemetry (RQ2)")
        t1, t2, t3, t4 = st.columns(4)
        t1.metric("Latency (Δt)", f"{tel.get('inference_time_ms', 0):.1f} ms")
        t2.metric("Throughput", f"{tel.get('tokens_per_second', 0):.1f} t/s")
        t3.metric("Output Tokens", f"{tel.get('output_tokens', 0)}")
        t4.metric("RAM (RSS)", f"{tel.get('process_ram_mb', 0):.1f} MB")

    if BENCHMARK_LOG_FILE.exists():
        st.markdown("#### 📄 IEEE Empirical Benchmark Results (30 Cases)")
        df_bench = pd.read_csv(BENCHMARK_LOG_FILE)
        st.dataframe(df_bench, use_container_width=True)

st.caption("NetSage AI • Cisco Packet Tracer AI Copilot with Human-in-the-Loop Safeguards")
