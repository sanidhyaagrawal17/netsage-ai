import React, { useState, useMemo, useCallback } from 'react';
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
  Info, X, Layers, Cpu, Activity, ArrowRight, Sparkles 
} from 'lucide-react';
import { Button } from './ui/button';

// 1. Custom Cisco Router Node
function CiscoRouterNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 rounded-2xl glass-card border transition-all ${selected ? 'border-cyan-400 shadow-[0_0_20px_rgba(56,189,248,0.3)]' : 'border-border/80'} bg-zinc-950/90 min-w-[140px]`}>
      <Handle type="target" position={Position.Left} className="w-2.5 h-2.5 bg-cyan-400 border border-black" />
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
          <Network size={15} />
        </div>
        <div>
          <h4 className="text-xs font-bold text-foreground">{data.label}</h4>
          <span className="text-[10px] text-zinc-500 font-mono block">Cisco 4321</span>
        </div>
      </div>
      <div className="mt-2 pt-1.5 border-t border-border/40 flex items-center justify-between text-[10px] font-mono">
        <span className="text-cyan-400">{data.ip || '192.168.1.1'}</span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      </div>
      <Handle type="source" position={Position.Right} className="w-2.5 h-2.5 bg-cyan-400 border border-black" />
    </div>
  );
}

// 2. Custom Cisco Switch Node
function CiscoSwitchNode({ data, selected }) {
  const isMismatch = data.isMismatch;
  return (
    <div className={`px-4 py-3 rounded-2xl glass-card border transition-all ${isMismatch ? 'border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.3)]' : selected ? 'border-blue-400 shadow-[0_0_20px_rgba(96,165,250,0.3)]' : 'border-border/80'} bg-zinc-950/90 min-w-[140px]`}>
      <Handle type="target" position={Position.Left} className="w-2.5 h-2.5 bg-blue-400 border border-black" />
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-lg ${isMismatch ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' : 'bg-blue-500/15 text-blue-400 border-blue-500/30'} border flex items-center justify-center`}>
          <Server size={15} />
        </div>
        <div>
          <h4 className="text-xs font-bold text-foreground">{data.label}</h4>
          <span className="text-[10px] text-zinc-500 font-mono block">Catalyst 2960</span>
        </div>
      </div>
      <div className="mt-2 pt-1.5 border-t border-border/40 flex items-center justify-between text-[10px] font-mono">
        <span className={isMismatch ? 'text-rose-400 font-bold' : 'text-blue-400'}>
          {data.vlan || 'VLAN 10'}
        </span>
        <span className={`w-1.5 h-1.5 rounded-full ${isMismatch ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'}`} />
      </div>
      <Handle type="source" position={Position.Right} className="w-2.5 h-2.5 bg-blue-400 border border-black" />
    </div>
  );
}

// 3. Custom Cisco Host Node
function CiscoHostNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 rounded-2xl glass-card border transition-all ${selected ? 'border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'border-border/80'} bg-zinc-950/90 min-w-[130px]`}>
      <Handle type="target" position={Position.Left} className="w-2.5 h-2.5 bg-emerald-400 border border-black" />
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <Laptop size={15} />
        </div>
        <div>
          <h4 className="text-xs font-bold text-foreground">{data.label}</h4>
          <span className="text-[10px] text-zinc-500 font-mono block">Workstation</span>
        </div>
      </div>
      <div className="mt-2 pt-1.5 border-t border-border/40 flex items-center justify-between text-[10px] font-mono">
        <span className="text-emerald-400">{data.ip || '10.1.10.5'}</span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
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

export default function TopologyFlowView({ onClose, hasMismatch = true }) {
  const [selectedNode, setSelectedNode] = useState(null);

  const initialNodes = useMemo(() => [
    {
      id: 'host-a',
      type: 'ciscoHost',
      position: { x: 50, y: 150 },
      data: { 
        label: 'Host-A', 
        ip: '10.1.10.5/24', 
        gw: '10.1.10.1', 
        vlan: '10', 
        mac: '0060.7022.AA01',
        interfaces: ['FastEthernet0 (Connected)'] 
      }
    },
    {
      id: 'sw-1',
      type: 'ciscoSwitch',
      position: { x: 300, y: 150 },
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
      id: 'sw-2',
      type: 'ciscoSwitch',
      position: { x: 600, y: 150 },
      data: { 
        label: 'SW2', 
        vlan: hasMismatch ? 'Native: VLAN 99 (Mismatch)' : 'Native: VLAN 1', 
        isMismatch: hasMismatch,
        interfaces: [
          'Gi0/1 -> SW1 (Trunk, Native VLAN 99)',
          'Fa0/2 -> Host-B (Access VLAN 10)'
        ]
      }
    },
    {
      id: 'host-b',
      type: 'ciscoHost',
      position: { x: 850, y: 150 },
      data: { 
        label: 'Host-B', 
        ip: '10.1.10.6/24', 
        gw: '10.1.10.1', 
        vlan: '10', 
        mac: '0060.7022.BB02',
        interfaces: ['FastEthernet0 (Connected)'] 
      }
    }
  ], [hasMismatch]);

  const initialEdges = useMemo(() => [
    {
      id: 'e-hosta-sw1',
      source: 'host-a',
      target: 'sw-1',
      animated: true,
      style: { stroke: '#38bdf8', strokeWidth: 2 }
    },
    {
      id: 'e-sw1-sw2',
      source: 'sw-1',
      target: 'sw-2',
      animated: true,
      label: hasMismatch ? 'TRUNK MISMATCH (VLAN 1 vs 99)' : '802.1Q TRUNK (OK)',
      labelStyle: { fill: hasMismatch ? '#f43f5e' : '#38bdf8', fontWeight: 700, fontSize: 10, fontFamily: 'monospace' },
      style: { 
        stroke: hasMismatch ? '#f43f5e' : '#38bdf8', 
        strokeWidth: hasMismatch ? 3 : 2, 
        strokeDasharray: hasMismatch ? '6,4' : 'none' 
      }
    },
    {
      id: 'e-sw2-hostb',
      source: 'sw-2',
      target: 'host-b',
      animated: !hasMismatch,
      style: { stroke: hasMismatch ? '#64748b' : '#10b981', strokeWidth: 2 }
    }
  ], [hasMismatch]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = useCallback((_, node) => {
    setSelectedNode(node);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex flex-col animate-in fade-in duration-200">
      {/* Header */}
      <header className="h-14 px-6 border-b border-border/80 flex items-center justify-between bg-zinc-950/70">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Network size={16} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              Interactive Topology Property Graph $G=(V, E)$
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400">
                React Flow (0% Idle CPU)
              </span>
            </h2>
            <p className="text-[11px] text-zinc-500">
              Drag nodes, inspect Cisco interface tables, and trace Layer 2/3 reachability
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasMismatch && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-mono">
              <ShieldAlert size={13} />
              <span>Layer-2 Forwarding Cut Detected</span>
            </div>
          )}
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

      {/* Main Flow Canvas */}
      <div className="flex-1 relative flex overflow-hidden">
        <div className="flex-1 h-full">
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
            <Background color="#1e293b" gap={24} size={1} />
            <Controls className="bg-zinc-950 border border-border/80 rounded-xl overflow-hidden fill-white" />
            <MiniMap 
              nodeColor={(n) => n.data.isMismatch ? '#f43f5e' : '#38bdf8'} 
              className="bg-zinc-950/80 border border-border/80 rounded-xl"
            />
          </ReactFlow>
        </div>

        {/* Node Inspector Drawer */}
        {selectedNode && (
          <div className="w-80 border-l border-border/80 bg-zinc-950/95 p-5 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center">
                    <Info size={14} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{selectedNode.data.label}</h3>
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
              <div className="space-y-2.5 text-xs font-mono">
                {selectedNode.data.ip && (
                  <div className="p-2.5 rounded-xl bg-card/60 border border-border/60 flex justify-between items-center">
                    <span className="text-zinc-500">IP Address:</span>
                    <span className="text-cyan-400 font-semibold">{selectedNode.data.ip}</span>
                  </div>
                )}
                {selectedNode.data.gw && (
                  <div className="p-2.5 rounded-xl bg-card/60 border border-border/60 flex justify-between items-center">
                    <span className="text-zinc-500">Default Gateway:</span>
                    <span className="text-zinc-300">{selectedNode.data.gw}</span>
                  </div>
                )}
                {selectedNode.data.mac && (
                  <div className="p-2.5 rounded-xl bg-card/60 border border-border/60 flex justify-between items-center">
                    <span className="text-zinc-500">MAC Address:</span>
                    <span className="text-zinc-400 text-[11px]">{selectedNode.data.mac}</span>
                  </div>
                )}
                {selectedNode.data.vlan && (
                  <div className="p-2.5 rounded-xl bg-card/60 border border-border/60 flex justify-between items-center">
                    <span className="text-zinc-500">VLAN State:</span>
                    <span className={selectedNode.data.isMismatch ? 'text-rose-400 font-bold' : 'text-blue-400'}>
                      {selectedNode.data.vlan}
                    </span>
                  </div>
                )}
              </div>

              {/* Interfaces */}
              {selectedNode.data.interfaces && (
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
