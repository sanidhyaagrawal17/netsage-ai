import React from 'react';
import { Terminal, Activity, BarChart3, Clock, Moon, Sun, Shield } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export default function Sidebar() {
  const { state, dispatch } = useAppContext();

  const handleThemeToggle = () => {
    dispatch({ type: 'SET_THEME', payload: state.theme === 'dark' ? 'light' : 'dark' });
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">NetSage AI</div>
      
      <nav className="sidebar-nav">
        <button 
          className={`sidebar-nav-item ${state.activeView === 'tab-input' ? 'active' : ''}`}
          onClick={() => dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'tab-input' })}
        >
          <Terminal size={18} />
          <span>Terminal</span>
        </button>
        
        <button 
          className={`sidebar-nav-item ${state.activeView === 'tab-diagnosis' ? 'active' : ''}`}
          onClick={() => dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'tab-diagnosis' })}
        >
          <Activity size={18} />
          <span>Diagnosis</span>
        </button>
        
        <button 
          className={`sidebar-nav-item ${state.activeView === 'tab-telemetry' ? 'active' : ''}`}
          onClick={() => dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'tab-telemetry' })}
        >
          <BarChart3 size={18} />
          <span>Telemetry</span>
        </button>

        <button 
          className={`sidebar-nav-item ${state.activeView === 'tab-history' ? 'active' : ''}`}
          onClick={() => dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'tab-history' })}
        >
          <Clock size={18} />
          <span>History</span>
        </button>

        <button 
          className={`sidebar-nav-item ${state.activeView === 'tab-audit' ? 'active' : ''}`}
          onClick={() => dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'tab-audit' })}
        >
          <Shield size={18} />
          <span>Audit</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className={`live-indicator ${state.liveStatus.active ? 'active' : ''}`}>
          <span className="live-dot"></span>
          <span>{state.liveStatus.text}</span>
        </div>
        <div className="model-indicator">{state.currentModel}</div>
        <button className="icon-btn theme-toggle" onClick={handleThemeToggle}>
          {state.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </aside>
  );
}
