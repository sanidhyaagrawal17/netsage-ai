import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, Minimize2, Maximize2, ExternalLink, X, RotateCcw, 
  Cpu, Sparkles, Terminal, Shield, Zap, ChevronRight, GripVertical,
  Wifi, WifiOff, Bot, ArrowDownToDot, Pin
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useDraggable } from '../hooks/useDraggable';
import { createPortal } from 'react-dom';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import MiniCopilotChat from './MiniCopilotChat';
import { toast } from 'sonner';

const PIP_STYLES = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 100vw; height: 100vh; margin: 0; padding: 0; overflow: hidden !important;
    background: #09090b; color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
    font-size: 12px; user-select: text; -webkit-font-smoothing: antialiased;
    scrollbar-width: none !important;
  }
  html::-webkit-scrollbar, body::-webkit-scrollbar { display: none !important; }
  .pip-wrapper { display: flex; flex-direction: column; height: 100vh; background: #09090b; }
  .pip-header { 
    display: flex; align-items: center; justify-content: space-between; padding: 8px 12px;
    background: rgba(18, 18, 20, 0.95); border-bottom: 1px solid rgba(255,255,255,0.08); flex-shrink: 0; height: 42px;
    backdrop-filter: blur(20px);
  }
  .pip-header-left { display: flex; align-items: center; gap: 8px; }
  .pip-dot { width: 8px; height: 8px; border-radius: 50%; }
  .pip-dot.idle { background: #10b981; box-shadow: 0 0 10px rgba(16,185,129,0.7); }
  .pip-dot.thinking { background: #f59e0b; box-shadow: 0 0 12px rgba(245,158,11,0.8); }
  .pip-dot.streaming { background: #06b6d4; box-shadow: 0 0 14px rgba(6,182,212,0.9); }
  .pip-dot.rules { background: #a855f7; box-shadow: 0 0 12px rgba(168,85,247,0.8); }
  .pip-title { font-weight: 600; letter-spacing: -0.01em; font-size: 12px; color: #ffffff; }
  .pip-model-tag { 
    font-family: ui-monospace, monospace; font-size: 10px; color: #71717a; 
    background: rgba(255,255,255,0.05); padding: 1px 6px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.08);
  }
  .pip-btn {
    background: transparent; border: none; color: #71717a; cursor: pointer;
    padding: 5px; border-radius: 6px; display: flex; align-items: center; justify-content: center;
  }
  .pip-btn:hover { background: rgba(255,255,255,0.08); color: #ffffff; }
  .pip-body { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
`;

export default function FloatingStatus() {
  const { state, dispatch } = useAppContext();
  const [isExpanded, setIsExpanded] = useState(false);
  const [pipWindow, setPipWindow] = useState(null);
  const [listenerRunning, setListenerRunning] = useState(false);
  const [size, setSize] = useState({ width: 340, height: 440 });
  const [isResizingWindow, setIsResizingWindow] = useState(false);

  const pipContainerRef = useRef(null);

  // Position for floating widget
  const defaultPos = { x: window.innerWidth - 380, y: 30 };
  const { position, isDragging, handlePointerDown } = useDraggable(defaultPos);

  // Check PT listener status
  useEffect(() => {
    const checkListener = async () => {
      try {
        const res = await fetch('/api/listener/status');
        if (!res.ok) return;
        const data = await res.json();
        setListenerRunning(!!data.running);
      } catch (e) {}
    };
    checkListener();
    const interval = setInterval(checkListener, 3000);
    return () => clearInterval(interval);
  }, []);

  // Sync PiP window closed
  useEffect(() => {
    if (!pipWindow) return;
    const handleUnload = () => setPipWindow(null);
    pipWindow.addEventListener('pagehide', handleUnload);
    return () => pipWindow.removeEventListener('pagehide', handleUnload);
  }, [pipWindow]);

  // Open Document Picture-in-Picture (OS Always-On-Top Window)
  const openPip = async () => {
    if (!('documentPictureInPicture' in window)) {
      toast.error('Document Picture-in-Picture is not supported in this browser.');
      return;
    }
    try {
      const pip = await window.documentPictureInPicture.requestWindow({
        width: 360,
        height: 480,
      });

      // Inject custom styling
      const styleEl = pip.document.createElement('style');
      styleEl.textContent = PIP_STYLES;
      pip.document.head.appendChild(styleEl);

      // Copy document stylesheets
      Array.from(document.styleSheets).forEach(sheet => {
        try {
          if (sheet.href) {
            const link = pip.document.createElement('link');
            link.rel = 'stylesheet';
            link.href = sheet.href;
            pip.document.head.appendChild(link);
          } else if (sheet.cssRules) {
            const inlineStyle = pip.document.createElement('style');
            Array.from(sheet.cssRules).forEach(rule => {
              inlineStyle.appendChild(pip.document.createTextNode(rule.cssText));
            });
            pip.document.head.appendChild(inlineStyle);
          }
        } catch (e) {}
      });

      const container = pip.document.createElement('div');
      container.id = 'pip-root';
      container.style.height = '100vh';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      pip.document.body.appendChild(container);
      pipContainerRef.current = container;

      setPipWindow(pip);
      setIsExpanded(false);
      toast.success('Mini Copilot popped out to Always-On-Top window!');
    } catch (e) {
      toast.error('Failed to open PiP window: ' + e.message);
    }
  };

  const closePip = () => {
    if (pipWindow) {
      pipWindow.close();
      setPipWindow(null);
    }
  };

  // Re-dock to navigation sidebar
  const handleDockToSidebar = (e) => {
    if (e) e.stopPropagation();
    setIsExpanded(false);
    dispatch({ type: 'SET_PILL_DOCKED', payload: true });
    toast.success('Pill docked back into navigation sidebar');
  };

  // Handle drag resizing of the expanded floating window
  const startResize = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizingWindow(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = size.width;
    const startH = size.height;

    const onMouseMove = (moveEvent) => {
      const newW = Math.max(300, Math.min(600, startW + (moveEvent.clientX - startX)));
      const newH = Math.max(350, Math.min(750, startH + (moveEvent.clientY - startY)));
      setSize({ width: newW, height: newH });
    };

    const onMouseUp = () => {
      setIsResizingWindow(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const statusConfigs = {
    idle: { label: 'Standby', color: 'bg-emerald-400', glow: 'shadow-[0_0_10px_rgba(52,211,153,0.8)]' },
    rules: { label: 'Rule Engine', color: 'bg-purple-400', glow: 'shadow-[0_0_12px_rgba(192,132,252,0.8)] animate-pulse' },
    thinking: { label: 'Synthesizing', color: 'bg-amber-400', glow: 'shadow-[0_0_12px_rgba(251,191,36,0.8)] animate-pulse' },
    streaming: { label: 'Generating', color: 'bg-sky-400', glow: 'shadow-[0_0_14px_rgba(56,189,248,0.9)] animate-pulse' },
    offline: { label: 'Offline', color: 'bg-rose-500', glow: 'shadow-[0_0_10px_rgba(244,63,94,0.7)] animate-pulse' }
  };

  const currentConfig = statusConfigs[state.aiStatus] || statusConfigs.idle;

  // If pill is docked in sidebar, do not render floating widget
  if (state.isPillDocked) {
    return null;
  }

  // PiP Window Component
  const PipWindowComponent = () => (
    <div className="pip-wrapper">
      <div className="pip-header">
        <div className="pip-header-left">
          <span className={cn("pip-dot", state.aiStatus)}></span>
          <span className="pip-title">NetSage Copilot</span>
          <span className="pip-model-tag">{state.currentModel}</span>
        </div>
        <div className="pip-header-right" style={{ display: 'flex', gap: '4px' }}>
          <button className="pip-btn" onClick={closePip} title="Close Always-On-Top Window">
            <X size={13} />
          </button>
        </div>
      </div>
      <div className="pip-body">
        <MiniCopilotChat isPiP={true} />
      </div>
    </div>
  );

  return (
    <>
      {/* Floating Draggable Dynamic Island / Window */}
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
            className="flex items-center gap-3 px-4 py-2 glass-pill rounded-full cursor-pointer hover:border-border transition-all duration-200 active:scale-95 group shadow-2xl"
            title="Viewing in Always-On-Top Window. Click to restore."
            onClick={closePip}
          >
            <span className={cn("w-2 h-2 rounded-full", currentConfig.color, currentConfig.glow)} />
            <span className="text-xs font-semibold text-foreground tracking-tight">PiP Active</span>
            <RotateCcw size={12} className="text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
        ) : isExpanded ? (
          
          /* Expanded Floating Mini Copilot Window */
          <div 
            className="flex flex-col glass-pill rounded-2xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.12)] border border-border" 
            style={{ width: size.width, height: size.height }}
          >
            {/* Header */}
            <div 
              className={cn(
                "flex items-center justify-between px-3.5 py-2.5 bg-muted/40 border-b border-border select-none", 
                isDragging ? 'cursor-grabbing' : 'cursor-grab'
              )}
              onMouseDown={handlePointerDown}
              onTouchStart={handlePointerDown}
            >
              <div className="flex items-center gap-2">
                <GripVertical size={13} className="text-muted-foreground opacity-60" />
                <span className={cn("w-2 h-2 rounded-full", currentConfig.color, currentConfig.glow)} />
                <span className="text-xs font-semibold text-foreground tracking-tight">NetSage Mini</span>
                <span className="text-[9px] font-mono text-muted-foreground bg-muted/80 border border-border px-1.5 py-0.2 rounded">
                  {state.currentModel}
                </span>
              </div>
              
              <div className="flex items-center gap-1" onMouseDown={(e) => e.stopPropagation()}>
                {'documentPictureInPicture' in window && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80" 
                    onClick={openPip} 
                    title="Pop out into OS Always-On-Top Window"
                  >
                    <ExternalLink size={12} />
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80" 
                  onClick={() => setIsExpanded(false)} 
                  title="Collapse to Pill"
                >
                  <Minimize2 size={12} />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80" 
                  onClick={handleDockToSidebar} 
                  title="Dock back to Sidebar"
                >
                  <Pin size={12} />
                </Button>
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-hidden">
              <MiniCopilotChat />
            </div>

            {/* Resize Corner Handle */}
            <div 
              className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-end justify-end p-1 select-none z-20" 
              onMouseDown={startResize} 
              title="Drag to resize window"
            >
              <div className="w-2 h-2 border-r-2 border-b-2 border-muted-foreground/60 rounded-br-[2px]" />
            </div>
          </div>

        ) : (

          /* Collapsed Draggable Floating Pill */
          <div 
            className={cn(
              "flex items-center gap-2.5 px-3.5 py-2 glass-pill rounded-full transition-all duration-150 shadow-2xl",
              "hover:border-border hover:scale-[1.03] active:scale-[0.97]",
              isDragging ? "cursor-grabbing scale-105" : "cursor-grab"
            )}
            onClick={() => !isDragging && setIsExpanded(true)}
            onDoubleClick={handleDockToSidebar}
            onMouseDown={handlePointerDown}
            onTouchStart={handlePointerDown}
            title="Click to open Mini Copilot • Double click to Dock back to Sidebar"
          >
            <GripVertical size={13} className="text-muted-foreground opacity-60 group-hover:opacity-100" />
            <span className={cn("w-2 h-2 rounded-full", currentConfig.color, currentConfig.glow)} />
            
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground tracking-tight">
                {currentConfig.label}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground bg-muted/80 px-2 py-0.5 rounded-full border border-border">
                {state.currentModel}
              </span>
            </div>

            {/* PT Indicator */}
            <span className="text-border">|</span>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground" title={listenerRunning ? 'Packet Tracer Sync Active' : 'Packet Tracer Sync Offline'}>
              {listenerRunning ? (
                <Wifi size={12} className="text-emerald-400" />
              ) : (
                <WifiOff size={12} className="text-zinc-500" />
              )}
            </div>

            {/* Quick Dock Button */}
            <button 
              onClick={handleDockToSidebar}
              className="p-0.5 rounded hover:bg-white/10 text-muted-foreground hover:text-white transition-colors ml-1"
              title="Dock back to Sidebar"
            >
              <Pin size={11} />
            </button>
          </div>

        )}
      </div>

      {/* PiP Portal */}
      {pipWindow && pipContainerRef.current && createPortal(
        <PipWindowComponent />,
        pipContainerRef.current
      )}
    </>
  );
}
