import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';

export default function TerminalInput() {
  const { state, dispatch } = useAppContext();
  const [isDiagnosing, setIsDiagnosing] = useState(false);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const handleDiagnose = async () => {
    if (!state.cliInput || state.cliInput.startsWith('# Waiting')) {
      alert("Please provide CLI input first.");
      return;
    }
    
    setIsDiagnosing(true);
    dispatch({ type: 'SET_AI_STATUS', payload: 'thinking' });

    try {
      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case_id: 'LIVE-PT-SESSION',
          symptom: 'Capturing live network anomaly from your active Cisco Packet Tracer terminal...',
          show_outputs: state.cliInput,
          osi_layer: 'Network',
        }),
      });
      const data = await res.json();
      dispatch({ type: 'SET_DIAGNOSIS', payload: data });
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'tab-diagnosis' });
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setIsDiagnosing(false);
      dispatch({ type: 'SET_AI_STATUS', payload: 'idle' });
    }
  };

  if (state.activeView !== 'tab-input') return null;

  return (
    <section className="tab-pane active">
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
              <button className="editor-btn" onClick={() => dispatch({ type: 'SET_CLI_INPUT', payload: '' })}>Clear</button>
              <button className="editor-btn" onClick={() => copyToClipboard(state.cliInput)}>Copy</button>
            </div>
          </div>
          <textarea 
            className="terminal-textarea" 
            spellCheck="false" 
            value={state.cliInput}
            onChange={(e) => dispatch({ type: 'SET_CLI_INPUT', payload: e.target.value })}
          />
        </div>

        <div className="action-row">
          <button className="primary-btn" onClick={handleDiagnose} disabled={isDiagnosing}>
            {isDiagnosing ? 'Analyzing...' : 'Run Diagnostic Engine ✦'}
          </button>
        </div>
      </div>
    </section>
  );
}
