# NetSage AI

> **Automated AIOps & Network Diagnostic Copilot for Cisco Packet Tracer**

NetSage AI is an intelligent network diagnostic engine designed to assist network engineering students and operators in troubleshooting complex network topologies and configurations within Cisco Packet Tracer labs.

---

## 🏗️ Architecture

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

## ✨ Features

- **Universal OCR Vision Extraction**: Paste screenshots directly (`Ctrl + V`) from Packet Tracer CLI terminals or canvas topology diagrams. The multi-pass engine automatically upscales, binarizes, cleans noise, and structures entities.
- **Deterministic Rule Engine (`checker.py`)**: Instant, zero-latency validation across Layer 2–Layer 7 misconfigurations (VLANs, Subnets, OSPF, ACLs, DHCP).
- **Localized SLM Copilot (`llm_engine.py`)**: Powered by local Ollama models (`qwen2.5-coder:3b`, `llama3.1:8b`) with stealth RAM pre-warming for zero cold-start latency.
- **Picture-in-Picture UI**: Floating, resizable Copilot drawer that can dock directly over your Packet Tracer window.
- **Responsible AI Audit**: Built-in human-in-the-loop review mechanism logging agreement rates, failure taxonomies, and diagnostic telemetry.

---

## 🚀 Quickstart & Installation

### 1. Prerequisites
- **Python 3.10+**
- **Node.js v18+**
- **Ollama** installed locally (`ollama run qwen2.5-coder:3b`)
- **Tesseract OCR 5.4+** (Install to default `C:\Program Files\Tesseract-OCR` or add to system PATH)

### 2. Backend Setup
```bash
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

# Launch Vite development server (runs on http://localhost:5173 or 5174)
npm run dev
```

---

## 📖 How to Use

1. **OCR Screenshot Ingestion**:
   - Take a screenshot of your Packet Tracer CLI or topology diagram with `Win + Shift + S`.
   - Click inside the NetSage AI Terminal Input or Copilot chat and hit **`Ctrl + V`**.
   - The OCR engine will clean and populate the structured text.
2. **Run Diagnostics**:
   - Click **Run Diagnostic Engine** to execute rule-based checks and generate an AI root-cause analysis.
3. **Interactive Copilot Chat**:
   - Open the Copilot drawer to ask follow-up questions, request exact Cisco IOS remediation commands, or explain network theory.

---

## 🔭 Future Scope & Roadmap

- [ ] **Native Cisco PTMP/IPC Socket Protocol**: Reverse-engineer closed-source binary packets on Port 39000 for direct simulator memory ingestion.
- [ ] **Automated Remediation Script Injector**: Programmatically dispatch generated Cisco IOS configuration commands back into simulated devices.
- [ ] **Multi-Vendor NOS Support**: Extend diagnostic rules to Juniper Junos, Arista EOS, and VyOS.
- [ ] **Desktop Packaging**: Package as an offline, single-binary application via Electron / Tauri.

---

## 📄 Documentation
For detailed technical specifications and design breakdown, refer to [docs/SYNOPSIS.md](docs/SYNOPSIS.md).
