# NetSage AI 🌐

> **AI-Assisted Network Diagnostic Engine with Human-in-the-Loop Safeguards**  
> *A deterministic + Local SLM (Ollama) AIOps engine for Cisco Packet Tracer and enterprise laboratory troubleshooting with empirical telemetry instrumentation.*

---

## 📌 Overview

**NetSage AI** bridges the diagnostic gap for network engineers by pairing deterministic rule-based checks with local Small Language Model (SLM) reasoning. It automates root-cause analysis across **OSI Layers 2 through 7**, enforces strict **Human-in-the-Loop (HITL)** review gates, and captures publication-grade performance telemetry (**RQ2 & RQ3**).

```
                      ┌───────────────────────────────────────────────┐
                      │    Input Telemetry & CLI 'show' Outputs       │
                      │  (symptom, topology, show outputs from lab)   │
                      └──────────────────────┬────────────────────────┘
                                             │
                     ┌───────────────────────┴───────────────────────┐
                     ▼                                               ▼
         ┌────────────────────────┐                     ┌────────────────────────┐
         │ Stage 1: Deterministic │                     │  Stage 2: Local SLM    │
         │   Python Rule Engine   │                     │   Reasoning (Ollama)   │
         │  (checker.py: L2-L7)   │                     │  (llm_engine.py: 3B)   │
         └───────────┬────────────┘                     └───────────┬────────────┘
                     │                                               │
                     └───────────────────────┬───────────────────────┘
                                             ▼
                              ┌─────────────────────────────┐
                              │  Streamlit Diagnostic Panel │
                              │ (Anomalies + Root Cause Fix)│
                              └──────────────┬──────────────┘
                                             ▼
                              ┌─────────────────────────────┐
                              │ Human-in-the-Loop (HITL)    │
                              │ Approval Gate (app.py)      │
                              │ [Accept | Edit | Reject]    │
                              └──────────────┬──────────────┘
                                             ▼
                              ┌─────────────────────────────┐
                              │  Responsible AI Audit Log   │
                              │  (responsible_ai_log.csv)   │
                              └─────────────────────────────┘
```

---

## 📁 Repository Structure

```
netsage-ai/
├── cases.csv                   # 30 verified network troubleshooting cases (L2, L3, L4, L7)
├── checker.py                  # Deterministic rule engine (L2-L7 validation, wildcard masks, OSPF, routing)
├── diagnose_prompt.md          # Few-shot system prompt forcing strict JSON output
├── llm_engine.py               # Local SLM query wrapper with native Ollama telemetry & RAM profiling
├── pt_listener.py              # Track A: Live Cisco Packet Tracer clipboard listener daemon
├── live_cli_input.txt          # Track A: Real-time captured CLI buffer
├── run_benchmarks.py           # Track B: Automated 30-case benchmark runner for IEEE paper
├── benchmark_paper_results.csv # Track B: Empirical benchmark dataset (Latency, t/s, RAM, Agreement)
├── app.py                      # Streamlit interactive dashboard with live feed & HITL workflow
├── responsible_ai_log.csv      # Auto-generated Responsible AI audit trail & failure taxonomy
├── requirements.txt            # Python dependencies (streamlit, requests, pandas, pydantic, psutil, pyperclip)
└── README.md                   # Project documentation
```

---

## 🚀 Quickstart & Setup

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. (Optional) Start Local SLM via Ollama
Ensure [Ollama](https://ollama.com) is installed and pull your target model:
```bash
ollama run qwen2.5-coder:3b
```
*(Note: If Ollama is offline, NetSage AI will automatically engage its deterministic simulation fallback mode with full telemetry profiling.)*

---

## ⚡ Dual-Track Operations

### Track A: Live Packet Tracer Demo Workflow

1. Start the clipboard listener daemon:
   ```bash
   python pt_listener.py
   ```
2. Launch the Streamlit dashboard in another terminal:
   ```bash
   streamlit run app.py
   ```
3. Copy any router/switch CLI output in **Cisco Packet Tracer** (e.g., `show ip interface brief`, `show access-lists`, `show interfaces trunk`).
4. `pt_listener.py` automatically captures the text into `live_cli_input.txt`.
5. In Streamlit, switch to **"⚡ Live Packet Tracer Feed"** from the sidebar to inspect, diagnose, and review live lab anomalies in real time.

---

### Track B: Empirical Benchmarking for IEEE Publication

To execute the automated empirical testbed across all 30 cases:
```bash
python run_benchmarks.py
```
This runs **Variant A (Deterministic Rules)** and **Variant C (Hybrid SLM Engine)**, measures execution latency, token throughput, and memory footprint, and generates **`benchmark_paper_results.csv`**.

---

## 📊 Published Telemetry Metrics (RQ2 & RQ3)

### 1. Inference Latency ($\Delta t$)
```math
\text{Latency } (\Delta t) = \frac{\text{total\_duration}}{10^6} \text{ ms}
```

### 2. Token Throughput ($t/s$)
```math
\text{Throughput } (t/s) = \frac{\text{eval\_count}}{\frac{\text{eval\_duration}}{10^9}}
```

### 3. Memory Footprint
Measured as Process RSS Memory ($\text{MB}$) and Global System Virtual Memory Percentage ($\%$) via `psutil`.

### 4. Publication Failure Taxonomy (RQ3)
When human reviewers edit or reject an AI diagnosis, they categorize the failure mode into one of 6 discrete classes:
- `None / Valid AI Diagnosis`
- `Hallucinated CLI Evidence (Model quoted line not in show output)`
- `Missed Subnet Mask Boundary (Model miscalculated host/subnet alignment)`
- `Wrong OSI Layer Identification (e.g., tagged L2 issue as L3)`
- `Unsafe / Invalid Remediation Step (CLI command syntax invalid in Cisco IOS)`
- `Incorrect Root Cause Diagnosis (Misattributed fault)`

---

## 📜 License

This project is developed for research and educational purposes under the MIT License.
