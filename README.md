# NetSage AI 🌐

> **AI-Assisted Network Diagnostic Engine with Human-in-the-Loop Safeguards**  
> *A deterministic rule engine + Local SLM (Ollama) AIOps framework for Cisco Packet Tracer and enterprise laboratory troubleshooting with empirical telemetry instrumentation.*

---

## 📌 Executive Summary

**NetSage AI** bridges the diagnostic gap for network engineers by pairing deterministic rule-based validation with local Small Language Model (SLM) reasoning. It automates root-cause analysis across **OSI Layers 2 through 7**, enforces strict **Human-in-the-Loop (HITL)** safety review gates, and captures publication-grade performance telemetry (**RQ2 & RQ3**).

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
> **Note:** If Ollama is offline or not installed, NetSage AI will automatically engage its deterministic simulation fallback mode with full telemetry profiling so the dashboard and tests never break.

---

## ⚡ Dual-Track Operations

### Track A: Live Packet Tracer Demo Workflow

1. **Start the clipboard listener daemon** in a terminal:
   ```bash
   python pt_listener.py
   ```
2. **Launch the Streamlit dashboard** in a second terminal:
   ```bash
   streamlit run app.py
   ```
3. In **Cisco Packet Tracer**, copy any router/switch CLI output (e.g., `show ip interface brief`, `show access-lists`, `show interfaces trunk`, `ipconfig /all`).
4. `pt_listener.py` automatically detects Cisco CLI patterns and writes the snippet into `live_cli_input.txt`.
5. In Streamlit, select **"⚡ Live Packet Tracer Feed"** from the sidebar to inspect anomalies, run SLM diagnosis, and triage live fixes in real time.

---

### Track B: Empirical Benchmarking for IEEE Publication

To execute the automated empirical benchmark suite across all 30 test cases:
```bash
python run_benchmarks.py
```
This script evaluates:
- **Variant A (Deterministic Rule Engine)**: Standalone rule execution latency.
- **Variant C (Hybrid Engine)**: Combined rule validation + local SLM reasoning.

All benchmark results and system memory telemetry are exported to **`benchmark_paper_results.csv`**.

---

## 🔬 Dataset Overview (30 Cases Across L2–L7)

| Fault Domain | Cases Count | Concepts Covered |
| :--- | :---: | :--- |
| **Layer 2 (Data Link)** | 8 Cases | Access VLAN mismatch, 802.1Q native VLAN mismatch, allowed VLAN pruning, STP BPDU Guard err-disable, duplex mismatch, EtherChannel LACP mismatch, MAC flapping loop, DTP negotiation failure. |
| **Layer 3 (Network)** | 10 Cases | Interface administratively shutdown, gateway subnet mismatch, subnet mask prefix mismatch, missing static route, OSPF MTU mismatch (EXSTART), OSPF Area ID mismatch, OSPF Hello/Dead timer mismatch, OSPF passive interface, HSRP duplicate active conflict, unreachable next-hop routing. |
| **Layer 4 (Transport & Security)** | 6 Cases | ACL implicit deny drops, explicit TCP port filtering (HTTP/HTTPS 443), inverted wildcard masks (`255.255.255.0` vs `0.0.0.255`), ACL direction misapplication, NAT PAT source ACL exclusion, VPN tunnel MTU/MSS black holes. |
| **Layer 7 (Services & Application)** | 6 Cases | DHCP pool exhaustion, missing IP helper-address (DHCP relay), DNS server misconfiguration, NTP clock unsynchronized (stratum 16), VTY line SSH ACL restrictions, dynamic NAT public pool exhaustion. |

---

## 📊 Empirical Telemetry Specifications (RQ2 & RQ3)

### 1. Inference Latency (Δt)
Measures the end-to-end turnaround time for diagnostic inference:

```
Latency (ms) = Total Duration (ns) / 1,000,000
```

### 2. Token Throughput (Tokens per Second)
Measures generative decoding speed across local SLM architectures:

```
Throughput (t/s) = Output Tokens / (Evaluation Duration (ns) / 1,000,000,000)
```

### 3. System Memory Footprint
Captured continuously via `psutil`:
- **Process RSS Memory**: Dedicated Python RAM consumption in Megabytes (MB).
- **System Memory Load**: Total host virtual memory utilization percentage (%).

### 4. Publication Failure Mode Taxonomy (RQ3)
When human reviewers edit or reject an AI diagnosis, they categorize the failure mode into one of 6 discrete classes:
1. `None / Valid AI Diagnosis` (Accepted)
2. `Hallucinated CLI Evidence (Model quoted line not in show output)`
3. `Missed Subnet Mask Boundary (Model miscalculated host/subnet alignment)`
4. `Wrong OSI Layer Identification (e.g., tagged L2 issue as L3)`
5. `Unsafe / Invalid Remediation Step (CLI command syntax invalid in Cisco IOS)`
6. `Incorrect Root Cause Diagnosis (Misattributed fault)`

---

## 📜 License

This project is developed for academic research and educational purposes under the MIT License.
