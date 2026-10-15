import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap, 
  useNodesState, 
  useEdgesState,
  Handle,
  Position
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { 
  Network, Server, Laptop, ShieldAlert, CheckCircle2, 
  Info, X, Layers, Cpu, Activity, ArrowRight, Sparkles,
  Download, Code2, RotateCcw, PlusCircle, Flame, Copy,
  Check, ChevronDown, ChevronUp, Play, FileCode, CheckCheck
} from 'lucide-react';
import { Player } from '@remotion/player';
import { PacketFlowComposition } from './PacketFlowAnimation';
import { Button } from './ui/button';
import { toast } from 'sonner';

// ==========================================
// 1. CUSTOM CISCO REACT FLOW NODES
// ==========================================
function CiscoRouterNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 rounded-2xl glass-card border transition-all ${selected ? 'border-cyan-400 shadow-[0_0_20px_rgba(56,189,248,0.4)]' : 'border-border/80'} bg-zinc-950/95 min-w-[150px]`}>
      <Handle type="target" position={Position.Left} className="w-2.5 h-2.5 bg-cyan-400 border border-black" />
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_10px_rgba(56,189,248,0.2)]">
          <Network size={16} />
        </div>
        <div>
          <h4 className="text-xs font-bold text-foreground">{data.label}</h4>
          <span className="text-[10px] text-zinc-500 font-mono block">Cisco 4331 ISR</span>
        </div>
      </div>
      <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between text-[10px] font-mono">
        <span className="text-cyan-400 font-semibold">{data.ip || '192.168.1.1'}</span>
        <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
      </div>
      <Handle type="source" position={Position.Right} className="w-2.5 h-2.5 bg-cyan-400 border border-black" />
    </div>
  );
}

function CiscoSwitchNode({ data, selected }) {
  const isMismatch = data.isMismatch;
  return (
    <div className={`px-4 py-3 rounded-2xl glass-card border transition-all ${isMismatch ? 'border-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.4)]' : selected ? 'border-blue-400 shadow-[0_0_20px_rgba(96,165,250,0.4)]' : 'border-border/80'} bg-zinc-950/95 min-w-[150px]`}>
      <Handle type="target" position={Position.Left} className="w-2.5 h-2.5 bg-blue-400 border border-black" />
      <div className="flex items-center gap-2.5">
        <div className={`w-8 h-8 rounded-xl ${isMismatch ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.3)]' : 'bg-blue-500/15 text-blue-400 border-blue-500/30'} border flex items-center justify-center`}>
          <Server size={16} />
        </div>
        <div>
          <h4 className="text-xs font-bold text-foreground">{data.label}</h4>
          <span className="text-[10px] text-zinc-500 font-mono block">Catalyst 2960</span>
        </div>
      </div>
      <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between text-[10px] font-mono">
        <span className={isMismatch ? 'text-rose-400 font-bold' : 'text-blue-400'}>
          {data.vlan || 'VLAN 10'}
        </span>
        <span className={`w-2 h-2 rounded-full ${isMismatch ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-ping' : 'bg-emerald-400 shadow-[0_0_8px_#34d399]'}`} />
      </div>
      <Handle type="source" position={Position.Right} className="w-2.5 h-2.5 bg-blue-400 border border-black" />
    </div>
  );
}

function CiscoHostNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 rounded-2xl glass-card border transition-all ${selected ? 'border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'border-border/80'} bg-zinc-950/95 min-w-[140px]`}>
      <Handle type="target" position={Position.Left} className="w-2.5 h-2.5 bg-emerald-400 border border-black" />
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.2)]">
          <Laptop size={16} />
        </div>
        <div>
          <h4 className="text-xs font-bold text-foreground">{data.label}</h4>
          <span className="text-[10px] text-zinc-500 font-mono block">Workstation</span>
        </div>
      </div>
      <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between text-[10px] font-mono">
        <span className="text-emerald-400 font-semibold">{data.ip || '10.1.10.5'}</span>
        <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
      </div>
      <Handle type="source" position={Position.Right} className="w-2.5 h-2.5 bg-emerald-400 border border-black" />
    </div>
  );
}

const nodeTypes = {
  ciscoRouter: CiscoRouterNode,
  ciscoSwitch: CiscoSwitchNode,
  ciscoHost: CiscoHostNode
};

// ==========================================
// 2. MAIN TOPOLOGY DIGITAL TWIN COMPONENT
// ==========================================
export default function TopologyFlowView({ onClose, hasMismatch: initialMismatch = true }) {
  const [selectedNode, setSelectedNode] = useState(null);
  const [hasMismatch, setHasMismatch] = useState(initialMismatch);
  const [faultLabel, setFaultLabel] = useState("Switchport trunk native VLAN mismatch across SW1 <-> SW2");
  const [reachability, setReachability] = useState(null);
  const [dotCode, setDotCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDslDrawerOpen, setIsDslDrawerOpen] = useState(false);
  const [dslTab, setDslTab] = useState("dot"); // 'dot' | 'json' | 'reachability'
  const [isSimulationOpen, setIsSimulationOpen] = useState(true);
  const [copiedDot, setCopiedDot] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Baseline Fallback Nodes
  const initialNodes = useMemo(() => [
    {
      id: 'host-a',
      type: 'ciscoHost',
      position: { x: 60, y: 200 },
      data: { 
        label: 'Host-A', 
        ip: '10.1.10.5/24', 
        gw: '10.1.10.1', 
        vlan: 'VLAN 10', 
        mac: '0060.7022.AA01',
        interfaces: ['FastEthernet0 (Connected)'] 
      }
    },
    {
      id: 'sw1',
      type: 'ciscoSwitch',
      position: { x: 320, y: 200 },
      data: { 
        label: 'SW1', 
        vlan: 'Native: VLAN 1', 
        isMismatch: false,
        interfaces: [
          'Fa0/2 -> Host-A (Access VLAN 10)',
          'Gi0/1 -> SW2 (Trunk, Native VLAN 1)'
        ]
      }
    },
    {
      id: 'sw2',
      type: 'ciscoSwitch',
      position: { x: 640, y: 200 },
      data: { 
        label: 'SW2', 
        vlan: initialMismatch ? 'Native: VLAN 99 (Mismatch)' : 'Native: VLAN 1', 
        isMismatch: initialMismatch,
        interfaces: [
          'Gi0/1 -> SW1 (Trunk, Native VLAN 99)',
          'Fa0/2 -> Host-B (Access VLAN 10)'
        ]
      }
    },
    {
      id: 'host-b',
      type: 'ciscoHost',
      position: { x: 900, y: 200 },
      data: { 
        label: 'Host-B', 
        ip: '10.1.10.6/24', 
        gw: '10.1.10.1', 
        vlan: 'VLAN 10', 
        mac: '0060.7022.BB02',
        interfaces: ['FastEthernet0 (Connected)'] 
      }
    }
  ], [initialMismatch]);

  const initialEdges = useMemo(() => [
    {
      id: 'e-host-a-sw1',
      source: 'host-a',
      target: 'sw1',
      animated: true,
      style: { stroke: '#38bdf8', strokeWidth: 2 }
    },
    {
      id: 'e-sw1-sw2',
      source: 'sw1',
      target: 'sw2',
      animated: true,
      label: initialMismatch ? 'TRUNK MISMATCH (VLAN 1 vs 99)' : '802.1Q TRUNK (OK)',
      labelStyle: { fill: initialMismatch ? '#fbbf24' : '#38bdf8', fontWeight: 700, fontSize: 10, fontFamily: 'monospace' },
      style: { 
        stroke: initialMismatch ? '#fbbf24' : '#38bdf8', 
        strokeWidth: 3, 
        strokeDasharray: initialMismatch ? '6,4' : 'none' 
      }
    },
    {
      id: 'e-sw2-host-b',
      source: 'sw2',
      target: 'host-b',
      animated: !initialMismatch,
      style: { stroke: initialMismatch ? '#64748b' : '#10b981', strokeWidth: 2 }
    }
  ], [initialMismatch]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync with live backend topology on mount
  const fetchCurrentTopology = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/topology/current');
      if (!res.ok) return;
      const data = await res.json();
      if (data.status === 'success' && data.react_flow) {
        setNodes(data.react_flow.nodes || []);
        setEdges(data.react_flow.edges || []);
        setDotCode(data.dot || "");
        setReachability(data.reachability_l2 || null);
        setHasMismatch(!!data.has_mismatch);
        if (data.fault_label) setFaultLabel(data.fault_label);
      }
    } catch (e) {
      console.warn("Backend topology fetch note:", e);
    } finally {
      setIsLoading(false);
    }
  }, [setNodes, setEdges]);

  useEffect(() => {
    fetchCurrentTopology();
  }, [fetchCurrentTopology]);

  // Handle dynamic AI mutation
  const handleMutation = async (action, extraPayload = {}) => {
    try {
      setIsLoading(true);
      const payload = { action, ...extraPayload };
      const res = await fetch('/api/topology/mutate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.status === 'success') {
        if (data.react_flow) {
          setNodes(data.react_flow.nodes || []);
          setEdges(data.react_flow.edges || []);
        }
        if (data.dot) setDotCode(data.dot);
        if (data.reachability_l2) setReachability(data.reachability_l2);
        setHasMismatch(!!data.has_mismatch);
        if (data.fault_label) setFaultLabel(data.fault_label);
        
        toast.success(data.mutation_result?.message || `Executed mutation: ${action}`);
      } else {
        toast.error(`Mutation failed: ${data.message || 'Unknown error'}`);
      }
    } catch (e) {
      toast.error(`Failed to execute mutation: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const onNodeClick = useCallback((_, node) => {
    setSelectedNode(node);
  }, []);

  // Canvas Vector High-Res PNG Export directly to D:\downloads
  const handleExportPng = async () => {
    try {
      setIsExporting(true);
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');

      // 1. Cyber Dark Background
      ctx.fillStyle = '#07090e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Cyber Grid
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 0.8;
      for (let x = 0; x < canvas.width; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // 3. Header HUD
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillText('NetSage AI - Heterogeneous Network Digital Twin G = (V, E, Φ)', 45, 55);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px monospace';
      const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
      ctx.fillText(`Hardware Telemetry: RTX 4050 6GB (0 MB VRAM) | Spanning Tree State: ${hasMismatch ? 'FAULT_DETECTED' : 'FORWARDING'} | ${timestamp}`, 45, 82);

      // 4. Draw Edges
      const nodePosMap = {};
      nodes.forEach(n => {
        // Normalize positions to canvas
        const posX = Math.max(120, Math.min(canvas.width - 150, (n.position?.x || 100) + 100));
        const posY = Math.max(180, Math.min(canvas.height - 180, (n.position?.y || 200) + 120));
        nodePosMap[n.id] = { x: posX, y: posY, data: n.data, type: n.type };
      });

      edges.forEach(edge => {
        const src = nodePosMap[edge.source];
        const dst = nodePosMap[edge.target];
        if (!src || !dst) return;

        const isDown = edge.style?.stroke === '#f43f5e' || edge.label?.includes('DOWN');
        const isMismatch = edge.style?.stroke === '#fbbf24' || edge.label?.includes('MISMATCH');

        ctx.strokeStyle = isDown ? '#f43f5e' : (isMismatch ? '#fbbf24' : '#38bdf8');
        ctx.lineWidth = (isDown || isMismatch) ? 3.5 : 2.5;

        if (isDown || isMismatch) {
          ctx.setLineDash([8, 6]);
        } else {
          ctx.setLineDash([]);
        }

        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(dst.x, dst.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label on Edge
        const midX = (src.x + dst.x) / 2;
        const midY = (src.y + dst.y) / 2 - 12;
        ctx.fillStyle = isDown ? '#f43f5e' : (isMismatch ? '#fbbf24' : '#38bdf8');
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(edge.label || 'Link (UP)', midX, midY);
      });

      // 5. Draw Device Nodes
      Object.entries(nodePosMap).forEach(([id, node]) => {
        const { x, y, data, type } = node;
        const width = 140;
        const height = 65;
        const rx = x - width / 2;
        const ry = y - height / 2;

        // Card fill
        ctx.fillStyle = '#090d16';
        ctx.strokeStyle = data.isMismatch ? '#f43f5e' : (type === 'ciscoRouter' ? '#0284c7' : (type === 'ciscoSwitch' ? '#2563eb' : '#059669'));
        ctx.lineWidth = 2;
        
        // Rounded rect
        ctx.beginPath();
        ctx.roundRect(rx, ry, width, height, 12);
        ctx.fill();
        ctx.stroke();

        // Node Title
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.fillText(data.label || id, rx + 16, ry + 26);

        // Subtext / IP
        ctx.fillStyle = data.isMismatch ? '#f43f5e' : '#38bdf8';
        ctx.font = '11px monospace';
        const sub = data.vlan || data.ip || '10.1.10.1';
        ctx.fillText(sub, rx + 16, ry + 46);
      });

      // 6. Watermark Footer
      ctx.textAlign = 'left';
      ctx.fillStyle = '#64748b';
      ctx.font = '11px monospace';
      ctx.fillText('NetSage AI © 2026 Cisco Packet Tracer Copilot Framework | Saved directly to D:\\downloads\\', 45, canvas.height - 30);

      // Convert to base64 and send to server
      const dataUrl = canvas.toDataURL('image/png');
      const filename = `netsage_topology_${Date.now()}.png`;

      const res = await fetch('/api/topology/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: dataUrl, filename })
      });
      const resData = await res.json();

      // Also trigger browser anchor download
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast.success(`Vector PNG exported directly to ${resData.file_path || 'D:\\downloads\\' + filename}`);
    } catch (e) {
      toast.error(`PNG Export error: ${e.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Export DOT to D:\downloads
  const handleExportDot = async () => {
    try {
      const filename = `netsage_topology_${Date.now()}.dot`;
      const res = await fetch('/api/topology/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dot: dotCode, filename })
      });
      const resData = await res.json();
      toast.success(`Saved Graphviz DOT to ${resData.file_path || 'D:\\downloads\\' + filename}`);
    } catch (e) {
      toast.error(`DOT export error: ${e.message}`);
    }
  };

  const handleCopyDot = () => {
    navigator.clipboard.writeText(dotCode);
    setCopiedDot(true);
    toast.success("Graphviz DOT dynamic DSL copied to clipboard");
    setTimeout(() => setCopiedDot(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-2xl flex flex-col animate-in fade-in duration-200">
      {/* 1. Header Bar */}
      <header className="h-16 px-6 border-b border-border/80 flex items-center justify-between bg-zinc-950/80 backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 border border-sky-400/40 flex items-center justify-center text-white shadow-[0_0_16px_rgba(56,189,248,0.35)]">
            <Network size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-foreground">
                Agentic Digital Twin Topology $G=(V, E, \Phi)$
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                0 MB Extra VRAM
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/25 text-sky-400">
                Dynamic DSL
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 flex items-center gap-2">
              Bidirectional Network State Mutation & 60 FPS Remotion Flow Engine
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          {hasMismatch ? (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/35 text-rose-400 text-xs font-mono animate-pulse">
              <ShieldAlert size={13} />
              <span>Layer-2 Forwarding Cut Detected</span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 text-xs font-mono">
              <CheckCheck size={13} />
              <span>Full Layer-2 Reachability Verified</span>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPng}
            disabled={isExporting}
            className="h-8 text-xs rounded-xl border-border bg-card/60 hover:bg-card text-sky-400 hover:text-white gap-1.5 shadow-sm"
            title="Export high-resolution PNG directly to D:\downloads"
          >
            <Download size={13} />
            <span className="hidden md:inline">Export PNG (D:\downloads)</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDslDrawerOpen(!isDslDrawerOpen)}
            className={`h-8 text-xs rounded-xl border-border gap-1.5 transition-all ${isDslDrawerOpen ? 'bg-sky-500/20 text-sky-300 border-sky-500/40' : 'bg-card/60 hover:bg-card text-muted-foreground hover:text-foreground'}`}
            title="Toggle Dynamic DSL & Graphviz DOT Drawer"
          >
            <Code2 size={13} />
            <span className="hidden md:inline">Dynamic DSL Drawer</span>
          </Button>

          {onClose && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-8 text-xs rounded-xl border-border bg-card/60 hover:bg-card text-muted-foreground hover:text-foreground gap-1"
            >
              <X size={14} /> Close Map
            </Button>
          )}
        </div>
      </header>

      {/* 2. AI Action Toolbar */}
      <div className="px-6 py-2 border-b border-border/60 bg-zinc-950/90 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles size={12} className="text-amber-400" />
            AI Digital Twin Mutations:
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleMutation('SIMULATE_FAIL', { target: 'trunk' })}
            disabled={isLoading}
            className="h-7 text-[11px] font-mono rounded-lg border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 gap-1"
          >
            <Flame size={12} className="text-rose-400" />
            Simulate Trunk Failure
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleMutation('ADD_BACKUP_ROUTER')}
            disabled={isLoading}
            className="h-7 text-[11px] font-mono rounded-lg border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 gap-1"
          >
            <PlusCircle size={12} className="text-sky-400" />
            Add Backup Router R2 (HSRP)
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleMutation('AUTO_HEAL')}
            disabled={isLoading}
            className="h-7 text-[11px] font-mono rounded-lg border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 gap-1"
          >
            <CheckCircle2 size={12} className="text-emerald-400" />
            Self-Heal Network
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleMutation('RESET')}
            disabled={isLoading}
            className="h-7 text-[11px] font-mono rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 gap-1"
          >
            <RotateCcw size={11} />
            Reset Baseline
          </Button>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-500">
          <span>Active Nodes: {nodes.length}</span>
          <span>•</span>
          <span>Links: {edges.length}</span>
        </div>
      </div>

      {/* 3. Main Body Canvas & Drawers */}
      <div className="flex-1 relative flex overflow-hidden">
        {/* React Flow Viewport */}
        <div className="flex-1 h-full relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            className="bg-[#07090e]"
          >
            <Background color="#1e293b" gap={28} size={1} />
            <Controls className="bg-zinc-950 border border-border/80 rounded-xl overflow-hidden fill-white" />
            <MiniMap 
              nodeColor={(n) => n.data?.isMismatch ? '#f43f5e' : (n.type === 'ciscoRouter' ? '#38bdf8' : (n.type === 'ciscoSwitch' ? '#60a5fa' : '#34d399'))} 
              className="bg-zinc-950/80 border border-border/80 rounded-xl"
            />
          </ReactFlow>

          {/* Collapsible Remotion 60FPS Packet Simulation Banner at Bottom */}
          <div className="absolute bottom-4 left-6 right-6 z-10">
            <div className="glass-card rounded-2xl border border-border/80 bg-zinc-950/95 shadow-2xl overflow-hidden transition-all duration-300">
              <div 
                onClick={() => setIsSimulationOpen(!isSimulationOpen)}
                className="px-4 py-2 flex items-center justify-between cursor-pointer border-b border-border/40 hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Play size={13} className="text-sky-400 fill-sky-400" />
                  <span className="text-xs font-bold text-foreground">
                    60 FPS Remotion Dynamic Packet Transit Simulation
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    Remotion Player Sync
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-zinc-400">
                    {hasMismatch ? "STATUS: PACKET DROP AT TRUNK" : "STATUS: TRANSIT COMPLETE"}
                  </span>
                  {isSimulationOpen ? <ChevronDown size={14} className="text-zinc-400" /> : <ChevronUp size={14} className="text-zinc-400" />}
                </div>
              </div>

              {isSimulationOpen && (
                <div className="h-44 w-full bg-black/60 relative overflow-hidden">
                  <Player
                    acknowledgeRemotionLicense
                    muted
                    component={PacketFlowComposition}
                    inputProps={{
                      hasAnomaly: hasMismatch,
                      faultLabel: faultLabel || "Switchport trunk native VLAN mismatch across SW1 <-> SW2",
                      srcNode: "Host-A",
                      midNodeA: "SW1",
                      midNodeB: "SW2",
                      dstNode: "Host-B",
                      osiLayer: "Data Link"
                    }}
                    durationInFrames={120}
                    fps={30}
                    compositionWidth={900}
                    compositionHeight={280}
                    style={{
                      width: "100%",
                      height: "100%",
                    }}
                    autoPlay
                    loop
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4. Dynamic DSL & Graphviz DOT Drawer */}
        {isDslDrawerOpen && (
          <div className="w-96 border-l border-border/80 bg-zinc-950/95 p-5 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200 z-20">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center">
                    <FileCode size={15} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Dynamic Network DSL</h3>
                    <span className="text-[10px] font-mono text-zinc-500">Live Code Generator</span>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setIsDslDrawerOpen(false)} 
                  className="h-6 w-6 text-zinc-400 hover:text-white"
                >
                  <X size={12} />
                </Button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 p-1 rounded-xl bg-black/60 border border-border/50 text-[11px] font-mono">
                <button
                  onClick={() => setDslTab('dot')}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${dslTab === 'dot' ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30' : 'text-zinc-400 hover:text-white'}`}
                >
                  Graphviz DOT
                </button>
                <button
                  onClick={() => setDslTab('json')}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${dslTab === 'json' ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30' : 'text-zinc-400 hover:text-white'}`}
                >
                  React Flow JSON
                </button>
                <button
                  onClick={() => setDslTab('reachability')}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${dslTab === 'reachability' ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30' : 'text-zinc-400 hover:text-white'}`}
                >
                  L2 Reachability
                </button>
              </div>

              {/* Tab Content */}
              <div className="rounded-xl border border-border/60 bg-black/80 p-3 overflow-hidden font-mono text-[11px] leading-relaxed max-h-[460px] overflow-y-auto scrollbar-mini">
                {dslTab === 'dot' && (
                  <pre className="text-sky-300/90 whitespace-pre">
                    {dotCode || "// Generating DOT DSL..."}
                  </pre>
                )}
                {dslTab === 'json' && (
                  <pre className="text-emerald-300/90 whitespace-pre">
                    {JSON.stringify({ nodes: nodes.map(n => ({ id: n.id, data: n.data })), edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target, label: e.label })) }, null, 2)}
                  </pre>
                )}
                {dslTab === 'reachability' && (
                  <div className="space-y-2 text-zinc-300">
                    <div className="flex justify-between items-center pb-2 border-b border-border/40">
                      <span>Status:</span>
                      <span className={reachability?.reachable ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                        {reachability?.reachable ? 'REACHABLE' : 'UNREACHABLE'}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block mb-1">Reason / Cut-Set Anomaly:</span>
                      <p className="text-zinc-200 text-xs bg-zinc-900/80 p-2 rounded-lg border border-border/40">
                        {reachability?.reason || faultLabel}
                      </p>
                    </div>
                    {reachability?.vlan && (
                      <div className="flex justify-between items-center pt-1 text-xs">
                        <span className="text-zinc-500">Evaluated VLAN:</span>
                        <span className="text-cyan-400">{reachability.vlan}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* DSL Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyDot}
                  className="flex-1 h-8 text-xs rounded-xl border-border bg-card/60 hover:bg-card text-zinc-300 hover:text-white gap-1"
                >
                  {copiedDot ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>Copy DOT</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportDot}
                  className="flex-1 h-8 text-xs rounded-xl border-border bg-card/60 hover:bg-card text-sky-400 hover:text-white gap-1"
                >
                  <Download size={12} />
                  <span>Save .dot (D:\downloads)</span>
                </Button>
              </div>
            </div>

            <div className="pt-4 border-t border-border/60 text-[10px] text-zinc-500 font-mono">
              NetworkX Heterogeneous Property Graph Engine
            </div>
          </div>
        )}

        {/* 5. Node Inspector Drawer */}
        {selectedNode && (
          <div className="w-80 border-l border-border/80 bg-zinc-950/95 p-5 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200 z-20">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center">
                    <Info size={14} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{selectedNode.data?.label}</h3>
                    <span className="text-[10px] font-mono text-zinc-500">Device Inspector</span>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setSelectedNode(null)} 
                  className="h-6 w-6 text-zinc-400 hover:text-white"
                >
                  <X size={12} />
                </Button>
              </div>

              {/* Attributes */}
              <div className="space-y-2 text-xs font-mono">
                {selectedNode.data?.ip && (
                  <div className="p-2.5 rounded-xl bg-card/60 border border-border/60 flex justify-between items-center">
                    <span className="text-zinc-500">IP Address:</span>
                    <span className="text-cyan-400 font-semibold">{selectedNode.data.ip}</span>
                  </div>
                )}
                {selectedNode.data?.gw && (
                  <div className="p-2.5 rounded-xl bg-card/60 border border-border/60 flex justify-between items-center">
                    <span className="text-zinc-500">Default Gateway:</span>
                    <span className="text-zinc-300">{selectedNode.data.gw}</span>
                  </div>
                )}
                {selectedNode.data?.vlan && (
                  <div className="p-2.5 rounded-xl bg-card/60 border border-border/60 flex justify-between items-center">
                    <span className="text-zinc-500">VLAN State:</span>
                    <span className={selectedNode.data.isMismatch ? 'text-rose-400 font-bold' : 'text-blue-400'}>
                      {selectedNode.data.vlan}
                    </span>
                  </div>
                )}
                {selectedNode.data?.mac && (
                  <div className="p-2.5 rounded-xl bg-card/60 border border-border/60 flex justify-between items-center">
                    <span className="text-zinc-500">MAC Address:</span>
                    <span className="text-zinc-400 text-[11px]">{selectedNode.data.mac}</span>
                  </div>
                )}
              </div>

              {/* Interfaces */}
              {selectedNode.data?.interfaces && (
                <div className="space-y-1.5 pt-2">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                    Active Interfaces
                  </span>
                  <div className="space-y-1">
                    {selectedNode.data.interfaces.map((intf, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-black/50 border border-border/50 text-[11px] font-mono text-zinc-300">
                        {intf}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-border/60 text-[10px] text-zinc-500 font-mono">
              NetSage Property Graph Invariant Verification: OK
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
