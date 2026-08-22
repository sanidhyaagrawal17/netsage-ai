import React from 'react';
import { AppProvider } from './context/AppContext';
import Sidebar from './components/Sidebar';
import FloatingStatus from './components/FloatingStatus';
import TerminalInput from './components/TerminalInput';
import DiagnosisView from './components/DiagnosisView';
import TelemetryView from './components/TelemetryView';
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
          {/* History and Audit views will go here in later phases */}
        </main>
        <ChatPanel />
        <FloatingStatus />
      </div>
    </AppProvider>
  );
}
