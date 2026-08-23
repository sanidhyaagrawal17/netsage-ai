# 🌐 NetSage AI
### Deterministic Heuristics + Small Language Model (SLM) Diagnostic Assistant for Cisco Packet Tracer

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React 19](https://img.shields.io/badge/Frontend-React_19_+_Vite-61DAFB?style=flat&logo=react)](https://react.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/Styling-Tailwind_CSS_v4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Shadcn UI](https://img.shields.io/badge/Components-shadcn%2Fui-000000?style=flat)](https://ui.shadcn.com/)
[![Ollama](https://img.shields.io/badge/AI_Engine-Ollama_SLM-white?style=flat)](https://ollama.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

NetSage AI is an intelligent, dual-stage network diagnostic copilot engineered for **Cisco Packet Tracer** laboratory environments. It combines **deterministic rule-based validation** (OSI Layers 2–7) with **local Small Language Models (SLMs)** like Llama 3.1 and Qwen2.5 to provide real-time root-cause analysis, syntax-verified CLI remediation commands, and empirical performance metrics with zero cloud dependency.

---

## ✨ Key Features

- **⚡ Stage 1: Deterministic Heuristic Engine (`checker.py`)**
  - Ultra-fast regex and logic parser inspecting OSI Layers 2 through 7 (VLANs, STP, OSPF, HSRP, ACLs, DHCP, NAT, Subnet boundaries).
  - Flags anomalies deterministically in under 5ms without hallucinations.

- **🧠 Stage 2: Local SLM Reasoning (`llm_engine.py`)**
  - Low-latency local inference powered by **Ollama** (`llama3.1:8b`, `qwen2.5-coder:3b`).
  - Streams structured diagnostic synthesis via Server-Sent Events (SSE).
  - Fully offline fallback mode with mock telemetry profiling.

- **🎨 Modern iOS / Apple Pure Black Interface (`frontend/`)**
  - **Pure OLED Deep Black Aesthetic (`#000000`)**: Crisp Apple typography, subtle glassmorphism panels, and high-contrast dark/light mode toggles.
  - **Dynamic Island Floating Pill (`FloatingStatus.jsx`)**: Tactile, draggable status capsule with real-time breathing aura indicators (*Standby*, *Synthesizing*, *Streaming Trace*, *Deterministic Rules*).
  - **Document Picture-in-Picture (PiP)**: Detached OS-level always-on-top window enabling live diagnosis while working inside Cisco Packet Tracer.
  - **Collapsible Sidebar Rail**: Collapses to an Apple-style icon rail with hover tooltips and sliding active spring animations (`motion/react`).
  - **Interactive NetSage Copilot**: Expandable assistant drawer with quick diagnostic prompts.
  - **Live Cisco Terminal Input**: Built-in line numbers, copy/paste shortcuts, and real-time buffer capture indicators.

- **📡 Track A: Real-Time Clipboard Listener (`pt_listener.py`)**
  - Background daemon monitoring system clipboard for Cisco IOS show-command output (`show ip int brief`, `show running-config`, `show interfaces trunk`, etc.).
  - Can be started/stopped directly from the UI header or sidebar with live status indicators.

- **📊 Track B: Empirical IEEE Benchmark Suite (`run_benchmarks.py`)**
  - 30-case validation suite measuring inference latency (ms), token throughput (t/s), memory footprint (RSS MB), and deterministic vs. SLM agreement.

---

## 🏛 Architecture Diagram

```
                              ┌─────────────────────────────────────┐
                              │     Cisco Packet Tracer Lab         │
                              │  (CLI Show Commands & Topologies)   │
                              └──────────────────┬──────────────────┘
                                                 │
                                                 ▼
                              ┌─────────────────────────────────────┐
                              │  Track A: pt_listener.py Daemon     │
                              │  (Clipboard Monitor & Validator)    │
                              └──────────────────┬──────────────────┘
                                                 │
                                                 ▼
                              ┌─────────────────────────────────────┐
                              │    FastAPI Server (server.py)       │
                              │  (REST API + SSE Stream: :8000)     │
                              └──────────────────┬──────────────────┘
                                                 │
                     ┌───────────────────────────┴───────────────────────────┐
                     ▼                                                       ▼
         ┌────────────────────────┐                             ┌────────────────────────┐
         │ Stage 1: Deterministic │                             │ Stage 2: Local SLM     │
         │   Python Rule Engine   │                             │   Reasoning (Ollama)   │
         │  (checker.py: L2-L7)   │                             │  (llm_engine.py: 8B/3B)│
         └───────────┬────────────┘                             └───────────┬────────────┘
                     │                                                       │
                     └───────────────────────────┬───────────────────────────┘
                                                 │ (SSE Event Stream)
                                                 ▼
                              ┌─────────────────────────────────────┐
                              │      Modern React 19 Frontend       │
                              │ (Apple Pure Black + Dynamic Island) │
                              │    [Terminal | Diagnosis | PiP]     │
                              └──────────────────┬──────────────────┘
                                                 ▼
                              ┌─────────────────────────────────────┐
                              │   Human-in-the-Loop (HITL) Gate     │
                              │   [Approve Fix | Re-evaluate]       │
                              └──────────────────┬──────────────────┘
                                                 ▼
                              ┌─────────────────────────────────────┐
                              │      Responsible AI Audit Trail     │
                              │      (responsible_ai_log.csv)       │
                              └─────────────────────────────────────┘
```

---

## 📁 Repository Structure

```
netsage-ai/
├── cases.csv                   # 30 verified network troubleshooting test cases (L2–L7)
├── checker.py                  # Deterministic rule engine (VLANs, OSPF, ACLs, NAT, Subnet masks)
├── diagnose_prompt.md          # Few-shot system prompt enforcing strict JSON output
├── llm_engine.py               # Local SLM wrapper with native Ollama telemetry & RAM profiling
├── pt_listener.py              # Track A: Live Cisco Packet Tracer clipboard listener daemon
├── live_cli_input.txt          # Track A: Real-time captured CLI buffer
├── run_benchmarks.py           # Track B: Automated 30-case benchmark runner for IEEE paper
├── benchmark_paper_results.csv # Track B: Empirical benchmark dataset (Latency, t/s, RAM)
├── server.py                   # FastAPI backend with SSE streaming & listener management
├── responsible_ai_log.csv      # Auto-generated Responsible AI audit trail & failure taxonomy
├── requirements.txt            # Python backend dependencies (FastAPI, uvicorn, pydantic, psutil)
├── frontend/                   # Modern React 19 + Tailwind v4 + Shadcn/ui Web App
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx          # Collapsible icon-rail navigation with spring layout
│   │   │   ├── TerminalInput.jsx    # Cisco IOS CLI editor with line numbers & live listener
│   │   │   ├── DiagnosisView.jsx    # Real-time streaming diagnosis, confidence meter, fix steps
│   │   │   ├── FloatingStatus.jsx   # Dynamic Island floating pill + OS Document PiP window
│   │   │   ├── ChatPanel.jsx        # Integrated Copilot assistant drawer with quick prompts
│   │   │   └── ui/                  # Shadcn UI primitives (Button, Accordion, Tooltip, Sonner)
│   │   ├── context/AppContext.jsx   # Global state management & live poller
│   │   ├── hooks/useDraggable.js    # Tactile drag hook with clamp boundaries & gesture detection
│   │   └── index.css                # Apple OLED Pure Black & Frosted Light design tokens
│   ├── vite.config.js
│   └── package.json
└── README.md                   # Project documentation
```

---

## 🚀 Quickstart & Setup

### 1. Backend Setup
```bash
# Clone the repository
git clone https://github.com/<your-username>/netsage-ai.git
cd netsage-ai

# Install Python dependencies
pip install -r requirements.txt

# Start the FastAPI backend
python server.py
```
> The API backend will be live at `http://127.0.0.1:8000` (Swagger docs available at `http://127.0.0.1:8000/docs`).

### 2. Frontend Setup
```bash
cd frontend

# Install Node dependencies
npm install

# Start Vite development server
npm run dev
```
> Open `http://localhost:5173` in your browser.

### 3. (Optional) Local SLM via Ollama
Ensure [Ollama](https://ollama.com) is installed and pull your model:
```bash
ollama run llama3.1:8b
# Or lightweight alternative:
ollama run qwen2.5-coder:3b
```
> *Note:* If Ollama is offline, NetSage AI gracefully falls back to deterministic simulation mode so the UI and tests never break.

---

## ⚡ Workflow Guide

### Live Packet Tracer Diagnostics (Track A)
1. Open the NetSage AI web app at `http://localhost:5173`.
2. Click **"Start Listener"** in the CLI header or the **Wifi icon** in the sidebar footer.
3. In **Cisco Packet Tracer**, copy any router/switch CLI output (`show ip int brief`, `show running-config`, `show interfaces trunk`, `show ip ospf neighbor`, etc.).
4. The terminal buffer will automatically populate with your active Packet Tracer output.
5. Click **"Run Diagnostic Engine"** (or click the **Floating Pill** / pop out the **PiP window**) to inspect root-cause analysis and copy exact Cisco IOS fix commands.

### Running Empirical Benchmarks (Track B)
```bash
python run_benchmarks.py
```
Evaluates all 30 test cases across Variant A (Deterministic) and Variant C (Hybrid Engine), exporting latency, throughput, and memory stats to `benchmark_paper_results.csv`.

---

## 🔬 Dataset Overview (30 Cases Across L2–L7)

| Fault Domain | Cases Count | Concepts Covered |
| :--- | :---: | :--- |
| **Layer 2 (Data Link)** | 8 Cases | Access VLAN mismatch, 802.1Q native VLAN mismatch, allowed VLAN pruning, STP BPDU Guard err-disable, duplex mismatch, EtherChannel LACP mismatch, MAC flapping loop, DTP negotiation failure. |
| **Layer 3 (Network)** | 10 Cases | Interface administratively shutdown, gateway subnet mismatch, subnet mask prefix mismatch, missing static route, OSPF MTU mismatch (EXSTART), OSPF Area ID mismatch, OSPF Hello/Dead timer mismatch, OSPF passive interface, HSRP duplicate active conflict, unreachable next-hop routing. |
| **Layer 4 (Transport & Security)** | 6 Cases | ACL implicit deny drops, explicit TCP port filtering (HTTP/HTTPS 443), inverted wildcard masks (`255.255.255.0` vs `0.0.0.255`), ACL direction misapplication, NAT PAT source ACL exclusion, VPN tunnel MTU/MSS black holes. |
| **Layer 7 (Services & Application)** | 6 Cases | DHCP pool exhaustion, missing IP helper-address (DHCP relay), DNS server misconfiguration, NTP clock unsynchronized (stratum 16), VTY line SSH ACL restrictions, dynamic NAT public pool exhaustion. |

---

## 📜 License

This project is developed for academic research and educational purposes under the MIT License.
