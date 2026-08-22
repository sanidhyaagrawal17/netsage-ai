import React from 'react';
import { useAppContext } from '../context/AppContext';

export default function TelemetryView() {
  const { state } = useAppContext();
  const diagnosis = state.diagnosis;

  if (state.activeView !== 'tab-telemetry') return null;

  return (
    <section className="tab-pane active">
      <div className="content-wrapper">
        <div className="metrics-grid">
          <div className="metric-item">
            <span className="metric-label">Latency (Δt)</span>
            <span className="metric-value">{diagnosis?.diagnosis?.telemetry?.inference_time_ms?.toFixed(1) || '--'} ms</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">Throughput</span>
            <span className="metric-value">{diagnosis?.diagnosis?.telemetry?.tokens_per_second?.toFixed(1) || '--'} t/s</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">Tokens</span>
            <span className="metric-value">{diagnosis?.diagnosis?.telemetry?.output_tokens || '--'}</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">RAM (RSS)</span>
            <span className="metric-value">{diagnosis?.diagnosis?.telemetry?.process_ram_mb?.toFixed(1) || '--'} MB</span>
          </div>
        </div>

        <section className="diag-section" style={{marginTop: '4rem'}}>
          <h3 className="section-title">Deterministic Rules Triggered</h3>
          <div className="rules-list">
            {diagnosis?.deterministic_findings?.length > 0 ? (
              diagnosis.deterministic_findings.map((f, i) => (
                <div key={i} className="rule-item">
                  <div style={{fontSize: '0.875rem', marginBottom: '0.25rem'}}>[{f.rule_id}] {f.title}</div>
                  <div style={{fontSize: '0.8125rem', fontFamily: 'monospace', color: 'var(--text-secondary)'}}>{f.evidence_snippet}</div>
                </div>
              ))
            ) : (
              <p className="text-muted">No rules evaluated yet.</p>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
