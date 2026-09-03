# NetSage AI — Major Project Synopsis Presentation Deck

**Project Title**: NetSage AI: Automated AIOps & Network Diagnostic System for Cisco Packet Tracer  
**Institution**: Medi-Caps University, Indore  
**Branch**: Department of Computer Science & Engineering  
**Team Members**:
- Sanidhya Agrawal (Enrollment: 0103CS221199)
- Sanskar Tolani (Enrollment: 0103CS221200)
- Sakshi Rajput (Enrollment: 0103CS221197)  
**Mentored By**:
- Prof. / Dr. [Guide / Faculty Mentor Name]
- Prof. / Dr. [Co-Guide / Coordinator Name]

---

## Slide 1: Title & Introduction

* **System Identity**: **NetSage AI** — Local-First Automated AIOps & Diagnostic Copilot for Cisco Packet Tracer
* **Presentation Context**: Major Project Synopsis & Architectural Specification
* **Target Audience**: Undergraduate Engineering Evaluation Panel & Faculty Mentors

> 🎙️ **Speaker Note (30s) — Sanidhya Agrawal**:  
> *"Good morning respected guides and evaluation panel. Today, our team—Sanidhya Agrawal, Sanskar Tolani, and Sakshi Rajput—presents our Major Project synopsis on NetSage AI: an Automated AIOps and Network Diagnostic Copilot designed specifically for Cisco Packet Tracer. We aim to transform static, closed networking labs into intelligent, guided learning environments using non-invasive vision extraction, deterministic validation, and local offline language models."*

---

## Slide 2: Presentation Agenda

* **01. Introduction & Background**: The CCNA troubleshooting chasm & Packet Tracer educational context
* **02. Problem Statement**: Diagnostic overhead, LLM hallucinations & closed `.pka` files
* **03. Proposed Solution**: Non-invasive multi-pass OCR, deterministic rules & local SLM copilot
* **04. System Architecture**: 6-stage operational pipeline from screenshot to telemetry
* **05. Implementation Roadmap**: 12-week phased engineering & milestone schedule
* **06. Future Scope**: Native PTMP socket decryption, automated CLI injection & NOS expansion
* **07. Conclusion & Deliverables**: Summary of contributions, evaluation metrics & prototype demonstration

> 🎙️ **Speaker Note (20s) — Sanidhya Agrawal**:  
> *"Here is the roadmap for our presentation. We will walk you through the fundamental challenges in network engineering education, the four critical research bottlenecks, our proposed multi-pass architecture, the 12-week implementation schedule, and future roadmap horizons before opening for discussion."*

---

## Slide 3: Introduction & Research Context

* **The Reality**:
  * Cisco Packet Tracer is the worldwide standard for CCNA networking education with millions of active student users.
  * Junior engineers frequently memorize isolated CLI commands (`show ip route`, `show ip int brief`), but **fail to synthesize multi-hop symptoms across Layer 2 switching, Layer 3 routing, and Layer 4 security**.
* **The Simulator Limitations**:
  * Packet Tracer is a closed, static sandbox that provides **zero real-time diagnostic intelligence, dynamic root-cause feedback, or guided remediation** when connectivity tests fail.
* **The NetSage AI Paradigm**:
  * An intelligent, local-first AIOps diagnostic copilot overlay that non-invasively observes lab states, validates Layer 2–7 configurations deterministically without hallucinations, and provides verified, step-by-step remediations.

> 🎙️ **Speaker Note (45s) — Sanskar Tolani**:  
> *"Respected jury, networking education does not suffer from a lack of simulation tools—it suffers from a diagnostic correlation gap. Cisco Packet Tracer is used by millions of students globally for CCNA training. However, junior engineers frequently memorize isolated show commands like 'show ip route' or 'show ip int brief', but struggle to correlate multi-hop symptoms across switching, routing, and security. Furthermore, Packet Tracer is a closed simulator that provides zero automated feedback when a ping fails. NetSage AI introduces an AIOps copilot that observes configurations in real time and guides the student to root cause without spoon-feeding answers."*

---

## Slide 4: Problem Statement & The Four Broken Pillars

* **1. High Diagnostic Overhead & Cognitive Load**:
  * Synthesizing verbose CLI outputs to isolate cross-layer faults (VLAN mismatches, routing blackholes, asymmetric ACLs) requires tedious manual correlation that is error-prone for learners.
* **2. AI Hallucinations & IOS Syntax Hazards**:
  * Standard cloud LLMs frequently hallucinate non-existent Cisco IOS syntax, miscalculate CIDR subnet boundaries, or suggest destructive configurations without empirical grounding.
* **3. Plagiarism Controls & Closed Protocols**:
  * Locked Packet Tracer `.pka` files disable terminal copy-paste to prevent plagiarism, while Cisco's internal PTMP IPC protocol is binary-encoded and undocumented, blocking standard data extraction.
* **4. Static Learning Feedback Loop**:
  * When connectivity fails, Packet Tracer provides zero interactive hints or root-cause explanations, creating severe learning bottlenecks without dedicated instructor intervention.

> 🎙️ **Speaker Note (45s) — Sakshi Rajput**:  
> *"We identified four primary bottlenecks that break modern networking labs: First, Diagnostic Overhead: parsing verbose CLI tables manually leads to high cognitive load and human error. Second, LLM Hallucinations: standard cloud models frequently invent non-existent Cisco IOS commands or miscalculate CIDR subnet boundaries. Third, Plagiarism Locks: educational .pka files strictly disable clipboard copy-paste, while Cisco's internal PTMP IPC protocol is binary-encoded and closed. Fourth, The Static Feedback Loop: when connectivity fails, students receive zero hints, creating severe learning delays."*

---

## Slide 5: Proposed Solution & Core Innovation

* **Module 1: Universal OCR Vision Ingestion Engine**:
  * Non-invasive clipboard screenshot ingestion (`Ctrl + V`) with 2x Lanczos super-resolution and PSM 11 sparse text parsing, working universally across all Packet Tracer `.pka` labs without binary hacks.
* **Module 2: Deterministic Layer 2–7 Rule Engine**:
  * Hardcoded Python verification algorithms (`checker.py`) that instantly detect configuration and CIDR subnet errors before AI processing, guaranteeing 100% precision on hard network facts.
* **Module 3: Offline Local SLM Diagnostic Copilot**:
  * Private diagnostic reasoning powered by local Small Language Models (`Ollama / Qwen2.5-Coder:3b`) with stealth RAM pre-warming for zero-latency, private, cloud-free inference.
* **Module 4: Responsible AI & Human-in-the-Loop Gate**:
  * Mandatory operator review (`Accept | Edit | Reject`) workflow paired with structured telemetry audit logging to measure precision, verify commands, and enforce strict safety standards.

```
+-------------------------------------------------------------------------------+
|                       Universal Vision Capture (Ctrl + V)                     |
+-------------------------------------------------------------------------------+
         |                               |                               |
         v                               v                               v
+------------------+           +-------------------+           +----------------+
| Multi-Pass OCR   |           | Deterministic     |           | Local Offline  |
| Vision Engine    | --------> | Rule Engine       | --------> | SLM Copilot    |
| (Tesseract 5.4+) |           | (Zero Halluc.)    |           | (Qwen2.5-Coder)|
+------------------+           +-------------------+           +----------------+
                                                                         |
                                                                         v
                                                               +----------------+
                                                               | HITL Review &  |
                                                               | Governance Log |
                                                               +----------------+
```

> 🎙️ **Speaker Note (45s) — Sanidhya Agrawal**:  
> *"To solve these four bottlenecks, NetSage AI introduces four cohesive architectural modules: Module 1 is our Universal OCR Vision Engine: capturing clipboard screenshots with Ctrl+V and using 2x Lanczos super-resolution to parse CLI text and topology diagrams without needing binary hooks. Module 2 is our Deterministic Layer 2–7 Rule Engine: Python-based algorithms that verify IP overlap, VLAN tags, and port states mathematically, eliminating hallucinations. Module 3 is our Offline Local SLM Copilot: running Qwen2.5-Coder:3b locally via Ollama with RAM pre-warming for zero-latency, private diagnostic reasoning. And Module 4 is our Responsible AI Governance Gate: requiring mandatory human-in-the-loop review with telemetry audit logging."*

---

## Slide 6: System Architecture Specification

| Stage / Component | Operational Details & Implementation Mechanism |
| :--- | :--- |
| **01. Data Ingestion** | Direct clipboard screenshot capture (`Ctrl + V`) or active Packet Tracer CLI buffer. |
| **02. Vision Processing** | Multi-Pass OCR Vision Engine (`Tesseract 5.4+` with 2x Lanczos Super-Resolution & PSM 11). |
| **03. Deterministic Analysis** | Deterministic Rule Engine (`Python Regex & Subnet Parsing`) flags hard Layer 2–7 errors. |
| **04. AI Inference** | Background-Preloaded local LLM Diagnostic Engine (`Ollama / Qwen2.5-Coder:3b`) hypothesizes faults. |
| **05. Human Review (HITL)** | Mandatory `Accept | Edit | Reject` review workflow with Responsible AI Log recording. |
| **06. Evaluation & Telemetry**| Final Metric & Evaluation Dashboard display with agreement rates & telemetry analytics. |

> 🎙️ **Speaker Note (45s) — Sanskar Tolani**:  
> *"This is our 6-stage operational pipeline. Ingestion captures the terminal or topology image from the clipboard. Vision Processing runs multi-pass Tesseract OCR with Cisco token normalizers. Deterministic Analysis scans configurations against hard networking invariants. The Local SLM generates contextual diagnostic hypotheses and remediation steps. The Human Review gate allows the student or instructor to Accept, Edit, or Reject suggestions. Finally, the Evaluation engine logs metrics for telemetry analytics."*

---

## Slide 7: Implementation Roadmap & Milestones

| Timeline | Milestone / Implementation Deliverable |
| :--- | :--- |
| **Weeks 1–2** | **Lab Modeling** — Construct 30 diverse Packet Tracer scenarios (L2 switching, L3 routing, L4 security). |
| **Weeks 3–4** | **Data Extraction** — CLI outputs, symptoms, topology notes, ground-truth root causes into `cases.csv`. |
| **Weeks 5–6** | **Engine Development** — Python rule engine (`checker.py`) and structured LLM prompt templates. |
| **Weeks 7–8** | **System Integration** — Connect prompt library to the local LLM via Ollama; run diagnostic passes on all 30 cases. |
| **Weeks 9–10** | **Human Review & Audit** — HITL tagging (`Accepted / Edited / Rejected`), compile the Responsible AI audit log. |
| **Weeks 11–12** | **Dashboard & Demo** — Finalize the React/Vite review UI and dashboard, record demo video, finalize documentation. |

> 🎙️ **Speaker Note (30s) — Sakshi Rajput**:  
> *"Our 12-week development plan is structured into six phases. Weeks 1 to 4 covered laboratory modeling across 30 diverse scenarios and ground-truth dataset extraction. Weeks 5 to 8 focus on rule engine implementation and local Ollama SLM integration. Weeks 9 to 12 finalize the Human-in-the-Loop audit pipeline, React review UI, and final demonstration deliverables."*

---

## Slide 8: Future Scope & Long-Term Roadmap

* **1. Native Cisco PTMP Socket Protocol Decryption**:
  * Reverse-engineer binary packet headers on Port 39000 for direct memory-level state extraction without visual screenshot capture.
* **2. Automated IOS Remediation Injector**:
  * Programmatically push verified remediation commands (`no shutdown`, VLAN repair) directly back into simulated devices.
* **3. Multi-Vendor Network OS Compatibility**:
  * Extend deterministic rules and CLI parsers to Juniper Junos, Arista EOS, and VyOS operating systems.
* **4. Standalone Offline Edge Packaging**:
  * Package NetSage AI as a self-contained single-binary desktop utility (`Electron / Tauri`) for fully air-gapped lab testing.
* **5. Autonomous Multi-Agent Probing**:
  * Upgrade Copilot to an agentic framework (e.g. LangGraph) that autonomously issues read-only discovery commands based on evolving hypotheses.

> 🎙️ **Speaker Note (30s) — Sanidhya Agrawal**:  
> *"Looking beyond the initial prototype, our future scope includes: reverse-engineering Cisco's native Port 39000 PTMP protocol for direct socket extraction, building an automated IOS configuration injector to push fixes back into devices, extending parsers to Juniper Junos and Arista EOS, and wrapping the system as an air-gapped desktop binary via Tauri."*

---

## Slide 9: Conclusion & Project Deliverables

* **1. Accelerated Root-Cause Learning Velocity**:
  * Transforms static Packet Tracer labs into dynamic, intelligent learning environments, helping students master cross-layer troubleshooting without cognitive bottlenecks.
* **2. 100% Universal Non-Invasive Ingestion**:
  * The multi-pass OCR Vision pipeline ensures complete compatibility across all `.pka` labs without requiring unsupported binary modifications or IPC workarounds.
* **3. Zero Hallucinations via Hard Verification**:
  * Deterministic Layer 2–7 rule pre-checks combined with mandatory Human-in-the-Loop review eliminate LLM hallucinations and enforce strict safety standards.
* **4. Production-Ready Architecture & Governance**:
  * Delivered a fully integrated, offline-capable prototype combining FastAPI, React, Local Ollama SLM, and Responsible AI telemetry governance.

> 🎙️ **Speaker Note (30s) — Team**:  
> *"In conclusion, NetSage AI bridges the critical gap between networking theory and practical diagnostic competence. By pairing non-invasive OCR ingestion with deterministic rule validation and local private SLMs, we eliminate hallucinations while ensuring 100% lab compatibility. The prototype is fully functional with FastAPI, React, and Ollama."*

---

## Slide 10: Thank You & Q&A

* **System**: NetSage AI — Automated AIOps & Network Diagnostic System for Cisco Packet Tracer
* **Open Source Repository**: [github.com/sanidhyaagrawal17/netsage-ai](https://github.com/sanidhyaagrawal17/netsage-ai)
* **Status**: Local Prototype Operational & Audited

> 🎙️ **Speaker Note (15s) — Sanidhya Agrawal**:  
> *"Thank you, respected panel, for your time and guidance. Our codebase and documentation are hosted on GitHub. We welcome your feedback, critiques, and questions."*
