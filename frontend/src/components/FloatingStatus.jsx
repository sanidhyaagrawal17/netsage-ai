import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';

export default function FloatingStatus() {
  const { state, dispatch } = useAppContext();
  const [expanded, setExpanded] = useState(false);

  const getStatusContent = () => {
    switch (state.aiStatus) {
      case 'idle': return { icon: '🟢', text: 'AI Idle', class: 'idle' };
      case 'rules': return { icon: '⚡', text: 'Scanning rules...', class: 'rules' };
      case 'thinking': return { icon: '🔵', text: 'AI thinking...', class: 'thinking' };
      case 'streaming': return { icon: '🔵', text: 'Streaming...', class: 'streaming' };
      case 'offline': return { icon: '🔴', text: 'Ollama offline', class: 'offline' };
      default: return { icon: '🟢', text: 'AI Idle', class: 'idle' };
    }
  };

  const status = getStatusContent();

  // For demo purposes, allow clicking the widget to cycle states when expanded
  const cycleState = (e) => {
    e.stopPropagation();
    const states = ['idle', 'rules', 'thinking', 'streaming', 'offline'];
    const currentIndex = states.indexOf(state.aiStatus);
    const nextState = states[(currentIndex + 1) % states.length];
    dispatch({ type: 'SET_AI_STATUS', payload: nextState });
  };

  return (
    <div 
      className={`floating-status ${status.class} ${expanded ? 'expanded' : ''}`}
      onClick={() => setExpanded(!expanded)}
      style={{ cursor: 'pointer' }}
    >
      <div className="status-header">
        <span className="status-icon">{status.icon}</span>
        <span className="status-text">{status.text}</span>
      </div>
      
      {expanded && (
        <div className="status-details" style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span>Model:</span>
            <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{state.currentModel}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span>Last Sync:</span>
            <span>{state.liveStatus.active ? 'Just now' : 'Unknown'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <span>API Port:</span>
            <span>8000</span>
          </div>
          
          <button 
            className="primary-btn" 
            style={{ width: '100%', justifyContent: 'center', padding: '0.4rem', fontSize: '0.7rem' }}
            onClick={cycleState}
          >
            Demo: Cycle State
          </button>
        </div>
      )}
    </div>
  );
}
