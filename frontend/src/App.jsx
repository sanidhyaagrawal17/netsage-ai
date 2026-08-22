import React from 'react';
import { AppProvider } from './context/AppContext';
import Sidebar from './components/Sidebar';
import FloatingStatus from './components/FloatingStatus';
import TerminalInput from './components/TerminalInput';
import DiagnosisView from './components/DiagnosisView';
import TelemetryView from './components/TelemetryView';
import HistoryView from './components/HistoryView';
import AuditView from './components/AuditView';
import ChatPanel from './components/ChatPanel';
import './index.css';

export default function App() {
  return (
    <AppProvider>
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <TerminalInput />
          <DiagnosisView />
          <TelemetryView />
          <HistoryView />
          <AuditView />
        </main>
        <ChatPanel />
        <FloatingStatus />
      </div>
    </AppProvider>
  );
}
