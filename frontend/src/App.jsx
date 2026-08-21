import React, { useState, useEffect } from 'react';
import './index.css';

export default function App() {
  const [currentMode, setCurrentMode] = useState('live');
  const [activeTab, setActiveTab] = useState('tab-input');
  const [theme, setTheme] = useState(localStorage.getItem('netsage_theme') || 'dark');
  const [cliInput, setCliInput] = useState('# Waiting for Packet Tracer CLI capture...\n# 1. Start python pt_listener.py\n# 2. Copy any show-command output in Packet Tracer.');
  const [liveStatus, setLiveStatus] = useState({ active: false, text: 'Standby' });
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosis, setDiagnosis] = useState(null);

  // Theme Sync
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('netsage_theme', theme);
  }, [theme]);

  // Live Poller
  useEffect(() => {
    if (currentMode !== 'live') return;
    const poll = async () => {
      try {
        const res = await fetch('/api/live');
        const data = await res.json();
        if (data.exists && data.is_fresh) {
          setLiveStatus({ active: true, text: 'Live Sync' });
          setCliInput(data.content);
        } else {
          setLiveStatus({ active: false, text: 'Standby' });
        }
      } catch (e) {
        console.error('Poll error', e);
      }
    };
    const interval = setInterval(poll, 1200);
    poll();
    return () => clearInterval(interval);
  }, [currentMode]);

  const handleDiagnose = async () => {
    if (!cliInput || cliInput.startsWith('# Waiting')) {
      alert("Please provide CLI input first.");
      return;
    }
    setIsDiagnosing(true);
    try {
      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case_id: 'LIVE-PT-SESSION',
          symptom: 'Capturing live network anomaly from your active Cisco Packet Tracer terminal...',
          show_outputs: cliInput,
          osi_layer: 'Network',
        }),
      });
      const data = await res.json();
      setDiagnosis(data);
      setActiveTab('tab-diagnosis');
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setIsDiagnosing(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <>
      <nav className="top-nav">
        <div className="brand">NetSage</div>
        <div className="nav-center">
          <button className={`nav-tab ${activeTab === 'tab-input' ? 'active' : ''}`} onClick={() => setActiveTab('tab-input')}>Input</button>
          <button className={`nav-tab ${activeTab === 'tab-diagnosis' ? 'active' : ''}`} onClick={() => setActiveTab('tab-diagnosis')}>Diagnosis</button>
          <button className={`nav-tab ${activeTab === 'tab-telemetry' ? 'active' : ''}`} onClick={() => setActiveTab('tab-telemetry')}>Telemetry</button>
        </div>
        <div className="nav-right">
          <div className={`live-indicator ${liveStatus.active ? 'active' : ''}`}>
            <span className="live-dot"></span>
            <span>{liveStatus.text}</span>
          </div>
          <button className="icon-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>🌓</button>
        </div>
      </nav>

      <main className="main-content">
        {/* INPUT TAB */}
        <section className={`tab-pane ${activeTab === 'tab-input' ? 'active' : ''}`}>
          <div className="content-wrapper">
            <div className="meta-section">
              <p className="meta-label">Symptom</p>
              <p className="meta-value">Capturing live network anomaly from your active Cisco Packet Tracer terminal...</p>
              <p className="meta-sub">Cisco Packet Tracer live lab session.</p>
            </div>

            <div className="classic-terminal">
              <div className="terminal-header">
                <div className="terminal-dots">
                  <span></span><span></span><span></span>
                </div>
                <div className="terminal-title">cisco-ios-cli — NetSage</div>
                <div className="editor-actions">
                  <button className="editor-btn" onClick={() => setCliInput('')}>Clear</button>
                  <button className="editor-btn" onClick={() => copyToClipboard(cliInput)}>Copy</button>
                </div>
              </div>
              <textarea 
                className="terminal-textarea" 
                spellCheck="false" 
                value={cliInput}
                onChange={(e) => setCliInput(e.target.value)}
              />
            </div>

            <div className="action-row">
              <button className="primary-btn" onClick={handleDiagnose} disabled={isDiagnosing}>
                {isDiagnosing ? 'Analyzing...' : 'Run Diagnostic Engine ↵'}
              </button>
            </div>
          </div>
        </section>

        {/* DIAGNOSIS TAB */}
        <section className={`tab-pane ${activeTab === 'tab-diagnosis' ? 'active' : ''}`}>
          <div className="content-wrapper">
            {!diagnosis ? (
              <div className="empty-state">No diagnosis run yet. Return to Input to analyze a trace.</div>
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

        {/* TELEMETRY TAB */}
        <section className={`tab-pane ${activeTab === 'tab-telemetry' ? 'active' : ''}`}>
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
      </main>
    </>
  );
}
