import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { 
  Play, Bot, Trash2, Copy, Wifi, WifiOff, Clipboard, HelpCircle, 
  Map, Info, Camera, Sparkles, Check, ChevronDown, Layers, Terminal as TerminalIcon
} from 'lucide-react';
import { cn } from '../lib/utils';
import BorderBeam from './ui/BorderBeam';

const PRESET_CASES = [
  {
    id: 'CASE-001',
    name: 'Native VLAN Mismatch (Layer 2)',
    layer: 'Data Link',
    cli: `SW1# show interfaces status
Port      Name               Status       Vlan       Duplex  Speed Type
Gi0/1     Trunk_to_SW2       connected    trunk      a-full a-1000 1000BaseTX
Gi0/2     Host-A_Access      connected    10         a-full  a-100 1000BaseTX

SW1# show interfaces trunk
Port        Mode             Encapsulation  Status        Native vlan
Gi0/1       on               802.1q         trunking      1

SW2# show interfaces trunk
Port        Mode             Encapsulation  Status        Native vlan
Gi0/1       on               802.1q         trunking      99

SW1# show logging
%CDP-4-NATIVE_VLAN_MISMATCH: Native VLAN mismatch discovered on GigabitEthernet0/1 (1), with SW2 GigabitEthernet0/1 (99).`
  },
  {
    id: 'CASE-002',
    name: 'Interface Administratively Down (Layer 1)',
    layer: 'Physical',
    cli: `Router1# show ip interface brief
Interface              IP-Address      OK? Method Status                Protocol
GigabitEthernet0/0     192.168.1.1     YES manual up                    up      
GigabitEthernet0/1     10.0.0.1        YES manual administratively down down    
Serial0/0/0            unassigned      YES unset  down                  down`
  },
  {
    id: 'CASE-003',
    name: 'OSPF Area ID Mismatch (Layer 3)',
    layer: 'Network',
    cli: `R1# show ip ospf interface brief
Interface    PID   Area            IP Address/Mask    Cost  State Nbrs F/C
Gi0/0        1     0               192.168.12.1/24    1     DR    0/0

R2# show ip ospf interface brief
Interface    PID   Area            IP Address/Mask    Cost  State Nbrs F/C
Gi0/0        1     1               192.168.12.2/24    1     BDR   0/0

R1# show ip ospf neighbor
(Empty output - no OSPF neighbors established across 192.168.12.0/24)`
  },
  {
    id: 'CASE-005',
    name: 'Extended ACL Port 80 Block (Layer 4)',
    layer: 'Transport',
    cli: `Router1# show access-lists
Extended IP access list 101
    10 deny tcp any host 10.1.50.10 eq www (24 matches)
    20 permit ip any any (112 matches)

Router1# show ip interface GigabitEthernet0/1
  Inbound access list is 101
  Outgoing access list is not set`
  }
];

export default function TerminalInput() {
  const { state, dispatch } = useAppContext();
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [isDiscoveringTopology, setIsDiscoveringTopology] = useState(false);
  const listenerRunning = state.isListenerRunning;
  const [lineCount, setLineCount] = useState(1);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('');
  const textareaRef = useRef(null);
  const lineNumbersRef = useRef(null);

  useEffect(() => {
    const lines = (state.cliInput || '').split('\n').length;
    setLineCount(lines);
  }, [state.cliInput]);

  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleSelectPreset = (e) => {
    const caseId = e.target.value;
    setSelectedPreset(caseId);
    const found = PRESET_CASES.find(c => c.id === caseId);
    if (found) {
      dispatch({ type: 'SET_CLI_INPUT', payload: found.cli });
      toast.success(`Loaded ${found.name}`);
    }
  };

  const handleDiscoverTopology = async () => {
    if (!state.cliInput || !state.cliInput.trim()) {
      toast.info("Paste 'show cdp neighbors' or a topology screenshot (Ctrl+V) first!");
      return;
    }
    setIsDiscoveringTopology(true);
    try {
      const res = await fetch('/api/topology/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cli_text: state.cliInput })
      });
      const data = await res.json();
      if (data.status === 'success' && data.topology) {
        dispatch({ type: 'SET_TOPOLOGY_NOTE', payload: data.topology });
        toast.success('Topology mapped into active property graph!');
        dispatch({ type: 'OPEN_TOPOLOGY_MODAL' });
        dispatch({ 
          type: 'SET_COPILOT_PROMPT', 
          payload: "I just mapped a network topology. Please summarize the connected devices, subnets, and layers, and suggest a topology reference name." 
        });
      } else {
        toast.info(data.message || "No CDP neighbor output detected. Paste 'show cdp neighbors' or a diagram screenshot.");
      }
    } catch (e) {
      toast.error('Failed to discover topology');
    } finally {
      setIsDiscoveringTopology(false);
    }
  };

  const handlePaste = async (e) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      const file = e.clipboardData.files[0];
      if (file.type.startsWith('image/')) {
        e.preventDefault();
        setIsOcrLoading(true);
        toast.info('Running multi-pass super-resolution OCR on pasted image...');
        const formData = new FormData();
        formData.append('file', file);
        try {
          const res = await fetch('/api/ocr', { method: 'POST', body: formData });
          const json = await res.json();
          if (json.success) {
            dispatch({ type: 'SET_CLI_INPUT', payload: (state.cliInput ? state.cliInput + '\n\n' : '') + json.text });
            toast.success('Visual OCR Transcription Successful');
          } else {
            toast.error(json.text || 'OCR Extraction Failed');
          }
        } catch (err) {
          toast.error('Network error during OCR');
        } finally {
          setIsOcrLoading(false);
        }
      }
    }
  };

  const handleDiagnose = async () => {
    if (!state.cliInput || !state.cliInput.trim()) {
      toast.error('CLI Buffer is empty. Paste Packet Tracer output or select a preset.');
      return;
    }

    setIsDiagnosing(true);
    dispatch({ type: 'SET_AI_STATUS', payload: 'thinking' });
    dispatch({ type: 'SET_DIAGNOSIS', payload: null });
    dispatch({ type: 'SET_STREAMED_RAW', payload: '' });
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'tab-diagnosis' });

    try {
      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case_id: selectedPreset || 'LIVE-PT-SESSION',
          show_outputs: state.cliInput,
          symptom: 'Network connectivity degraded or packet drop detected',
          topology_note: state.topologyNote || '',
          model_name: state.currentModel
        })
      });

      if (!res.ok) throw new Error('Diagnosis server returned error');
      const data = await res.json();
      dispatch({ type: 'SET_DIAGNOSIS', payload: data });
      dispatch({ type: 'SET_AI_STATUS', payload: 'idle' });

      // Save to history audit trail
      if (data.diagnosis) {
        dispatch({
          type: 'ADD_HISTORY_ENTRY',
          payload: {
            id: 'diag-' + Date.now(),
            caseId: data.case_id || selectedPreset || 'LIVE-PT',
            rootCause: data.diagnosis.root_cause || 'Network Anomaly',
            osiLayer: data.diagnosis.osi_layer || 'Network',
            confidence: Math.round((data.diagnosis.confidence_score || 0.95) * 100),
            date: new Date().toLocaleDateString(),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            cliEvidence: data.diagnosis.cli_evidence_quote || '',
            fixSteps: data.diagnosis.fix_steps || [],
            diagnosisObj: data
          }
        });
      }

      toast.success('Diagnosis and remediation synthesized!');
    } catch (e) {
      toast.error('Diagnosis failed: ' + e.message);
      dispatch({ type: 'SET_AI_STATUS', payload: 'offline' });
    } finally {
      setIsDiagnosing(false);
    }
  };

  if (state.activeView !== 'tab-input') return null;

  return (
    <section className="flex-1 p-6 lg:p-8 overflow-y-auto bg-background font-sans">
      <div className="max-w-5xl mx-auto space-y-5 animate-in fade-in duration-300">
        
        {/* Top Header & Presets Bar */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/80">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <TerminalIcon size={16} />
              </div>
              Interactive Ingestion Canvas
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Paste CLI terminal outputs, drop screenshots (Ctrl+V), or select standardized CCNA lab scenarios
            </p>
          </div>

          {/* Quick Preset Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-muted-foreground hidden md:inline">Preset Scenarios:</span>
            <select
              value={selectedPreset}
              onChange={handleSelectPreset}
              className="bg-card border border-border text-xs text-foreground rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-500/50 cursor-pointer shadow-sm"
            >
              <option value="">Load Sample CCNA Lab...</option>
              {PRESET_CASES.map(c => (
                <option key={c.id} value={c.id}>[{c.layer}] {c.name}</option>
              ))}
            </select>
          </div>
        </header>

        {/* Vision Dropzone Banner */}
        <div 
          className={cn(
            "p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 text-xs",
            isOcrLoading 
              ? "bg-blue-500/10 border-blue-500/40 text-blue-300 animate-pulse" 
              : "bg-card/70 backdrop-blur-md border-border/70 text-muted-foreground hover:border-blue-500/30"
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400 flex-shrink-0">
              <Camera size={15} />
            </div>
            <div>
              <span className="font-medium text-foreground block">
                {isOcrLoading ? "Processing Multi-Pass OCR Super-Resolution..." : "Visual Screenshot Ingestion Active"}
              </span>
              <span className="text-[11px] text-zinc-500 block">
                Capture any CLI window or topology diagram (`Win+Shift+S`) and press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px]">Ctrl+V</kbd> anywhere
              </span>
            </div>
          </div>
          {listenerRunning && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>PT Clipboard Sync Active</span>
            </div>
          )}
        </div>

        {/* Cisco Terminal Window */}
        <div className="cisco-terminal-window relative rounded-2xl overflow-hidden shadow-2xl border border-border/90 flex flex-col">
          <BorderBeam rx={16} duration={12} colorFrom="#38bdf8" colorTo="#60a5fa" />
          {/* macOS / Cisco Terminal Header */}
          <div className="h-10 bg-zinc-950/80 px-4 border-b border-border/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 mr-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80 border border-rose-600" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80 border border-amber-600" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80 border border-emerald-600" />
              </div>
              <span className="text-[11px] font-mono text-zinc-400 font-semibold tracking-wide">
                Cisco Packet Tracer — Live CLI Terminal Buffer
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(state.cliInput || '');
                  toast.success('CLI buffer copied to clipboard');
                }}
                className="h-6 px-2 text-[11px] text-zinc-400 hover:text-zinc-200 gap-1"
                title="Copy buffer"
              >
                <Copy size={11} /> Copy
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  dispatch({ type: 'SET_CLI_INPUT', payload: '' });
                  setSelectedPreset('');
                  toast.info('CLI buffer cleared');
                }}
                className="h-6 px-2 text-[11px] text-zinc-400 hover:text-rose-400 gap-1"
                title="Clear buffer"
              >
                <Trash2 size={11} /> Clear
              </Button>
            </div>
          </div>

          {/* Editor Body */}
          <div className="relative flex bg-[#080a10] min-h-[380px] max-h-[520px] font-mono text-xs">
            {/* Line Numbers */}
            <div 
              ref={lineNumbersRef}
              className="w-11 py-3 bg-zinc-950/50 border-r border-border/40 text-right pr-3 select-none text-zinc-600 overflow-hidden leading-relaxed font-mono text-[11px]"
            >
              {Array.from({ length: Math.max(lineCount, 15) }, (_, i) => (
                <div key={i + 1}>{i + 1}</div>
              ))}
            </div>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              onScroll={handleScroll}
              onPaste={handlePaste}
              value={state.cliInput}
              onChange={(e) => dispatch({ type: 'SET_CLI_INPUT', payload: e.target.value })}
              placeholder="# Paste Cisco IOS show-command output here, or drop a screenshot (Ctrl+V)..."
              className="flex-1 p-3 bg-transparent text-zinc-200 focus:outline-none resize-none leading-relaxed font-mono text-xs placeholder:text-zinc-600 scrollbar-mini selection:bg-blue-500/30 selection:text-white"
              spellCheck={false}
            />
          </div>

          {/* Terminal Footer Bar */}
          <div className="h-9 bg-zinc-950/90 border-t border-border/50 px-4 flex items-center justify-between text-[11px] font-mono text-zinc-500">
            <div className="flex items-center gap-3">
              <span>{lineCount} lines</span>
              <span>{(state.cliInput || '').length} characters</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span className="text-zinc-400">Ready for Invariant Scan</span>
            </div>
          </div>
        </div>

        {/* Bottom Actions Hub */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDiscoverTopology}
            disabled={isDiscoveringTopology}
            className="h-10 px-4 rounded-xl border-border bg-card/60 hover:bg-card text-xs text-foreground gap-2 w-full sm:w-auto"
          >
            <Map size={14} className="text-blue-400" />
            <span>{isDiscoveringTopology ? "Mapping Topology..." : "Map Topology Graph (CDP)"}</span>
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => dispatch({ type: 'SET_COPILOT_OPEN', payload: !state.isCopilotOpen })}
              className={cn(
                "h-11 px-4 rounded-2xl border-border bg-card/60 hover:bg-card text-xs gap-2 flex-1 sm:flex-none transition-all",
                state.isCopilotOpen ? "text-blue-400 border-blue-500/40 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.15)]" : "text-muted-foreground hover:text-foreground"
              )}
              title="Toggle NetSage Copilot Assistant"
            >
              <Bot size={15} className={state.isCopilotOpen ? "text-blue-400" : "text-zinc-400"} />
              <span>Ask Copilot</span>
            </Button>

            <Button
              variant="default"
              size="lg"
              onClick={handleDiagnose}
              disabled={isDiagnosing}
              className="h-11 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs tracking-wide shadow-lg shadow-blue-500/25 gap-2 flex-1 sm:flex-none transition-all"
            >
              <Play size={14} className={isDiagnosing ? "animate-spin" : "fill-current"} />
              <span>{isDiagnosing ? "Synthesizing Diagnosis..." : "Run Diagnostic Engine"}</span>
            </Button>
          </div>
        </div>

      </div>
    </section>
  );
}
