"""NetSage AI - Streamlit Troubleshooting & HITL Review Dashboard (Phase 3).

Interactive AIOps workbench supporting:
- Track A: Live Cisco Packet Tracer clipboard feed (live_cli_input.txt)
- Track B: Empirical benchmark telemetry & publication analytics (RQ2 & RQ3)
- Multi-tier deterministic rule validation and local SLM inference
- Human-in-the-Loop review with publication failure taxonomy
"""

from __future__ import annotations

import datetime
import json
import os
from pathlib import Path
from typing import Any, Dict, List

import pandas as pd
import streamlit as st

# Local modules
from checker import run_all_checks
from llm_engine import log_telemetry_and_audit, query_local_slm

# --- App Configuration ---
st.set_page_config(
    page_title="NetSage AI - Live AIOps Troubleshooting Workbench",
    page_icon="🌐",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Custom CSS for high-contrast modern AIOps dashboard aesthetic
st.markdown(
    """
    <style>
    .main-title {
        font-size: 2.1rem;
        font-weight: 700;
        color: #1E3A8A;
        margin-bottom: 0.2rem;
    }
    .badge {
        display: inline-block;
        padding: 0.25rem 0.6rem;
        font-size: 0.8rem;
        font-weight: 600;
        border-radius: 9999px;
        margin-right: 0.4rem;
    }
    .badge-critical { background-color: #FEE2E2; color: #991B1B; border: 1px solid #F87171; }
    .badge-high { background-color: #FFEDD5; color: #9A3412; border: 1px solid #FB923C; }
    .badge-medium { background-color: #FEF3C7; color: #92400E; border: 1px solid #FCD34D; }
    .badge-info { background-color: #DBEAFE; color: #1E40AF; border: 1px solid #93C5FD; }
    .badge-live { background-color: #F3E8FF; color: #6B21A8; border: 1px solid #C084FC; }
    .badge-accepted { background-color: #DCFCE7; color: #166534; border: 1px solid #86EFAC; }
    .badge-edited { background-color: #E0E7FF; color: #3730A3; border: 1px solid #A5B4FC; }
    .badge-rejected { background-color: #FFE4E6; color: #9F1239; border: 1px solid #FDA4AF; }
    .badge-pending { background-color: #F1F5F9; color: #475569; border: 1px solid #CBD5E1; }
    
    .card {
        background: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 10px;
        padding: 1.1rem;
        margin-bottom: 0.9rem;
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.04);
    }
    .evidence-box {
        background-color: #F8FAFC;
        border-left: 4px solid #3B82F6;
        padding: 0.65rem 0.9rem;
        font-family: monospace;
        font-size: 0.86rem;
        color: #0F172A;
        border-radius: 0 6px 6px 0;
        margin-top: 0.4rem;
    }
    .telemetry-chip {
        background: #F1F5F9;
        border: 1px solid #CBD5E1;
        border-radius: 6px;
        padding: 0.4rem 0.8rem;
        font-family: monospace;
        font-size: 0.82rem;
        color: #1E293B;
        display: inline-block;
        margin-right: 0.5rem;
        margin-top: 0.3rem;
    }
    .live-banner {
        background-color: #FAF5FF;
        border: 1px solid #D8B4FE;
        border-radius: 8px;
        padding: 0.8rem 1.2rem;
        color: #581C87;
        margin-bottom: 1rem;
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
    """Load cases from CSV file."""
    if not CASES_FILE.exists():
        st.error(f"Cases file not found at {CASES_FILE}")
        return pd.DataFrame()
    return pd.read_csv(CASES_FILE)


def load_prompt_template() -> str:
    """Load diagnosis prompt template."""
    if not PROMPT_FILE.exists():
        return "Diagnose case: {{case_id}} {{show_outputs}}"
    return PROMPT_FILE.read_text(encoding="utf-8")


def read_live_cli_buffer() -> Dict[str, Any]:
    """Check and read live_cli_input.txt buffer captured by pt_listener.py."""
    if not LIVE_INPUT_FILE.exists():
        return {"exists": False, "content": "", "mtime": None, "age_sec": None}

    st_stat = LIVE_INPUT_FILE.stat()
    mtime = datetime.datetime.fromtimestamp(st_stat.st_mtime)
    age_sec = (datetime.datetime.now() - mtime).total_seconds()
    try:
        content = LIVE_INPUT_FILE.read_text(encoding="utf-8")
        return {
            "exists": True,
            "content": content,
            "mtime": mtime,
            "age_sec": age_sec,
        }
    except Exception:
        return {"exists": False, "content": "", "mtime": None, "age_sec": None}


# --- Initialize Session State ---
if "reviews" not in st.session_state:
    st.session_state.reviews = {}

if "diagnoses" not in st.session_state:
    st.session_state.diagnoses = {}

if "rule_findings" not in st.session_state:
    st.session_state.rule_findings = {}

if "input_mode" not in st.session_state:
    st.session_state.input_mode = "Dataset Cases (30)"

# --- Sidebar ---
st.sidebar.markdown("## 🌐 NetSage AI")
st.sidebar.caption("Phase 3: Live Packet Tracer Feed & Research Benchmark Suite")

# Input Mode Selector
st.sidebar.markdown("### 📥 Source Ingestion Mode")
input_mode = st.sidebar.radio(
    "Select Input Source",
    options=["Dataset Cases (30)", "⚡ Live Packet Tracer Feed"],
    index=0 if st.session_state.input_mode == "Dataset Cases (30)" else 1,
)
st.session_state.input_mode = input_mode

df_cases = load_cases_data()
live_info = read_live_cli_buffer()

if input_mode == "Dataset Cases (30)":
    if df_cases.empty:
        st.stop()

    osi_layers_available = ["All Layers"] + sorted(df_cases["osi_layer"].unique().tolist())
    selected_layer_filter = st.sidebar.selectbox("Filter by Fault Domain", options=osi_layers_available, index=0)
    filtered_df = df_cases if selected_layer_filter == "All Layers" else df_cases[df_cases["osi_layer"] == selected_layer_filter]

    case_ids = filtered_df["case_id"].tolist()
    selected_case_id = st.sidebar.selectbox(
        "Select Incident Case",
        options=case_ids,
        format_func=lambda cid: f"{cid} [{df_cases[df_cases['case_id'] == cid]['concept_tag'].iloc[0]}]: {df_cases[df_cases['case_id'] == cid]['symptom'].iloc[0][:30]}...",
    )
    active_case = df_cases[df_cases["case_id"] == selected_case_id].iloc[0].to_dict()

else:  # Live Packet Tracer Feed Mode
    selected_case_id = "LIVE-PT-SESSION"
    active_case = {
        "case_id": "LIVE-PT-SESSION",
        "symptom": "Live Packet Tracer network anomaly captured from engineer clipboard.",
        "topology_note": "Cisco Packet Tracer live lab topology session.",
        "show_outputs": live_info.get("content", "# No live CLI data captured yet.\n# Run 'python pt_listener.py' and copy CLI text from Packet Tracer."),
        "expected_fault": "Live network diagnostic investigation",
        "osi_layer": "Network",
        "severity": "High",
        "concept_tag": "live_pt_capture",
    }
    st.sidebar.info(
        f"⚡ Live Feed Active\n\nBuffer file: `live_cli_input.txt`\n"
        f"Last updated: {live_info['mtime'].strftime('%H:%M:%S') if live_info['mtime'] else 'None'}"
    )

# Model Settings in Sidebar
st.sidebar.markdown("---")
st.sidebar.markdown("### ⚙️ SLM & Telemetry Settings")
model_choice = st.sidebar.selectbox(
    "Local Model",
    options=["qwen2.5-coder:3b", "llama3.2:3b", "qwen2.5:7b", "custom"],
    index=0,
)
if model_choice == "custom":
    model_choice = st.sidebar.text_input("Custom Model Tag", value="mistral:7b")

ollama_url = st.sidebar.text_input("Ollama Host", value="http://localhost:11434")

if st.sidebar.button("Test Ollama Connection"):
    import requests
    try:
        r = requests.get(f"{ollama_url.rstrip('/')}/api/tags", timeout=3)
        if r.status_code == 200:
            models = [m.get("name") for m in r.json().get("models", [])]
            st.sidebar.success(f"Connected! Models: {', '.join(models) if models else 'None loaded'}")
        else:
            st.sidebar.warning(f"Ollama returned HTTP {r.status_code}")
    except Exception as e:
        st.sidebar.error(f"Ollama offline ({e}). Simulation mode will activate.")

reviewed_count = len(st.session_state.reviews)
st.sidebar.markdown("---")
st.sidebar.markdown(f"**Reviewed Cases:** {reviewed_count} / {len(df_cases)}")
st.sidebar.progress(min(reviewed_count / max(len(df_cases), 1), 1.0))

# --- Main Dashboard Header ---
severity_badge_map = {
    "Critical": "badge-critical",
    "High": "badge-high",
    "Medium": "badge-medium",
    "Low": "badge-info",
}
sev_class = severity_badge_map.get(active_case.get("severity", "Medium"), "badge-info")

current_review = st.session_state.reviews.get(selected_case_id, {})
review_status = current_review.get("decision", "Pending Review")
status_badge_map = {
    "Accepted": "badge-accepted",
    "Edited": "badge-edited",
    "Rejected": "badge-rejected",
    "Pending Review": "badge-pending",
}
stat_class = status_badge_map.get(review_status, "badge-pending")

st.markdown(
    f"""
    <div>
        <span class="main-title">NetSage AI Diagnostic Workbench</span>
    </div>
    <div style="margin-bottom: 1rem;">
        <span class="badge {stat_class}">HITL: {review_status.upper()}</span>
        <span class="badge {sev_class}">Severity: {active_case.get('severity', 'N/A')}</span>
        <span class="badge badge-info">Layer: {active_case.get('osi_layer', 'N/A')}</span>
        <span class="badge badge-info">Tag: {active_case.get('concept_tag', 'N/A')}</span>
        <span class="badge {'badge-live' if input_mode != 'Dataset Cases (30)' else 'badge-info'}">Source: {selected_case_id}</span>
    </div>
    """,
    unsafe_allow_html=True,
)

# Live capture notification banner if fresh capture detected
if live_info["exists"] and live_info["age_sec"] is not None and live_info["age_sec"] < 60:
    st.markdown(
        f"""
        <div class="live-banner">
            ⚡ <b>Fresh Packet Tracer Capture Detected!</b> (Updated {live_info['age_sec']:.0f}s ago).
            Switch to <b>'⚡ Live Packet Tracer Feed'</b> mode in the sidebar to diagnose live lab output.
        </div>
        """,
        unsafe_allow_html=True,
    )

# Tabs
tab_overview, tab_diagnose, tab_hitl, tab_history = st.tabs([
    "📋 Incident Overview & CLI Data",
    "⚡ Diagnostic Engine & Telemetry (RQ2)",
    "✍️ Human-in-the-Loop Review (RQ3)",
    "📊 Publication Analytics & Audit Log",
])

# --- Tab 1: Incident Overview ---
with tab_overview:
    col_sym, col_top = st.columns([1, 1])
    with col_sym:
        st.markdown("#### 🚨 Symptom Description")
        st.info(active_case.get("symptom", "No symptom provided."))

    with col_top:
        st.markdown("#### 🗺️ Topology Context")
        st.markdown(f"```\n{active_case.get('topology_note', 'No topology note.')}\n```")

    st.markdown("#### 💻 Raw CLI Show Outputs")
    st.code(active_case.get("show_outputs", ""), language="text")

# --- Tab 2: Diagnostic Engine & Telemetry ---
with tab_diagnose:
    st.markdown("### Multi-Tier Diagnostic Execution")
    
    col_rule_btn, col_llm_btn = st.columns(2)
    
    with col_rule_btn:
        if st.button("🔍 Run Deterministic Rules", key=f"btn_rules_{selected_case_id}", use_container_width=True):
            findings = run_all_checks(active_case.get("show_outputs", ""))
            st.session_state.rule_findings[selected_case_id] = findings
            st.success(f"Executed rule checks. Found {len(findings)} anomaly(ies).")

    with col_llm_btn:
        if st.button("🤖 Query Local SLM (AI Diagnosis + Telemetry)", key=f"btn_slm_{selected_case_id}", use_container_width=True):
            prompt_template = load_prompt_template()
            findings = st.session_state.rule_findings.get(selected_case_id, [])
            if not findings:
                findings = run_all_checks(active_case.get("show_outputs", ""))
                st.session_state.rule_findings[selected_case_id] = findings
            
            with st.spinner(f"Querying {model_choice} with empirical instrumentation..."):
                diagnosis = query_local_slm(
                    prompt_template=prompt_template,
                    case_data=active_case,
                    model_name=model_choice,
                    ollama_host=ollama_url,
                    deterministic_findings=findings,
                )
                st.session_state.diagnoses[selected_case_id] = diagnosis
                st.success("SLM Diagnostic Analysis & Telemetry Captured!")

    st.markdown("---")
    col_findings, col_ai = st.columns([1, 1])

    # Left: Deterministic Findings
    with col_findings:
        st.markdown("#### 1️⃣ Deterministic Rule Findings")
        active_findings = st.session_state.rule_findings.get(selected_case_id, None)

        if active_findings is None:
            st.caption("Click 'Run Deterministic Rules' or run AI Diagnosis to evaluate rule patterns.")
        elif len(active_findings) == 0:
            st.success("✅ No deterministic rule anomalies detected.")
        else:
            for item in active_findings:
                st.markdown(
                    f"""
                    <div class="card">
                        <b>[{item.get('rule_id')}] {item.get('title')}</b><br/>
                        <small style="color: #64748B;">Layer: {item.get('layer')} | Severity: {item.get('severity')}</small>
                        <p style="margin-top: 0.4rem; font-size: 0.88rem;">{item.get('description')}</p>
                        <div class="evidence-box">Evidence: {item.get('evidence_snippet')}</div>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )

    # Right: AI SLM Diagnosis & Telemetry
    with col_ai:
        st.markdown("#### 2️⃣ AI Root Cause Analysis & Empirical Telemetry")
        diag = st.session_state.diagnoses.get(selected_case_id, None)

        if diag is None:
            st.caption("Click 'Query Local SLM' to generate intelligent root cause diagnosis.")
        else:
            if diag.get("_is_simulated"):
                st.warning("⚠️ " + diag.get("_note", "Simulation fallback active"))

            tel = diag.get("telemetry", {})
            st.markdown(
                f"""
                <div>
                    <span class="telemetry-chip">⏱️ Latency: <b>{tel.get('inference_time_ms', 0):.1f} ms</b></span>
                    <span class="telemetry-chip">⚡ Speed: <b>{tel.get('tokens_per_second', 0):.1f} t/s</b></span>
                    <span class="telemetry-chip">📝 Tokens: <b>{tel.get('output_tokens', 0)} out / {tel.get('prompt_tokens', 0)} in</b></span>
                    <span class="telemetry-chip">💾 RAM: <b>{tel.get('process_ram_mb', 0):.1f} MB ({tel.get('system_ram_percent', 0)}% sys)</b></span>
                </div>
                """,
                unsafe_allow_html=True,
            )

            conf = diag.get("confidence_score", 0.0)
            st.markdown(f"**Root Cause:** {diag.get('root_cause', 'N/A')}")
            st.progress(min(max(float(conf), 0.0), 1.0), text=f"Confidence Score: {conf * 100:.1f}%")
            
            c1, c2 = st.columns(2)
            c1.metric("Predicted Layer", diag.get("osi_layer", "N/A"))
            c2.metric("Rule Agreement", "Matched" if diag.get("deterministic_agreement") else "Divergent")

            st.markdown("**Evidence Quote:**")
            st.markdown(f"```\n{diag.get('cli_evidence_quote', 'N/A')}\n```")

            st.markdown("**Recommended Fix Steps:**")
            for idx, step in enumerate(diag.get("fix_steps", []), 1):
                st.code(f"{step}", language="bash")

            if diag.get("verification_commands"):
                st.markdown("**Verification Commands:**")
                for vcmd in diag.get("verification_commands", []):
                    st.code(vcmd, language="bash")

# --- Tab 3: Human-in-the-Loop Review ---
with tab_hitl:
    st.markdown("### ✍️ Human-in-the-Loop (HITL) Review & Failure Taxonomy (RQ3)")
    st.caption("Validate AI diagnostic outputs, tag failure categories when editing/rejecting, and commit to responsible AI audit log.")

    diag = st.session_state.diagnoses.get(selected_case_id, {})
    default_root = diag.get("root_cause", active_case.get("expected_fault", ""))
    default_layer = diag.get("osi_layer", active_case.get("osi_layer", "Network"))
    default_fixes = "\n".join(diag.get("fix_steps", ["# Enter corrective CLI commands"]))

    with st.form(key=f"hitl_form_{selected_case_id}"):
        col_f1, col_f2 = st.columns([2, 1])
        with col_f1:
            reviewed_root_cause = st.text_area(
                "Root Cause Diagnosis (Editable)",
                value=current_review.get("root_cause", default_root),
                height=90,
            )
        with col_f2:
            layer_options = ["Physical", "Data Link", "Network", "Transport", "Session", "Presentation", "Application"]
            cur_idx = layer_options.index(default_layer) if default_layer in layer_options else 2
            reviewed_layer = st.selectbox("OSI Layer Verification", options=layer_options, index=cur_idx)

        reviewed_fixes = st.text_area(
            "Approved Remediation CLI Steps (One per line)",
            value=current_review.get("fix_steps", default_fixes),
            height=100,
        )

        default_failure_cat = current_review.get("failure_category", "None / Valid AI Diagnosis")
        fail_cat_idx = FAILURE_TAXONOMY.index(default_failure_cat) if default_failure_cat in FAILURE_TAXONOMY else 0
        failure_category = st.selectbox(
            "🏷️ AI Failure Mode Category (Required if Editing or Rejecting)",
            options=FAILURE_TAXONOMY,
            index=fail_cat_idx,
            help="Categorize the primary root cause of AI diagnostic error for RQ3 publication taxonomy.",
        )

        engineer_notes = st.text_input(
            "Engineer Audit Notes / Feedback",
            value=current_review.get("engineer_notes", current_review.get("notes", "")),
            placeholder="e.g. Verified against core switch running-config; command syntax corrected.",
        )

        col_b1, col_b2, col_b3 = st.columns(3)
        with col_b1:
            btn_accept = st.form_submit_button("✅ Accept Diagnosis", use_container_width=True)
        with col_b2:
            btn_edit = st.form_submit_button("✏️ Save Edits & Accept", use_container_width=True)
        with col_b3:
            btn_reject = st.form_submit_button("❌ Reject Diagnosis", use_container_width=True)

        if btn_accept:
            cat = "None / Valid AI Diagnosis" if failure_category == "None / Valid AI Diagnosis" else failure_category
            review_entry = {
                "case_id": selected_case_id,
                "osi_layer": reviewed_layer,
                "severity": active_case.get("severity", "Medium"),
                "concept_tag": active_case.get("concept_tag", "N/A"),
                "model_used": model_choice,
                "is_simulated": diag.get("_is_simulated", True),
                "decision": "Accepted",
                "failure_category": cat,
                "root_cause": reviewed_root_cause,
                "fix_steps": reviewed_fixes,
                "rule_agreement": diag.get("deterministic_agreement", True),
                "engineer_notes": engineer_notes,
                "telemetry": diag.get("telemetry", {}),
                "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            }
            st.session_state.reviews[selected_case_id] = review_entry
            log_telemetry_and_audit(review_entry, str(RESPONSIBLE_LOG_FILE))
            st.success(f"Case {selected_case_id} ACCEPTED and logged to responsible_ai_log.csv!")
            st.rerun()

        elif btn_edit:
            cat = failure_category if failure_category != "None / Valid AI Diagnosis" else "Incorrect Root Cause Diagnosis (Misattributed fault)"
            review_entry = {
                "case_id": selected_case_id,
                "osi_layer": reviewed_layer,
                "severity": active_case.get("severity", "Medium"),
                "concept_tag": active_case.get("concept_tag", "N/A"),
                "model_used": model_choice,
                "is_simulated": diag.get("_is_simulated", True),
                "decision": "Edited",
                "failure_category": cat,
                "root_cause": reviewed_root_cause,
                "fix_steps": reviewed_fixes,
                "rule_agreement": diag.get("deterministic_agreement", True),
                "engineer_notes": engineer_notes,
                "telemetry": diag.get("telemetry", {}),
                "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            }
            st.session_state.reviews[selected_case_id] = review_entry
            log_telemetry_and_audit(review_entry, str(RESPONSIBLE_LOG_FILE))
            st.info(f"Case {selected_case_id} EDITED ({cat}) and logged!")
            st.rerun()

        elif btn_reject:
            cat = failure_category if failure_category != "None / Valid AI Diagnosis" else "Incorrect Root Cause Diagnosis (Misattributed fault)"
            review_entry = {
                "case_id": selected_case_id,
                "osi_layer": reviewed_layer,
                "severity": active_case.get("severity", "Medium"),
                "concept_tag": active_case.get("concept_tag", "N/A"),
                "model_used": model_choice,
                "is_simulated": diag.get("_is_simulated", True),
                "decision": "Rejected",
                "failure_category": cat,
                "root_cause": reviewed_root_cause,
                "fix_steps": reviewed_fixes,
                "rule_agreement": diag.get("deterministic_agreement", True),
                "engineer_notes": engineer_notes,
                "telemetry": diag.get("telemetry", {}),
                "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            }
            st.session_state.reviews[selected_case_id] = review_entry
            log_telemetry_and_audit(review_entry, str(RESPONSIBLE_LOG_FILE))
            st.warning(f"Case {selected_case_id} REJECTED ({cat}) and logged!")
            st.rerun()

# --- Tab 4: Publication Analytics & Audit Log ---
with tab_history:
    st.markdown("### 📊 Publication Analytics & Research Benchmarks (Track B)")

    # Section 1: Empirical Benchmark Telemetry from run_benchmarks.py
    if BENCHMARK_LOG_FILE.exists():
        st.markdown("#### 🔬 IEEE Empirical Benchmark Summary (30-Case Testbed)")
        df_bench = pd.read_csv(BENCHMARK_LOG_FILE)
        
        bk1, bk2, bk3, bk4 = st.columns(4)
        bk1.metric("Mean Rule Latency (Var A)", f"{df_bench['rules_latency_ms'].mean():.3f} ms")
        bk2.metric("Mean SLM Latency (Var C)", f"{df_bench['inference_time_ms'].mean():.1f} ms")
        bk3.metric("Mean Throughput (RQ2)", f"{df_bench['tokens_per_second'].mean():.1f} t/s")
        bk4.metric("Rule Coverage", f"{(df_bench['rules_triggered_count'] > 0).mean() * 100:.1f}%")

        with st.expander("📄 View Empirical Benchmark Results Table (30 Cases)"):
            st.dataframe(df_bench, use_container_width=True)
            st.download_button(
                "📥 Download benchmark_paper_results.csv",
                data=BENCHMARK_LOG_FILE.read_bytes(),
                file_name="benchmark_paper_results.csv",
                mime="text/csv",
                use_container_width=True,
            )
        st.markdown("---")

    # Section 2: Real-time HITL Review Log
    st.markdown("#### ✍️ Real-Time HITL Review Log & Failure Taxonomy Distribution (RQ3)")
    if not st.session_state.reviews:
        st.info("No interactive reviews recorded yet in this session. Complete a review in the 'Human-in-the-Loop Review' tab.")
    else:
        review_records = list(st.session_state.reviews.values())
        df_rev = pd.DataFrame(review_records)

        kpi1, kpi2, kpi3, kpi4 = st.columns(4)
        total_rev = len(df_rev)
        accepted_cnt = len(df_rev[df_rev["decision"] == "Accepted"])
        acc_rate = (accepted_cnt / total_rev) * 100 if total_rev > 0 else 0.0

        latencies = [r.get("telemetry", {}).get("inference_time_ms", 0) for r in review_records if r.get("telemetry", {}).get("inference_time_ms")]
        avg_lat = sum(latencies) / len(latencies) if latencies else 0.0

        tps_list = [r.get("telemetry", {}).get("tokens_per_second", 0) for r in review_records if r.get("telemetry", {}).get("tokens_per_second")]
        avg_tps = sum(tps_list) / len(tps_list) if tps_list else 0.0

        kpi1.metric("Interactive Reviews Logged", f"{total_rev}")
        kpi2.metric("Acceptance Rate", f"{acc_rate:.1f}%")
        kpi3.metric("Session Avg Latency", f"{avg_lat:.1f} ms")
        kpi4.metric("Session Avg Throughput", f"{avg_tps:.1f} t/s")

        col_c1, col_c2 = st.columns([1, 1])
        with col_c1:
            st.markdown("##### 🎯 Decision Distribution")
            st.bar_chart(df_rev["decision"].value_counts())

        with col_c2:
            st.markdown("##### 🔍 Failure Taxonomy Breakdown (RQ3)")
            fail_counts = df_rev[df_rev["failure_category"] != "None / Valid AI Diagnosis"]["failure_category"].value_counts()
            if not fail_counts.empty:
                st.bar_chart(fail_counts)
            else:
                st.success("All reviewed diagnoses marked as valid.")

        st.dataframe(df_rev, use_container_width=True)

        col_dl1, col_dl2 = st.columns(2)
        with col_dl1:
            csv_data = df_rev.to_csv(index=False).encode("utf-8")
            st.download_button(
                "📥 Export HITL Review History (CSV)",
                data=csv_data,
                file_name="netsage_hitl_reviews.csv",
                mime="text/csv",
                use_container_width=True,
            )
        with col_dl2:
            if RESPONSIBLE_LOG_FILE.exists():
                resp_log_data = RESPONSIBLE_LOG_FILE.read_bytes()
                st.download_button(
                    "📥 Export Responsible AI & Telemetry Log (CSV)",
                    data=resp_log_data,
                    file_name="responsible_ai_log.csv",
                    mime="text/csv",
                    use_container_width=True,
                )

st.markdown("---")
st.caption("NetSage AI • Phase 3 Live Demo (Track A) & Empirical Benchmarking (Track B)")
