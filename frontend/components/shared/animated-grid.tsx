"use client";

import { motion } from "framer-motion";

/* ─── Floating gradient orbs — organic, colorful background ─── */
export function FloatingOrbs({ className = "" }: { className?: string }) {
  const orbs = [
    {
      color: "from-blue-400/30 to-indigo-500/20",
      size: "w-[500px] h-[500px]",
      initial: { x: "-10%", y: "-20%" },
      animate: { x: ["−10%", "5%", "-10%"], y: ["-20%", "-5%", "-20%"] },
      duration: 20,
    },
    {
      color: "from-emerald-400/25 to-teal-500/15",
      size: "w-[400px] h-[400px]",
      initial: { x: "60%", y: "10%" },
      animate: { x: ["60%", "70%", "60%"], y: ["10%", "-5%", "10%"] },
      duration: 25,
    },
    {
      color: "from-violet-400/20 to-purple-500/15",
      size: "w-[350px] h-[350px]",
      initial: { x: "30%", y: "50%" },
      animate: { x: ["30%", "40%", "30%"], y: ["50%", "35%", "50%"] },
      duration: 18,
    },
    {
      color: "from-amber-300/20 to-orange-400/10",
      size: "w-[300px] h-[300px]",
      initial: { x: "80%", y: "60%" },
      animate: { x: ["80%", "75%", "80%"], y: ["60%", "45%", "60%"] },
      duration: 22,
    },
  ];

  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
    >
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full bg-gradient-to-br ${orb.color} ${orb.size} blur-[80px]`}
          initial={orb.initial}
          animate={orb.animate}
          transition={{
            duration: orb.duration,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/* ─── Animated mesh dots — subtle grid with color pulses ─── */
export function MeshDots({ className = "" }: { className?: string }) {
  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
    >
      {/* Base dot grid */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle, #94a3b8 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Color pulse spots */}
      {[
        { x: "20%", y: "30%", color: "rgba(5,150,105,0.4)", delay: 0 },
        { x: "70%", y: "20%", color: "rgba(26,86,219,0.4)", delay: 2 },
        { x: "50%", y: "70%", color: "rgba(124,58,237,0.3)", delay: 4 },
        { x: "85%", y: "50%", color: "rgba(217,119,6,0.3)", delay: 1 },
        { x: "35%", y: "55%", color: "rgba(26,86,219,0.3)", delay: 3 },
      ].map((spot, i) => (
        <motion.div
          key={i}
          className="absolute w-[200px] h-[200px] rounded-full"
          style={{
            left: spot.x,
            top: spot.y,
            background: `radial-gradient(circle, ${spot.color}, transparent 70%)`,
            transform: "translate(-50%, -50%)",
          }}
          animate={{ opacity: [0, 1, 0], scale: [0.8, 1.2, 0.8] }}
          transition={{
            duration: 4,
            delay: spot.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/* ─── Section wave divider ─── */
export function WaveDivider({
  className = "",
  flip = false,
}: {
  className?: string;
  flip?: boolean;
}) {
  return (
    <div
      className={`w-full overflow-hidden leading-[0] ${flip ? "rotate-180" : ""} ${className}`}
    >
      <svg
        viewBox="0 0 1440 60"
        className="w-full h-[60px]"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="wave-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#059669" stopOpacity="0.15" />
            <stop offset="50%" stopColor="#1a56db" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.15" />
          </linearGradient>
        </defs>
        <path
          d="M0,30 C360,60 720,0 1080,30 C1260,45 1380,20 1440,30 L1440,60 L0,60 Z"
          fill="url(#wave-grad)"
        />
      </svg>
    </div>
  );
}
