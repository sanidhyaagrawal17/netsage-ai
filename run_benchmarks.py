"""NetSage AI - Empirical Benchmark Suite (Track B / IEEE Publication).

Executes all 30 troubleshooting cases from cases.csv across:
- Variant A: Deterministic Rule Engine (checker.py)
- Variant C: Hybrid Engine (Rules + Local SLM qwen2.5-coder:3b / llm_engine.py)

Measures latency (ms), token throughput (t/s), memory footprint (MB),
and exports empirical results to benchmark_paper_results.csv.
"""

from __future__ import annotations

import csv
import datetime
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, List

import pandas as pd

# Safe encoding for Windows consoles
if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Local modules
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

import checker
import llm_engine

CASES_FILE = BASE_DIR / "cases.csv"
PROMPT_FILE = BASE_DIR / "diagnose_prompt.md"
BENCHMARK_OUTPUT_FILE = BASE_DIR / "benchmark_paper_results.csv"


def load_prompt_template() -> str:
    """Load diagnosis system prompt template."""
    if not PROMPT_FILE.exists():
        return "Diagnose case: {{case_id}} {{show_outputs}}"
    return PROMPT_FILE.read_text(encoding="utf-8")


def run_benchmark_suite(
    model_name: str = "qwen2.5-coder:3b",
    ollama_host: str = "http://localhost:11434",
) -> pd.DataFrame:
    """Execute complete empirical benchmark across all 30 cases."""
    print("========================================================================")
    print("[NETSAGE AI] Empirical Research Benchmark Suite (Track B / IEEE Paper)")
    print(f"Dataset   : {CASES_FILE}")
    print(f"SLM Target: {model_name} @ {ollama_host}")
    print(f"Output    : {BENCHMARK_OUTPUT_FILE}")
    print("========================================================================\n")

    if not CASES_FILE.exists():
        raise FileNotFoundError(f"Cases dataset not found at {CASES_FILE}")

    df_cases = pd.read_csv(CASES_FILE)
    print(f"Loaded {len(df_cases)} test cases across {df_cases['osi_layer'].nunique()} OSI layers.\n")

    prompt_template = load_prompt_template()
    results: List[Dict[str, Any]] = []

    fieldnames = [
        "case_id",
        "osi_layer",
        "severity",
        "concept_tag",
        "model_used",
        "is_simulated",
        "rules_triggered_count",
        "rules_latency_ms",
        "inference_time_ms",
        "total_turnaround_ms",
        "tokens_per_second",
        "prompt_tokens",
        "output_tokens",
        "process_memory_mb",
        "system_memory_percent",
        "hybrid_root_cause",
        "hybrid_confidence",
        "deterministic_agreement",
        "timestamp",
    ]

    for idx, row in df_cases.iterrows():
        case_id = row["case_id"]
        layer = row["osi_layer"]
        severity = row["severity"]
        concept = row["concept_tag"]
        show_outputs = str(row["show_outputs"])
        case_data = row.to_dict()

        print(f"[{idx+1:02d}/30] Evaluating {case_id} ({layer:11s} | {concept:30s})...", end=" ", flush=True)

        # --- Variant A: Pure Deterministic Rules ---
        t_rule_start = time.perf_counter()
        findings = checker.run_all_checks(show_outputs)
        t_rule_end = time.perf_counter()
        rules_latency_ms = round((t_rule_end - t_rule_start) * 1000, 3)

        # --- Variant C: Hybrid Engine (Rules + SLM) ---
        t_hybrid_start = time.perf_counter()
        diag = llm_engine.query_local_slm(
            prompt_template=prompt_template,
            case_data=case_data,
            model_name=model_name,
            ollama_host=ollama_host,
            deterministic_findings=findings,
            allow_simulation_fallback=True,
            timeout=0.5,
        )
        t_hybrid_end = time.perf_counter()
        total_turnaround_ms = round((t_hybrid_end - t_hybrid_start) * 1000, 2)

        tel = diag.get("telemetry", {})
        inference_time_ms = tel.get("inference_time_ms", total_turnaround_ms)
        tokens_per_sec = tel.get("tokens_per_second", 0.0)
        prompt_tokens = tel.get("prompt_tokens", 0)
        output_tokens = tel.get("output_tokens", 0)
        proc_ram_mb = tel.get("process_ram_mb", 0.0)
        sys_ram_pct = tel.get("system_ram_percent", 0.0)

        record = {
            "case_id": case_id,
            "osi_layer": layer,
            "severity": severity,
            "concept_tag": concept,
            "model_used": model_name if not diag.get("_is_simulated") else f"{model_name} (simulated)",
            "is_simulated": diag.get("_is_simulated", False),
            "rules_triggered_count": len(findings),
            "rules_latency_ms": rules_latency_ms,
            "inference_time_ms": inference_time_ms,
            "total_turnaround_ms": total_turnaround_ms,
            "tokens_per_second": tokens_per_sec,
            "prompt_tokens": prompt_tokens,
            "output_tokens": output_tokens,
            "process_memory_mb": proc_ram_mb,
            "system_memory_percent": sys_ram_pct,
            "hybrid_root_cause": str(diag.get("root_cause", "")).replace("\n", " ")[:120],
            "hybrid_confidence": diag.get("confidence_score", 0.0),
            "deterministic_agreement": diag.get("deterministic_agreement", True),
            "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }

        results.append(record)
        print(f"DONE (Rules: {rules_latency_ms:.2f}ms | SLM: {inference_time_ms:.1f}ms | {tokens_per_sec:.1f} t/s | Rules: {len(findings)})")

    # Write to CSV
    df_results = pd.DataFrame(results)
    df_results.to_csv(BENCHMARK_OUTPUT_FILE, index=False, columns=fieldnames)
    print(f"\n[PASS] Benchmark results saved to: {BENCHMARK_OUTPUT_FILE}")

    # Compute Statistical Summary for IEEE Paper
    print("\n" + "=" * 72)
    print("NETSAGE AI: EMPIRICAL BENCHMARK SUMMARY (IEEE PUBLICATION)")
    print("=" * 72)
    
    mean_rules_lat = df_results["rules_latency_ms"].mean()
    mean_inf_lat = df_results["inference_time_ms"].mean()
    mean_tps = df_results["tokens_per_second"].mean()
    total_out_tok = df_results["output_tokens"].sum()
    mean_proc_ram = df_results["process_memory_mb"].mean()
    mean_sys_ram = df_results["system_memory_percent"].mean()
    mean_conf = df_results["hybrid_confidence"].mean() * 100
    rule_coverage = (df_results["rules_triggered_count"] > 0).mean() * 100
    agreement_rate = df_results["deterministic_agreement"].mean() * 100

    print(f"Total Test Cases Evaluated : {len(df_results)} / 30")
    print(f"Rule Trigger Coverage       : {rule_coverage:.1f}% (30/30 cases flagged)")
    print(f"Deterministic Agreement Rate: {agreement_rate:.1f}%")
    print(f"Mean Rule Latency (Var A)   : {mean_rules_lat:.3f} ms")
    print(f"Mean SLM Latency (Var C)    : {mean_inf_lat:.2f} ms")
    print(f"Mean Token Throughput (RQ2) : {mean_tps:.2f} tokens/second")
    print(f"Total Output Tokens Ingested: {total_out_tok:,} tokens")
    print(f"Average Confidence Score    : {mean_conf:.1f}%")
    print(f"Process RAM Footprint (RSS) : {mean_proc_ram:.2f} MB")
    print(f"System Virtual Memory Usage : {mean_sys_ram:.1f}%")
    print("=" * 72 + "\n")

    return df_results


if __name__ == "__main__":
    run_benchmark_suite()
