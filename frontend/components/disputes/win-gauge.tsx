"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";

interface WinGaugeProps {
  probability: number;
  size?: number;
  showLabel?: boolean;
}

function getColor(probability: number): string {
  if (probability >= 0.45) return "oklch(0.75 0.18 155)";
  if (probability >= 0.25) return "oklch(0.80 0.16 80)";
  return "oklch(0.65 0.2 25)";
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
          stroke="oklch(0.25 0.02 260)"
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

      {/* Number */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
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
          className="text-xs font-medium mt-1 uppercase tracking-wider"
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
