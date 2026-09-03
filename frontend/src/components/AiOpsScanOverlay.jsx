import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Layers, ShieldCheck, Cpu, Activity, CheckCircle2, Sparkles } from 'lucide-react';

const SCAN_STAGES = [
  { layer: 'Layer 1: Physical', label: 'Checking interface carrier & duplex status...', icon: Activity, color: '#38bdf8' },
  { layer: 'Layer 2: Data Link', label: 'Scanning 802.1Q trunk native VLANs & spanning-tree...', icon: Layers, color: '#60a5fa' },
  { layer: 'Layer 3: Network', label: 'Verifying CIDR subnet masks, RFC 1812 & OSPF neighbors...', icon: ShieldCheck, color: '#818cf8' },
  { layer: 'Layer 4: Transport', label: 'Inspecting ACL shadowing & TCP/UDP port restrictions...', icon: Cpu, color: '#a78bfa' },
  { layer: 'Layer 7: Application', label: 'Synthesizing verified Cisco IOS remediation script...', icon: Sparkles, color: '#10b981' }
];

export default function AiOpsScanOverlay({ isScanning = false, onComplete }) {
  const [currentStage, setCurrentStage] = useState(0);

  useEffect(() => {
    if (!isScanning) {
      setCurrentStage(0);
      return;
    }

    const interval = setInterval(() => {
      setCurrentStage((prev) => {
        if (prev < SCAN_STAGES.length - 1) {
          return prev + 1;
        }
        clearInterval(interval);
        if (onComplete) onComplete();
        return prev;
      });
    }, 450);

    return () => clearInterval(interval);
  }, [isScanning]);

  if (!isScanning) return null;

  const stage = SCAN_STAGES[currentStage];

  return (
    <div className="p-6 rounded-3xl glass-card border border-blue-500/30 space-y-4 shadow-2xl relative overflow-hidden">
      {/* Animated Scan Beam */}
      <motion.div 
        className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#38bdf8]"
        animate={{ top: ['0%', '100%', '0%'] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <stage.icon size={18} className="animate-pulse" />
          </div>
          <div>
            <span className="text-xs font-bold tracking-wide uppercase text-blue-400 font-mono">
              AIOps Invariant Radar Active
            </span>
            <h3 className="text-sm font-semibold text-foreground">
              {stage.layer}
            </h3>
          </div>
        </div>
        <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/20">
          Stage {currentStage + 1} / {SCAN_STAGES.length}
        </span>
      </div>

      {/* Progress Bars */}
      <div className="grid grid-cols-5 gap-2">
        {SCAN_STAGES.map((s, idx) => (
          <div key={idx} className="space-y-1">
            <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: idx <= currentStage ? '100%' : '0%' }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className="text-[10px] font-mono text-zinc-500 block truncate">
              L{idx === 0 ? '1' : idx === 1 ? '2' : idx === 2 ? '3' : idx === 3 ? '4' : '7'}
            </span>
          </div>
        ))}
      </div>

      <p className="text-xs text-zinc-400 font-mono flex items-center gap-2 pt-1">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
        {stage.label}
      </p>
    </div>
  );
}
