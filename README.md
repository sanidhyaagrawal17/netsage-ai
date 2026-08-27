# NetSage AI
An advanced AIOps Network Reliability and Troubleshooting Engine designed to assist with Cisco Packet Tracer labs.

## Architecture
- **Backend:** Python + FastAPI
- **Frontend:** React + Vite + TailwindCSS
- **AI Engine:** Local Small Language Model (Ollama) with deterministic pre-flight checks.
- **Telemetry Extraction:** Dual-Engine capability (Packet Tracer IPC + OCR Vision fallback).

## Features
- **Deterministic Validation:** Rule-based engine (\checker.py\) validates Layer 2-7 misconfigurations natively.
- **AI Diagnosis:** Highly-structured root cause analysis powered by a localized AI agent.
- **Human-in-the-loop (HITL):** Built-in Responsible AI workflow forcing human verification before accepting remediations.
- **Picture-in-Picture UI:** A floating copilot that docks directly over Packet Tracer.
- **Responsible AI Dashboard:** Live analytics on AI vs. Human agreement rates and fault distributions.

## How to Run Locally

### 1. Requirements
- Python 3.10+
- Node.js v18+
- Ollama installed locally with the \qwen2.5-coder:3b\ model downloaded (\ollama run qwen2.5-coder:3b\).

### 2. Setup
\\ash
# Install backend dependencies
pip install -r requirements.txt

# Install frontend dependencies
cd frontend
npm install
\
### 3. Launch
Use the included Windows Master Controller batch script:
\\ash
start.bat
\This will automatically spin up the FastAPI backend and the Vite frontend simultaneously.