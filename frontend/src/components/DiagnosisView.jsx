import React from 'react';
import { useAppContext } from '../context/AppContext';

export default function DiagnosisView() {
  const { state } = useAppContext();
  const diagnosis = state.diagnosis;

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  if (state.activeView !== 'tab-diagnosis') return null;

  return (
    <section className="tab-pane active">
      <div className="content-wrapper">
        {!diagnosis ? (
          <div className="empty-state">No diagnosis run yet. Return to Terminal to analyze a trace.</div>
        ) : (
          <div className="diagnosis-content">
            <header className="diag-header">
              <div className="diag-meta">
                <span>{diagnosis.diagnosis?.osi_layer || 'Layer 3'}</span>
                <span className="dot-sep">•</span>
                <span>{Math.round((diagnosis.diagnosis?.confidence_score || 0.9) * 100)}% Confidence</span>
              </div>
              <h1 className="diag-title">{diagnosis.diagnosis?.root_cause || 'Configuration Anomaly'}</h1>
            </header>

            <section className="diag-section">
              <h3 className="section-title">Evidence</h3>
              <pre className="evidence-block">{diagnosis.diagnosis?.cli_evidence_quote || 'N/A'}</pre>
            </section>

            <section className="diag-section">
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
                <h3 className="section-title">Remediation Steps</h3>
                <button className="editor-btn" onClick={() => copyToClipboard((diagnosis.diagnosis?.fix_steps || []).join('\n'))}>Copy All</button>
              </div>
              <div className="steps-list">
                {(diagnosis.diagnosis?.fix_steps || []).map((step, i) => (
                  <div key={i} className="step-item">
                    <span className="step-cmd">{step}</span>
                    <button className="editor-btn" onClick={() => copyToClipboard(step)}>Copy</button>
                  </div>
                ))}
              </div>
            </section>

            <footer className="approval-footer">
              <button className="gate-btn accept" onClick={() => alert('Approved')}>Approve Fix</button>
              <button className="gate-btn edit">Adjust</button>
              <button className="gate-btn">Report Issue</button>
            </footer>
          </div>
        )}
      </div>
    </section>
  );
}
