import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { Clock, Search, Trash2, ArrowUpRight, Copy, Bot, Layers, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../lib/utils';

export default function HistoryView() {
  const { state, dispatch } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLayer, setSelectedLayer] = useState('All');
  const [expandedId, setExpandedId] = useState(null);

  if (state.activeView !== 'tab-history') return null;

  const history = state.diagnosisHistory || [];

  const filteredHistory = history.filter(item => {
    const matchesSearch = 
      (item.rootCause || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.caseId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.cliEvidence || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLayer = 
      selectedLayer === 'All' || 
      (item.osiLayer || '').toLowerCase().includes(selectedLayer.toLowerCase());

    return matchesSearch && matchesLayer;
  });

  const handleRestore = (item) => {
    if (item.diagnosisObj) {
      dispatch({ type: 'SET_DIAGNOSIS', payload: item.diagnosisObj });
    } else {
      dispatch({
        type: 'SET_DIAGNOSIS',
        payload: {
          case_id: item.caseId,
          deterministic_findings: [],
          diagnosis: {
            root_cause: item.rootCause,
            osi_layer: item.osiLayer,
            confidence_score: (item.confidence || 95) / 100,
            cli_evidence_quote: item.cliEvidence,
            fix_steps: item.fixSteps || [],
          }
        }
      });
    }
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'tab-diagnosis' });
    toast.info(`Restored diagnosis for ${item.caseId}`);
  };

  const handleAskCopilot = (item) => {
    const prompt = `Explain the root cause and fix for past diagnosis ${item.caseId} (${item.osiLayer}):\n\nRoot Cause: ${item.rootCause}\nFix Steps:\n${(item.fixSteps || []).join('\n')}`;
    dispatch({ type: 'SET_COPILOT_PROMPT', payload: prompt });
  };

  const copyCommands = (steps) => {
    navigator.clipboard.writeText((steps || []).join('\n'));
    toast.success('Fix commands copied to clipboard');
  };

  const handleDelete = (id) => {
    dispatch({ type: 'DELETE_HISTORY_ENTRY', payload: id });
    toast.success('Diagnosis removed from history');
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all diagnosis history?')) {
      dispatch({ type: 'CLEAR_HISTORY' });
      toast.info('History cleared');
    }
  };

  return (
    <section className="flex-1 p-8 overflow-y-auto bg-background font-sans">
      <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
        {/* Header */}
        <header className="border-b border-border pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Clock size={18} className="text-blue-400" />
              Diagnosis History
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Persistent local audit trail of Packet Tracer diagnoses ({history.length} recorded)
            </p>
          </div>
          {history.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 h-8 gap-1.5 rounded-xl"
            >
              <Trash2 size={13} />
              <span>Clear History</span>
            </Button>
          )}
        </header>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by root cause, case ID, or evidence..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-card border border-border rounded-xl pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
          <div className="flex items-center gap-1 bg-card border border-border p-1 rounded-xl">
            {['All', 'Data Link', 'Network', 'Transport', 'Application'].map((layer) => (
              <button
                key={layer}
                onClick={() => setSelectedLayer(layer)}
                className={cn(
                  "px-3 py-1 text-xs rounded-lg transition-colors",
                  selectedLayer === layer 
                    ? "bg-blue-600 text-white font-medium shadow-sm" 
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                )}
              >
                {layer}
              </button>
            ))}
          </div>
        </div>

        {/* List of Entries */}
        {filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border border-dashed border-border rounded-3xl bg-card/50 text-muted-foreground text-sm gap-2">
            <AlertCircle size={28} className="text-zinc-600" />
            <p className="font-medium text-foreground">No matching diagnosis records</p>
            <p className="text-xs text-muted-foreground">Diagnoses will automatically appear here once you run the Diagnostic Engine.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredHistory.map((item) => {
              const isExpanded = expandedId === item.id;
              return (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl bg-card border border-border hover:border-border/80 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Layers size={11} />
                          {item.osiLayer || 'Layer 3'}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {item.confidence || 95}% Confidence
                        </span>
                        <span className="text-[11px] text-zinc-500 font-mono">
                          • {item.date} {item.timestamp}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-foreground pt-0.5">
                        {item.rootCause}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(item)}
                        className="h-7 text-xs gap-1 rounded-lg border-white/10 hover:bg-white/[0.06] text-foreground"
                      >
                        <span>View Details</span>
                        <ArrowUpRight size={12} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded View */}
                  {isExpanded && (
                    <div className="pt-3 border-t border-border/60 space-y-3 animate-in fade-in duration-200">
                      {item.cliEvidence && (
                        <div>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                            Evidence Quote
                          </span>
                          <pre className="p-3 rounded-xl bg-background/80 border border-border text-xs font-mono text-zinc-300 leading-relaxed whitespace-pre-wrap">
                            {item.cliEvidence}
                          </pre>
                        </div>
                      )}

                      {item.fixSteps && item.fixSteps.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              Remediation Steps ({item.fixSteps.length})
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyCommands(item.fixSteps)}
                              className="h-5 px-2 text-[11px] gap-1 text-blue-400 hover:text-blue-300"
                            >
                              <Copy size={10} /> Copy Commands
                            </Button>
                          </div>
                          <div className="p-3 rounded-xl bg-background/80 border border-border space-y-1">
                            {item.fixSteps.map((s, idx) => (
                              <div key={idx} className="text-xs font-mono text-blue-400">
                                {s}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAskCopilot(item)}
                            className="h-7 text-xs gap-1.5 rounded-lg bg-blue-600/10 border-blue-500/30 text-blue-400 hover:bg-blue-600/20"
                          >
                            <Bot size={13} /> Ask Copilot
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                          className="h-7 text-xs gap-1 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 size={12} /> Delete Entry
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
