"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";

interface WinGaugeProps {
  probability: number;
  size?: number;
  showLabel?: boolean;
}

function getColor(probability: number): string {
  if (probability >= 0.45) return "#059669"; // emerald-600
  if (probability >= 0.25) return "#d97706"; // amber-600
  return "#dc2626"; // red-600
}

function getGlowClass(probability: number): string {
  if (probability >= 0.45) return "glow-win";
  if (probability >= 0.25) return "";
  return "glow-lose";
}

function getLabel(probability: number): string {
  if (probability >= 0.45) return "Fight";
  if (probability >= 0.25) return "Borderline";
  return "Skip";
}

export function WinGauge({
  probability,
  size = 160,
  showLabel = true,
}: WinGaugeProps) {
  const progress = useMotionValue(0);
  const displayValue = useTransform(progress, (v) =>
    Math.round(v * 100),
  );

  useEffect(() => {
    const controls = animate(progress, probability, {
      duration: 1.2,
      ease: "easeOut",
    });
    return controls.stop;
  }, [probability, progress]);

  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius; // Half circle
  const color = getColor(probability);

  return (
    <div
      className={`relative inline-flex flex-col items-center ${getGlowClass(probability)} rounded-full`}
    >
      <svg
        width={size}
        height={size / 2 + strokeWidth}
        viewBox={`0 0 ${size} ${size / 2 + strokeWidth}`}
      >
        {/* Background arc */}
        <path
          d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
          fill="none"
          stroke="hsl(220 13% 91%)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Progress arc */}
        <motion.path
          d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{
            strokeDashoffset: useTransform(
              progress,
              [0, 1],
              [circumference, 0],
            ),
          }}
        />
      </svg>

      {/* Number — positioned inside the arc with proper spacing */}
      <div className="absolute left-1/2 -translate-x-1/2 text-center" style={{ bottom: showLabel ? "20px" : "4px" }}>
        <motion.span
          className="text-3xl font-bold tabular-nums"
          style={{ color }}
        >
          {displayValue}
        </motion.span>
        <span className="text-lg font-bold" style={{ color }}>
          %
        </span>
      </div>

      {showLabel && (
        <div
          className="text-xs font-semibold mt-0 uppercase tracking-wider"
          style={{ color }}
        >
          {getLabel(probability)}
        </div>
      )}
    </div>
  );
}

export function WinGaugeMini({ probability }: { probability: number }) {
  const color = getColor(probability);
  const pct = Math.round(probability * 100);

  return (
    <div className="flex items-center gap-2">
      <div
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-sm font-medium tabular-nums" style={{ color }}>
        {pct}%
      </span>
    </div>
  );
}
