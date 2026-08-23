"""NetSage AI - Local Small Language Model (SLM) Inference & Telemetry Engine (Phase 2).

Provides communication with local Ollama instances (e.g. qwen2.5-coder:3b,
llama3.2:3b), prompt assembly, strict JSON parsing, native execution telemetry
instrumentation (RQ2), system memory profiling, and responsible AI audit logging.
"""

from __future__ import annotations

import csv
import datetime
import json
import logging
import os
import re
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests

try:
    import psutil
except ImportError:
    psutil = None

logger = logging.getLogger(__name__)


def get_memory_telemetry() -> Dict[str, float]:
    """Capture current process and global system RAM metrics for empirical telemetry."""
    if psutil is not None:
        try:
            proc_ram_mb = psutil.Process().memory_info().rss / (1024 * 1024)
            sys_ram_pct = psutil.virtual_memory().percent
            return {
                "process_ram_mb": round(proc_ram_mb, 2),
                "system_ram_percent": round(sys_ram_pct, 1),
            }
        except Exception:
            pass
    return {
        "process_ram_mb": 0.0,
        "system_ram_percent": 0.0,
    }


def clean_json_response(raw_text: str) -> Dict[str, Any]:
    """Extract and parse JSON object from raw LLM output text.

    Handles markdown fences (```json ... ```), preamble text, and minor syntax anomalies.
    """
    if not raw_text or not raw_text.strip():
        raise ValueError("LLM returned empty response")

    text = raw_text.strip()

    if "```" in text:
        match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL | re.IGNORECASE)
        if match:
            text = match.group(1).strip()
        else:
            text = re.sub(r"^```[a-zA-Z]*\n", "", text)
            text = re.sub(r"\n```$", "", text).strip()

    json_match = re.search(r"(\{.*\})", text, re.DOTALL)
    if json_match:
        text = json_match.group(1).strip()

    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed
        raise ValueError(f"Expected JSON object, got {type(parsed).__name__}")
    except json.JSONDecodeError as exc:
        logger.warning(f"Standard JSON decode failed: {exc}. Attempting sanitization.")
        sanitized = re.sub(r",\s*([\]}])", r"\1", text)
        try:
            return json.loads(sanitized)
        except Exception as inner_exc:
            raise ValueError(
                f"Failed to parse JSON response from LLM. Raw output snippet: {raw_text[:200]}..."
            ) from inner_exc


def build_prompt(
    prompt_template: str,
    case_data: Dict[str, Any],
    deterministic_findings: Optional[List[Dict[str, Any]]] = None,
) -> str:
    """Inject case attributes and deterministic findings into the prompt template."""
    findings_json = json.dumps(deterministic_findings or [], indent=2)

    prompt = prompt_template
    prompt = prompt.replace("{{case_id}}", str(case_data.get("case_id", "CASE-UNKNOWN")))
    prompt = prompt.replace("{{symptom}}", str(case_data.get("symptom", "N/A")))
    prompt = prompt.replace("{{topology_note}}", str(case_data.get("topology_note", "N/A")))
    prompt = prompt.replace("{{show_outputs}}", str(case_data.get("show_outputs", "N/A")))
    prompt = prompt.replace("{{deterministic_findings}}", findings_json)

    return prompt


def simulate_fallback_diagnosis(
    case_data: Dict[str, Any],
    deterministic_findings: Optional[List[Dict[str, Any]]] = None,
    elapsed_ms: float = 45.0,
) -> Dict[str, Any]:
    """Provide a deterministic simulation diagnosis when the local SLM is unreachable."""
    case_id = case_data.get("case_id", "CASE-SIM")
    expected_fault = case_data.get("expected_fault", "Investigate network configuration and status.")
    osi_layer = case_data.get("osi_layer", "Network")

    findings = deterministic_findings or []
    if findings:
        primary = findings[0]
        root_cause = primary.get("description", expected_fault)
        evidence = primary.get("evidence_snippet", "Detected via deterministic rule engine")
        layer = primary.get("layer", osi_layer)
    else:
        root_cause = expected_fault
        evidence = "Inferred from case topology and symptoms."
        layer = osi_layer

    mock_fix_steps = [
        "Review interface and VLAN configuration across affected devices",
        "Execute corrective CLI commands matching deterministic rule recommendation",
        "Verify state restoration with show commands and ping connectivity tests",
    ]

    estimated_output_text = f"{root_cause} {evidence} {' '.join(mock_fix_steps)}"
    word_count = len(estimated_output_text.split())
    est_tokens = max(int(word_count / 0.75), 45)
    est_sec = max(elapsed_ms / 1000.0, 0.05)
    tps = round(est_tokens / est_sec, 2)

    mem = get_memory_telemetry()

    return {
        "case_id": case_id,
        "root_cause": f"[Offline Simulation] {root_cause}",
        "osi_layer": layer,
        "confidence_score": 0.90,
        "cli_evidence_quote": evidence,
        "fix_steps": mock_fix_steps,
        "verification_commands": [
            "show ip interface brief",
            "show interfaces status",
        ],
        "deterministic_agreement": True,
        "_is_simulated": True,
        "_note": "Ollama server not reachable; diagnosis generated via deterministic fallback engine.",
        "telemetry": {
            "inference_time_ms": round(elapsed_ms, 2),
            "prompt_tokens": max(int(len(str(case_data)) / 4), 100),
            "output_tokens": est_tokens,
            "tokens_per_second": tps,
            "process_ram_mb": mem["process_ram_mb"],
            "system_ram_percent": mem["system_ram_percent"],
            "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        },
    }


def query_local_slm_stream(
    prompt_template: str,
    case_data: Dict[str, Any],
    model_name: str = "qwen2.5-coder:3b",
    ollama_host: str = "http://localhost:11434",
    deterministic_findings: Optional[List[Dict[str, Any]]] = None,
):
    """Generator that yields tokens from Ollama in streaming mode."""
    full_prompt = build_prompt(prompt_template, case_data, deterministic_findings)
    endpoint = f"{ollama_host.rstrip('/')}/api/generate"

    payload = {
        "model": model_name,
        "prompt": full_prompt,
        "stream": True,
        "format": "json",
        "options": {
            "temperature": 0.1,
            "top_p": 0.9,
            "num_ctx": 8192,
        },
    }

    try:
        response = requests.post(endpoint, json=payload, stream=True, timeout=10.0)
        response.raise_for_status()
        
        for line in response.iter_lines():
            if line:
                data = json.loads(line)
                token = data.get("response", "")
                if token:
                    yield token
                    
    except Exception as exc:
        logger.error(f"Error querying SLM (Stream): {exc}")
        # Yield a fallback simulated response in chunks if offline
        simulated = simulate_fallback_diagnosis(case_data, deterministic_findings, 500)
        simulated_str = json.dumps(simulated)
        # Yield it in chunks of 50 chars to simulate streaming
        for i in range(0, len(simulated_str), 50):
            yield simulated_str[i:i+50]
            time.sleep(0.05)


def query_local_slm(
    prompt_template: str,
    case_data: Dict[str, Any],
    model_name: str = "qwen2.5-coder:3b",
    ollama_host: str = "http://localhost:11434",
    deterministic_findings: Optional[List[Dict[str, Any]]] = None,
    timeout: float = 30.0,
    allow_simulation_fallback: bool = True,
) -> Dict[str, Any]:
    r"""Send structured prompt to local Ollama SLM and return validated JSON with native telemetry.

    Captures:
    - Inference latency ($\Delta t$ ms)
    - Output token count (`eval_count`)
    - Throughput ($t/s = \frac{\text{eval\_count}}{\text{eval\_duration} / 10^9}$)
    - Process RAM and system memory metrics.
    """
    full_prompt = build_prompt(prompt_template, case_data, deterministic_findings)
    endpoint = f"{ollama_host.rstrip('/')}/api/generate"

    payload = {
        "model": model_name,
        "prompt": full_prompt,
        "stream": False,
        "format": "json",
        "options": {
            "temperature": 0.1,
            "top_p": 0.9,
        },
    }

    start_time = time.perf_counter()

    try:
        response = requests.post(endpoint, json=payload, timeout=(2.0, timeout))
        response.raise_for_status()
        end_time = time.perf_counter()

        data = response.json()
        raw_response = data.get("response", "")
        parsed_result = clean_json_response(raw_response)

        # Native Ollama Telemetry Extraction (RQ2)
        eval_count = data.get("eval_count")
        eval_duration_ns = data.get("eval_duration")
        prompt_eval_count = data.get("prompt_eval_count", int(len(full_prompt) / 4))
        total_duration_ns = data.get("total_duration")

        if eval_count is not None and eval_duration_ns is not None and eval_duration_ns > 0:
            eval_duration_sec = eval_duration_ns / 1e9
            tokens_per_sec = round(eval_count / eval_duration_sec, 2)
            inference_time_ms = round((total_duration_ns or eval_duration_ns) / 1e6, 2)
            out_tokens = eval_count
        else:
            elapsed_sec = max(end_time - start_time, 0.001)
            inference_time_ms = round(elapsed_sec * 1000, 2)
            out_tokens = max(int(len(raw_response.split()) / 0.75), 20)
            tokens_per_sec = round(out_tokens / elapsed_sec, 2)

        mem = get_memory_telemetry()

        parsed_result["_is_simulated"] = False
        parsed_result["_model_used"] = model_name
        parsed_result["telemetry"] = {
            "inference_time_ms": inference_time_ms,
            "prompt_tokens": prompt_eval_count,
            "output_tokens": out_tokens,
            "tokens_per_second": tokens_per_sec,
            "process_ram_mb": mem["process_ram_mb"],
            "system_ram_percent": mem["system_ram_percent"],
            "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }

        return parsed_result

    except requests.exceptions.ConnectionError as exc:
        logger.warning(f"Ollama connection refused at {ollama_host}: {exc}")
        if allow_simulation_fallback:
            elapsed_ms = (time.perf_counter() - start_time) * 1000
            return simulate_fallback_diagnosis(case_data, deterministic_findings, elapsed_ms)
        raise ConnectionError(
            f"Could not connect to Ollama at {ollama_host}. Please ensure 'ollama serve' is running."
        ) from exc

    except requests.exceptions.Timeout as exc:
        logger.warning(f"Ollama request timed out after {timeout}s: {exc}")
        if allow_simulation_fallback:
            elapsed_ms = (time.perf_counter() - start_time) * 1000
            return simulate_fallback_diagnosis(case_data, deterministic_findings, elapsed_ms)
        raise TimeoutError(f"Ollama inference timed out after {timeout} seconds.") from exc

    except Exception as exc:
        logger.error(f"Error querying SLM: {exc}")
        if allow_simulation_fallback:
            elapsed_ms = (time.perf_counter() - start_time) * 1000
            return simulate_fallback_diagnosis(case_data, deterministic_findings, elapsed_ms)
        raise


def log_telemetry_and_audit(
    review_record: Dict[str, Any],
    log_file_path: str = "responsible_ai_log.csv",
) -> None:
    """Append structured performance telemetry and HITL failure taxonomy to responsible_ai_log.csv.

    Args:
        review_record: Dict containing case review, telemetry, and failure category fields.
        log_file_path: Target CSV path.
    """
    fieldnames = [
        "timestamp",
        "case_id",
        "osi_layer",
        "severity",
        "concept_tag",
        "model_used",
        "is_simulated",
        "inference_time_ms",
        "prompt_tokens",
        "output_tokens",
        "tokens_per_second",
        "process_ram_mb",
        "system_ram_percent",
        "decision",
        "failure_category",
        "rule_agreement",
        "engineer_notes",
    ]

    telemetry = review_record.get("telemetry", {})
    row_data = {
        "timestamp": review_record.get("timestamp", datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
        "case_id": review_record.get("case_id", "N/A"),
        "osi_layer": review_record.get("osi_layer", "N/A"),
        "severity": review_record.get("severity", "N/A"),
        "concept_tag": review_record.get("concept_tag", "N/A"),
        "model_used": review_record.get("model_used", "qwen2.5-coder:3b"),
        "is_simulated": review_record.get("is_simulated", False),
        "inference_time_ms": telemetry.get("inference_time_ms", 0.0),
        "prompt_tokens": telemetry.get("prompt_tokens", 0),
        "output_tokens": telemetry.get("output_tokens", 0),
        "tokens_per_second": telemetry.get("tokens_per_second", 0.0),
        "process_ram_mb": telemetry.get("process_ram_mb", 0.0),
        "system_ram_percent": telemetry.get("system_ram_percent", 0.0),
        "decision": review_record.get("decision", "Pending"),
        "failure_category": review_record.get("failure_category", "None / Valid AI Diagnosis"),
        "rule_agreement": review_record.get("rule_agreement", True),
        "engineer_notes": review_record.get("engineer_notes", ""),
    }

    file_exists = os.path.exists(log_file_path)
    with open(log_file_path, mode="a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        if not file_exists or os.path.getsize(log_file_path) == 0:
            writer.writeheader()
        writer.writerow(row_data)


if __name__ == "__main__":
    sample_case = {
        "case_id": "CASE-021",
        "symptom": "Branch ACL blocks all traffic.",
        "topology_note": "Branch R1",
        "show_outputs": "access-list 50 permit 10.10.0.0 255.255.255.0",
        "expected_fault": "Inverted wildcard mask",
        "osi_layer": "Transport",
    }
    sample_template = "Diagnose case: {{case_id}} {{show_outputs}}"
    result = query_local_slm(sample_template, sample_case)
    print("Diagnosis Result with Telemetry:")
    print(json.dumps(result, indent=2))
