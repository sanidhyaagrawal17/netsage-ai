import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { 
  Clock, Search, Trash2, ArrowUpRight, Copy, Bot, Layers, 
  CheckCircle2, AlertCircle, ChevronDown, ChevronUp, MessageSquare, Plus 
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function HistoryView() {
  const { state, dispatch } = useAppContext();
  const [historyTab, setHistoryTab] = useState('diagnosis'); // 'diagnosis' | 'chat'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLayer, setSelectedLayer] = useState('All');
  const [expandedId, setExpandedId] = useState(null);
  const [chatSearchTerm, setChatSearchTerm] = useState('');

  if (state.activeView !== 'tab-history') return null;

  const history = state.diagnosisHistory || [];
  const chatSessions = state.chatSessions || [];

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

  const filteredChatSessions = chatSessions.filter(s => {
    const titleMatch = (s.title || '').toLowerCase().includes(chatSearchTerm.toLowerCase());
    const msgMatch = (s.messages || []).some(m => (m.content || '').toLowerCase().includes(chatSearchTerm.toLowerCase()));
    return titleMatch || msgMatch;
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

  const handleResumeChat = (session) => {
    dispatch({ type: 'SWITCH_CHAT_SESSION', payload: session.id });
    dispatch({ type: 'SET_COPILOT_OPEN', payload: true });
    toast.success(`Switched to conversation: "${session.title}"`);
  };

  const handleExportChatMarkdown = (session) => {
    const lines = [
      `# ${session.title}`,
      `*Recorded on ${new Date(session.createdAt || Date.now()).toLocaleString()}*`,
      '',
      '---',
      ''
    ];
    (session.messages || []).forEach(m => {
      const speaker = m.role === 'user' ? '**User**' : '**NetSage Copilot**';
      lines.push(`### ${speaker} (${m.timestamp || ''})`);
      lines.push(m.content || '');
      lines.push('');
    });
    navigator.clipboard.writeText(lines.join('\n'));
    toast.success('Conversation transcript copied to clipboard as Markdown');
  };

  const handleDeleteChatSession = (e, id) => {
    e.stopPropagation();
    dispatch({ type: 'DELETE_CHAT_SESSION', payload: id });
    toast.info('Conversation removed from history');
  };

  const copyCommands = (steps) => {
    navigator.clipboard.writeText((steps || []).join(String.fromCharCode(10)));
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
        <header className="border-b border-border pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Clock size={18} className="text-blue-400" />
              History & Saved Sessions
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Persistent local audit trail of Packet Tracer diagnoses and AI Copilot dialogues
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center p-1 bg-card border border-border rounded-xl">
            <button
              onClick={() => setHistoryTab('diagnosis')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                historyTab === 'diagnosis'
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Clock size={13} />
              <span>Diagnosis Runs</span>
              <span className={cn(
                "text-[10px] px-1.5 py-0.2 rounded-full font-mono",
                historyTab === 'diagnosis' ? "bg-white/20 text-white" : "bg-zinc-800 text-zinc-400"
              )}>
                {history.length}
              </span>
            </button>
            <button
              onClick={() => setHistoryTab('chat')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                historyTab === 'chat'
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <MessageSquare size={13} />
              <span>Copilot Chats</span>
              <span className={cn(
                "text-[10px] px-1.5 py-0.2 rounded-full font-mono",
                historyTab === 'chat' ? "bg-white/20 text-white" : "bg-zinc-800 text-zinc-400"
              )}>
                {chatSessions.length}
              </span>
            </button>
          </div>
        </header>

        {/* TAB 1: DIAGNOSIS RUNS */}
        {historyTab === 'diagnosis' && (
          <div className="space-y-4 animate-in fade-in duration-200">
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

            {/* List of Diagnosis Entries */}
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

                          <div className="flex items-center justify-between pt-2">
                            <span className="text-[11px] text-muted-foreground font-mono">
                              Case Identifier: {item.caseId}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(item.id)}
                              className="h-6 text-xs text-destructive hover:bg-destructive/10 px-2 gap-1"
                            >
                              <Trash2 size={12} /> Remove
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
        )}

        {/* TAB 2: COPILOT CHAT THREADS */}
        {historyTab === 'chat' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Search and New Chat Actions */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search past Copilot dialogues..."
                  value={chatSearchTerm}
                  onChange={(e) => setChatSearchTerm(e.target.value)}
                  className="w-full bg-card border border-border rounded-xl pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  dispatch({ type: 'CREATE_NEW_CHAT_SESSION' });
                  dispatch({ type: 'SET_COPILOT_OPEN', payload: true });
                  toast.success('Started a new conversation');
                }}
                className="h-9 px-3 gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-medium"
              >
                <Plus size={14} />
                <span>New Chat</span>
              </Button>
            </div>

            {/* List of Chat Sessions */}
            {filteredChatSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 border border-dashed border-border rounded-3xl bg-card/50 text-muted-foreground text-sm gap-2">
                <MessageSquare size={28} className="text-zinc-600" />
                <p className="font-medium text-foreground">No conversations found</p>
                <p className="text-xs text-muted-foreground">Start a conversation in NetSage Copilot to view your chat threads here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredChatSessions.map((session) => {
                  const msgs = session.messages || [];
                  const nonSystemMsgs = msgs.filter(m => m.role !== 'system');
                  const lastUserMsg = [...msgs].reverse().find(m => m.role === 'user');
                  const lastAssistantMsg = [...msgs].reverse().find(m => m.role === 'assistant');
                  const isActive = session.id === state.activeSessionId;

                  return (
                    <div
                      key={session.id}
                      className={cn(
                        "p-4 rounded-2xl bg-card border transition-all flex flex-col justify-between space-y-3",
                        isActive ? "border-blue-500/40 shadow-sm ring-1 ring-blue-500/20" : "border-border hover:border-border/80"
                      )}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 overflow-hidden flex-1">
                            <div className={cn(
                              "w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0",
                              isActive ? "bg-blue-500/20 text-blue-400" : "bg-zinc-800 text-zinc-400"
                            )}>
                              <MessageSquare size={12} />
                            </div>
                            <h3 className="text-xs font-semibold text-foreground truncate">
                              {session.title}
                            </h3>
                          </div>
                          {isActive && (
                            <span className="text-[10px] font-medium text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded flex-shrink-0">
                              Active
                            </span>
                          )}
                        </div>

                        {/* Preview */}
                        <div className="p-2.5 rounded-xl bg-background/60 border border-border/50 text-[11px] text-zinc-400 space-y-1 line-clamp-3">
                          {lastUserMsg && (
                            <p className="line-clamp-1 font-medium text-zinc-300">
                              Q: {lastUserMsg.content}
                            </p>
                          )}
                          {lastAssistantMsg && (
                            <p className="line-clamp-2 text-zinc-500">
                              A: {lastAssistantMsg.content}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                          <span>{nonSystemMsgs.length} messages</span>
                          <span>{new Date(session.updatedAt || session.createdAt || Date.now()).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border/60">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExportChatMarkdown(session)}
                          className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1"
                          title="Copy transcript as Markdown"
                        >
                          <Copy size={11} /> Copy
                        </Button>
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleDeleteChatSession(e, session.id)}
                            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Delete conversation"
                          >
                            <Trash2 size={12} />
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleResumeChat(session)}
                            className="h-7 px-2.5 text-xs gap-1 rounded-lg bg-blue-600 hover:bg-blue-500 font-medium"
                          >
                            <span>Resume</span>
                            <ArrowUpRight size={12} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
