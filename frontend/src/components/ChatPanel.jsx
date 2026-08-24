import ChatMessageContent from './ChatMessageContent';
import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Sparkles, Terminal, ChevronRight, Bot, Trash2, Layers, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { useAppContext } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export default function ChatPanel() {
  const [inputMessage, setInputMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
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

  return (
    <AnimatePresence>
      <motion.aside 
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: 340, opacity: 1 }}
        exit={{ width: 0, opacity: 0 }}
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
        className="w-[340px] border-l border-border bg-card flex flex-col h-screen select-none flex-shrink-0 transition-colors duration-200"
      >
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-[0_0_12px_rgba(59,130,246,0.2)]">
              <Bot size={15} className="text-blue-400" />
            </div>
            <div>
              <span className="font-semibold text-xs text-foreground tracking-tight block">NetSage Copilot</span>
              <span className="text-[10px] text-zinc-500 font-mono block -mt-0.5">Packet Tracer Assistant</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.06]"
              onClick={handleClearChat}
              title="Clear Conversation"
            >
              <Trash2 size={13} />
            </Button>
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
          {/* Context Banner */}
          {state.diagnosis?.diagnosis && (
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs flex items-center gap-2 text-blue-300">
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
                  className={`p-3 rounded-2xl text-xs leading-relaxed max-w-[90%] break-words ${
                    isUser 
                      ? 'bg-blue-600 text-white rounded-br-none shadow-md shadow-blue-600/20' 
                      : 'bg-muted/40 text-foreground border border-border/80 rounded-bl-none'
                  }`}
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
              <div className="space-y-1.5">
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

        {/* Input Footer */}
        <div className="p-3.5 border-t border-border bg-muted/20 flex-shrink-0">
          <div className="flex items-center gap-2 p-1.5 rounded-xl bg-background border border-border focus-within:border-primary/50 transition-colors">
            <input 
              type="text" 
              placeholder="Ask Copilot about trace..." 
              value={inputMessage}
              disabled={isStreaming}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              className="w-full text-xs bg-transparent px-2.5 py-1 text-foreground placeholder:text-muted-foreground focus:outline-none" 
            />
            <Button 
              size="icon" 
              disabled={isStreaming || !inputMessage.trim()}
              className="h-7 w-7 rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex-shrink-0 disabled:opacity-40" 
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
