# NetSage AI 🌐 (Phase 3: Dual-Track Capstone & Research Suite)

> AI-assisted network troubleshooting engine combining deterministic Python checks across L2–L7, local Small Language Model (SLM) reasoning via Ollama, live Cisco Packet Tracer clipboard ingestion (Track A), and empirical research benchmarking for IEEE publication (Track B).

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
└── README.md                   # Quickstart documentation
```

---

## 🚀 Quickstart & Dual-Track Operations

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

---

### ⚡ Track A: Live Packet Tracer Demo Workflow

1. Start the clipboard listener daemon in one terminal:
   ```bash
   python pt_listener.py
   ```
2. Launch the Streamlit dashboard in another terminal:
   ```bash
   streamlit run app.py
   ```
3. Open **Cisco Packet Tracer**, copy any router/switch CLI output (e.g. `show ip interface brief`, `show access-lists`, `show interfaces trunk`).
4. `pt_listener.py` automatically captures the output into `live_cli_input.txt`.
5. In Streamlit, select **"⚡ Live Packet Tracer Feed"** from the sidebar to immediately inspect, diagnose, and review live lab anomalies!

---

### 🔬 Track B: Empirical Benchmarking for IEEE Publication

To run the automated empirical testbed across all 30 cases:
```bash
python run_benchmarks.py
```
This runs **Variant A (Deterministic Rules)** and **Variant C (Hybrid SLM Engine)** across the 30 cases, extracts native execution latency, token throughput, and memory footprint, and generates **`benchmark_paper_results.csv`**.

---

## 📊 Published Telemetry Metrics (RQ2 & RQ3)

- **Inference Latency ($\Delta t$)**:
  $$\Delta t = \frac{\text{total\_duration}}{10^6} \text{ ms}$$
- **Token Throughput ($t/s$)**:
  $$\text{Throughput} = \frac{\text{eval\_count}}{\left(\frac{\text{eval\_duration}}{10^9}\right)}$$
- **Memory Footprint**: Process RSS RAM (MB) + Global system RAM % via `psutil`.
- **Publication Failure Taxonomy (RQ3)**: 6 discrete failure classes for responsible human oversight.
