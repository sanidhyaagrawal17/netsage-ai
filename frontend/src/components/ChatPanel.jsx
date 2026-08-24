import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, X, Send, Sparkles, Terminal, ChevronRight, Bot, Trash2, Layers, Loader2, Maximize2, Minimize2 } from 'lucide-react';
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

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

  const sendMessage = async (textToSend) => {
    const query = textToSend || inputMessage;
    if (!query || !query.trim() || isStreaming) return;

    setInputMessage('');

    // 1. Add User Message
    const userMsg = {
      id: 'msg-' + Date.now(),
      role: 'user',
      content: query.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    dispatch({ type: 'ADD_CHAT_MESSAGE', payload: userMsg });

    // 2. Add Assistant Message placeholder
    const assistantMsgId = 'msg-' + (Date.now() + 1);
    dispatch({
      type: 'ADD_CHAT_MESSAGE',
      payload: {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    });

    setIsStreaming(true);

    // Build context
    let activeContext = '';
    if (state.diagnosis?.diagnosis) {
      const d = state.diagnosis.diagnosis;
      activeContext += `Active Root Cause: ${d.root_cause || ''}\nOSI Layer: ${d.osi_layer || ''}\nFix Commands: ${(d.fix_steps || []).join('; ')}\n`;
    }
    if (state.cliInput && !state.cliInput.startsWith('# Waiting')) {
      activeContext += `\nActive CLI Telemetry:\n${state.cliInput.slice(0, 1500)}`;
    }

    try {
      const historyPayload = messages.map(m => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const decoder = new TextDecoder('utf-8');
      let streamedAnswer = '';
      let done = false;

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
                dispatch({ type: 'UPDATE_LAST_CHAT_MESSAGE', payload: streamedAnswer });
              } else if (event.type === 'done') {
                done = true;
              }
            } catch (e) {
              console.error('Chat SSE parse error', e);
            }
          }
        }
      }
    } catch (e) {
      toast.error('Chat error: ' + e.message);
      dispatch({ 
        type: 'UPDATE_LAST_CHAT_MESSAGE', 
        payload: '⚠️ Could not generate response. Please ensure the backend server is running.' 
      });
    } finally {
      setIsStreaming(false);
    }
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
          "relative border-l border-border bg-card flex flex-col h-screen select-none flex-shrink-0 transition-colors duration-200 shadow-2xl",
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
        <div className="flex-1 p-4 overflow-y-auto space-y-4 font-sans scrollbar-none">
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
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div 
                  key={msg.id} 
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
                >
                  <div 
                    className={cn(
                      "p-3.5 rounded-2xl text-xs leading-relaxed break-words transition-all",
                      isUser 
                        ? 'bg-blue-600 text-white rounded-br-none shadow-md shadow-blue-600/20 max-w-[85%]' 
                        : 'bg-muted/40 text-foreground border border-border/80 rounded-bl-none shadow-sm',
                      isMaximized && !isUser ? 'max-w-full w-full' : 'max-w-[92%]'
                    )}
                  >
                    <ChatMessageContent content={msg.content} isUser={isUser} />
                  </div>
                  <span className="text-[9px] text-zinc-500 px-1 font-mono">{msg.timestamp}</span>
                </div>
              );
            })}

            {isStreaming && (
              <div className="flex items-center gap-2 text-xs text-blue-400 py-1">
                <Loader2 size={12} className="animate-spin" />
                <span className="text-[11px]">Copilot is typing...</span>
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
          <div className={cn("flex items-center gap-2 p-1.5 rounded-xl bg-background border border-border focus-within:border-primary/50 transition-colors shadow-inner", isMaximized && "max-w-4xl mx-auto")}>
            <input 
              type="text" 
              placeholder="Ask Copilot about trace, commands, or concepts..." 
              value={inputMessage}
              disabled={isStreaming}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              className="w-full text-xs bg-transparent px-2.5 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none" 
            />
            <Button 
              size="icon" 
              disabled={isStreaming || !inputMessage.trim()}
              className="h-7 w-7 rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex-shrink-0 disabled:opacity-40 shadow-sm" 
              onClick={() => sendMessage()}
            >
              <Send size={12} />
            </Button>
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
