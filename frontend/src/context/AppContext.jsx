import React, { createContext, useContext, useReducer, useEffect } from 'react';

const AppContext = createContext();

const initialState = {
  activeView: 'tab-input',
  theme: localStorage.getItem('netsage_theme') || 'dark',
  liveStatus: { active: false, text: 'Standby' },
  aiStatus: 'idle', // 'idle' | 'rules' | 'thinking' | 'streaming' | 'offline'
  diagnosis: null,
  diagnosisHistory: [], // Placeholder for phase 3
  cliInput: '# Waiting for Packet Tracer CLI capture...\n# 1. Start python pt_listener.py\n# 2. Copy any show-command output in Packet Tracer.',
  currentModel: 'llama3.1:8b',
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_ACTIVE_VIEW':
      return { ...state, activeView: action.payload };
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'SET_LIVE_STATUS':
      return { ...state, liveStatus: action.payload };
    case 'SET_AI_STATUS':
      return { ...state, aiStatus: action.payload };
    case 'SET_DIAGNOSIS':
      return { ...state, diagnosis: action.payload };
    case 'SET_CLI_INPUT':
      return { ...state, cliInput: action.payload };
    case 'SET_CURRENT_MODEL':
      return { ...state, currentModel: action.payload };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Theme Sync
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme);
    localStorage.setItem('netsage_theme', state.theme);
  }, [state.theme]);

  // Live Poller
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('/api/live');
        const data = await res.json();
        if (data.exists && data.is_fresh) {
          dispatch({ type: 'SET_LIVE_STATUS', payload: { active: true, text: 'Live Sync' } });
          dispatch({ type: 'SET_CLI_INPUT', payload: data.content });
        } else {
          dispatch({ type: 'SET_LIVE_STATUS', payload: { active: false, text: 'Standby' } });
        }
      } catch (e) {
        console.error('Poll error', e);
      }
    };
    const interval = setInterval(poll, 1200);
    poll();
    return () => clearInterval(interval);
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
