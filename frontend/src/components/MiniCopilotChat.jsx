import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, Sparkles, Loader2, ChevronRight, Copy, Check } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import ChatMessageContent from './ChatMessageContent';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

export default function MiniCopilotChat({ isPiP = false }) {
  const { state, dispatch } = useAppContext();
  const [inputMessage, setInputMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef(null);

  const messages = state.chatMessages || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  const quickPrompts = [
    "Explain native VLAN mismatch",
    "Why does OSPF get stuck in EXSTART?",
    "Show next Cisco command to run"
  ];

  const sendMessage = async (textToSend) => {
    const query = textToSend || inputMessage;
    if (!query || !query.trim() || isStreaming) return;

    setInputMessage('');

    // Add User Message
    const userMsg = {
      id: 'msg-' + Date.now(),
      role: 'user',
      content: query.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    });

    setIsStreaming(true);
    dispatch({ type: 'SET_COPILOT_STREAMING', payload: true });

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
      dispatch({ type: 'SET_COPILOT_STREAMING', payload: false });
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-card/60 backdrop-blur select-text font-sans">
      
      {/* Message Feed */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3 scrollbar-none text-xs">
        {/* Context Banner */}
        {state.diagnosis?.diagnosis && (
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] flex items-center gap-1.5 text-blue-300">
            <Sparkles size={12} className="flex-shrink-0 text-blue-400" />
            <span className="truncate">
              {state.diagnosis.diagnosis?.root_cause || 'Active Diagnosis Attached'}
            </span>
          </div>
        )}

        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div 
              key={msg.id} 
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-0.5`}
            >
              <div 
                className={cn(
                  "p-2.5 rounded-xl text-xs leading-relaxed break-words transition-all shadow-sm",
                  isUser 
                    ? 'bg-blue-600 text-white rounded-br-none max-w-[88%]' 
                    : 'bg-muted/50 text-foreground border border-border/70 rounded-bl-none max-w-[95%]'
                )}
              >
                <ChatMessageContent content={msg.content} isUser={isUser} />
              </div>
              <span className="text-[9px] text-zinc-500 px-1 font-mono">{msg.timestamp}</span>
            </div>
          );
        })}

        {isStreaming && (
          <div className="flex items-center gap-1.5 text-xs text-blue-400 py-0.5">
            <Loader2 size={11} className="animate-spin" />
            <span className="text-[10px]">Generating response...</span>
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
          <input 
            type="text" 
            placeholder="Ask Copilot..." 
            value={inputMessage}
            disabled={isStreaming}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            className="w-full text-xs bg-transparent px-2 py-1 text-foreground placeholder:text-muted-foreground focus:outline-none" 
          />
          <Button 
            size="icon" 
            disabled={isStreaming || !inputMessage.trim()}
            className="h-6 w-6 rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex-shrink-0 disabled:opacity-40 shadow-sm" 
            onClick={() => sendMessage()}
          >
            <Send size={11} />
          </Button>
        </div>
      </div>

    </div>
  );
}
