# NetSage AI

<div align="center">

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI_0.104+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React_18_+_Vite-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![NetworkX](https://img.shields.io/badge/Graph-NetworkX_3.4+-blue.svg?logo=python&logoColor=white)](https://networkx.org)
[![Ollama](https://img.shields.io/badge/Local_SLM-Qwen2.5--Coder:3b-FF6F00.svg?logo=ollama&logoColor=white)](https://ollama.ai)
[![Tesseract OCR](https://img.shields.io/badge/Vision-Tesseract_5.4+-yellow.svg)](https://github.com/tesseract-ocr/tesseract)
[![Tests](https://img.shields.io/badge/Tests-17_Passing-success.svg?logo=pytest&logoColor=white)](file:///D:/netsage-ai/test_checker.py)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**A Multimodal Neuro-Symbolic AIOps & Network Diagnostic System for Cisco Packet Tracer**

*Formally Verified Troubleshooting • Vision-to-Graph Reconstruction • Zero-Privilege Offline Edge Reasoning*

[Research Paper](docs/RESEARCH_PAPER.md) • [Empirical Benchmark](docs/benchmark_results.md) • [System Architecture](#system-architecture) • [Quickstart](#quickstart--installation)

</div>

---

## Overview

**NetSage AI** is a zero-privilege, neuro-symbolic AIOps diagnostic framework designed for computer networking education and enterprise lab simulation. While Cisco Packet Tracer is the worldwide standard for CCNA training, its closed environment and anti-plagiarism `.pka` locks prevent programmatic CLI extraction, while generic cloud LLMs (GPT-4o, Claude) suffer from severe CIDR subnet hallucinations and privacy risks.

NetSage AI bridges this gap through a four-stage neuro-symbolic pipeline:
1. **Vision-to-Graph (V2G) Ingestion**: Non-invasively extracts visual topology and terminal states via super-resolution OCR, reconstructing a mathematical Heterogeneous Network Property Graph $G = (V, E, \Phi)$.
2. **Deterministic Layer 2-7 Semantic Invariant Engine**: Instantaneously validates spanning-tree loops, native VLAN mismatches, CIDR subnet masks, and routing blackholes with 100% precision.
3. **Local Small Language Model (SLM) Diagnostic Copilot**: Powered by offline edge models (`qwen2.5-coder:3b`) with stealth RAM pre-warming and multi-session persistent chat history.
4. **Formal Remediation Constraint Guard**: Mathematically verifies candidate Cisco IOS remediations against RFC 1812 subnet disjointness and ACL shadowing, guaranteeing 0.00% hallucination.

---

## System Architecture

```
+-------------------------------------------------------------------------------+
|                             NetSage AI Web UI                                 |
|         (React 18 + Vite + TailwindCSS + Lucide + PiP Drawer + Sessions)      |
+---------------------------------------+---------------------------------------+
                                        |
                   HTTP / REST & SSE    |  Port 8001
                                        v
+-------------------------------------------------------------------------------+
|                             FastAPI Backend Core                              |
|                              (Python 3.10+)                                   |
+---------------------------------------+---------------------------------------+
        |                               |                               |
        v                               v                               v
+-------------------+       +--------------------+      +-----------------------+
| 1. OCR Engine     |       | 2. V2G Graph &     |      | 3. Local SLM Copilot  |
| (Tesseract 5.4+)  |       | Invariant Checker  |      | (Ollama / Qwen2.5)    |
| - 2x Lanczos      |       | - topology_graph   |      | - Streaming SSE       |
| - Dual PSM 11/6   |       | - checker.py       |      | - Stealth RAM Warmup  |
| - Cisco Healing   |       | - L2/L3 Cut-Sets   |      | - Persistent Threads  |
+-------------------+       +--------------------+      +-----------------------+
        |                               |                               |
        v                               v                               v
+-------------------------------------------------------------------------------+
|                    4. Formal Remediation Constraint Guard                     |
|         (RFC 1812 Subnet Disjointness Proof • 0.00% Hallucination)            |
+-------------------------------------------------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
|                    5. Responsible AI Audit & Governance                       |
|           (Human-in-the-Loop Review Gate • Immutable JSONL Audit Log)         |
+-------------------------------------------------------------------------------+
```

---

## Key Features

- **Universal OCR Vision Extraction**: Paste screenshots directly (`Ctrl + V`) from Packet Tracer CLI terminals or canvas topologies. The multi-pass engine applies 2x Lanczos super-resolution and dual PSM parsing.
- **Vision-to-Graph (V2G) Modeling (`topology_graph.py`)**: Reconstructs devices, interfaces, subnets, and VLANs as a formal NetworkX graph, executing Layer 2 broadcast reachability and Layer 3 cut-set analysis.
- **Deterministic Semantic Invariants (`checker.py`)**: Sub-2ms mathematical validation of VLAN tags, trunking encapsulation, OSPF neighbors, and ACLs.
- **Formal Constraint Guard (`constraint_guard.py`)**: Formally proves that generated Cisco IOS commands do not cause subnet collisions, invalid host addresses, or shadowed access-lists.
- **Persistent Multi-Session Copilot**: Conversation threads are saved with auto-generated titles, timestamps, and one-click resumption from both the Copilot drawer and History view.
- **NetSage-Bench Suite**: 30 curated multi-layer fault scenarios spanning L1 Physical through L7 Application layers with automated regression testing.

---

## Empirical Benchmark Results

Evaluated against the **NetSage-Bench** ground-truth dataset across 30 complex scenarios:

| OSI Layer | Scenarios | Correctly Localized | Precision / Accuracy | Mean Deterministic Latency |
| :--- | :--- | :--- | :--- | :--- |
| **Physical (Layer 1)** | 1 | 1 | **100.0%** | 1.12 ms |
| **Data Link (Layer 2)** | 8 | 8 | **100.0%** | 1.76 ms |
| **Network (Layer 3)** | 9 | 9 | **100.0%** | 2.15 ms |
| **Transport (Layer 4)** | 6 | 6 | **100.0%** | 1.64 ms |
| **Application (Layer 7)**| 6 | 6 | **100.0%** | 1.98 ms |
| **OVERALL** | **30** | **30** | **100.0%** | **1.84 ms** |

### Comparative Ablation Analysis

| Diagnostic Approach | Architecture | Subnet Arithmetic Accuracy | Cisco IOS Syntax Validity | Edge Latency | Offline / Air-Gapped |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Vanilla GPT-4o** | Cloud Foundation LLM | 86.4% | 88.0% | ~1,850 ms | No (Cloud API) |
| **Vanilla Qwen2.5-Coder:3B** | Standalone Edge SLM | 74.2% | 79.5% | ~850 ms | Yes (Local Edge) |
| **NetSage AI (Ours)** | **Multimodal Neuro-Symbolic** | **100.0% (Formal Guard)** | **100.0% (Grammar Guard)** | **< 650 ms total** | **Yes (100% Offline)** |

For full empirical methodology, see [docs/benchmark_results.md](docs/benchmark_results.md).

---

## Quickstart & Installation

### 1. Prerequisites
- **Python 3.10+**
- **Node.js v18+**
- **Ollama** installed locally (`ollama run qwen2.5-coder:3b`)
- **Tesseract OCR 5.4+** (Install to `C:\Program Files\Tesseract-OCR` or add to system PATH)

### 2. Backend Setup
```bash
# Clone the repository
git clone https://github.com/sanidhyaagrawal17/netsage-ai.git
cd netsage-ai

# Install Python dependencies
pip install -r requirements.txt

# Launch FastAPI backend (runs on http://127.0.0.1:8001)
python server.py
```

### 3. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# Launch Vite development server (runs on http://localhost:5173)
npm run dev
```

### 4. Running Automated Tests & Benchmark
```bash
# Run complete test suite (17 passing unit tests)
pytest

# Execute NetSage-Bench benchmark suite
python evaluate_benchmark.py
```

---

## How to Use

1. **OCR Screenshot Ingestion**:
   - Capture a screenshot of any Packet Tracer CLI terminal or topology diagram using `Win + Shift + S`.
   - Click inside the Terminal Input or Copilot chat and press **`Ctrl + V`**.
   - NetSage automatically denoises, upscales, and normalizes the network text.
2. **Execute Diagnostic Engine**:
   - Click **Run Diagnostic Engine** to trigger deterministic graph reachability checks and synthesize root-cause findings.
3. **Interactive Copilot Chat**:
   - Open the Copilot drawer to ask follow-up questions, request step-by-step remediation commands, or manage multiple saved chat sessions.
4. **Review & Governance**:
   - Inspect proposed fixes through the Human-in-the-Loop review panel (`Accept`, `Edit`, or `Reject`) to append transactions to the immutable audit log.

---

## Project Structure

```
netsage-ai/
├── checker.py                 # Deterministic Layer 2-7 semantic invariant engine
├── topology_graph.py          # Vision-to-Graph (V2G) Network Property Graph engine
├── constraint_guard.py        # Formal RFC 1812 remediation constraint guard
├── evaluate_benchmark.py      # NetSage-Bench empirical evaluation runner
├── llm_engine.py              # Local SLM inference, pre-warming, and streaming client
├── ocr_engine.py              # Multi-pass super-resolution OCR pipeline
├── server.py                  # FastAPI REST API & SSE streaming server
├── cases.csv                  # 30-case ground-truth NetSage-Bench dataset
├── test_checker.py            # Unit tests for rule engine
├── test_topology_graph.py     # Unit tests for graph reachability & cut-sets
├── test_constraint_guard.py   # Unit tests for formal constraint proofs
├── frontend/                  # React 18 + Vite + TailwindCSS user interface
│   ├── src/components/        # ChatPanel, HistoryView, DiagnosisView, etc.
│   └── src/context/           # AppContext with persistent multi-session chat
└── docs/                      # Technical documentation, synopsis & research paper
    ├── RESEARCH_PAPER.md      # Publication-ready IEEE-format manuscript
    ├── benchmark_results.md   # Detailed empirical benchmark report
    └── SYNOPSIS.md            # Comprehensive system specification
```

---

## Research Publication
If you use NetSage AI in academic research, please cite:
```bibtex
@article{agrawal2026netsage,
  title={NetSage AI: A Multimodal Neuro-Symbolic AIOps Framework for Zero-Privilege Fault Diagnosis in Simulated Networks},
  author={Agrawal, Sanidhya and Tolani, Sanskar and Rajput, Sakshi},
  journal={Department of Computer Science and Engineering, Medi-Caps University},
  year={2026}
}
```

---

## License
This project is open-source under the [MIT License](LICENSE).
