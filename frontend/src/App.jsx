import React, { useEffect, Suspense, lazy } from 'react';
import Sidebar from './components/Sidebar';
import TerminalInput from './components/TerminalInput';
import DiagnosisView from './components/DiagnosisView';
import ChatPanel from './components/ChatPanel';
import FloatingStatus from './components/FloatingStatus';
import CommandPalette from './components/CommandPalette';
import { useAppContext } from './context/AppContext';
import { Toaster } from './components/ui/sonner';
import { Loader2 } from 'lucide-react';

// Lazy-load non-initial views to conserve memory and reduce CPU overhead on laptops
const TelemetryView = lazy(() => import('./components/TelemetryView'));
const HistoryView = lazy(() => import('./components/HistoryView'));
const AuditView = lazy(() => import('./components/AuditView'));

function App() {
  const { state } = useAppContext();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme);
  }, [state.theme]);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col relative overflow-hidden min-w-0">
        <TerminalInput />
        <DiagnosisView />
        <Suspense fallback={<div className="p-8 flex items-center justify-center text-muted-foreground text-xs gap-2"><Loader2 className="animate-spin" size={14} /> Loading View...</div>}>
          {state.activeView === 'tab-telemetry' && <TelemetryView />}
          {state.activeView === 'tab-history' && <HistoryView />}
          {state.activeView === 'tab-audit' && <AuditView />}
        </Suspense>
      </main>
      <ChatPanel />
      <FloatingStatus />
      <CommandPalette />
      <Toaster position="bottom-right" theme={state.theme} />
    </div>
  );
}

export default App;
