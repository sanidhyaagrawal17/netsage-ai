import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, Minimize2, Maximize2, ExternalLink, X, RotateCcw, 
  Cpu, Sparkles, Terminal, Shield, Zap, ChevronRight, GripVertical
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useDraggable } from '../hooks/useDraggable';
import { createPortal } from 'react-dom';
import { cn } from '../lib/utils';
import { Button } from './ui/button';

const PIP_STYLES = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 100vw; height: 100vh; margin: 0; padding: 0; overflow: hidden !important;
    background: #000000; color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif;
    font-size: 13px; user-select: none; -webkit-font-smoothing: antialiased;
    scrollbar-width: none !important;
  }
  html::-webkit-scrollbar, body::-webkit-scrollbar { display: none !important; }
  .pip-wrapper { display: flex; flex-direction: column; height: 100vh; background: #000000; }
  .pip-header { 
    display: flex; align-items: center; justify-content: space-between; padding: 10px 14px;
    background: rgba(18, 18, 20, 0.85); border-bottom: 1px solid rgba(255,255,255,0.08); flex-shrink: 0; height: 44px;
    backdrop-filter: blur(20px);
  }
  .pip-header-left { display: flex; align-items: center; gap: 8px; }
  .pip-dot { width: 8px; height: 8px; border-radius: 50%; }
  .pip-dot.idle { background: #10b981; box-shadow: 0 0 10px rgba(16,185,129,0.7); }
  .pip-dot.thinking { background: #f59e0b; box-shadow: 0 0 12px rgba(245,158,11,0.8); animation: pulse 1.2s infinite; }
  .pip-dot.streaming { background: #06b6d4; box-shadow: 0 0 14px rgba(6,182,212,0.9); animation: pulse 0.8s infinite; }
  .pip-dot.rules { background: #a855f7; box-shadow: 0 0 12px rgba(168,85,247,0.8); animation: pulse 1s infinite; }
  .pip-title { font-weight: 600; letter-spacing: -0.02em; font-size: 13px; color: #ffffff; }
  .pip-model-tag { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10px; padding: 2px 7px; background: rgba(255,255,255,0.08); border-radius: 999px; color: #a1a1aa; border: 1px solid rgba(255,255,255,0.06); }
  .pip-header-right { display: flex; gap: 6px; align-items: center; }
  .pip-btn { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); color: #a1a1aa; cursor: pointer; border-radius: 6px; display: flex; align-items: center; justify-content: center; width: 26px; height: 26px; transition: all 0.15s; }
  .pip-btn:hover { background: rgba(255,255,255,0.15); color: #fff; }
  .pip-btn.close:hover { background: rgba(239, 68, 68, 0.25); color: #ef4444; border-color: rgba(239, 68, 68, 0.4); }
  .pip-body { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 14px; scrollbar-width: none; background: #050507; }
  .pip-body::-webkit-scrollbar { display: none; }
  .pip-stream-text { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; line-height: 1.6; color: #38bdf8; white-space: pre-wrap; word-break: break-word; }
  .pip-empty { display: flex; align-items: center; justify-content: center; height: 100%; color: #71717a; font-size: 12px; font-style: italic; text-align: center; padding: 0 16px; }
  .pip-cursor { display: inline-block; width: 6px; height: 14px; background: #38bdf8; margin-left: 2px; vertical-align: middle; animation: blink 1s step-end infinite; }
  .pip-compact-view { display: flex; align-items: center; justify-content: space-between; height: 100vh; padding: 0 14px; background: #09090b; cursor: pointer; border-top: 1px solid rgba(255,255,255,0.1); }
  .pip-compact-view:hover { background: #121216; }
  .pip-compact-left { display: flex; align-items: center; gap: 8px; overflow: hidden; flex: 1; margin-right: 8px; }
  @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
`;

export default function FloatingStatus() {
  const { state } = useAppContext();
  const [isExpanded, setIsExpanded] = useState(false);
  const [pipWindow, setPipWindow] = useState(null);
  const [isPipExpanded, setIsPipExpanded] = useState(true);
  const pipContainerRef = useRef(null);
  const [showToast, setShowToast] = useState(false);

  const [size, setSize] = useState({ width: 360, height: 280 });
  const [isResizing, setIsResizing] = useState(false);
  const minSize = { width: 300, height: 220 };
  const maxSize = { width: 650, height: 550 };

  // Floating default: Placed on bottom-left of main viewport, away from buttons & copilot
  const defaultPos = typeof window !== 'undefined' 
    ? { x: 264, y: Math.max(20, window.innerHeight - 64) }
    : { x: 264, y: 640 };

  const { position, isDragging, handlePointerDown, hasMoved } = useDraggable(
    'netsage-floating-pos',
    defaultPos
  );

  const isAiActive = state.aiStatus !== 'idle';
  const hasStreamed = !!state.streamedRaw;

  // Background tab alert
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isAiActive && !pipWindow) {
        setShowToast(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAiActive, pipWindow]);

  // Window resize handler
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      requestAnimationFrame(() => {
        setSize(prev => ({
          width: Math.min(Math.max(prev.width + e.movementX, minSize.width), maxSize.width),
          height: Math.min(Math.max(prev.height + e.movementY, minSize.height), maxSize.height)
        }));
      });
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const startResize = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
  };

  const openPip = async () => {
    if (!('documentPictureInPicture' in window)) {
      alert('Document Picture-in-Picture API is supported in Chromium browsers (Chrome/Edge).');
      return;
    }
    setShowToast(false);
    setIsPipExpanded(true);

    try {
      const pip = await window.documentPictureInPicture.requestWindow({
        width: 360,
        height: 240,
        disallowReturnToOpener: false
      });
      
      pip.document.title = 'NetSage AI • Floating Diagnostics';
      const styleEl = pip.document.createElement('style');
      styleEl.textContent = PIP_STYLES;
      pip.document.head.appendChild(styleEl);

      const container = pip.document.createElement('div');
      container.id = 'pip-root';
      pip.document.body.appendChild(container);
      
      pip.addEventListener('pagehide', () => setPipWindow(null));
      pipContainerRef.current = container;
      setPipWindow(pip);
    } catch (e) {
      console.error('Failed to open PiP window:', e);
    }
  };

  const closePip = () => {
    if (pipWindow) {
      pipWindow.close();
      setPipWindow(null);
    }
  };

  const togglePipExpand = (expand) => {
    setIsPipExpanded(expand);
    if (pipWindow) {
      try {
        if (expand) pipWindow.resizeTo(360, 240);
        else pipWindow.resizeTo(280, 48);
      } catch (e) {}
    }
  };

  const streamBodyRef = useRef(null);
  useEffect(() => {
    if (streamBodyRef.current) streamBodyRef.current.scrollTop = streamBodyRef.current.scrollHeight;
  }, [state.streamedRaw]);

  const pipBodyRef = useRef(null);
  useEffect(() => {
    if (pipBodyRef.current) pipBodyRef.current.scrollTop = pipBodyRef.current.scrollHeight;
  }, [state.streamedRaw]);

  // Status configuration
  const statusConfigs = {
    idle: {
      color: "bg-emerald-500",
      glow: "shadow-[0_0_12px_rgba(16,185,129,0.8)]",
      label: "Standby",
      tag: "Live Sync",
      icon: Activity
    },
    thinking: {
      color: "bg-amber-400 animate-pulse",
      glow: "shadow-[0_0_14px_rgba(245,158,11,0.9)]",
      label: "Synthesizing",
      tag: "Deep Reasoning",
      icon: Sparkles
    },
    streaming: {
      color: "bg-cyan-400 animate-pulse",
      glow: "shadow-[0_0_16px_rgba(6,182,212,0.95)]",
      label: "Streaming Trace",
      tag: "Llama-3.1",
      icon: Zap
    },
    rules: {
      color: "bg-purple-400 animate-pulse",
      glow: "shadow-[0_0_14px_rgba(168,85,247,0.9)]",
      label: "Deterministic Rules",
      tag: "Layer 1-3 Check",
      icon: Shield
    }
  };

  const currentConfig = statusConfigs[state.aiStatus] || statusConfigs.idle;

  const renderStatusDot = () => (
    <div className="relative flex items-center justify-center">
      <span className={cn("w-2 h-2 rounded-full", currentConfig.color, currentConfig.glow)}></span>
      {state.aiStatus !== 'idle' && (
        <span className={cn("absolute w-4 h-4 rounded-full -inset-1 opacity-50 animate-ping", currentConfig.color)}></span>
      )}
    </div>
  );

  const handlePillClick = () => {
    if (hasMoved && hasMoved()) return;
    setIsExpanded(true);
  };

  // PiP Window Component
  const PipWindowComponent = () => {
    if (!isPipExpanded) {
      return (
        <div className="pip-compact-view" onClick={() => togglePipExpand(true)} title="Click to expand diagnostics">
          <div className="pip-compact-left">
            <span className={`pip-dot ${state.aiStatus}`}></span>
            <span className="pip-title">{currentConfig.label}</span>
            <span className="pip-model-tag">{state.currentModel}</span>
          </div>
          <div className="pip-header-right" onClick={(e) => e.stopPropagation()}>
            <button className="pip-btn" onClick={() => togglePipExpand(true)} title="Expand window"><Maximize2 size={12} /></button>
            <button className="pip-btn close" onClick={closePip} title="Return to tab"><RotateCcw size={12} /></button>
          </div>
        </div>
      );
    }
    return (
      <div className="pip-wrapper">
        <div className="pip-header">
          <div className="pip-header-left">
            <span className={`pip-dot ${state.aiStatus}`}></span>
            <span className="pip-title">{currentConfig.label}</span>
            <span className="pip-model-tag">{state.currentModel}</span>
          </div>
          <div className="pip-header-right">
            <button className="pip-btn" onClick={() => togglePipExpand(false)} title="Collapse to compact mode"><Minimize2 size={12} /></button>
            <button className="pip-btn close" onClick={closePip} title="Return to tab"><RotateCcw size={12} /></button>
          </div>
        </div>
        <div className="pip-body" ref={pipBodyRef}>
          {hasStreamed ? (
            <pre className="pip-stream-text">{state.streamedRaw}<span className="pip-cursor"></span></pre>
          ) : (
            <div className="pip-empty">{isAiActive ? 'Analyzing live telemetry...' : 'Ready for Cisco Packet Tracer show-command input'}</div>
          )}
        </div>
      </div>
    );
  };

  // Expanded in-app view
  const InAppExpandedContent = () => (
    <div 
      className="flex flex-col glass-pill rounded-2xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.12)] border border-border" 
      style={{ width: size.width, height: size.height }}
    >
      <div 
        className={cn(
          "flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border select-none", 
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        )}
        onMouseDown={handlePointerDown}
        onTouchStart={handlePointerDown}
      >
        <div className="flex items-center gap-2.5">
          {renderStatusDot()}
          <span className="text-xs font-semibold text-foreground tracking-tight">{currentConfig.label}</span>
          <span className="text-[10px] font-mono text-muted-foreground bg-muted/80 border border-border px-2 py-0.5 rounded-full">
            {state.currentModel}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          {'documentPictureInPicture' in window && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80" 
              onClick={(e) => { e.stopPropagation(); openPip(); }} 
              title="Pop out into OS Always-On-Top Window"
            >
              <ExternalLink size={13} />
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80" 
            onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }} 
            title="Collapse to Pill"
          >
            <Minimize2 size={13} />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 scrollbar-none bg-card/40 font-mono" ref={streamBodyRef}>
        {hasStreamed ? (
          <pre className="text-xs text-sky-400 leading-relaxed whitespace-pre-wrap break-words">
            {state.streamedRaw}
            <span className="inline-block w-1.5 h-3.5 bg-sky-400 ml-1 align-middle animate-pulse"></span>
          </pre>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-xs text-muted-foreground gap-2">
            <Terminal size={20} className="text-muted-foreground mb-1" />
            <p className="italic">
              {isAiActive ? 'Synthesizing network topology & telemetry...' : 'Standby • Ready for CLI diagnosis'}
            </p>
          </div>
        )}
      </div>

      <div 
        className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize flex items-end justify-end p-1 select-none" 
        onMouseDown={startResize} 
        title="Drag to resize"
      >
        <div className="w-2 h-2 border-r-2 border-b-2 border-border rounded-br-[2px]"></div>
      </div>
    </div>
  );

  return (
    <>
      {/* Draggable Dynamic Island Pill */}
      <div 
        id="floating-status-widget"
        className={cn(
          "fixed top-0 left-0 z-50 select-none",
          isDragging ? "cursor-grabbing" : "transition-transform duration-150 ease-out"
        )}
        style={{ 
          transform: `translate(${position.x}px, ${position.y}px)`,
          touchAction: 'none'
        }}
      >
        {pipWindow ? (
          <div 
            className="flex items-center gap-3 px-4 py-2 glass-pill rounded-full cursor-pointer hover:border-border transition-all duration-200 active:scale-95 group"
            title="Viewing in Picture-in-Picture. Click to bring back."
            onClick={closePip}
          >
            {renderStatusDot()}
            <span className="text-xs font-semibold text-foreground tracking-tight">PiP Active</span>
            <RotateCcw size={12} className="text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
        ) : isExpanded ? (
          <InAppExpandedContent />
        ) : (
          <div 
            className={cn(
              "flex items-center gap-2.5 px-3.5 py-2 glass-pill rounded-full transition-all duration-150",
              "hover:border-border hover:scale-[1.03] active:scale-[0.97]",
              isDragging ? "cursor-grabbing scale-105 shadow-2xl" : "cursor-grab"
            )}
            onClick={handlePillClick}
            onMouseDown={handlePointerDown}
            onTouchStart={handlePointerDown}
          >
            <GripVertical size={13} className="text-muted-foreground opacity-60 group-hover:opacity-100" />
            {renderStatusDot()}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground tracking-tight">
                {currentConfig.label}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground bg-muted/80 px-2 py-0.5 rounded-full border border-border">
                {state.currentModel}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* PiP Portal */}
      {pipWindow && pipContainerRef.current && createPortal(
        <PipWindowComponent />,
        pipContainerRef.current
      )}

      {/* Tab Alert Toast */}
      {showToast && createPortal(
        <div className="fixed bottom-6 right-6 z-[60] flex items-center justify-between gap-4 p-4 glass-pill rounded-2xl animate-in slide-in-from-bottom-4 shadow-2xl">
          <div className="flex items-center gap-3">
            <Activity size={18} className="text-primary" />
            <span className="text-xs font-medium text-white">AI Diagnostic is running in background</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={openPip} className="h-8 text-xs rounded-lg bg-primary hover:bg-primary/90 text-white shadow-lg">
              Pop Out ↗
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setShowToast(false)}>
              <X size={13} />
            </Button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
