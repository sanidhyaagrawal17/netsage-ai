import React from 'react';
import { cn } from '../../lib/utils';

export default function BorderBeam({
  className,
  colorFrom = "#38bdf8",
  colorTo = "#3b82f6",
  rx = 18,
  strokeWidth = 2,
  duration = 8
}) {
  const gradientId = React.useId();

  return (
    <svg 
      className={cn("pointer-events-none absolute inset-0 w-full h-full z-10 overflow-visible", className)}
      style={{ borderRadius: `${rx}px` }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colorFrom} stopOpacity="1" />
          <stop offset="60%" stopColor={colorTo} stopOpacity="0.8" />
          <stop offset="100%" stopColor="transparent" stopOpacity="0" />
        </linearGradient>
        <filter id={`${gradientId}-glow`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <rect
        x="0"
        y="0"
        width="100%"
        height="100%"
        rx={rx}
        ry={rx}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={strokeWidth}
        strokeDasharray="160 640"
        filter={`url(#${gradientId}-glow)`}
        className="animate-border-beam-dash"
        style={{ animationDuration: `${duration}s` }}
      />
    </svg>
  );
}
