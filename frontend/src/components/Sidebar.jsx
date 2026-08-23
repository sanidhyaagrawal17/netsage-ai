import React from 'react';
import { 
  Terminal, Activity, BarChart3, Clock, Moon, Sun, Shield, 
  Wifi, WifiOff, Sparkles, MessageSquare, Network, Bot,
  PanelLeftClose, PanelLeft
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useState, useEffect as useEff } from 'react';
import { motion } from 'motion/react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

export default function Sidebar() {
  const { state, dispatch } = useAppContext();
  const [listenerRunning, setListenerRunning] = useState(false);
  const isCollapsed = state.isSidebarCollapsed;

  useEff(() => {
    fetch('/api/listener/status').then(r => r.json()).then(d => setListenerRunning(d.running)).catch(() => {});
    const iv = setInterval(() => fetch('/api/listener/status').then(r => r.json()).then(d => setListenerRunning(d.running)).catch(() => {}), 4000);
    return () => clearInterval(iv);
  }, []);

  const toggleListener = async () => {
    const ep = listenerRunning ? '/api/listener/stop' : '/api/listener/start';
    const r = await fetch(ep, { method: 'POST' });
    const d = await r.json();
    setListenerRunning(d.status === 'started' || d.status === 'already_running');
  };

  const handleThemeToggle = () => {
    dispatch({ type: 'SET_THEME', payload: state.theme === 'dark' ? 'light' : 'dark' });
  };

  const navItems = [
    { id: 'tab-input', label: 'Terminal', icon: Terminal, badge: 'Live' },
    { id: 'tab-diagnosis', label: 'Diagnosis', icon: Activity },
    { id: 'tab-telemetry', label: 'Telemetry', icon: BarChart3 },
    { id: 'tab-history', label: 'History', icon: Clock },
    { id: 'tab-audit', label: 'AI Safety', icon: Shield },
  ];

  return (
    <TooltipProvider delayDuration={150}>
      <aside 
        className={cn(
          "flex flex-col bg-card border-r border-border h-screen flex-shrink-0 select-none transition-all duration-300 ease-in-out",
          isCollapsed ? "w-16" : "w-60"
        )}
      >
        {/* Brand Header & Toggle */}
        <div className={cn(
          "h-16 flex items-center border-b border-border transition-all px-3",
          isCollapsed ? "justify-center" : "justify-between px-4"
        )}>
          {!isCollapsed && (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)] flex-shrink-0">
                <Network size={17} className="text-white" />
              </div>
              <div className="truncate">
                <span className="font-semibold text-foreground tracking-tight text-sm block leading-none">NetSage AI</span>
                <span className="text-[10px] text-muted-foreground font-mono block mt-1 leading-none">Packet Tracer</span>
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
        </nav>

        {/* Footer Status & Controls */}
        <div className={cn(
          "p-3 border-t border-border flex flex-col bg-muted/10 transition-all",
          isCollapsed ? "items-center gap-2 px-1" : "gap-3"
        )}>
          {/* Status Indicator */}
          {!isCollapsed ? (
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  state.liveStatus.active ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-pulse" : "bg-zinc-500"
                )}></span>
                <span className="text-[11px] text-muted-foreground font-medium truncate">
                  {state.liveStatus.text}
                </span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded border border-border">
                {state.currentModel}
              </span>
            </div>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-1.5 cursor-default">
                  <span className={cn(
                    "block w-2.5 h-2.5 rounded-full",
                    state.liveStatus.active ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-pulse" : "bg-zinc-500"
                  )}></span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                {state.liveStatus.text} • {state.currentModel}
              </TooltipContent>
            </Tooltip>
          )}
          
          {/* Controls */}
          <div className={cn(
            "flex pt-1 border-t border-border/50",
            isCollapsed ? "flex-col items-center gap-1.5 w-full" : "items-center justify-between"
          )}>
            {/* PT Listener Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size={isCollapsed ? "icon" : "sm"}
                  onClick={toggleListener} 
                  className={cn(
                    "rounded-lg transition-all",
                    isCollapsed ? "h-8 w-8" : "h-8 px-2 text-xs gap-1.5",
                    listenerRunning 
                      ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {listenerRunning ? <Wifi size={14} /> : <WifiOff size={14} />}
                  {!isCollapsed && <span>{listenerRunning ? 'PT Sync' : 'PT Offline'}</span>}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {listenerRunning ? 'Stop PT Clipboard Listener' : 'Start PT Clipboard Listener'}
              </TooltipContent>
            </Tooltip>

            {/* Copilot & Theme Buttons */}
            <div className={cn("flex items-center", isCollapsed ? "flex-col gap-1.5" : "gap-1")}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => dispatch({ type: 'TOGGLE_COPILOT' })} 
                    className={cn(
                      "h-8 w-8 rounded-lg transition-all",
                      state.isCopilotOpen 
                        ? "text-blue-400 bg-blue-500/10 border border-blue-500/20" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <Bot size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {state.isCopilotOpen ? 'Hide Copilot' : 'Open Copilot'}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleThemeToggle} 
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  >
                    {state.theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Toggle Theme</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
