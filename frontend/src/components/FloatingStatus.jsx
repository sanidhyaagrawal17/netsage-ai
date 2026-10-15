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
import { motion, AnimatePresence } from 'motion/react';
import MiniCopilotChat from './MiniCopilotChat';
import { toast } from 'sonner';

export default function FloatingStatus() {
  const { state, dispatch } = useAppContext();
  const [isExpanded, setIsExpanded] = useState(false);
  const [pipWindow, setPipWindow] = useState(null);
  const listenerRunning = state.isListenerRunning;
  const [isTogglingListener, setIsTogglingListener] = useState(false);
  const [size, setSize] = useState({ width: 350, height: 480 });
  const [isResizingWindow, setIsResizingWindow] = useState(false);

  const [flavorText, setFlavorText] = useState('');
  const [activeTimer, setActiveTimer] = useState(0);

  const flavors = ['Charting the Stars', 'Analyzing Telemetry', 'Decoding Configs', 'Synthesizing Fix', 'Querying NetSage Core'];

  useEffect(() => {
    let interval;
    if (state.aiStatus === 'thinking' || state.aiStatus === 'streaming') {
      setFlavorText(flavors[0]);
      setActiveTimer(0);
      interval = setInterval(() => {
        setActiveTimer(t => {
          const newT = t + 1;
          if (newT % 3 === 0) setFlavorText(flavors[Math.floor((newT / 3)) % flavors.length]);
          return newT;
        });
      }, 1000);
    } else {
      setActiveTimer(0);
      setFlavorText('');
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [state.aiStatus]);

  const pipContainerRef = useRef(null);

  const defaultPos = { 
    x: typeof window !== 'undefined' ? Math.max(20, window.innerWidth - 380) : 100, 
    y: 30 
  };
  const { position, setPosition, isDragging, handlePointerDown, wasDragged } = useDraggable('netsage_floating_status_pos', defaultPos);

  const handleExpand = () => {
    if (wasDragged()) return;
    const curX = Number.isFinite(position?.x) ? position.x : defaultPos.x;
    const curY = Number.isFinite(position?.y) ? position.y : defaultPos.y;
    const maxX = Math.max(12, window.innerWidth - size.width - 16);
    const maxY = Math.max(12, window.innerHeight - size.height - 16);
    const targetX = Math.min(Math.max(12, curX), maxX);
    const targetY = Math.min(Math.max(12, curY), maxY);
    if (targetX !== curX || targetY !== curY) {
      setPosition({ x: targetX, y: targetY });
    }
    setIsExpanded(true);
  };



  // Sync PiP window closed
  useEffect(() => {
    if (!pipWindow) return;
    const handleUnload = () => setPipWindow(null);
    pipWindow.addEventListener('pagehide', handleUnload);
    return () => pipWindow.removeEventListener('pagehide', handleUnload);
  }, [pipWindow]);

  // Open Document Picture-in-Picture (OS Always-On-Top Window)
    const handleToggleListener = async (e) => {
    e.stopPropagation();
    if (isTogglingListener) return;
    setIsTogglingListener(true);
    try {
      const res = await fetch('/api/listener/toggle', { method: 'POST' });
      const data = await res.json();
      const isRunning = data.status === 'started' || !!data.running;
      dispatch({ type: 'SET_LISTENER_RUNNING', payload: isRunning });
    } catch (e) {}
    finally {
      setIsTogglingListener(false);
    }
  };

  const openPip = async () => {
    if (!('documentPictureInPicture' in window)) {
      toast.error('Document Picture-in-Picture is not supported in this browser.');
      return;
    }
    try {
      const pip = await window.documentPictureInPicture.requestWindow({
        width: 380,
        height: 540,
      });

      const pipDoc = pip.document;
      const currentTheme = state.theme || 'dark';

      // 1. Set theme and dark class on documentElement and body
      pipDoc.documentElement.setAttribute('data-theme', currentTheme);
      pipDoc.documentElement.className = currentTheme === 'dark' ? 'dark' : '';
      pipDoc.body.setAttribute('data-theme', currentTheme);
      pipDoc.body.className = `${currentTheme === 'dark' ? 'dark' : ''} bg-background text-foreground`;

      // 2. Clone ALL style and link elements from parent document head
      document.querySelectorAll('style, link[rel="stylesheet"]').forEach((el) => {
        try {
          pipDoc.head.appendChild(el.cloneNode(true));
        } catch (e) {}
      });

      // 3. Extract all CSS rules from document.styleSheets to ensure 100% style parity
      Array.from(document.styleSheets).forEach((sheet) => {
        try {
          if (sheet.cssRules && sheet.cssRules.length > 0) {
            const newStyle = pipDoc.createElement('style');
            let rulesText = '';
            for (let i = 0; i < sheet.cssRules.length; i++) {
              rulesText += sheet.cssRules[i].cssText + '\n';
            }
            newStyle.textContent = rulesText;
            pipDoc.head.appendChild(newStyle);
          }
        } catch (e) {
          // Cross-origin stylesheet fallback
          if (sheet.href) {
            const link = pipDoc.createElement('link');
            link.rel = 'stylesheet';
            link.href = sheet.href;
            pipDoc.head.appendChild(link);
          }
        }
      });

      // 4. Injected PiP base & scroll styles
      

      // Create root container
      const container = pipDoc.createElement('div');
      container.id = 'pip-root';
      pipDoc.body.appendChild(container);
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

    let resizeAnimFrame = null;
    let latestX = startX;
    let latestY = startY;

    const onMouseMove = (moveEvent) => {
      latestX = moveEvent.clientX;
      latestY = moveEvent.clientY;

      if (resizeAnimFrame) return;
      resizeAnimFrame = requestAnimationFrame(() => {
        const newW = Math.max(300, Math.min(window.innerWidth - 30, startW + (latestX - startX)));
        const newH = Math.max(350, Math.min(window.innerHeight - 30, startH + (latestY - startY)));
        setSize({ width: newW, height: newH });
        resizeAnimFrame = null;
      });
    };

    const onMouseUp = () => {
      if (resizeAnimFrame) cancelAnimationFrame(resizeAnimFrame);
      setIsResizingWindow(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseup', onMouseUp);
  };

  const statusConfigs = {
    idle: { label: 'Standby', color: 'bg-emerald-400', glow: 'shadow-[0_0_10px_rgba(52,211,153,0.8)]' },
    rules: { label: 'Rule Engine', color: 'bg-purple-400', glow: 'shadow-[0_0_12px_rgba(192,132,252,0.8)] animate-pulse' },
    thinking: { label: 'Synthesizing', color: 'bg-amber-400', glow: 'shadow-[0_0_12px_rgba(251,191,36,0.8)] animate-pulse' },
    streaming: { label: 'Generating', color: 'bg-sky-400', glow: 'shadow-[0_0_14px_rgba(56,189,248,0.9)] animate-pulse' },
    offline: { label: 'Offline', color: 'bg-rose-500', glow: 'shadow-[0_0_10px_rgba(244,63,94,0.7)] animate-pulse' }
  };

  const currentConfig = { ...(statusConfigs[state.aiStatus] || statusConfigs.idle) };
  if (state.aiStatus === 'thinking' || state.aiStatus === 'streaming') {
    currentConfig.label = `${flavorText}... (${activeTimer}s)`;
  }

  // If pill is docked in sidebar, do not render floating widget
  if (state.isPillDocked) {
    return null;
  }

  // PiP Window Component
  // Smooth animation variants
  const pillVariants = {
    initial: { scale: 0.92, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.92, opacity: 0 }
  };

  const expandedVariants = {
    initial: { scale: 0.92, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.92, opacity: 0 }
  };

  const transitionConfig = { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] };

  return (
    <>
      {/* Floating Draggable Dynamic Island / Window */}
      <div 
        id="floating-status-widget"
        className={cn(
          "fixed top-0 left-0 z-50 select-none",
          isDragging ? "cursor-grabbing" : "cursor-grab"
        )}
        style={{ 
          transform: `translate3d(${Number.isFinite(position?.x) ? position.x : defaultPos.x}px, ${Number.isFinite(position?.y) ? position.y : defaultPos.y}px, 0)`,
          transition: isDragging ? 'none' : 'transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
          touchAction: 'none'
        }}
      >
        <AnimatePresence>

          {pipWindow ? (
            /* PiP Active Badge */
            <motion.div 
              key="pip-badge"
              variants={pillVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={transitionConfig}
              className="flex items-center gap-3 px-4 py-2 glass-pill rounded-full cursor-pointer hover:border-border transition-all duration-200 active:scale-95 group shadow-2xl"
              title="Viewing in Always-On-Top Window. Click to restore."
              onClick={closePip}
            >
              <span className={cn("w-2 h-2 rounded-full", currentConfig.color, currentConfig.glow)} />
              <span className="text-xs font-semibold text-foreground tracking-tight">PiP Active</span>
              <RotateCcw size={12} className="text-muted-foreground group-hover:text-foreground transition-colors" />
            </motion.div>

          ) : isExpanded ? (
            
            /* Expanded Floating Mini Copilot Window */
            <motion.div 
              key="expanded-window"
              variants={expandedVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={transitionConfig}
              className="grid grid-rows-[auto_1fr] glass-pill rounded-2xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.12)] border border-border" 
              style={{ width: size.width, height: size.height }}
            >
              {/* Header */}
              <div 
                className={cn(
                  "flex items-center justify-between px-3.5 py-2.5 bg-muted/40 border-b border-border select-none flex-shrink-0", 
                  isDragging ? 'cursor-grabbing' : 'cursor-grab'
                )}
                onMouseDown={handlePointerDown}
                onTouchStart={handlePointerDown}
              >
                <div className="flex items-center gap-2">
                  <GripVertical size={13} className="text-muted-foreground opacity-60" />
                  <span className={cn("w-2 h-2 rounded-full", currentConfig.color, currentConfig.glow)} />
                  <span className="text-xs font-semibold text-foreground tracking-tight">NetSage Mini <span className="text-muted-foreground font-normal ml-1 border-l border-border pl-2">{currentConfig.label}</span></span>
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

              {/* Chat Body with min-h-0 */}
              <div className="min-h-0 h-full overflow-hidden" data-no-drag="true">
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
            </motion.div>

          ) : (

            /* Collapsed Draggable Floating Pill */
            <motion.div 
              key="collapsed-pill"
              variants={pillVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={transitionConfig}
              className={cn(
                "flex items-center gap-2.5 px-3.5 py-2 glass-pill rounded-full transition-colors duration-150 shadow-2xl select-none",
                "hover:border-border",
                isDragging ? "cursor-grabbing scale-[1.02] shadow-primary/25" : "cursor-pointer"
              )}
              onClick={handleExpand}
              onDoubleClick={handleDockToSidebar}
              onMouseDown={handlePointerDown}
              onTouchStart={handlePointerDown}
              title="Click to open Mini Copilot · Drag to move · Double click to Dock"
            >
              <div 
                className="cursor-grab active:cursor-grabbing p-0.5 -ml-1 text-muted-foreground hover:text-foreground transition-colors"
                title="Drag widget"
              >
                <GripVertical size={13} />
              </div>
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
              <button 
                onClick={handleToggleListener}
                className="flex items-center gap-1 text-[10px] p-0.5 rounded hover:bg-white/10 transition-colors" 
                title={listenerRunning ? 'Packet Tracer Sync Active (Click to Pause)' : 'Packet Tracer Sync Offline (Click to Start)'}
              >
                {listenerRunning ? (
                  <Wifi size={12} className="text-emerald-400" />
                ) : (
                  <WifiOff size={12} className="text-zinc-500" />
                )}
              </button>

              {/* Quick Dock Button */}
              <button 
                onClick={handleDockToSidebar}
                className="p-0.5 rounded hover:bg-white/10 text-muted-foreground hover:text-white transition-colors ml-1"
                title="Dock back to Sidebar"
              >
                <Pin size={11} />
              </button>
            </motion.div>

          )}

        </AnimatePresence>
      </div>

      {/* PiP Portal */}
      {pipWindow && pipContainerRef.current && createPortal(
        <div className="grid grid-rows-[auto_1fr] h-full w-full bg-card text-foreground font-sans select-text overflow-hidden">
      {/* Header */}
      <header className="h-11 flex items-center justify-between px-3 border-b border-border bg-card/95 backdrop-blur flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className={cn("w-2 h-2 rounded-full", currentConfig.color, currentConfig.glow)} />
          <span className="font-semibold text-xs text-foreground tracking-tight">NetSage Copilot <span className="text-muted-foreground font-normal ml-1 border-l border-border pl-2">{currentConfig.label}</span></span>
          <span className="text-[10px] font-mono text-muted-foreground bg-muted/80 border border-border px-1.5 py-0.5 rounded">
            {state.currentModel}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80" 
            onClick={closePip} 
            title="Close Pop-out Window"
          >
            <X size={13} />
          </Button>
        </div>
      </header>
      
      {/* Chat Body */}
      <div className="min-h-0 h-full overflow-hidden">
        <MiniCopilotChat isPiP={true} />
        </div>
      </div>,
      pipContainerRef.current
    )}
  </>
);


}
