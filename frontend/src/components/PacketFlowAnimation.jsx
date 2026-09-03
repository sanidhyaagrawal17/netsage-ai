import React from 'react';
import { Player } from '@remotion/player';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';

export const PacketFlowComposition = ({ 
  hasAnomaly = true, 
  faultLabel = "Native VLAN Mismatch (VLAN 1 vs 99)", 
  srcNode = "Host-A", 
  midNodeA = "SW1",
  midNodeB = "SW2",
  dstNode = "Host-B",
  osiLayer = "Data Link"
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Positions on an 800x200 canvas
  const nodePositions = {
    src: { x: 100, y: 100 },
    sw1: { x: 280, y: 100 },
    sw2: { x: 520, y: 100 },
    dst: { x: 700, y: 100 },
  };

  // Packet animation timeline (0 to 120 frames):
  // Phase 1 (0-30): Host-A -> SW1
  // Phase 2 (30-65): SW1 -> Trunk link midpoint (Collision / Drop if anomaly)
  // Phase 3 (65-100): Trunk midpoint -> SW2 -> Host-B (if success)
  // Phase 4 (100-120): Idle / Reset loop

  const dropX = 400; // Trunk link midpoint
  let packetX = nodePositions.src.x;
  let packetOpacity = 1;
  let packetColor = "#38bdf8"; // Cyan

  if (hasAnomaly) {
    if (frame < 30) {
      packetX = interpolate(frame, [0, 30], [nodePositions.src.x, nodePositions.sw1.x], { extrapolateRight: "clamp" });
    } else if (frame < 60) {
      packetX = interpolate(frame, [30, 60], [nodePositions.sw1.x, dropX], { extrapolateRight: "clamp" });
      packetColor = interpolate(frame, [45, 60], [0, 1]) > 0.5 ? "#f43f5e" : "#38bdf8";
    } else if (frame < 95) {
      packetX = dropX;
      packetColor = "#f43f5e"; // Crimson Red
      packetOpacity = interpolate(frame, [75, 95], [1, 0], { extrapolateRight: "clamp" });
    } else {
      packetOpacity = 0;
    }
  } else {
    // Continuous transit to destination
    if (frame < 30) {
      packetX = interpolate(frame, [0, 30], [nodePositions.src.x, nodePositions.sw1.x], { extrapolateRight: "clamp" });
    } else if (frame < 65) {
      packetX = interpolate(frame, [30, 65], [nodePositions.sw1.x, nodePositions.sw2.x], { extrapolateRight: "clamp" });
    } else if (frame < 95) {
      packetX = interpolate(frame, [65, 95], [nodePositions.sw2.x, nodePositions.dst.x], { extrapolateRight: "clamp" });
      packetColor = "#10b981"; // Emerald
    } else {
      packetX = nodePositions.dst.x;
      packetColor = "#10b981";
      packetOpacity = interpolate(frame, [105, 120], [1, 0], { extrapolateRight: "clamp" });
    }
  }

  // Shockwave rings upon collision
  const collisionSpring = spring({
    frame: frame - 55,
    fps,
    config: { damping: 12, stiffness: 120 }
  });
  const shockwaveRadius = interpolate(collisionSpring, [0, 1], [0, 48]);
  const shockwaveOpacity = interpolate(collisionSpring, [0, 1], [1, 0]);

  // Pulse glow for nodes
  const pulse = Math.sin((frame / 15) * Math.PI) * 0.2 + 0.8;

  return (
    <div style={{ width: "100%", height: "100%", background: "#090b10", position: "relative", overflow: "hidden", fontFamily: "system-ui, sans-serif" }}>
      {/* Background Grid Pattern */}
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.15 }}>
        <defs>
          <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#38bdf8" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Top Header HUD */}
      <div style={{ position: "absolute", top: 10, left: 16, right: 16, display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: hasAnomaly ? "#f43f5e" : "#10b981", boxShadow: `0 0 8px ${hasAnomaly ? "#f43f5e" : "#10b981"}` }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: "#e2e8f0", letterSpacing: 0.5 }}>
            {hasAnomaly ? "SIMULATED COLLISION / PACKET DROP" : "TRANSIT PATH VERIFIED"}
          </span>
          <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.3)", fontFamily: "monospace" }}>
            {osiLayer}
          </span>
        </div>
        <span style={{ fontSize: 10, color: "#64748b", fontFamily: "monospace" }}>
          Frame {frame}/120 • 60fps
        </span>
      </div>

      {/* SVG Canvas for Links, Shockwaves, and Packets */}
      <svg width="800" height="200" viewBox="0 0 800 200" style={{ width: "100%", height: "100%" }}>
        {/* Physical Links */}
        <line x1={nodePositions.src.x} y1={nodePositions.src.y} x2={nodePositions.sw1.x} y2={nodePositions.sw1.y} stroke="#334155" strokeWidth="2.5" />
        <line x1={nodePositions.sw1.x} y1={nodePositions.sw1.y} x2={nodePositions.sw2.x} y2={nodePositions.sw2.y} stroke={hasAnomaly ? "#f43f5e" : "#38bdf8"} strokeWidth="3" strokeDasharray="6,4" />
        <line x1={nodePositions.sw2.x} y1={nodePositions.sw2.y} x2={nodePositions.dst.x} y2={nodePositions.dst.y} stroke="#334155" strokeWidth="2.5" />

        {/* Link Badges */}
        <text x="190" y="90" fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="middle">Fa0/2</text>
        <text x="400" y="86" fill={hasAnomaly ? "#f43f5e" : "#38bdf8"} fontSize="10" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
          802.1Q TRUNK
        </text>
        <text x="610" y="90" fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="middle">Fa0/2</text>

        {/* Shockwave Rings on Drop */}
        {hasAnomaly && frame >= 55 && frame < 95 && (
          <g transform={`translate(${dropX}, 100)`}>
            <circle r={shockwaveRadius} fill="none" stroke="#f43f5e" strokeWidth="2" opacity={shockwaveOpacity} />
            <circle r={shockwaveRadius * 0.6} fill="none" stroke="#fb7185" strokeWidth="1.5" opacity={shockwaveOpacity * 0.8} />
          </g>
        )}

        {/* Animated Packet */}
        {packetOpacity > 0 && (
          <g transform={`translate(${packetX}, 100)`} opacity={packetOpacity}>
            {/* Outer Glow */}
            <circle r="14" fill={packetColor} opacity="0.25" />
            <circle r="8" fill={packetColor} />
            {/* Packet Header Label */}
            <rect x="-24" y="-22" width="48" height="14" rx="3" fill="#0f172a" stroke={packetColor} strokeWidth="1" />
            <text x="0" y="-12" fill={packetColor} fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
              ICMP
            </text>
          </g>
        )}

        {/* Nodes */}
        {/* 1. Host-A */}
        <g transform={`translate(${nodePositions.src.x}, ${nodePositions.src.y})`}>
          <circle r="20" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
          <text x="0" y="4" fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle">PC</text>
          <text x="0" y="34" fill="#f1f5f9" fontSize="11" fontWeight="bold" textAnchor="middle">{srcNode}</text>
          <text x="0" y="46" fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="middle">10.1.10.5</text>
        </g>

        {/* 2. SW1 */}
        <g transform={`translate(${nodePositions.sw1.x}, ${nodePositions.sw1.y})`}>
          <rect x="-18" y="-18" width="36" height="36" rx="6" fill="#1e293b" stroke="#60a5fa" strokeWidth="1.5" />
          <text x="0" y="4" fill="#60a5fa" fontSize="10" fontWeight="bold" textAnchor="middle">SW</text>
          <text x="0" y="34" fill="#f1f5f9" fontSize="11" fontWeight="bold" textAnchor="middle">{midNodeA}</text>
          <text x="0" y="46" fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="middle">VLAN 10</text>
        </g>

        {/* 3. SW2 */}
        <g transform={`translate(${nodePositions.sw2.x}, ${nodePositions.sw2.y})`}>
          <rect x="-18" y="-18" width="36" height="36" rx="6" fill="#1e293b" stroke={hasAnomaly ? "#f43f5e" : "#60a5fa"} strokeWidth="1.5" />
          <text x="0" y="4" fill={hasAnomaly ? "#f43f5e" : "#60a5fa"} fontSize="10" fontWeight="bold" textAnchor="middle">SW</text>
          <text x="0" y="34" fill="#f1f5f9" fontSize="11" fontWeight="bold" textAnchor="middle">{midNodeB}</text>
          <text x="0" y="46" fill={hasAnomaly ? "#f43f5e" : "#64748b"} fontSize="9" fontFamily="monospace" textAnchor="middle">
            {hasAnomaly ? "VLAN 20 (Mismatch)" : "VLAN 10"}
          </text>
        </g>

        {/* 4. Host-B */}
        <g transform={`translate(${nodePositions.dst.x}, ${nodePositions.dst.y})`}>
          <circle r="20" fill="#1e293b" stroke={hasAnomaly ? "#64748b" : "#10b981"} strokeWidth="1.5" />
          <text x="0" y="4" fill={hasAnomaly ? "#64748b" : "#10b981"} fontSize="11" fontWeight="bold" textAnchor="middle">PC</text>
          <text x="0" y="34" fill="#f1f5f9" fontSize="11" fontWeight="bold" textAnchor="middle">{dstNode}</text>
          <text x="0" y="46" fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="middle">10.1.20.6</text>
        </g>
      </svg>

      {/* Fault / Status Callout Banner */}
      {hasAnomaly && frame >= 50 && (
        <div style={{
          position: "absolute",
          bottom: 10,
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(244, 63, 94, 0.15)",
          border: "1px solid rgba(244, 63, 94, 0.4)",
          borderRadius: 8,
          padding: "4px 12px",
          display: "flex",
          alignItems: "center",
          gap: 6,
          boxShadow: "0 0 16px rgba(244, 63, 94, 0.25)"
        }}>
          <span style={{ color: "#f43f5e", fontSize: 11, fontWeight: "bold", fontFamily: "monospace" }}>
            [!] PACKET COLLISION: {faultLabel}
          </span>
        </div>
      )}
    </div>
  );
};

export default function PacketFlowAnimation({
  hasAnomaly = true,
  faultLabel = "Native VLAN Mismatch",
  srcNode = "Host-A",
  midNodeA = "SW1",
  midNodeB = "SW2",
  dstNode = "Host-B",
  osiLayer = "Data Link"
}) {
  return (
    <div className="w-full rounded-2xl overflow-hidden border border-border/80 shadow-lg bg-card/60 backdrop-blur-md">
      <Player
        acknowledgeRemotionLicense
        muted
        component={PacketFlowComposition}
        inputProps={{
          hasAnomaly,
          faultLabel,
          srcNode,
          midNodeA,
          midNodeB,
          dstNode,
          osiLayer
        }}
        durationInFrames={120}
        fps={30}
        compositionWidth={800}
        compositionHeight={200}
        style={{
          width: "100%",
          height: "190px",
        }}
        autoPlay
        loop
      />
    </div>
  );
}
