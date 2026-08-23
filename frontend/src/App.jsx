import React, { useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TerminalInput from './components/TerminalInput';
import DiagnosisView from './components/DiagnosisView';
import TelemetryView from './components/TelemetryView';
import HistoryView from './components/HistoryView';
import AuditView from './components/AuditView';
import ChatPanel from './components/ChatPanel';
import FloatingStatus from './components/FloatingStatus';
import { useAppContext } from './context/AppContext';
import { Toaster } from './components/ui/sonner';

function App() {
  const { state } = useAppContext();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme);
  }, [state.theme]);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <TerminalInput />
        <DiagnosisView />
        <TelemetryView />
        <HistoryView />
        <AuditView />
      </main>
      <ChatPanel />
      <FloatingStatus />
      <Toaster position="bottom-right" theme={state.theme} />
    </div>
  );
}

export default App;
