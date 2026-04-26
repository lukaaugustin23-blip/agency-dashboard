'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';
import AnimatedCounter from './AnimatedCounter';

interface GoalRingProps {
  current: number;
  goal: number;
  size?: number;
  strokeWidth?: number;
}

export default function GoalRing({ current, goal, size = 160, strokeWidth = 14 }: GoalRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min((current / goal) * 100, 100);

  const [animatedOffset, setAnimatedOffset] = useState(circumference);
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const targetOffset = circumference - (percentage / 100) * circumference;
    const timeout = setTimeout(() => setAnimatedOffset(targetOffset), 100);
    return () => clearTimeout(timeout);
  }, [inView, percentage, circumference]);

  const cx = size / 2;
  const cy = size / 2;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg ref={ref} width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Track */}
          <circle
            cx={cx} cy={cy} r={radius}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className="dark:[stroke:#334155]"
          />
          {/* Fill */}
          <circle
            cx={cx} cy={cy} r={radius}
            fill="none"
            stroke="#3C50E0"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={animatedOffset}
            style={{
              transform: 'rotate(-90deg)',
              transformOrigin: 'center',
              transition: 'stroke-dashoffset 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-slate-900 dark:text-white">
            <AnimatedCounter value={percentage} decimals={1} suffix="%" />
          </span>
          <span className="text-xs text-slate-400 mt-0.5">of goal</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          <AnimatedCounter value={current} prefix="$" />
          <span className="text-slate-400 font-normal"> / $10,000</span>
        </p>
        <p className="text-xs text-slate-400 mt-0.5">Net Profit Goal</p>
      </div>
    </div>
  );
}
