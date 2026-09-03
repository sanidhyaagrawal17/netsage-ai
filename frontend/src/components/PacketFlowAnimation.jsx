import React from 'react';
import { Player } from '@remotion/player';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';

export const PacketFlowComposition = ({ 
  hasAnomaly = true, 
  faultLabel = "Switchport trunk link native VLANs do not match across interconnected switches", 
  srcNode = "Host-A", 
  midNodeA = "SW1",
  midNodeB = "SW2",
  dstNode = "Host-B",
  osiLayer = "Data Link"
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Positions on a 900x280 canvas with generous spacing
  const nodeY = 105;
  const nodePositions = {
    src: { x: 110, y: nodeY },
    sw1: { x: 300, y: nodeY },
    sw2: { x: 600, y: nodeY },
    dst: { x: 790, y: nodeY },
  };

  const trunkMidX = (nodePositions.sw1.x + nodePositions.sw2.x) / 2; // 450

  // Packet animation timeline (0 to 120 frames):
  let packetX = nodePositions.src.x;
  let packetOpacity = 1;
  let packetColor = "#38bdf8"; // Cyan

  if (hasAnomaly) {
    if (frame < 30) {
      packetX = interpolate(frame, [0, 30], [nodePositions.src.x, nodePositions.sw1.x], { extrapolateRight: "clamp" });
    } else if (frame < 60) {
      packetX = interpolate(frame, [30, 60], [nodePositions.sw1.x, trunkMidX], { extrapolateRight: "clamp" });
      packetColor = frame > 48 ? "#f43f5e" : "#38bdf8";
    } else if (frame < 95) {
      packetX = trunkMidX;
      packetColor = "#f43f5e"; // Crimson
      packetOpacity = interpolate(frame, [75, 95], [1, 0], { extrapolateRight: "clamp" });
    } else {
      packetOpacity = 0;
    }
  } else {
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

  // Shockwave spring
  const collisionSpring = spring({
    frame: frame - 55,
    fps,
    config: { damping: 14, stiffness: 100 }
  });
  const shockwaveRadius = interpolate(collisionSpring, [0, 1], [0, 52]);
  const shockwaveOpacity = interpolate(collisionSpring, [0, 1], [0.9, 0]);

  return (
    <div style={{ width: "100%", height: "100%", background: "#07090e", position: "relative", overflow: "hidden", fontFamily: "system-ui, sans-serif" }}>
      {/* Background Cyber Grid */}
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.18 }}>
        <defs>
          <pattern id="grid-pattern" width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#38bdf8" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-pattern)" />
      </svg>

      {/* Top Telemetry Header HUD */}
      <div style={{ position: "absolute", top: 12, left: 20, right: 20, display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ 
            width: 8, 
            height: 8, 
            borderRadius: "50%", 
            background: hasAnomaly ? "#f43f5e" : "#10b981", 
            boxShadow: `0 0 10px ${hasAnomaly ? "#f43f5e" : "#10b981"}` 
          }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", letterSpacing: 0.5 }}>
            {hasAnomaly ? "SIMULATED COLLISION / PACKET DROP" : "PACKET TRANSIT PATH VERIFIED"}
          </span>
          <span style={{ 
            fontSize: 10, 
            padding: "2px 8px", 
            borderRadius: 6, 
            background: "rgba(56, 189, 248, 0.12)", 
            color: "#38bdf8", 
            border: "1px solid rgba(56, 189, 248, 0.28)", 
            fontFamily: "monospace" 
          }}>
            OSI {osiLayer}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#64748b", fontFamily: "monospace" }}>
          <span>Frame {frame}/120</span>
          <span>•</span>
          <span>60 FPS</span>
        </div>
      </div>

      {/* Main SVG Topology Canvas (900 x 280) */}
      <svg width="900" height="280" viewBox="0 0 900 280" style={{ width: "100%", height: "100%" }}>
        {/* Layer 2 Links */}
        <line x1={nodePositions.src.x} y1={nodePositions.src.y} x2={nodePositions.sw1.x} y2={nodePositions.sw1.y} stroke="#334155" strokeWidth="3" />
        <line x1={nodePositions.sw1.x} y1={nodePositions.sw1.y} x2={nodePositions.sw2.x} y2={nodePositions.sw2.y} stroke={hasAnomaly ? "#f43f5e" : "#38bdf8"} strokeWidth="3.5" strokeDasharray="8,5" />
        <line x1={nodePositions.sw2.x} y1={nodePositions.sw2.y} x2={nodePositions.dst.x} y2={nodePositions.dst.y} stroke="#334155" strokeWidth="3" />

        {/* Link Header Labels (Positioned safely above link at y=68 to avoid ICMP overlap) */}
        <text x="205" y="90" fill="#64748b" fontSize="10" fontFamily="monospace" textAnchor="middle">Fa0/2</text>
        <g transform={`translate(${trunkMidX}, 64)`}>
          <rect x="-65" y="-12" width="130" height="20" rx="6" fill="#0b1120" stroke={hasAnomaly ? "rgba(244,63,94,0.4)" : "rgba(56,189,248,0.4)"} strokeWidth="1" />
          <text x="0" y="2" fill={hasAnomaly ? "#f43f5e" : "#38bdf8"} fontSize="11" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
            802.1Q TRUNK
          </text>
        </g>
        <text x="695" y="90" fill="#64748b" fontSize="10" fontFamily="monospace" textAnchor="middle">Fa0/2</text>

        {/* Shockwave Rings on Drop */}
        {hasAnomaly && frame >= 55 && frame < 95 && (
          <g transform={`translate(${trunkMidX}, ${nodeY})`}>
            <circle r={shockwaveRadius} fill="none" stroke="#f43f5e" strokeWidth="2.5" opacity={shockwaveOpacity} />
            <circle r={shockwaveRadius * 0.65} fill="none" stroke="#fb7185" strokeWidth="1.8" opacity={shockwaveOpacity * 0.8} />
          </g>
        )}

        {/* Animated Packet */}
        {packetOpacity > 0 && (
          <g transform={`translate(${packetX}, ${nodeY})`} opacity={packetOpacity}>
            <circle r="16" fill={packetColor} opacity="0.22" />
            <circle r="9" fill={packetColor} />
            {/* Packet Header Label (Offset above packet) */}
            <g transform="translate(0, -26)">
              <rect x="-26" y="-10" width="52" height="18" rx="5" fill="#020617" stroke={packetColor} strokeWidth="1.2" />
              <text x="0" y="3" fill={packetColor} fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                ICMP
              </text>
            </g>
          </g>
        )}

        {/* Device Nodes (y = 105) */}
        {/* 1. Host-A */}
        <g transform={`translate(${nodePositions.src.x}, ${nodePositions.src.y})`}>
          <circle r="22" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
          <text x="0" y="4" fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle">PC</text>
          <text x="0" y="42" fill="#f8fafc" fontSize="12" fontWeight="bold" textAnchor="middle">{srcNode}</text>
          <text x="0" y="58" fill="#64748b" fontSize="10" fontFamily="monospace" textAnchor="middle">10.1.10.5</text>
        </g>

        {/* 2. SW1 */}
        <g transform={`translate(${nodePositions.sw1.x}, ${nodePositions.sw1.y})`}>
          <rect x="-22" y="-22" width="44" height="44" rx="8" fill="#0f172a" stroke="#60a5fa" strokeWidth="2" />
          <text x="0" y="5" fill="#60a5fa" fontSize="11" fontWeight="bold" textAnchor="middle">SW</text>
          <text x="0" y="42" fill="#f8fafc" fontSize="12" fontWeight="bold" textAnchor="middle">{midNodeA}</text>
          <text x="0" y="58" fill="#38bdf8" fontSize="10" fontFamily="monospace" textAnchor="middle">VLAN 10</text>
        </g>

        {/* 3. SW2 */}
        <g transform={`translate(${nodePositions.sw2.x}, ${nodePositions.sw2.y})`}>
          <rect x="-22" y="-22" width="44" height="44" rx="8" fill="#0f172a" stroke={hasAnomaly ? "#f43f5e" : "#60a5fa"} strokeWidth="2" />
          <text x="0" y="5" fill={hasAnomaly ? "#f43f5e" : "#60a5fa"} fontSize="11" fontWeight="bold" textAnchor="middle">SW</text>
          <text x="0" y="42" fill="#f8fafc" fontSize="12" fontWeight="bold" textAnchor="middle">{midNodeB}</text>
          <text x="0" y="58" fill={hasAnomaly ? "#f43f5e" : "#64748b"} fontSize="10" fontFamily="monospace" textAnchor="middle">
            {hasAnomaly ? "VLAN 20 (Mismatch)" : "VLAN 10"}
          </text>
        </g>

        {/* 4. Host-B */}
        <g transform={`translate(${nodePositions.dst.x}, ${nodePositions.dst.y})`}>
          <circle r="22" fill="#0f172a" stroke={hasAnomaly ? "#475569" : "#10b981"} strokeWidth="2" />
          <text x="0" y="4" fill={hasAnomaly ? "#475569" : "#10b981"} fontSize="11" fontWeight="bold" textAnchor="middle">PC</text>
          <text x="0" y="42" fill="#f8fafc" fontSize="12" fontWeight="bold" textAnchor="middle">{dstNode}</text>
          <text x="0" y="58" fill="#64748b" fontSize="10" fontFamily="monospace" textAnchor="middle">10.1.20.6</text>
        </g>
      </svg>

      {/* Spacious Bottom Collision Banner (y = 220, perfectly below all node labels) */}
      {hasAnomaly && frame >= 48 && (
        <div style={{
          position: "absolute",
          bottom: 12,
          left: 20,
          right: 20,
          background: "rgba(244, 63, 94, 0.12)",
          border: "1px solid rgba(244, 63, 94, 0.35)",
          borderRadius: 10,
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          boxShadow: "0 0 20px rgba(244, 63, 94, 0.2)",
          backdropFilter: "blur(10px)"
        }}>
          <div style={{
            width: 20,
            height: 20,
            borderRadius: 6,
            background: "rgba(244, 63, 94, 0.2)",
            color: "#f43f5e",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: "bold",
            flexShrink: 0
          }}>
            !
          </div>
          <div style={{ overflow: "hidden" }}>
            <span style={{ color: "#f43f5e", fontSize: 11, fontWeight: 700, fontFamily: "monospace", display: "block" }}>
              PACKET DROP DETECTED AT 802.1Q TRUNK
            </span>
            <span style={{ color: "#cbd5e1", fontSize: 11, fontFamily: "monospace", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {faultLabel}
            </span>
          </div>
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
    <div className="w-full rounded-3xl overflow-hidden border border-border/80 shadow-2xl bg-card/70 backdrop-blur-xl">
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
        compositionWidth={900}
        compositionHeight={280}
        style={{
          width: "100%",
          height: "260px",
        }}
        autoPlay
        loop
      />
    </div>
  );
}
