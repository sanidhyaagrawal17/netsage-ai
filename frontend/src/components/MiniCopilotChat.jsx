import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Send, Sparkles, Loader2, Bot, ChevronRight, Check, Brain, Square, Edit2, ChevronLeft } from 'lucide-react';
import { Button } from './ui/button';
import { useAppContext } from '../context/AppContext';
import { toast } from 'sonner';
import ChatMessageContent from './ChatMessageContent';
import { cn } from '../lib/utils';

export default function MiniCopilotChat({ isPiP = false }) {
  const { state, dispatch } = useAppContext();
  const [inputMessage, setInputMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      if (!inputMessage) {
        textareaRef.current.style.height = '32px';
      } else {
        textareaRef.current.style.height = 'auto';
        const newHeight = Math.min(textareaRef.current.scrollHeight, 150);
        textareaRef.current.style.height = `${Math.max(32, newHeight)}px`;
      }
    }
  }, [inputMessage]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editText, setEditText] = useState('');

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const isAutoScrollEnabled = useRef(true);
  const abortControllerRef = useRef(null);

  const messages = state.chatMessages || [];

  // Track if user has scrolled away from bottom
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 80;
    isAutoScrollEnabled.current = isNearBottom;
  };

  useLayoutEffect(() => {
    if (messagesContainerRef.current && isAutoScrollEnabled.current) {
      requestAnimationFrame(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      });
    }
  }, [messages, isStreaming]);

  const quickPrompts = [
    "Explain native VLAN mismatch",
    "Why does OSPF get stuck in EXSTART?",
    "Show next Cisco command to run"
  ];

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    dispatch({ type: 'SET_COPILOT_STREAMING', payload: false });
    dispatch({ type: 'SET_AI_STATUS', payload: 'idle' });
    toast.info('Generation stopped');
  };

  const sendMessage = async (textToSend, isBranch = false, branchUserIdx = null) => {
    const query = textToSend || inputMessage;
    if (!query || !query.trim() || isStreaming) return;

    if (!isBranch) {
      setInputMessage('');
    }
    isAutoScrollEnabled.current = true;

    // Create Abort Controller
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortCtrl = new AbortController();
    abortControllerRef.current = abortCtrl;

    let historyPayload = [];

    if (isBranch && branchUserIdx !== null) {
      const assistantMsgId = 'msg-' + (Date.now() + 1);
      dispatch({
        type: 'BRANCH_CHAT_MESSAGE',
        payload: {
          userMsgIndex: branchUserIdx,
          newPrompt: query.trim(),
          newAssistantMsgId: assistantMsgId
        }
      });
      // Build history up to the branched prompt
      historyPayload = messages.slice(0, branchUserIdx).map(m => ({ role: m.role, content: m.content }));
    } else {
      // Add User Message
      const userMsg = {
        id: 'msg-' + Date.now(),
        role: 'user',
        content: query.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        versions: [query.trim()],
        currentVersionIndex: 0
      };
      dispatch({ type: 'ADD_CHAT_MESSAGE', payload: userMsg });

      // Add Assistant Message placeholder
      const assistantMsgId = 'msg-' + (Date.now() + 1);
      dispatch({
        type: 'ADD_CHAT_MESSAGE',
        payload: {
          id: assistantMsgId,
          role: 'assistant',
          content: '',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          versions: [''],
          currentVersionIndex: 0
        }
      });
      historyPayload = messages.map(m => ({ role: m.role, content: m.content }));
    }

    setIsStreaming(true);
    dispatch({ type: 'SET_COPILOT_STREAMING', payload: true });
    dispatch({ type: 'SET_AI_STATUS', payload: 'thinking' });

    // Build context from active diagnosis & telemetry
    let activeContext = '';
    if (state.diagnosis?.diagnosis) {
      const d = state.diagnosis.diagnosis;
      activeContext += `Active Root Cause: ${d.root_cause || ''}\nOSI Layer: ${d.osi_layer || ''}\nFix Commands: ${(d.fix_steps || []).join('; ')}\n`;
    }
    if (state.cliInput && !state.cliInput.startsWith('# Waiting')) {
      activeContext += `\nActive CLI Telemetry:\n${state.cliInput.slice(0, 1500)}`;
    }

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortCtrl.signal,
        body: JSON.stringify({
          message: query.trim(),
          context: activeContext,
          history: historyPayload,
          model_name: state.currentModel,
        })
      });

      if (!res.ok) {
        throw new Error('Failed to connect to chat stream');
      }

      const reader = res.body.getReader();
      dispatch({ type: 'SET_AI_STATUS', payload: 'streaming' });
      const decoder = new TextDecoder('utf-8');
      let streamedAnswer = '';
      let done = false;

      let lastDispatch = 0;
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        if (readerDone) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (!dataStr) continue;
            try {
              const event = JSON.parse(dataStr);
              if (event.type === 'token') {
                streamedAnswer += event.token;
                const now = performance.now();
                // Throttle React state updates to ~25fps (every 40ms) to eliminate frontend UI freezing
                if (now - lastDispatch > 40) {
                  lastDispatch = now;
                  dispatch({ type: 'UPDATE_LAST_CHAT_MESSAGE', payload: streamedAnswer });
                }
              } else if (event.type === 'done') {
                done = true;
              }
            } catch (e) {
              console.error('Chat SSE parse error', e);
            }
          }
        }
      }
      // Ensure final complete text is always dispatched
      dispatch({ type: 'UPDATE_LAST_CHAT_MESSAGE', payload: streamedAnswer });
    } catch (e) {
      if (e.name === 'AbortError') {
        // Graceful stop
      } else {
        toast.error('Chat error: ' + e.message);
        dispatch({ 
          type: 'UPDATE_LAST_CHAT_MESSAGE', 
          payload: '⚠️ Could not generate response. Please ensure the backend server is running.' 
        });
      }
    } finally {
      setIsStreaming(false);
      dispatch({ type: 'SET_COPILOT_STREAMING', payload: false });
      dispatch({ type: 'SET_AI_STATUS', payload: 'idle' });
      abortControllerRef.current = null;
    }
  };

  const handleStartEdit = (idx, currentContent) => {
    setEditingIndex(idx);
    setEditText(currentContent);
  };

  const handleSaveEdit = (idx) => {
    if (!editText.trim()) return;
    setEditingIndex(null);
    sendMessage(editText.trim(), true, idx);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditText('');
  };

  const switchVersion = (userMsgIndex, targetIdx) => {
    if (isStreaming) return;
    dispatch({
      type: 'SWITCH_CHAT_VERSION',
      payload: { userMsgIndex, targetVersionIndex: targetIdx }
    });
  };

  return (
    <div className="grid grid-rows-[1fr_auto] h-full overflow-hidden bg-card/60 backdrop-blur select-text font-sans">
      
      {/* Message Feed */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        style={{ overflowAnchor: "none" }}
        className="min-h-0 h-full overflow-y-auto p-3 space-y-3 scrollbar-mini text-xs"
      >
        {/* Context Banner */}
        {state.diagnosis?.diagnosis && (
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] flex items-center gap-1.5 text-blue-300">
            <Sparkles size={12} className="flex-shrink-0 text-blue-400" />
            <span className="truncate">
              {state.diagnosis.diagnosis?.root_cause || 'Active Diagnosis Attached'}
            </span>
          </div>
        )}

        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          const isEditing = editingIndex === index;
          const versions = msg.versions || [msg.content];
          const currentVIdx = msg.currentVersionIndex !== undefined ? msg.currentVersionIndex : (versions.length - 1);
          const hasMultipleVersions = versions.length > 1;

          return (
            <div 
              key={msg.id || index} 
              className={`group/msg flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-0.5 relative`}
            >
              {isUser && isEditing ? (
                /* Edit Prompt Box */
                <div className="w-full max-w-[95%] bg-muted/90 border border-blue-500/50 rounded-xl p-2.5 space-y-2 shadow-lg animate-in fade-in zoom-in-95">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={2}
                    className="w-full bg-background border border-border/80 rounded-lg p-2 text-xs text-foreground focus:outline-none focus:border-blue-500 resize-none"
                    placeholder="Edit your prompt..."
                    autoFocus
                  />
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCancelEdit}
                      className="h-6 px-2 text-[10px] text-muted-foreground hover:text-white"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSaveEdit(index)}
                      className="h-6 px-2.5 text-[10px] bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-sm"
                    >
                      Save & Branch
                    </Button>
                  </div>
                </div>
              ) : (
                /* Standard Message Bubble */
                <div className="relative group/bubble max-w-[95%]">
                  <div 
                    className={cn(
                      "p-2.5 rounded-xl text-xs leading-relaxed break-words transition-all shadow-sm",
                      isUser 
                        ? 'bg-blue-600 text-white rounded-br-none max-w-full' 
                        : 'bg-muted/50 text-foreground border border-border/70 rounded-bl-none max-w-full'
                    )}
                  >
                    <ChatMessageContent content={msg.content} isUser={isUser} />
                  </div>

                  {/* Edit Pencil on Hover for User Messages */}
                  {isUser && !isStreaming && (
                    <button
                      onClick={() => handleStartEdit(index, msg.content)}
                      className="absolute -left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover/bubble:opacity-100 transition-opacity p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-white"
                      title="Edit prompt and branch response"
                    >
                      <Edit2 size={11} />
                    </button>
                  )}
                </div>
              )}

              {/* Version Navigation & Timestamp */}
              <div className="flex items-center gap-2 px-1 text-[9px] text-zinc-500 font-mono">
                {isUser && hasMultipleVersions && !isEditing && (
                  <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.08] px-1.5 py-0.5 rounded-md">
                    <button
                      disabled={currentVIdx === 0 || isStreaming}
                      onClick={() => switchVersion(index, currentVIdx - 1)}
                      className="hover:text-white disabled:opacity-30 disabled:hover:text-zinc-500"
                    >
                      <ChevronLeft size={10} />
                    </button>
                    <span>{currentVIdx + 1}/{versions.length}</span>
                    <button
                      disabled={currentVIdx === versions.length - 1 || isStreaming}
                      onClick={() => switchVersion(index, currentVIdx + 1)}
                      className="hover:text-white disabled:opacity-30 disabled:hover:text-zinc-500"
                    >
                      <ChevronRight size={10} />
                    </button>
                  </div>
                )}
                <span>{msg.timestamp}</span>
              </div>
            </div>
          );
        })}

        {isStreaming && (
          <div className="flex items-center justify-between gap-1.5 text-xs py-0.5 px-1 animate-fadeIn">
            <div className="flex items-center gap-1.5">
              {state.aiStatus === 'thinking' ? (
                <>
                  <Brain size={11} className="text-amber-400 animate-pulse" />
                  <span className="text-[10px] text-amber-400 font-medium">Reasoning...</span>
                </>
              ) : (
                <>
                  <Loader2 size={11} className="animate-spin text-blue-400" />
                  <span className="text-[10px] text-blue-400 font-medium">Generating solution...</span>
                </>
              )}
            </div>

            {/* Inline Stop Button */}
            <button
              onClick={stopGeneration}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-[10px] font-medium transition-colors"
            >
              <Square size={9} className="fill-current" />
              <span>Stop</span>
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />

        {/* Quick Prompts */}
        {messages.length < 3 && (
          <div className="space-y-1.5 pt-1">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500 px-1">
              Suggested Questions
            </span>
            <div className="space-y-1">
              {quickPrompts.map((p, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(p)}
                  className="w-full text-left p-2 rounded-lg bg-muted/30 hover:bg-muted/60 border border-border/50 text-[11px] text-foreground transition-all flex items-center justify-between group"
                >
                  <span className="truncate">{p}</span>
                  <ChevronRight size={11} className="text-zinc-600 group-hover:text-white transition-colors flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input Box */}
      <div className="p-2 border-t border-border bg-muted/20 flex-shrink-0">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-background border border-border focus-within:border-primary/50 transition-colors shadow-inner">
          <textarea ref={textareaRef} 
            rows={1}
            placeholder={isStreaming ? "Copilot is generating..." : "Ask Copilot..."} 
            value={inputMessage}
            disabled={isStreaming}
            onChange={(e) => {
              setInputMessage(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
                e.target.style.height = 'auto';
              }
            }}
            className="w-full text-xs bg-transparent px-2 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-60 resize-none overflow-y-auto h-[32px] min-h-[32px] scrollbar-none" 
            style={{ maxHeight: '150px' }}
          />
          {isStreaming ? (
            <Button 
              size="icon" 
              onClick={stopGeneration}
              className="h-6 w-6 rounded-lg bg-red-600 hover:bg-red-500 text-white flex-shrink-0 shadow-sm"
              title="Stop Generation"
            >
              <Square size={10} className="fill-current" />
            </Button>
          ) : (
            <Button 
              size="icon" 
              disabled={!inputMessage.trim()}
              className="h-6 w-6 rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex-shrink-0 disabled:opacity-40 shadow-sm" 
              onClick={() => sendMessage()}
            >
              <Send size={11} />
            </Button>
          )}
        </div>
      </div>

    </div>
  );
}
