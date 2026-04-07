"use client";

import Link from "next/link";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
} from "framer-motion";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  Shield,
  ArrowRight,
  Check,
  Target,
  FileSearch,
  PenLine,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatingOrbs, MeshDots, WaveDivider } from "@/components/shared/animated-grid";

/* ─── Animated counter ─── */
function AnimatedNumber({
  value,
  prefix = "",
  suffix = "",
  className = "",
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const motionValue = useMotionValue(0);
  const display = useTransform(motionValue, (v) => Math.round(v));
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 2,
      ease: "easeOut",
    });
    const unsub = display.on("change", (v) => setCurrent(v));
    return () => {
      controls.stop();
      unsub();
    };
  }, [value, motionValue, display]);

  return (
    <span className={className}>
      {prefix}
      {current}
      {suffix}
    </span>
  );
}

/* ─── Animated arc gauge with pulse ring ─── */
function HeroGauge({ percentage }: { percentage: number }) {
  const radius = 120;
  const stroke = 12;
  const center = 150;
  const startAngle = -225;
  const endAngle = 45;
  const totalAngle = endAngle - startAngle;

  function polarToCartesian(angle: number) {
    const rad = (angle * Math.PI) / 180;
    return {
      x: center + radius * Math.cos(rad),
      y: center + radius * Math.sin(rad),
    };
  }

  function describeArc(start: number, end: number) {
    const s = polarToCartesian(start);
    const e = polarToCartesian(end);
    const largeArc = end - start > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${largeArc} 1 ${e.x} ${e.y}`;
  }

  const filledAngle = startAngle + (totalAngle * percentage) / 100;
  const bgPath = describeArc(startAngle, endAngle);
  const fgPath = describeArc(startAngle, filledAngle);

  const color =
    percentage >= 50 ? "#059669" : percentage >= 30 ? "#d97706" : "#dc2626";

  return (
    <div className="relative w-[300px] h-[300px]">
      {/* Pulsing glow behind gauge */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, ${color}15, transparent 70%)`,
        }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <svg viewBox="0 0 300 300" className="w-full h-full relative z-10">
        <path
          d={bgPath}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        <motion.path
          d={fgPath}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
        <span className="text-6xl font-bold tabular-nums text-foreground">
          <AnimatedNumber value={percentage} suffix="%" />
        </span>
        <span className="text-xs text-muted-foreground mt-1">industry avg win rate</span>
      </div>
    </div>
  );
}

/* ─── Interactive savings calculator with math breakdown ─── */
function SavingsCalculator() {
  const [chargebacks, setChargebacks] = useState(10);
  const [avgAmount, setAvgAmount] = useState(250);

  const totalAtRisk = chargebacks * avgAmount;
  const winRate = 0.72;
  const recovered = Math.round(totalAtRisk * winRate);
  const competitorCut = 0.25;
  const competitorCost = Math.round(recovered * competitorCut);
  const ourCost = 29;
  const savings = competitorCost - ourCost;

  return (
    <div className="space-y-8">
      {/* Sliders */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-foreground">
            Chargebacks per month
          </label>
          <span className="text-2xl font-bold text-foreground tabular-nums">
            {chargebacks}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={50}
          value={chargebacks}
          onChange={(e) => setChargebacks(Number(e.target.value))}
          className="w-full h-2 bg-gradient-to-r from-emerald-200 via-amber-200 to-red-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>1</span>
          <span>50</span>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-foreground">
            Average chargeback amount
          </label>
          <span className="text-2xl font-bold text-foreground tabular-nums">
            ${avgAmount}
          </span>
        </div>
        <input
          type="range"
          min={50}
          max={2000}
          step={50}
          value={avgAmount}
          onChange={(e) => setAvgAmount(Number(e.target.value))}
          className="w-full h-2 bg-gradient-to-r from-blue-200 via-indigo-200 to-violet-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>$50</span>
          <span>$2,000</span>
        </div>
      </div>

      {/* Math breakdown */}
      <div className="rounded-xl bg-slate-50 border border-slate-200 p-5 space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Here&apos;s the math
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {chargebacks} chargebacks &times; ${avgAmount} avg
          </span>
          <span className="font-semibold text-foreground tabular-nums">
            ${totalAtRisk.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            &times; 72% win rate <span className="text-xs">(industry avg)</span>
          </span>
          <span className="font-semibold text-emerald-600 tabular-nums">
            ${recovered.toLocaleString()} recovered
          </span>
        </div>

        <div className="h-px bg-slate-200 my-2" />

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Competitor takes 25% of recovered
          </span>
          <span className="font-semibold text-red-600 tabular-nums">
            -${competitorCost.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            DisputeShield flat fee
          </span>
          <span className="font-semibold text-primary tabular-nums">
            -$29
          </span>
        </div>
      </div>

      {/* Result cards */}
      <div className="grid grid-cols-3 gap-4">
        <motion.div
          className="rounded-xl bg-red-50 border border-red-200 p-4 text-center"
          animate={{ scale: [1, 1] }}
          key={`comp-${competitorCost}`}
        >
          <div className="text-xs text-muted-foreground mb-1">
            They charge
          </div>
          <div className="text-2xl font-bold text-red-600 tabular-nums">
            ${competitorCost.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            25% of wins
          </div>
        </motion.div>
        <motion.div className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-center">
          <div className="text-xs text-muted-foreground mb-1">We charge</div>
          <div className="text-2xl font-bold text-primary tabular-nums">
            ${ourCost}
          </div>
          <div className="text-xs text-muted-foreground mt-1">flat/month</div>
        </motion.div>
        <motion.div
          className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center"
          key={`save-${savings}`}
        >
          <div className="text-xs text-muted-foreground mb-1">You save</div>
          <div className="text-2xl font-bold text-emerald-600 tabular-nums">
            ${Math.max(0, savings).toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground mt-1">per month</div>
        </motion.div>
      </div>

      <p className="text-xs text-muted-foreground text-center mt-4">
        Based on a 72% industry average win rate for disputed chargebacks. Your actual results may vary.
      </p>
    </div>
  );
}

/* ─── Live dispute simulation ─── */
function DisputeSimulation() {
  const disputes = [
    {
      amount: "$487.00",
      code: "10.4",
      reason: "Fraud",
      score: 82,
      status: "fight",
    },
    {
      amount: "$1,249.00",
      code: "13.1",
      reason: "Not received",
      score: 91,
      status: "fight",
    },
    {
      amount: "$62.50",
      code: "10.4",
      reason: "Fraud",
      score: 18,
      status: "skip",
    },
    {
      amount: "$329.00",
      code: "13.3",
      reason: "Not as described",
      score: 67,
      status: "fight",
    },
  ];

  return (
    <div className="space-y-3">
      {disputes.map((d, i) => {
        const scoreColor =
          d.score >= 70
            ? "text-emerald-600 bg-emerald-50 border-emerald-300"
            : d.score >= 40
              ? "text-amber-600 bg-amber-50 border-amber-300"
              : "text-red-600 bg-red-50 border-red-300";
        const badgeColor =
          d.status === "fight"
            ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
            : "bg-red-100 text-red-700 border border-red-200";
        const leftBorder =
          d.status === "fight"
            ? "border-l-emerald-500"
            : "border-l-red-400";
        return (
          <motion.div
            key={i}
            className={`flex items-center justify-between rounded-xl border border-border border-l-4 ${leftBorder} bg-card p-4 shadow-card hover:shadow-elevated transition-shadow duration-200`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 + i * 0.15, duration: 0.4 }}
          >
            <div className="flex items-center gap-4">
              <span className="text-lg font-bold text-foreground tabular-nums w-24">
                {d.amount}
              </span>
              <div>
                <span className="text-xs text-muted-foreground">
                  {d.code} &middot; {d.reason}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-sm font-bold tabular-nums ${scoreColor}`}
              >
                {d.score}
              </div>
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full uppercase tracking-wider ${badgeColor}`}
              >
                {d.status}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ─── Interactive card with mouse glow ─── */
function GlowCard({
  children,
  className = "",
  delay = 0,
  glowColor = "rgba(26, 86, 219, 0.08)",
  accentColor = "",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  glowColor?: string;
  accentColor?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  return (
    <motion.div
      ref={ref}
      className={`relative rounded-2xl border border-border bg-card overflow-hidden transition-all duration-300 ${isHovered ? "shadow-elevated border-transparent" : "shadow-card"} ${accentColor} ${className}`}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isHovered && (
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{
            background: `radial-gradient(500px circle at ${mousePos.x}px ${mousePos.y}px, ${glowColor}, transparent 40%)`,
          }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

/* ─── Features ─── */
const features = [
  {
    icon: Target,
    title: "Win Probability",
    description:
      "Instantly know which chargebacks are worth fighting. Each dispute gets a score based on reason code, evidence strength, and historical patterns.",
    color: "bg-emerald-50 text-emerald-600",
    glowColor: "rgba(5, 150, 105, 0.1)",
    accent: "border-t-2 border-t-emerald-500",
  },
  {
    icon: PenLine,
    title: "Response Writer",
    description:
      "Professional representment letters tailored to each reason code and card network. Not templates — arguments built from your evidence.",
    color: "bg-violet-50 text-violet-600",
    glowColor: "rgba(124, 58, 237, 0.1)",
    accent: "border-t-2 border-t-violet-500",
  },
  {
    icon: FileSearch,
    title: "Evidence Compiler",
    description:
      "Pulls transaction records, shipping data, and customer info from Stripe automatically. Organizes everything the card network needs.",
    color: "bg-amber-50 text-amber-600",
    glowColor: "rgba(217, 119, 6, 0.1)",
    accent: "border-t-2 border-t-amber-500",
  },
  {
    icon: BarChart3,
    title: "Performance Analytics",
    description:
      "Track your win rate, money recovered, and reason code patterns. See what's working and where you're leaving money on the table.",
    color: "bg-blue-50 text-blue-600",
    glowColor: "rgba(26, 86, 219, 0.1)",
    accent: "border-t-2 border-t-blue-500",
  },
];

/* ─── Pricing (future tiers, shown greyed out during beta) ─── */
const tiers = [
  {
    name: "Starter",
    price: 29,
    description: "For merchants handling occasional chargebacks",
    features: [
      "Up to 10 chargebacks/month",
      "Win probability scoring",
      "Evidence compiler",
      "Email support",
    ],
  },
  {
    name: "Growth",
    price: 49,
    popular: true,
    description: "For growing businesses that need full coverage",
    features: [
      "Unlimited chargebacks",
      "Response generation",
      "Full analytics dashboard",
      "Priority support",
    ],
  },
  {
    name: "Agency",
    price: 99,
    description: "For agencies managing multiple merchant accounts",
    features: [
      "Everything in Growth",
      "Multi-merchant management",
      "White-label responses",
      "Dedicated support",
    ],
  },
];

const stagger = {
  animate: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

/* ─── Page ─── */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/60">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <span className="font-bold text-lg tracking-tight text-foreground">
              DisputeShield
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">
                Start free trial
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══════════ Hero ═══════════ */}
      <section className="relative pt-28 pb-20 px-6">
        <FloatingOrbs />
        <MeshDots />

        <div className="max-w-6xl mx-auto relative">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left — copy */}
            <motion.div initial="initial" animate="animate" variants={stagger}>
              <motion.div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6"
                variants={fadeUp}
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-medium text-primary">
                  Flat pricing — never a % cut
                </span>
              </motion.div>

              <motion.h1
                className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.08] mb-6"
                variants={fadeUp}
              >
                Fight the right
                <br />
                chargebacks.
                <br />
                <span className="text-gradient">Win them.</span>
              </motion.h1>

              <motion.p
                className="text-lg text-muted-foreground max-w-lg mb-8 leading-relaxed"
                variants={fadeUp}
              >
                DisputeShield scores every chargeback, compiles your evidence
                from Stripe, and writes your response letter.{" "}
                <span className="text-foreground font-medium">
                  Flat $29/month — no percentage of recovered revenue.
                </span>
              </motion.p>

              <motion.div
                className="flex flex-col sm:flex-row items-start gap-4"
                variants={fadeUp}
              >
                <Link href="/register">
                  <Button
                    size="lg"
                    className="text-base px-8 shadow-elevated"
                  >
                    Start free trial
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <p className="text-sm text-muted-foreground pt-3">
                  14-day free trial &middot; No credit card
                </p>
              </motion.div>

              {/* Inline stats */}
              <motion.div
                className="flex gap-10 mt-12 pt-8 border-t border-border"
                variants={fadeUp}
              >
                <div>
                  <div className="text-3xl font-bold text-emerald-600 tabular-nums">
                    <AnimatedNumber value={72} suffix="%" />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Industry avg win rate
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary tabular-nums">
                    <AnimatedNumber value={30} suffix="s" />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Per analysis
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-violet-600 tabular-nums">
                    $<AnimatedNumber value={0} />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Revenue share
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Right — gauge visualization */}
            <motion.div
              className="flex justify-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <HeroGauge percentage={72} />
            </motion.div>
          </div>
        </div>
      </section>

      <WaveDivider />

      {/* ═══════════ Live dispute preview ═══════════ */}
      <section className="py-16 px-6 relative bg-gradient-to-b from-blue-50/40 to-background">
        <div className="max-w-3xl mx-auto">
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-3 text-foreground">
              Every dispute gets a verdict
            </h2>
            <p className="text-muted-foreground">
              Instantly see which chargebacks are worth your time — and which
              ones aren&apos;t.
            </p>
          </motion.div>

          <DisputeSimulation />
        </div>
      </section>

      {/* ═══════════ Features — bento grid ═══════════ */}
      <section className="py-24 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-slate-50/80 to-background" />
        <MeshDots className="opacity-30" />
        <div className="max-w-6xl mx-auto relative">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
              Everything you need to win
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              From analysis to submission — one tool, one workflow.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-5">
            {features.map((feature, i) => (
              <GlowCard
                key={feature.title}
                delay={0.6 + i * 0.1}
                glowColor={feature.glowColor}
                accentColor={feature.accent}
                className="p-8"
              >
                <div className="flex items-center gap-3 mb-5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${feature.color}`}
                  >
                    <feature.icon className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-foreground">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </GlowCard>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ Savings calculator ═══════════ */}
      <section className="py-24 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-emerald-50/20 to-background" />
        <div className="max-w-3xl mx-auto relative">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
              Calculate what you&apos;ll save
            </h2>
            <p className="text-muted-foreground text-lg">
              Drag the sliders. Watch the math update in real time.
            </p>
          </motion.div>

          <motion.div
            className="rounded-2xl border border-border bg-card p-8 md:p-10 shadow-elevated"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <SavingsCalculator />
          </motion.div>
        </div>
      </section>

      <WaveDivider flip />

      {/* ═══════════ Pricing ═══════════ */}
      <section className="py-24 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/40 via-background to-background" />
        <div className="max-w-5xl mx-auto relative">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
              Simple, honest pricing
            </h2>
            <p className="text-muted-foreground text-lg">
              No percentage cuts. No hidden fees. No surprises.
            </p>
          </motion.div>

          {/* Free beta banner */}
          <motion.div
            className="rounded-2xl border-2 border-emerald-500 bg-emerald-50 p-8 md:p-10 text-center mb-10 shadow-elevated relative overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <motion.div
              className="absolute inset-0 opacity-10"
              style={{
                background:
                  "radial-gradient(circle at 50% 50%, rgba(5, 150, 105, 0.3), transparent 70%)",
              }}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 border border-emerald-200 mb-4">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-medium text-emerald-700">Beta</span>
              </div>
              <h3 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
                Free during beta
              </h3>
              <p className="text-lg text-muted-foreground max-w-lg mx-auto mb-6">
                Get in early — completely free while we&apos;re in beta. Full access to every feature, no credit card required.
              </p>
              <Link href="/register">
                <Button size="lg" className="text-base px-8 shadow-elevated">
                  Get started free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Future tiers (greyed out) */}
          <div className="grid md:grid-cols-3 gap-6 opacity-50 pointer-events-none">
            {tiers.map((tier, i) => (
              <motion.div
                key={tier.name}
                className={`rounded-2xl border p-8 relative ${
                  tier.popular
                    ? "border-primary/40 bg-card shadow-card"
                    : "border-border bg-card shadow-card"
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 + i * 0.1 }}
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                  Coming soon
                </div>
                <h3 className="text-xl font-semibold text-foreground">
                  {tier.name}
                </h3>
                <p className="text-muted-foreground text-sm mt-1 mb-5">
                  {tier.description}
                </p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold text-foreground">
                    ${tier.price}
                  </span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <ul className="space-y-3">
                  {tier.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ CTA ═══════════ */}
      <section className="py-24 px-6">
        <motion.div
          className="max-w-3xl mx-auto text-center rounded-2xl bg-gradient-to-br from-primary via-blue-700 to-violet-700 p-12 md:p-16 shadow-elevated relative overflow-hidden"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          {/* Animated shimmer across the CTA */}
          <motion.div
            className="absolute inset-0 opacity-20"
            style={{
              background:
                "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)",
            }}
            animate={{ x: ["-100%", "100%"] }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear",
              repeatDelay: 4,
            }}
          />
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(circle, #fff 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
              Every chargeback you don&apos;t fight is money you hand back
            </h2>
            <p className="text-blue-100 text-lg mb-8 max-w-xl mx-auto">
              Connect your Stripe account and DisputeShield starts working in
              minutes. No setup fees, no long contracts.
            </p>
            <Link href="/register">
              <Button
                size="lg"
                className="text-base px-8 bg-white text-primary hover:bg-blue-50"
              >
                Start your free trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">DisputeShield</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/support" className="hover:text-foreground transition-colors">Support</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} DisputeShield. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
