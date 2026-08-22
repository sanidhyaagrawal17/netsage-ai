import React from 'react';
import { useAppContext } from '../context/AppContext';

export default function FloatingStatus() {
  const { state } = useAppContext();

  // 'idle' | 'rules' | 'thinking' | 'streaming' | 'offline'
  const getStatusContent = () => {
    switch (state.aiStatus) {
      case 'idle':
        return { icon: '🟢', text: 'AI Idle', class: 'idle' };
      case 'rules':
        return { icon: '⚡', text: 'Scanning rules...', class: 'rules' };
      case 'thinking':
        return { icon: '🔵', text: 'AI thinking...', class: 'thinking' };
      case 'streaming':
        return { icon: '🔵', text: 'Streaming...', class: 'streaming' };
      case 'offline':
        return { icon: '🔴', text: 'Ollama offline', class: 'offline' };
      default:
        return { icon: '🟢', text: 'AI Idle', class: 'idle' };
    }
  };

  const status = getStatusContent();

  return (
    <div className={`floating-status ${status.class}`}>
      <span className="status-icon">{status.icon}</span>
      <span className="status-text">{status.text}</span>
    </div>
  );
}
