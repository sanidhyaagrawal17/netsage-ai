import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { MessageSquare, X, Send, Sparkles, Terminal, ChevronRight, Bot, Trash2, Layers, Loader2, Maximize2, Minimize2, Square, Edit2, ChevronLeft, Brain } from 'lucide-react';
import { Button } from './ui/button';
import { useAppContext } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import ChatMessageContent from './ChatMessageContent';
import { cn } from '../lib/utils';

export default function ChatPanel() {
  const [inputMessage, setInputMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editText, setEditText] = useState('');
  const [width, setWidth] = useState(() => {
    try {
      const saved = localStorage.getItem('netsage_copilot_width');
      return saved ? Math.max(300, Math.min(1000, parseInt(saved, 10))) : 360;
    } catch (e) {
      return 360;
    }
  });

  const { state, dispatch } = useAppContext();
  const messagesEndRef = useRef(null);

  const messages = state.chatMessages || [];

  const messagesContainerRef = useRef(null);
  const isAutoScrollEnabled = useRef(true);
  const abortControllerRef = useRef(null);
  const textareaRef = useRef(null);

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

    // Auto-resize textarea when inputMessage changes (e.g. typing, pasting, clearing)
  useEffect(() => {
    if (textareaRef.current) {
      if (!inputMessage) {
        textareaRef.current.style.height = '34px';
      } else {
        textareaRef.current.style.height = 'auto';
        const newHeight = Math.min(textareaRef.current.scrollHeight, 180);
        textareaRef.current.style.height = `${Math.max(34, newHeight)}px`;
      }
    }
  }, [inputMessage]);

  // Handle pending prompt passed from other components (e.g. selection or diagnosis)
  useEffect(() => {
    if (state.pendingCopilotPrompt) {
      const prompt = state.pendingCopilotPrompt;
      dispatch({ type: 'SET_COPILOT_PROMPT', payload: '' });
      sendMessage(prompt);
    }
  }, [state.pendingCopilotPrompt]);

  // Drag-to-resize handler
  const startResize = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = width;

    const onMouseMove = (moveEvent) => {
      const delta = startX - moveEvent.clientX; // Moving mouse left increases width
      const maxWidth = window.innerWidth - (state.isSidebarCollapsed ? 80 : 260);
      const newWidth = Math.max(280, Math.min(maxWidth, startWidth + delta));
      setWidth(newWidth);
    };

    const onMouseUp = (upEvent) => {
      setIsResizing(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      const finalDelta = startX - upEvent.clientX;
      const maxWidth = window.innerWidth - (state.isSidebarCollapsed ? 80 : 260);
      const finalWidth = Math.max(280, Math.min(maxWidth, startWidth + finalDelta));
      try {
        localStorage.setItem('netsage_copilot_width', String(finalWidth));
      } catch (err) {}
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [width, state.isSidebarCollapsed]);

  const quickPrompts = [
    "Explain native VLAN mismatch simply",
    "Why does OSPF get stuck in EXSTART?",
    "What Cisco show command should I run next?",
    "How does an inverted wildcard mask cause ACL drops?"
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
      historyPayload = messages.slice(0, branchUserIdx).map(m => ({ role: m.role, content: m.content }));
    } else {
      const userMsg = {
        id: 'msg-' + Date.now(),
        role: 'user',
        content: query.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        versions: [query.trim()],
        currentVersionIndex: 0
      };
      dispatch({ type: 'ADD_CHAT_MESSAGE', payload: userMsg });

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
        // Handled stop
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
    if (editText.trim() === messages[idx].content.trim()) {
      setEditingIndex(null);
      return;
    }
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

  const handleClearChat = () => {
    dispatch({ type: 'CLEAR_CHAT' });
    toast.info('Chat history cleared');
  };

  if (!state.isCopilotOpen) return null;

  // Calculate actual width style
  const sidebarWidth = state.isSidebarCollapsed ? 64 : 240;
  const currentWidthStyle = isMaximized 
    ? `calc(100vw - ${sidebarWidth}px)` 
    : `${width}px`;

  return (
    <AnimatePresence>
      <motion.aside 
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: currentWidthStyle, opacity: 1 }}
        exit={{ width: 0, opacity: 0 }}
        transition={isResizing ? { duration: 0 } : { type: "spring", stiffness: 350, damping: 30 }}
        style={{ width: currentWidthStyle }}
        className={cn(
          "relative border-l border-border bg-card flex flex-col h-screen flex-shrink-0 transition-colors duration-200 shadow-2xl",
          isMaximized && "z-20",
          isResizing && "select-none cursor-col-resize"
        )}
      >
        {/* Resize Handle (Left Edge) */}
        {!isMaximized && (
          <div
            onMouseDown={startResize}
            className={cn(
              "absolute left-0 top-0 bottom-0 w-2 -ml-1 cursor-col-resize z-30 transition-colors group",
              "hover:bg-blue-500/40 active:bg-blue-500",
              isResizing && "bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.8)]"
            )}
            title="Drag to resize Copilot drawer"
          >
            <div className="absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-8 rounded-full bg-zinc-600 group-hover:bg-blue-400 transition-colors" />
          </div>
        )}

        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-[0_0_12px_rgba(59,130,246,0.2)]">
              <Bot size={15} className="text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-xs text-foreground tracking-tight block">NetSage Copilot</span>
                {isMaximized && (
                  <span className="text-[10px] font-medium text-blue-400 bg-blue-500/10 px-1.5 py-0.2 rounded">Full Screen</span>
                )}
              </div>
              <span className="text-[10px] text-zinc-500 font-mono block -mt-0.5">Packet Tracer Assistant</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Fullscreen / Maximize Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.06]"
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? "Restore size" : "Expand to full screen"}
            >
              {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </Button>
            {/* Clear Chat */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.06]"
              onClick={handleClearChat}
              title="Clear Conversation"
            >
              <Trash2 size={13} />
            </Button>
            {/* Close Copilot */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.06]" 
              onClick={() => dispatch({ type: 'SET_COPILOT_OPEN', payload: false })}
              title="Close Copilot"
            >
              <X size={14} />
            </Button>
          </div>
        </header>

        {/* Message Thread */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 font-sans scrollbar-mini">
          <div className={cn("space-y-4", isMaximized && "max-w-4xl mx-auto")}>
            {/* Context Banner */}
            {state.diagnosis?.diagnosis && (
              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs flex items-center gap-2 text-blue-300 shadow-sm">
                <Sparkles size={13} className="flex-shrink-0 text-blue-400" />
                <span className="line-clamp-1 text-[11px]">
                  Attached Context: {state.diagnosis.diagnosis?.root_cause || 'Active Diagnosis'}
                </span>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              const isEditing = editingIndex === index;
              const hasMultipleVersions = msg.versions && msg.versions.length > 1;
              const currentVIdx = msg.currentVersionIndex || 0;
              const versions = msg.versions || [];

              return (
                <div 
                  key={msg.id} 
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1 group/bubble relative`}
                >
                  {isEditing ? (
                    <div className="flex flex-col gap-2 w-full max-w-[85%] animate-fadeIn">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 resize-none min-h-[60px] scrollbar-mini"
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
                    <div 
                      className={cn(
                        "relative p-3.5 rounded-2xl text-xs leading-relaxed break-words transition-all",
                        isUser 
                          ? 'bg-blue-600 text-white rounded-br-none shadow-md shadow-blue-600/20 max-w-[85%]' 
                          : 'bg-muted/40 text-foreground border border-border/80 rounded-bl-none shadow-sm',
                        isMaximized && !isUser ? 'max-w-full w-full' : 'max-w-[92%]'
                      )}
                    >
                      <ChatMessageContent content={msg.content} isUser={isUser} />
                      
                      {/* Action Buttons on Hover for User Messages */}
                      {isUser && (
                        <div className="absolute -left-12 top-1/2 -translate-y-1/2 opacity-0 group-hover/bubble:opacity-100 transition-opacity flex items-center gap-1">
                          <button
                            onClick={() => { navigator.clipboard.writeText(msg.content); toast.success('Prompt copied'); }}
                            className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-white"
                            title="Copy prompt"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                          </button>
                          <button
                            onClick={() => handleStartEdit(index, msg.content)}
                            className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-white"
                            title="Edit prompt and branch response"
                          >
                            <Edit2 size={11} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  
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
              <div className="flex items-center justify-between gap-1.5 text-xs py-1 px-1 animate-fadeIn">
                <div className="flex items-center gap-2">
                  {state.aiStatus === 'thinking' ? (
                    <>
                      <Brain size={13} className="text-amber-400 animate-pulse" />
                      <span className="text-xs text-amber-400 font-medium">Reasoning...</span>
                    </>
                  ) : (
                    <>
                      <Loader2 size={13} className="animate-spin text-blue-400" />
                      <span className="text-xs text-blue-400 font-medium">Generating solution...</span>
                    </>
                  )}
                </div>


              </div>
            )}

            <div ref={messagesEndRef} />

            {/* Quick Suggestions */}
            {messages.length < 3 && (
              <div className="space-y-2 pt-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 px-1">
                  Suggested Prompts
                </span>
                <div className={cn("space-y-1.5", isMaximized && "grid grid-cols-2 gap-2 space-y-0")}>
                  {quickPrompts.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(p)}
                      className="w-full text-left p-2.5 rounded-xl bg-muted/30 hover:bg-muted/70 border border-border/60 text-xs text-foreground transition-all flex items-center justify-between group"
                    >
                      <span className="line-clamp-1 text-[11px]">{p}</span>
                      <ChevronRight size={12} className="text-zinc-600 group-hover:text-white transition-colors flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Footer */}
        <div className="p-3.5 border-t border-border bg-muted/20 flex-shrink-0">
          <div className={cn("flex items-end gap-2 p-1.5 rounded-xl bg-background border border-border focus-within:border-primary/50 transition-colors shadow-inner", isMaximized && "max-w-4xl mx-auto")}>
            <textarea 
              ref={textareaRef}
              rows={1}
              placeholder="Ask Copilot... (Shift+Enter for newline)" 
              value={inputMessage}
              disabled={isStreaming}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              className="w-full text-xs bg-transparent px-2.5 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none resize-none overflow-y-auto h-[34px] min-h-[34px] scrollbar-none leading-relaxed" 
              style={{ maxHeight: '180px' }}
            />
            {isStreaming ? (
              <button 
                  onClick={stopGeneration}
                  title="Stop Generating"
                  className="h-7 w-7 flex items-center justify-center rounded-full bg-foreground hover:bg-foreground/80 text-background flex-shrink-0 mb-0.5 transition-all shadow-sm group"
                >
                  <Square size={10} className="fill-current group-hover:scale-90 transition-transform" />
                </button>
            ) : (
              <Button 
                size="icon" 
                disabled={!inputMessage.trim()}
                className="h-7 w-7 rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex-shrink-0 disabled:opacity-40 shadow-sm mb-0.5" 
                onClick={() => sendMessage()}
              >
                <Send size={12} />
              </Button>
            )}
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
