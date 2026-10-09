import React, { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import { useAppContext } from '../context/AppContext';
import { 
  Terminal, Activity, History, ShieldCheck, Play, Map, 
  Wifi, Bot, Moon, Sun, Search, Sparkles, Layers, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const { state, dispatch } = useAppContext();

  useEffect(() => {
    const down = (e) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runAction = (callback) => {
    setOpen(false);
    callback();
  };

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-start justify-center pt-24 p-4 animate-in fade-in duration-200"
      onClick={() => setOpen(false)}
    >
      <div 
        className="w-full max-w-xl rounded-2xl bg-[#090c14] border border-white/10 shadow-2xl overflow-hidden glass-card"
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="w-full font-sans text-sm">
          {/* Search Input */}
          <div className="flex items-center px-4 border-b border-white/[0.08] gap-3">
            <Search size={16} className="text-zinc-400" />
            <Command.Input 
              autoFocus
              placeholder="Type a command, search CCNA labs, or jump to view..."
              className="w-full py-3.5 bg-transparent text-sm text-foreground placeholder:text-zinc-500 focus:outline-none font-sans"
            />
            <kbd className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px] font-mono border border-zinc-700">ESC</kbd>
          </div>

          {/* Results List */}
          <Command.List className="max-h-80 overflow-y-auto p-2 scrollbar-mini space-y-1">
            <Command.Empty className="p-4 text-center text-xs text-zinc-500">
              No matching commands or CCNA lab scenarios found.
            </Command.Empty>

            {/* Presets Group */}
            <Command.Group heading="CCNA Lab Presets" className="px-2 py-1 text-[11px] font-semibold text-zinc-400 tracking-wider uppercase">
              <Command.Item
                onSelect={() => runAction(() => {
                  dispatch({ 
                    type: 'SET_CLI_INPUT', 
                    payload: `SW1# show interfaces status\nPort      Name               Status       Vlan       Duplex  Speed Type\nGi0/1     Trunk_to_SW2       connected    trunk      a-full a-1000 1000BaseTX\nGi0/2     Host-A_Access      connected    10         a-full  a-100 1000BaseTX\n\nSW1# show interfaces trunk\nPort        Mode             Encapsulation  Status        Native vlan\nGi0/1       on               802.1q         trunking      1\n\nSW2# show interfaces trunk\nPort        Mode             Encapsulation  Status        Native vlan\nGi0/1       on               802.1q         trunking      99\n\nSW1# show logging\n%CDP-4-NATIVE_VLAN_MISMATCH: Native VLAN mismatch discovered on GigabitEthernet0/1 (1), with SW2 GigabitEthernet0/1 (99).` 
                  });
                  dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'tab-input' });
                  toast.success('Loaded Native VLAN Mismatch (Layer 2)');
                })}
                className="flex items-center justify-between p-2.5 rounded-xl cursor-pointer hover:bg-white/[0.06] text-zinc-200 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Layers size={15} className="text-blue-400" />
                  <span>CASE-001: Native VLAN Mismatch</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800/60 px-2 py-0.5 rounded">Layer 2</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runAction(() => {
                  dispatch({ 
                    type: 'SET_CLI_INPUT', 
                    payload: `R1# show ip ospf interface brief\nInterface    PID   Area            IP Address/Mask    Cost  State Nbrs F/C\nGi0/0        1     0               192.168.12.1/24    1     DR    0/0\n\nR2# show ip ospf interface brief\nInterface    PID   Area            IP Address/Mask    Cost  State Nbrs F/C\nGi0/0        1     1               192.168.12.2/24    1     BDR   0/0\n\nR1# show ip ospf neighbor\n(Empty output - no OSPF neighbors established across 192.168.12.0/24)` 
                  });
                  dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'tab-input' });
                  toast.success('Loaded OSPF Area Mismatch (Layer 3)');
                })}
                className="flex items-center justify-between p-2.5 rounded-xl cursor-pointer hover:bg-white/[0.06] text-zinc-200 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Activity size={15} className="text-cyan-400" />
                  <span>CASE-003: OSPF Area ID Mismatch</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800/60 px-2 py-0.5 rounded">Layer 3</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runAction(() => {
                  dispatch({ 
                    type: 'SET_CLI_INPUT', 
                    payload: `Router1# show access-lists\nExtended IP access list 101\n    10 deny tcp any host 10.1.50.10 eq www (24 matches)\n    20 permit ip any any (112 matches)\n\nRouter1# show ip interface GigabitEthernet0/1\n  Inbound access list is 101\n  Outgoing access list is not set` 
                  });
                  dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'tab-input' });
                  toast.success('Loaded Extended ACL Port Deny (Layer 4)');
                })}
                className="flex items-center justify-between p-2.5 rounded-xl cursor-pointer hover:bg-white/[0.06] text-zinc-200 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck size={15} className="text-purple-400" />
                  <span>CASE-005: Extended ACL Port 80 Block</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800/60 px-2 py-0.5 rounded">Layer 4</span>
              </Command.Item>
            </Command.Group>

            {/* Quick Actions */}
            <Command.Group heading="Actions" className="px-2 py-1 text-[11px] font-semibold text-zinc-400 tracking-wider uppercase pt-2">
              <Command.Item
                onSelect={() => runAction(() => {
                  dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'tab-input' });
                })}
                className="flex items-center justify-between p-2.5 rounded-xl cursor-pointer hover:bg-white/[0.06] text-zinc-200 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Terminal size={15} className="text-zinc-400" />
                  <span>Open Terminal Ingestion Canvas</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-500">View</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runAction(() => {
                  dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'tab-diagnosis' });
                })}
                className="flex items-center justify-between p-2.5 rounded-xl cursor-pointer hover:bg-white/[0.06] text-zinc-200 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Activity size={15} className="text-blue-400" />
                  <span>Open Diagnosis & Packet Simulation</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-500">View</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runAction(() => {
                  dispatch({ type: 'SET_COPILOT_OPEN', payload: !state.isCopilotOpen });
                })}
                className="flex items-center justify-between p-2.5 rounded-xl cursor-pointer hover:bg-white/[0.06] text-zinc-200 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Bot size={15} className="text-emerald-400" />
                  <span>Toggle Copilot Chat Assistant</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-500">Copilot</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runAction(() => {
                  dispatch({ type: 'SET_THEME', payload: state.theme === 'dark' ? 'light' : 'dark' });
                  toast.info(`Switched to ${state.theme === 'dark' ? 'light' : 'dark'} mode`);
                })}
                className="flex items-center justify-between p-2.5 rounded-xl cursor-pointer hover:bg-white/[0.06] text-zinc-200 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  {state.theme === 'dark' ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-indigo-400" />}
                  <span>Toggle Dark / Light Theme</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-500">Appearance</span>
              </Command.Item>
            </Command.Group>
          </Command.List>

          {/* Footer info */}
          <div className="p-2.5 bg-black/40 border-t border-white/[0.06] px-4 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
            <span>Navigation: ↑ ↓ Enter</span>
            <span className="flex items-center gap-1.5 text-zinc-400">
              <Sparkles size={11} className="text-blue-400" /> NetSage Spotlight Active
            </span>
          </div>
        </Command>
      </div>
    </div>
  );
}
