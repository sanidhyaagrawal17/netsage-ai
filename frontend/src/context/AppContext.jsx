import React, { createContext, useContext, useReducer, useEffect } from 'react';

const AppContext = createContext();

const initialHistory = (() => {
  try {
    const saved = localStorage.getItem('netsage_history');
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
})();

const defaultWelcomeMessage = {
  id: 'welcome-1',
  role: 'assistant',
  content: 'Hello! I am **NetSage Copilot**.\n\nI can explain network anomalies, decode Cisco IOS CLI outputs, and guide you through Packet Tracer configuration fixes. What would you like to explore?',
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
};

const createFreshSession = (customTitle = null) => {
  const id = 'session-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
  return {
    id,
    title: customTitle || 'New Conversation',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [{ ...defaultWelcomeMessage, id: 'welcome-' + Date.now() }]
  };
};

const { initialSessions, initialActiveId } = (() => {
  try {
    const saved = localStorage.getItem('netsage_chat_sessions');
    const sessions = saved ? JSON.parse(saved) : [];
    if (Array.isArray(sessions) && sessions.length > 0) {
      const savedActive = localStorage.getItem('netsage_active_chat_id');
      const activeExists = sessions.some(s => s.id === savedActive);
      return {
        initialSessions: sessions,
        initialActiveId: activeExists ? savedActive : sessions[0].id
      };
    }
  } catch (e) {}
  const fresh = createFreshSession();
  return {
    initialSessions: [fresh],
    initialActiveId: fresh.id
  };
})();

const initialActiveSession = initialSessions.find(s => s.id === initialActiveId) || initialSessions[0];

const initialState = {
  activeView: 'tab-input',
  theme: localStorage.getItem('netsage_theme') || 'dark',
  liveStatus: { active: false, text: 'Standby' },
  backendConnected: true,
  isCopilotStreaming: false,
  isPillDocked: true,
  aiStatus: 'idle', // 'idle' | 'rules' | 'thinking' | 'streaming' | 'offline'
  diagnosis: null,
  streamedRaw: '',
  diagnosisHistory: initialHistory,
  chatSessions: initialSessions,
  activeSessionId: initialActiveId,
  chatMessages: initialActiveSession ? initialActiveSession.messages : [defaultWelcomeMessage],
  pendingCopilotPrompt: '',
  cliInput: '# Waiting for Packet Tracer CLI capture...\n# 1. Start python pt_listener.py\n# 2. Copy any show-command output in Packet Tracer.',
  currentModel: 'qwen2.5-coder:3b',
  isCopilotOpen: true,
  isSidebarCollapsed: false,
  isListenerRunning: false,
};

function syncSessions(sessions, activeId) {
  try {
    localStorage.setItem('netsage_chat_sessions', JSON.stringify(sessions));
    localStorage.setItem('netsage_active_chat_id', activeId);
  } catch (e) {}
}

function autoTitleSession(session, messages) {
  if (session.title && session.title !== 'New Conversation') return session.title;
  const firstUser = messages.find(m => m.role === 'user');
  if (!firstUser || !firstUser.content) return 'New Conversation';
  const clean = firstUser.content.trim().replace(/^[^a-zA-Z0-9]+/, '');
  const title = clean.split('\n')[0].substring(0, 36);
  return title.length > 2 ? (title + (clean.length > 36 ? '...' : '')) : 'New Conversation';
}

function updateActiveSessionInList(sessions, activeId, updatedMessages) {
  return sessions.map(s => {
    if (s.id === activeId) {
      const newTitle = autoTitleSession(s, updatedMessages);
      return {
        ...s,
        title: newTitle,
        updatedAt: new Date().toISOString(),
        messages: updatedMessages
      };
    }
    return s;
  });
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_ACTIVE_VIEW':
      return { ...state, activeView: action.payload };
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'SET_LIVE_STATUS':
      return { ...state, liveStatus: action.payload };
    case 'SET_LISTENER_RUNNING':
      return { ...state, isListenerRunning: action.payload };
    case 'SET_BACKEND_CONNECTED':
      return { ...state, backendConnected: action.payload };
    case 'SET_COPILOT_STREAMING':
      return { ...state, isCopilotStreaming: action.payload };
    case 'SET_PILL_DOCKED':
      return { ...state, isPillDocked: action.payload };
    case 'TOGGLE_PILL_DOCK':
      return { ...state, isPillDocked: !state.isPillDocked };
    case 'SET_AI_STATUS':
      return { ...state, aiStatus: action.payload };
    case 'SET_DIAGNOSIS':
      return { ...state, diagnosis: action.payload };
    case 'SET_STREAMED_RAW':
      return { ...state, streamedRaw: action.payload };
    case 'SET_CLI_INPUT':
      return { ...state, cliInput: action.payload };
    case 'SET_CURRENT_MODEL':
      return { ...state, currentModel: action.payload };
    case 'TOGGLE_COPILOT':
      return { ...state, isCopilotOpen: !state.isCopilotOpen };
    case 'SET_COPILOT_OPEN':
      return { ...state, isCopilotOpen: action.payload };
    case 'SET_TOPOLOGY_NOTE':
      return { ...state, topologyNote: action.payload };
    case 'TOGGLE_SIDEBAR':
      return { ...state, isSidebarCollapsed: !state.isSidebarCollapsed };
    case 'SET_SIDEBAR_COLLAPSED':
      return { ...state, isSidebarCollapsed: action.payload };
    case 'ADD_HISTORY_ENTRY': {
      const updated = [action.payload, ...state.diagnosisHistory.filter(h => h.id !== action.payload.id)].slice(0, 50);
      try { localStorage.setItem('netsage_history', JSON.stringify(updated)); } catch (e) {}
      return { ...state, diagnosisHistory: updated };
    }
    case 'UPDATE_HISTORY_ENTRY': {
      const updated = state.diagnosisHistory.map(h => h.id === action.payload.id ? { ...h, ...action.payload.updates } : h);
      try { localStorage.setItem('netsage_history', JSON.stringify(updated)); } catch (e) {}
      return { ...state, diagnosisHistory: updated };
    }
    case 'DELETE_HISTORY_ENTRY': {
      const updated = state.diagnosisHistory.filter(h => h.id !== action.payload);
      try { localStorage.setItem('netsage_history', JSON.stringify(updated)); } catch (e) {}
      return { ...state, diagnosisHistory: updated };
    }
    case 'CLEAR_HISTORY': {
      try { localStorage.removeItem('netsage_history'); } catch (e) {}
      return { ...state, diagnosisHistory: [] };
    }

    // ==========================================
    // CHAT & SESSION MANAGEMENT
    // ==========================================
    case 'CREATE_NEW_CHAT_SESSION': {
      const newSession = createFreshSession(action.payload?.title);
      const updatedSessions = [newSession, ...state.chatSessions];
      syncSessions(updatedSessions, newSession.id);
      return {
        ...state,
        chatSessions: updatedSessions,
        activeSessionId: newSession.id,
        chatMessages: newSession.messages,
        isCopilotOpen: true
      };
    }
    case 'SWITCH_CHAT_SESSION': {
      const targetId = action.payload;
      const targetSession = state.chatSessions.find(s => s.id === targetId);
      if (!targetSession) return state;
      syncSessions(state.chatSessions, targetId);
      return {
        ...state,
        activeSessionId: targetId,
        chatMessages: targetSession.messages,
        isCopilotOpen: true
      };
    }
    case 'DELETE_CHAT_SESSION': {
      const targetId = action.payload;
      const remainingSessions = state.chatSessions.filter(s => s.id !== targetId);
      if (remainingSessions.length === 0) {
        const fresh = createFreshSession();
        syncSessions([fresh], fresh.id);
        return {
          ...state,
          chatSessions: [fresh],
          activeSessionId: fresh.id,
          chatMessages: fresh.messages
        };
      }
      let nextActiveId = state.activeSessionId;
      let nextMessages = state.chatMessages;
      if (state.activeSessionId === targetId) {
        nextActiveId = remainingSessions[0].id;
        nextMessages = remainingSessions[0].messages;
      }
      syncSessions(remainingSessions, nextActiveId);
      return {
        ...state,
        chatSessions: remainingSessions,
        activeSessionId: nextActiveId,
        chatMessages: nextMessages
      };
    }
    case 'RENAME_CHAT_SESSION': {
      const { sessionId, title } = action.payload;
      const updatedSessions = state.chatSessions.map(s => s.id === sessionId ? { ...s, title: title.trim() || 'Untitled Chat' } : s);
      syncSessions(updatedSessions, state.activeSessionId);
      return { ...state, chatSessions: updatedSessions };
    }
    case 'ADD_CHAT_MESSAGE': {
      const updatedMessages = [...state.chatMessages, action.payload];
      const updatedSessions = updateActiveSessionInList(state.chatSessions, state.activeSessionId, updatedMessages);
      syncSessions(updatedSessions, state.activeSessionId);
      return {
        ...state,
        chatMessages: updatedMessages,
        chatSessions: updatedSessions
      };
    }
    case 'SET_CHAT_MESSAGES': {
      const updatedMessages = action.payload;
      const updatedSessions = updateActiveSessionInList(state.chatSessions, state.activeSessionId, updatedMessages);
      syncSessions(updatedSessions, state.activeSessionId);
      return {
        ...state,
        chatMessages: updatedMessages,
        chatSessions: updatedSessions
      };
    }
    case 'BRANCH_CHAT_MESSAGE': {
      const { userMsgIndex, newPrompt, newAssistantMsgId } = action.payload;
      const msgs = [...state.chatMessages];
      const targetUser = msgs[userMsgIndex];
      const targetAssistant = msgs[userMsgIndex + 1];

      const userVersions = targetUser.versions ? [...targetUser.versions, newPrompt] : [targetUser.content, newPrompt];
      const newVersionIdx = userVersions.length - 1;
      msgs[userMsgIndex] = {
        ...targetUser,
        content: newPrompt,
        versions: userVersions,
        currentVersionIndex: newVersionIdx
      };

      if (targetAssistant && targetAssistant.role === 'assistant') {
        const assistantVersions = targetAssistant.versions ? [...targetAssistant.versions, ''] : [targetAssistant.content, ''];
        msgs[userMsgIndex + 1] = {
          ...targetAssistant,
          content: '',
          versions: assistantVersions,
          currentVersionIndex: newVersionIdx
        };
      } else {
        msgs.splice(userMsgIndex + 1, 0, {
          id: newAssistantMsgId || 'msg-' + Date.now(),
          role: 'assistant',
          content: '',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          versions: [''],
          currentVersionIndex: 0
        });
      }

      const truncated = msgs.slice(0, userMsgIndex + 2);
      const updatedSessions = updateActiveSessionInList(state.chatSessions, state.activeSessionId, truncated);
      syncSessions(updatedSessions, state.activeSessionId);
      return {
        ...state,
        chatMessages: truncated,
        chatSessions: updatedSessions
      };
    }
    case 'SWITCH_CHAT_VERSION': {
      const { userMsgIndex, targetVersionIndex } = action.payload;
      const msgs = [...state.chatMessages];
      const targetUser = msgs[userMsgIndex];
      const targetAssistant = msgs[userMsgIndex + 1];

      if (targetUser && targetUser.versions && targetUser.versions[targetVersionIndex] !== undefined) {
        msgs[userMsgIndex] = {
          ...targetUser,
          content: targetUser.versions[targetVersionIndex],
          currentVersionIndex: targetVersionIndex
        };
      }
      if (targetAssistant && targetAssistant.versions && targetAssistant.versions[targetVersionIndex] !== undefined) {
        msgs[userMsgIndex + 1] = {
          ...targetAssistant,
          content: targetAssistant.versions[targetVersionIndex],
          currentVersionIndex: targetVersionIndex
        };
      }
      const updatedSessions = updateActiveSessionInList(state.chatSessions, state.activeSessionId, msgs);
      syncSessions(updatedSessions, state.activeSessionId);
      return {
        ...state,
        chatMessages: msgs,
        chatSessions: updatedSessions
      };
    }
    case 'UPDATE_LAST_CHAT_MESSAGE': {
      if (state.chatMessages.length === 0) return state;
      const newMsgs = [...state.chatMessages];
      const lastIdx = newMsgs.length - 1;
      const current = newMsgs[lastIdx];
      let updatedVersions = current.versions;
      if (updatedVersions && updatedVersions.length > 0) {
        const vIdx = current.currentVersionIndex !== undefined ? current.currentVersionIndex : updatedVersions.length - 1;
        updatedVersions = [...updatedVersions];
        updatedVersions[vIdx] = action.payload;
      }
      newMsgs[lastIdx] = { 
        ...current, 
        content: action.payload,
        versions: updatedVersions || [action.payload],
        currentVersionIndex: current.currentVersionIndex !== undefined ? current.currentVersionIndex : 0
      };
      const updatedSessions = updateActiveSessionInList(state.chatSessions, state.activeSessionId, newMsgs);
      syncSessions(updatedSessions, state.activeSessionId);
      return {
        ...state,
        chatMessages: newMsgs,
        chatSessions: updatedSessions
      };
    }
    case 'CLEAR_CHAT': {
      const welcome = { ...defaultWelcomeMessage, id: 'welcome-' + Date.now() };
      const updatedSessions = updateActiveSessionInList(state.chatSessions, state.activeSessionId, [welcome]);
      syncSessions(updatedSessions, state.activeSessionId);
      return {
        ...state,
        chatMessages: [welcome],
        chatSessions: updatedSessions
      };
    }
    case 'SET_COPILOT_PROMPT':
      return { ...state, pendingCopilotPrompt: action.payload, isCopilotOpen: true };
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

  // Live Poller & PT Listener Sync
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('/api/live');
        if (!res.ok) {
          dispatch({ type: 'SET_BACKEND_CONNECTED', payload: false });
          return;
        }
        dispatch({ type: 'SET_BACKEND_CONNECTED', payload: true });
        const text = await res.text();
        if (text) {
          try {
            const data = JSON.parse(text);
            if (data.exists && data.is_fresh) {
              dispatch({ type: 'SET_LIVE_STATUS', payload: { active: true, text: 'Live Sync' } });
              dispatch({ type: 'SET_CLI_INPUT', payload: data.content });
            } else {
              dispatch({ type: 'SET_LIVE_STATUS', payload: { active: false, text: 'Standby' } });
            }
          } catch(e) {}
        }

        const lRes = await fetch('/api/listener/status');
        if (lRes.ok) {
          const lData = await lRes.json();
          dispatch({ type: 'SET_LISTENER_RUNNING', payload: !!lData.running });
        }
      } catch (e) {
        dispatch({ type: 'SET_BACKEND_CONNECTED', payload: false });
      }
    };
    const interval = setInterval(poll, 5000);
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
