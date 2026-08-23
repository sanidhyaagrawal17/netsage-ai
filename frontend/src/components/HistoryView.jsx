import React from 'react';
import { useAppContext } from '../context/AppContext';

export default function HistoryView() {
  const { state } = useAppContext();
  if (state.activeView !== 'tab-history') return null;

  return (
    <section className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
        <header className="border-b border-border pb-4">
          <h1 className="text-2xl font-bold tracking-tight">Diagnosis History</h1>
          <p className="text-muted-foreground text-sm mt-1">Past anomalies and resolutions.</p>
        </header>
        <div className="flex items-center justify-center h-64 border border-dashed border-border rounded-xl bg-muted/20 text-muted-foreground text-sm">
          No history available.
        </div>
      </div>
    </section>
  );
}
