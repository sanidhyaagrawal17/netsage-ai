# NetSage AI: Automated AIOps & Network Diagnostic System for Cisco Packet Tracer
**Project Synopsis & Technical Architecture Specification**

---

## 1. Abstract
**NetSage AI** is an intelligent AIOps (Artificial Intelligence for IT Operations) diagnostic and pedagogical copilot engineered to assist network engineering students and operators in troubleshooting complex network topologies within Cisco Packet Tracer. By synthesizing a **Multi-Pass OCR Vision Engine**, a **Deterministic Layer 2–Layer 7 Rule Engine**, and a localized **Small Language Model (SLM)**, NetSage AI detects, analyzes, and provides step-by-step remediation for misconfigurations without sending sensitive operational telemetry to external cloud servers.

---

## 2. Problem Statement & Motivation
Cisco Packet Tracer is the global standard for CCNA and computer networking education. However, learners face substantial hurdles:
1. **Isolated & Static Environments**: Packet Tracer does not natively provide dynamic, real-time diagnostic hints or root-cause explanations when connectivity fails (e.g., VLAN trunk mismatches, overlapping subnets, missing default routes, or asymmetric ACLs).
2. **Copy/Paste & Clipboard Bottlenecks**: Many Packet Tracer lab environments (`.pka` files) intentionally lock down copy-paste capabilities or restrict terminal text extraction to prevent cheating, making programmatic data transfer difficult.
3. **Proprietary Ecosystem**: The native Packet Tracer Messaging Protocol (PTMP) over ExApps socket channels is binary-encoded, closed-source, and lacks official modern Python SDK support.

**NetSage AI addresses these bottlenecks** by implementing a non-invasive, vision-based OCR extraction pipeline combined with offline localized AI diagnostics, creating an instant tutor overlay that operates universally across any Packet Tracer lab.

---

## 3. System Architecture

```
+-------------------------------------------------------------------------------+
|                             NetSage AI Web UI                                 |
|         (React 18 + Vite + TailwindCSS + Lucide + Sonner + PiP Dock)          |
+---------------------------------------+---------------------------------------+
                                        |
                 HTTP / REST & SSE     |  Port 8001
                                        v
+-------------------------------------------------------------------------------+
|                             FastAPI Backend Core                              |
|                              (Python 3.10+)                                   |
+---------------------------------------+---------------------------------------+
        |                               |                               |
        v                               v                               v
+-------------------+       +--------------------+      +-----------------------+
| OCR Vision Engine |       | Deterministic Rule |      | Local SLM Diagnostics |
| (Tesseract 5.4+)  |       | Engine (Layer 2-7) |      | (Ollama / Qwen / LLM) |
+-------------------+       +--------------------+      +-----------------------+
        |                               |                               |
        | Screenshot Parsing            | Hard Heuristics Check         | Root-Cause Analysis
        v                               v                               v
+-------------------------------------------------------------------------------+
|                    Responsible AI Audit & Governance Log                      |
|                  (Telemetry, Error Taxonomy & User Feedback)                  |
+-------------------------------------------------------------------------------+
```

---

## 4. Implemented Core Modules

### Module 1: Universal OCR Vision Ingestion Engine (`ocr_engine.py`)
- **Direct Clipboard Interception (`Ctrl + V`)**: Users can capture any Packet Tracer CLI window or canvas diagram with `Win + Shift + S` and paste directly into NetSage AI.
- **Multi-Pass Preprocessing**:
  - **Super-Resolution Upscaling (2x Lanczos)**: Restores clarity to fine text labels like CIDR subnet masks (`/29`, `/24`).
  - **Adaptive Contrast & Binarization**: Isolates dark text characters from grey canvas backgrounds and removes diagonal wire artifacts.
  - **Dual PSM Recognition**: Leverages PSM 11 (Sparse Text) for freeform topology nodes and PSM 6 (Uniform Block) for columnar CLI outputs (`show ip int brief`, `show ip route`).
- **Entity Structuring Heuristics**: Automatically repairs common OCR optical ambiguities (e.g., `Rowter1` $\rightarrow$ `Router1`, `PCO` $\rightarrow$ `PC0`, `2960-24TT`) and cleans noise characters.

### Module 2: Deterministic Rule-Based Checker (`checker.py`)
- Executes instant, zero-latency deterministic validation across common CCNA failure modes:
  - **Layer 2 (Data Link)**: VLAN ID mismatch, trunk encapsulation errors, native VLAN mismatches, port security violations.
  - **Layer 3 (Network)**: Subnet calculation errors, overlapping IP assignments, missing default gateways, misconfigured static/OSPF/EIGRP routes.
  - **Layer 4 (Transport) & Layer 7 (Application)**: ACL blockages, DHCP pool exhaustion, DNS/NAT misconfigurations.
- Outputs structured fault codes and remediation rules prior to AI synthesis.

### Module 3: Local SLM Diagnostic & Copilot Engine (`llm_engine.py`)
- Powered by localized Small Language Models via Ollama (e.g., `qwen2.5-coder:3b` or `llama3.1:8b`).
- **Stealth Pre-Warming**: Silently loads weights into RAM during backend initialization to eliminate cold-start latency.
- **Hierarchical Network Analysis**: Formulates structured, pedagogical responses with root cause breakdowns, exact Cisco IOS commands, and verification steps.

### Module 4: Responsible AI & HITL Audit Dashboard
- Built-in Human-in-the-Loop (HITL) review workflow.
- Captures operator agreement rates, override logs, and failure taxonomies to ensure trustworthy, auditable AI recommendations.

---

## 5. Future Scope & Roadmap

While the active production release relies on the non-invasive OCR Vision and CLI ingestion pipelines, the following enhancements are planned for subsequent iterations:

1. **Native Cisco PTMP/IPC Socket Decryption (Option A)**:
   - Reverse-engineer binary headers of Cisco's Packet Tracer Messaging Protocol (Port 39000) to enable direct memory-level extraction without visual capture.
2. **Automated Remediation Script Injector**:
   - Programmatically push generated Cisco IOS remediation scripts (`configure terminal`, `no shutdown`, etc.) back into target simulated devices.
3. **Multi-Vendor Network Operating System Support**:
   - Extend CLI parsing and deterministic rule taxonomies to Juniper Junos, Arista EOS, and VyOS environments.
4. **Offline Edge Packaging**:
   - Package NetSage AI as a self-contained, single-binary desktop utility using Electron / Tauri for air-gapped lab testing.

---

## 6. Technical Stack Summary
- **Frontend**: React 18, Vite 5, TailwindCSS, Lucide React, Sonner Toasts.
- **Backend**: Python 3.10+, FastAPI, Uvicorn, Pydantic, Pandas.
- **Vision / OCR**: Google Tesseract OCR 5.4+, Pillow (PIL).
- **AI Inference**: Ollama Local Runtime (`qwen2.5-coder:3b`, `llama3.1:8b`).
