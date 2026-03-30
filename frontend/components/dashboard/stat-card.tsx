"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  icon: LucideIcon;
  color?: string;
  delay?: number;
}

export function StatCard({
  label,
  value,
  prefix = "",
  suffix = "",
  icon: Icon,
  color = "text-primary",
  delay = 0,
}: StatCardProps) {
  const motionValue = useMotionValue(0);
  const displayValue = useTransform(motionValue, (v) => Math.round(v));

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 1,
      ease: "easeOut",
      delay,
    });
    return controls.stop;
  }, [value, motionValue, delay]);

  return (
    <motion.div
      className="rounded-xl border border-border bg-card p-5 shadow-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div className="text-2xl font-bold tabular-nums text-foreground">
        {prefix}
        <motion.span>{displayValue}</motion.span>
        {suffix}
      </div>
    </motion.div>
  );
}
