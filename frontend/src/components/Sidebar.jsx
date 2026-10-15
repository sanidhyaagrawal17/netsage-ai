import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  Activity, 
  Wifi, 
  WifiOff, 
  History, 
  ShieldCheck, 
  Sun, 
  Moon, 
  PanelLeftClose, 
  PanelLeft,
  Search,
  GripVertical,
  ExternalLink,
  Pin,
  Sparkles,
  Bot,
  Move,
  Network
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { toast } from 'sonner';

export default function Sidebar() {
  const { state, dispatch } = useAppContext();
  const isCollapsed = state.isSidebarCollapsed;
  const listenerRunning = state.isListenerRunning;
  const [isTogglingListener, setIsTogglingListener] = useState(false);



  const toggleListener = async () => {
    if (isTogglingListener) return;
    setIsTogglingListener(true);
    try {
      const res = await fetch('/api/listener/toggle', { method: 'POST' });
      const data = await res.json();
      const isRunning = data.status === 'started' || !!data.running;
      dispatch({ type: 'SET_LISTENER_RUNNING', payload: isRunning });
      toast.success(isRunning ? 'PT clipboard sync started' : 'PT sync stopped');
    } catch (e) {
      toast.error('Failed to toggle PT listener: ' + e.message);
    } finally {
      setIsTogglingListener(false);
    }
  };

  const navItems = [
    { id: 'tab-input', label: 'Terminal', icon: Terminal, badge: 'Live' },
    { id: 'tab-diagnosis', label: 'Diagnosis', icon: Activity },
    { id: 'tab-history', label: 'History', icon: History, badge: state.diagnosisHistory?.length > 0 ? String(state.diagnosisHistory.length) : null },
    { id: 'tab-audit', label: 'AI Safety', icon: ShieldCheck },
  ];

  const handleThemeToggle = () => {
    dispatch({ type: 'SET_THEME', payload: state.theme === 'dark' ? 'light' : 'dark' });
  };

  const handleUndock = (e) => {
    if (e) e.stopPropagation();
    dispatch({ type: 'SET_PILL_DOCKED', payload: false });
    toast.info('Pill undocked! Drag it anywhere or double-click to re-dock.');
  };

  const handleRedock = () => {
    dispatch({ type: 'SET_PILL_DOCKED', payload: true });
    toast.success('Pill docked into navigation sidebar');
  };

  const statusConfigs = {
    idle: { label: 'Standby', color: 'bg-emerald-400', glow: 'shadow-[0_0_10px_rgba(52,211,153,0.8)]' },
    rules: { label: 'Rule Engine', color: 'bg-purple-400', glow: 'shadow-[0_0_12px_rgba(192,132,252,0.8)] animate-pulse' },
    thinking: { label: 'Synthesizing', color: 'bg-amber-400', glow: 'shadow-[0_0_12px_rgba(251,191,36,0.8)] animate-pulse' },
    streaming: { label: 'Generating', color: 'bg-sky-400', glow: 'shadow-[0_0_14px_rgba(56,189,248,0.9)] animate-pulse' },
    offline: { label: 'Offline', color: 'bg-rose-500', glow: 'shadow-[0_0_10px_rgba(244,63,94,0.7)] animate-pulse' }
  };

  const currentConfig = statusConfigs[state.aiStatus] || statusConfigs.idle;

  return (
    <TooltipProvider delayDuration={150}>
      <aside className={cn(
        "border-r border-border bg-card flex flex-col h-screen select-none relative z-20 transition-all duration-300 ease-in-out flex-shrink-0",
        isCollapsed ? "w-16" : "w-60"
      )}>
        {/* Brand Header */}
        <div className={cn(
          "h-16 flex items-center border-b border-border transition-all duration-300",
          isCollapsed ? "justify-center px-0" : "justify-between px-4"
        )}>
          {!isCollapsed && (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)] flex-shrink-0">
                <Terminal size={17} className="text-white" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-sm tracking-tight text-foreground truncate">NetSage AI</span>
                <span className="text-[10px] text-muted-foreground font-mono tracking-wider uppercase -mt-0.5 truncate">Packet Tracer</span>
              </div>
            </div>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 flex-shrink-0"
              >
                {isCollapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            </TooltipContent>
          </Tooltip>
        </div>
        
        {/* Navigation Items */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto scrollbar-none">
          {/* Spotlight Search Trigger */}
          <button
            onClick={() => {
              const e = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
              document.dispatchEvent(e);
            }}
            className={cn(
              "flex items-center w-full rounded-xl text-xs text-muted-foreground hover:text-foreground bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all mb-3",
              isCollapsed ? "justify-center h-10 px-0" : "justify-between px-3 py-2"
            )}
            title="Spotlight Search (Ctrl + K)"
          >
            <div className="flex items-center gap-2">
              <Search size={14} className="text-zinc-400" />
              {!isCollapsed && <span>Search...</span>}
            </div>
            {!isCollapsed && (
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-mono text-zinc-400 border border-zinc-700">Ctrl K</kbd>
            )}
          </button>

          {/* Digital Twin Topology Trigger */}
          <button
            onClick={() => dispatch({ type: 'OPEN_TOPOLOGY_MODAL' })}
            className={cn(
              "flex items-center w-full rounded-xl text-xs text-sky-400 hover:text-white bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 transition-all mb-3",
              isCollapsed ? "justify-center h-10 px-0" : "justify-between px-3 py-2"
            )}
            title="Open Digital Twin Topology ($G=(V, E)$)"
          >
            <div className="flex items-center gap-2">
              <Network size={15} className="text-sky-400 animate-pulse" />
              {!isCollapsed && <span className="font-semibold">Digital Twin</span>}
            </div>
            {!isCollapsed && (
              <span className="text-[9px] font-mono uppercase bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded border border-sky-500/30">0 MB VRAM</span>
            )}
          </button>

          {navItems.map((item) => {
            const isActive = state.activeView === item.id;
            const buttonContent = (
              <button
                key={item.id}
                onClick={() => dispatch({ type: 'SET_ACTIVE_VIEW', payload: item.id })}
                className={cn(
                  "relative flex items-center w-full rounded-xl text-xs font-medium transition-all duration-150",
                  isCollapsed ? "justify-center h-10 px-0" : "gap-3 px-3 py-2.5",
                  isActive 
                    ? "text-primary-foreground font-semibold" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 bg-gradient-to-r from-blue-600/40 via-indigo-600/30 to-blue-600/20 border border-blue-500/40 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.2)]"
                    initial={false}
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  />
                )}
                <item.icon size={17} className={cn("relative z-10 flex-shrink-0", isActive ? "text-blue-400" : "text-muted-foreground")} />
                {!isCollapsed && (
                  <>
                    <span className="relative z-10 flex-1 text-left truncate">{item.label}</span>
                    {item.badge && (
                      <span className="relative z-10 text-[9px] font-mono uppercase bg-blue-500/15 text-blue-400 px-1.5 py-0.5 rounded-md border border-blue-500/20">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </button>
            );

            if (isCollapsed) {
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
                  <TooltipContent side="right" className="flex items-center gap-2">
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] font-mono uppercase bg-blue-500/20 text-blue-400 px-1 rounded">
                        {item.badge}
                      </span>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return buttonContent;
          })}
          {/* Dedicated Copilot Toggle Button */}
          <div className="pt-2 mt-2 border-t border-border/40">
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => dispatch({ type: 'SET_COPILOT_OPEN', payload: !state.isCopilotOpen })}
                    className={cn(
                      "relative flex items-center w-full rounded-xl text-xs font-medium transition-all duration-150 justify-center h-10 px-0",
                      state.isCopilotOpen 
                        ? "bg-blue-600/20 text-blue-400 border border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.2)]" 
                        : "text-zinc-400 hover:text-foreground hover:bg-white/[0.04] border border-transparent"
                    )}
                    aria-label="Toggle NetSage Copilot Assistant"
                  >
                    <Bot size={17} className={state.isCopilotOpen ? "text-blue-400" : "text-zinc-400"} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <span>NetSage Copilot (AI)</span>
                </TooltipContent>
              </Tooltip>
            ) : (
              <button
                onClick={() => dispatch({ type: 'SET_COPILOT_OPEN', payload: !state.isCopilotOpen })}
                className={cn(
                  "relative flex items-center w-full rounded-xl text-xs font-medium transition-all duration-150 gap-3 px-3 py-2.5",
                  state.isCopilotOpen 
                    ? "bg-blue-600/20 text-blue-400 border border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.2)]" 
                    : "text-zinc-400 hover:text-foreground hover:bg-white/[0.04] border border-transparent"
                )}
                title="Toggle NetSage Copilot Assistant"
              >
                <Bot size={17} className={state.isCopilotOpen ? "text-blue-400" : "text-zinc-400"} />
                <span className="flex-1 text-left truncate font-semibold">NetSage Copilot</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-500/15 text-blue-400 border border-blue-500/30">
                  AI
                </span>
              </button>
            )}
          </div>
        </nav>

        {/* Footer: Dedicated Pill Dock Zone & Theme */}
        <div className={cn(
          "p-2.5 border-t border-border flex flex-col bg-muted/10 transition-all gap-2",
          isCollapsed ? "items-center px-1" : ""
        )}>
          
          {/* Dock Slot */}
          {state.isPillDocked ? (
            
            /* Docked Pill Content */
            !isCollapsed ? (
              <div className="p-2.5 rounded-xl bg-card border border-border/80 shadow-sm flex flex-col gap-2 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full", currentConfig.color, currentConfig.glow)} />
                    <span className="text-xs font-semibold text-foreground tracking-tight">
                      {currentConfig.label}
                    </span>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={handleUndock}
                        className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                        title="Undock pill to float freely"
                      >
                        <Move size={12} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Undock to floating widget</TooltipContent>
                  </Tooltip>
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground pt-1 border-t border-border/50">
                  <span className="bg-muted/60 px-1.5 py-0.5 rounded border border-border">
                    {state.currentModel}
                  </span>
                  
                  {/* PT Toggle */}
                  <button
                    onClick={toggleListener}
                    disabled={isTogglingListener}
                    className={cn(
                      "flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors",
                      listenerRunning ? "text-emerald-400 bg-emerald-500/10" : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    {listenerRunning ? <Wifi size={11} /> : <WifiOff size={11} />}
                    <span>{listenerRunning ? 'PT Sync' : 'PT Off'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={handleUndock}
                    className="p-2 rounded-xl bg-card border border-border/80 flex items-center justify-center transition-all hover:border-primary/50"
                  >
                    <span className={cn("w-2.5 h-2.5 rounded-full", currentConfig.color, currentConfig.glow)} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {currentConfig.label} • {state.currentModel} (Click to Undock)
                </TooltipContent>
              </Tooltip>
            )

          ) : (

            /* Ghost Slot (When Pill is Undocked) */
            !isCollapsed ? (
              <div 
                onClick={handleRedock}
                className="p-2.5 rounded-xl border border-dashed border-border/80 hover:border-primary/50 hover:bg-primary/5 cursor-pointer flex items-center justify-between text-muted-foreground hover:text-foreground transition-all group"
                title="Click to re-dock pill"
              >
                <div className="flex items-center gap-1.5 text-[11px]">
                  <Pin size={12} className="text-primary/70 group-hover:text-primary transition-colors" />
                  <span>Pill Undocked</span>
                </div>
                <span className="text-[10px] font-mono text-primary/80 group-hover:text-primary">
                  Click to Dock
                </span>
              </div>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={handleRedock}
                    className="p-2 rounded-xl border border-dashed border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary"
                  >
                    <Pin size={13} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Click to re-dock pill</TooltipContent>
              </Tooltip>
            )

          )}

          {/* Theme Switcher Button */}
          <div className={cn(
            "flex items-center pt-1 border-t border-border/40",
            isCollapsed ? "justify-center" : "justify-between px-1"
          )}>
            {!isCollapsed && (
              <span className="text-[10px] text-muted-foreground font-mono">Theme</span>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleThemeToggle} 
                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50"
                >
                  {state.theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Toggle Theme</TooltipContent>
            </Tooltip>
          </div>

        </div>
      </aside>
    </TooltipProvider>
  );
}
