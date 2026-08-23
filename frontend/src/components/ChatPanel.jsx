import React, { useState } from 'react';
import { MessageSquare, X, Send, Sparkles, Terminal, ChevronRight, Bot } from 'lucide-react';
import { Button } from './ui/button';
import { useAppContext } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';

export default function ChatPanel() {
  const [message, setMessage] = useState('');
  const { state, dispatch } = useAppContext();

  if (!state.isCopilotOpen) return null;

  const quickPrompts = [
    "Check Spanning-Tree Root Bridge",
    "Identify OSPF Area Mismatch",
    "Explain Native VLAN Anomaly"
  ];

  const handleSend = (text) => {
    const query = text || message;
    if (!query) return;
    setMessage('');
  };

  return (
    <AnimatePresence>
      <motion.aside 
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: 320, opacity: 1 }}
        exit={{ width: 0, opacity: 0 }}
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
        className="w-80 border-l border-border bg-card flex flex-col hidden xl:flex h-screen select-none flex-shrink-0 transition-colors duration-200"
      >
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-[0_0_12px_rgba(59,130,246,0.2)]">
              <Bot size={15} className="text-blue-400" />
            </div>
            <div>
              <span className="font-semibold text-xs text-foreground tracking-tight block">NetSage Copilot</span>
              <span className="text-[10px] text-zinc-500 font-mono block -mt-0.5">Network Assistant</span>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.06]" 
            onClick={() => dispatch({ type: 'SET_COPILOT_OPEN', payload: false })}
            title="Close Copilot"
          >
            <X size={14} />
          </Button>
        </header>

        {/* Body */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 font-sans scrollbar-none">
          <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-blue-400">
              <Sparkles size={13} />
              <span>AI Packet Tracer Copilot</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              I can inspect your active Cisco Packet Tracer CLI output, highlight topology anomalies, and generate Cisco IOS fix commands in real-time.
            </p>
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 px-1">
              Quick Diagnostic Actions
            </span>
            <div className="space-y-1.5">
              {quickPrompts.map((p, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(p)}
                  className="w-full text-left p-2.5 rounded-xl bg-muted/30 hover:bg-muted/70 border border-border/60 text-xs text-foreground transition-all flex items-center justify-between group"
                >
                  <span className="line-clamp-1">{p}</span>
                  <ChevronRight size={12} className="text-zinc-600 group-hover:text-white transition-colors flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Input Footer */}
        <div className="p-3.5 border-t border-border bg-muted/20">
          <div className="flex items-center gap-2 p-1.5 rounded-xl bg-background border border-border focus-within:border-primary/50 transition-colors">
            <input 
              type="text" 
              placeholder="Ask Copilot about trace..." 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="w-full text-xs bg-transparent px-2.5 py-1 text-foreground placeholder:text-muted-foreground focus:outline-none" 
            />
            <Button 
              size="icon" 
              className="h-7 w-7 rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex-shrink-0" 
              onClick={() => handleSend()}
            >
              <Send size={12} />
            </Button>
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
