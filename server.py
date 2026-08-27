"""NetSage AI - Modern High-Performance FastAPI Backend Server.

Provides REST APIs for:
- 30 practice cases dataset (/api/cases)
- Live Packet Tracer clipboard buffer (/api/live)
- Multi-tier diagnostic engine (rules + SLM) (/api/diagnose)
- Human-in-the-Loop review logging (/api/review)
- Empirical benchmark dataset (/api/benchmarks)
- Serves modern static web frontend
"""

from __future__ import annotations
import requests

import datetime
import json
import os
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd
import uvicorn
from fastapi import FastAPI, HTTPException
from starlette.middleware.gzip import GZipMiddleware
import threading
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# Local diagnostic engines
from checker import run_all_checks, extract_relevant_context
from llm_engine import log_telemetry_and_audit, query_local_slm, query_local_slm_stream, chat_slm_stream

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
CASES_FILE = BASE_DIR / "cases.csv"
PROMPT_FILE = BASE_DIR / "diagnose_prompt.md"
LIVE_INPUT_FILE = BASE_DIR / "live_cli_input.txt"
RESPONSIBLE_LOG_FILE = BASE_DIR / "responsible_ai_log.csv"
BENCHMARK_LOG_FILE = BASE_DIR / "benchmark_paper_results.csv"

app = FastAPI(title="NetSage AI Copilot API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=500)






def _prewarm_ollama_model():
    """Background pre-warm: Wait 20 seconds so startup is fast, then use 1 thread to quietly load model to RAM."""
    import time
    time.sleep(20.0)  # Wait for system to settle
    try:
        import requests
        url = "http://localhost:11434/api/generate"
        payload = {
            "model": "qwen2.5-coder:3b",
            "prompt": "",  # Empty prompt
            "stream": False,
            "keep_alive": "30m",
            "options": {
                "num_predict": 1,
                "num_ctx": 128,
                "num_thread": 1
            }
        }
        requests.post(url, json=payload, timeout=30.0)
        print("Ollama model pre-warmed into RAM (background pre-warm complete).", flush=True)
    except Exception as exc:
        print(f"Ollama pre-warm notice: {exc}", flush=True)

@app.on_event("startup")
def on_startup():
    import threading
    threading.Thread(target=_prewarm_ollama_model, daemon=True).start()


class TopologyRequest(BaseModel):
    cli_text: str

@app.post("/api/topology/discover")
async def discover_topology(req: TopologyRequest):
    from checker import parse_cdp_neighbors
    topology = parse_cdp_neighbors(req.cli_text)
    if not topology:
        return {"topology": "", "status": "not_found"}
    return {"topology": topology, "status": "success"}

def load_prompt_template() -> str:
    if not PROMPT_FILE.exists():
        return "Diagnose case: {{case_id}} {{show_outputs}}"
    return PROMPT_FILE.read_text(encoding="utf-8")


# --- Request/Response Models ---
class DiagnoseRequest(BaseModel):
    case_id: str
    symptom: str
    topology_note: Optional[str] = ""
    show_outputs: str
    osi_layer: Optional[str] = "Network"
    severity: Optional[str] = "Medium"
    concept_tag: Optional[str] = "manual"
    model_name: Optional[str] = "qwen2.5-coder:3b"
    ollama_host: Optional[str] = "http://localhost:11434"


class ReviewRequest(BaseModel):
    case_id: str
    osi_layer: str
    severity: str
    concept_tag: str
    model_used: str
    is_simulated: bool
    decision: str
    failure_category: str
    root_cause: str
    fix_steps: str
    rule_agreement: bool
    engineer_notes: str
    telemetry: Dict[str, Any] = {}


# --- REST API Endpoints ---


@app.get("/api/models")
def get_available_models():
    """Return list of locally installed Ollama models."""
    try:
        r = requests.get("http://localhost:11434/api/tags", timeout=2.0)
        if r.status_code == 200:
            models = [m.get("name") for m in r.json().get("models", [])]
            return {"online": True, "models": models, "active": "qwen2.5-coder:3b" if "qwen2.5-coder:3b" in models else (models[0] if models else "mock-slm")}
    except Exception:
        pass
    return {"online": False, "models": ["qwen2.5-coder:3b (offline fallback)"], "active": "qwen2.5-coder:3b"}


@app.get("/api/cases")
def get_cases():
    """Return list of 30 standard practice cases."""
    if not CASES_FILE.exists():
        return []
    df = pd.read_csv(CASES_FILE)
    return df.to_dict(orient="records")


@app.get("/api/live")
def get_live_cli():
    """Return current contents of live Packet Tracer CLI buffer."""
    if not LIVE_INPUT_FILE.exists():
        return {
            "exists": False,
            "content": "",
            "mtime": None,
            "age_sec": 99999,
            "is_fresh": False,
        }

    st_stat = LIVE_INPUT_FILE.stat()
    mtime = datetime.datetime.fromtimestamp(st_stat.st_mtime)
    age_sec = (datetime.datetime.now() - mtime).total_seconds()
    try:
        content = LIVE_INPUT_FILE.read_text(encoding="utf-8").strip()
        is_fresh = age_sec < 180 and len(content) > 10
        return {
            "exists": True,
            "content": content,
            "mtime": mtime.strftime("%H:%M:%S"),
            "age_sec": round(age_sec, 1),
            "is_fresh": is_fresh,
        }
    except Exception as e:
        return {
            "exists": False,
            "content": "",
            "mtime": None,
            "age_sec": 99999,
            "is_fresh": False,
            "error": str(e),
        }


@app.post("/api/diagnose")
def run_diagnosis(req: DiagnoseRequest):
    """Run deterministic rule engine + local SLM diagnosis."""
    show_outputs = req.show_outputs or ""
    
    # 1. Deterministic rules
    findings = run_all_checks(show_outputs)
    
    # 2. Extract relevant context (Phase 2 optimization)
    filtered_context = extract_relevant_context(show_outputs, findings)
    
    # 3. Local SLM reasoning
    prompt_template = load_prompt_template()
    case_data = {
        "case_id": req.case_id,
        "symptom": req.symptom,
        "topology_note": req.topology_note or "",
        "show_outputs": filtered_context,
        "osi_layer": req.osi_layer or "Network",
        "severity": req.severity or "Medium",
        "concept_tag": req.concept_tag or "general",
    }

    diagnosis = query_local_slm(
        prompt_template=prompt_template,
        case_data=case_data,
        model_name=req.model_name or "qwen2.5-coder:3b",
        ollama_host=req.ollama_host or "http://localhost:11434",
        deterministic_findings=findings,
        allow_simulation_fallback=True,
    )

    return {
        "case_id": req.case_id,
        "deterministic_findings": findings,
        "diagnosis": diagnosis,
    }


@app.post("/api/diagnose/stream")
def run_diagnosis_stream(req: DiagnoseRequest):
    """Stream diagnosis tokens via SSE."""
    show_outputs = req.show_outputs or ""
    
    # 1. Deterministic rules
    findings = run_all_checks(show_outputs)
    
    # 2. Extract relevant context
    filtered_context = extract_relevant_context(show_outputs, findings)
    
    # 3. Build Case Data
    prompt_template = load_prompt_template()
    case_data = {
        "case_id": req.case_id,
        "symptom": req.symptom,
        "topology_note": req.topology_note or "",
        "show_outputs": filtered_context,
        "osi_layer": req.osi_layer or "Network",
        "severity": req.severity or "Medium",
        "concept_tag": req.concept_tag or "general",
    }

    def generate_events():
        # First send the findings so the UI can update immediately
        yield f"data: {json.dumps({'type': 'findings', 'data': findings})}\n\n"
        
        # Then stream the LLM response
        token_stream = query_local_slm_stream(
            prompt_template=prompt_template,
            case_data=case_data,
            model_name=req.model_name or "qwen2.5-coder:3b",
            ollama_host=req.ollama_host or "http://localhost:11434",
            deterministic_findings=findings,
        )
        
        for token in token_stream:
            # We wrap the token in our own JSON structure
            yield f"data: {json.dumps({'type': 'token', 'token': token})}\n\n"
            
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(generate_events(), media_type="text/event-stream")



class ChatRequest(BaseModel):
    message: str
    context: Optional[str] = ""
    history: Optional[List[Dict[str, str]]] = []
    model_name: Optional[str] = "qwen2.5-coder:3b"
    ollama_host: Optional[str] = "http://localhost:11434"


@app.post("/api/chat/stream")
def run_chat_stream(req: ChatRequest):
    """Stream conversational Copilot assistance via SSE."""
    def generate_chat_events():
        token_stream = chat_slm_stream(
            message=req.message,
            context=req.context or "",
            history=req.history or [],
            model_name=req.model_name or "qwen2.5-coder:3b",
            ollama_host=req.ollama_host or "http://localhost:11434",
        )
        for token in token_stream:
            yield f"data: {json.dumps({'type': 'token', 'token': token})}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(generate_chat_events(), media_type="text/event-stream")


@app.post("/api/review")
def submit_review(req: ReviewRequest):
    """Save human-in-the-loop review and failure taxonomy to responsible_ai_log.csv."""
    review_dict = req.dict()
    review_dict["timestamp"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    log_telemetry_and_audit(review_dict, str(RESPONSIBLE_LOG_FILE))
    return {"status": "success", "message": f"Case {req.case_id} logged successfully."}


@app.get("/api/audit")
def get_audit_logs():
    """Return responsible AI audit data."""
    if not RESPONSIBLE_LOG_FILE.exists():
        return {"exists": False, "records": []}
    df = pd.read_csv(RESPONSIBLE_LOG_FILE)
    df = df.fillna("")
    return {
        "exists": True,
        "records": df.to_dict(orient="records")
    }

@app.get("/api/benchmarks")
def get_benchmarks():
    """Return empirical benchmark data."""
    if not BENCHMARK_LOG_FILE.exists():
        return {"exists": False, "records": []}
    df = pd.read_csv(BENCHMARK_LOG_FILE)
    return {
        "exists": True,
        "records": df.to_dict(orient="records"),
        "summary": {
            "total_cases": len(df),
            "mean_rules_latency_ms": round(df["rules_latency_ms"].mean(), 3),
            "mean_slm_latency_ms": round(df["inference_time_ms"].mean(), 1),
            "mean_throughput_tps": round(df["tokens_per_second"].mean(), 1),
            "mean_process_ram_mb": round(df["process_memory_mb"].mean(), 1),
        },
    }


# Mount static files and root fallback
if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")



# --- Listener Management ---
import subprocess as _sp
_listener_proc = None

@app.post("/api/listener/toggle")
def toggle_listener():
    global _listener_proc
    if _listener_proc and _listener_proc.poll() is None:
        _listener_proc.terminate()
        _listener_proc = None
        return {"status": "stopped", "running": False}
    try:
        _listener_proc = _sp.Popen(
            ["python", "pt_listener.py"],
            cwd=str(Path(__file__).parent),
            creationflags=_sp.CREATE_NO_WINDOW if hasattr(_sp, "CREATE_NO_WINDOW") else 0,
        )
        return {"status": "started", "running": True, "pid": _listener_proc.pid}
    except Exception as e:
        return {"status": "error", "running": False, "detail": str(e)}


def start_listener():
    global _listener_proc
    if _listener_proc and _listener_proc.poll() is None:
        return {"status": "already_running", "pid": _listener_proc.pid}
    try:
        _listener_proc = _sp.Popen(
            ["python", "pt_listener.py"],
            cwd=str(Path(__file__).parent),
            creationflags=_sp.CREATE_NO_WINDOW if hasattr(_sp, "CREATE_NO_WINDOW") else 0,
        )
        return {"status": "started", "pid": _listener_proc.pid}
    except Exception as e:
        return {"status": "error", "detail": str(e)}

def stop_listener():
    global _listener_proc
    if _listener_proc and _listener_proc.poll() is None:
        _listener_proc.terminate()
        _listener_proc = None
        return {"status": "stopped"}
    return {"status": "not_running"}

@app.get("/api/listener/status")
def listener_status():
    global _listener_proc
    running = _listener_proc is not None and _listener_proc.poll() is None
    return {"running": running, "pid": _listener_proc.pid if running else None}

@app.get("/")
def serve_index():
    index_path = STATIC_DIR / "index.html"
    if index_path.exists():
        return FileResponse(str(index_path))
    return JSONResponse({"status": "NetSage AI Backend Live", "docs": "/docs"})


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
