"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Zap,
  ArrowRight,
  ChevronRight,
  Check,
  Link2,
  ExternalLink,
  CreditCard,
  Loader2,
  Eye,
  FileText,
  Send,
  BarChart3,
  Sparkles,
  Crown,
  Clock,
  Target,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { getConnectUrl, createCheckout } from "@/lib/api";

/* ─── step config ─── */
const STEPS = ["welcome", "how", "connect", "plan"] as const;
type Step = (typeof STEPS)[number];

/* ─── animated counter ─── */
function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const duration = 1200;
    const start = performance.now();
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [value]);
  return (
    <span>
      {display}
      {suffix}
    </span>
  );
}

/* ─── mini win gauge for the demo ─── */
function DemoGauge({ pct, color, delay }: { pct: number; color: string; delay: number }) {
  return (
    <motion.div
      className="relative w-16 h-16"
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 300, damping: 20 }}
    >
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        <circle
          cx="18"
          cy="18"
          r="15.9155"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-muted/30"
        />
        <motion.circle
          cx="18"
          cy="18"
          r="15.9155"
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="100"
          initial={{ strokeDashoffset: 100 }}
          animate={{ strokeDashoffset: 100 - pct }}
          transition={{ delay: delay + 0.3, duration: 0.8, ease: "easeOut" }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color }}>
        {pct}%
      </span>
    </motion.div>
  );
}

/* ─── interactive demo step card ─── */
function DemoCard({
  icon: Icon,
  title,
  description,
  delay,
  active,
  onClick,
}: {
  icon: typeof Zap;
  title: string;
  description: string;
  delay: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      className={`relative text-left w-full rounded-2xl border p-5 transition-all duration-300 ${
        active
          ? "border-primary bg-primary/5 shadow-lg shadow-primary/10 scale-[1.02]"
          : "border-border bg-card/50 hover:border-primary/30 hover:bg-card"
      }`}
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.4 }}
      whileHover={{ scale: active ? 1.02 : 1.01 }}
    >
      {active && (
        <motion.div
          className="absolute -left-px top-4 bottom-4 w-1 rounded-full bg-primary"
          layoutId="demo-indicator"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
            active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="font-semibold text-sm text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>
    </motion.button>
  );
}

/* ─── demo visualisations per step ─── */
function DemoVisual({ activeDemo }: { activeDemo: number }) {
  return (
    <AnimatePresence mode="wait">
      {activeDemo === 0 && (
        <motion.div
          key="detect"
          className="rounded-2xl border border-border bg-card p-6 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            Incoming Chargeback
          </div>
          <motion.div
            className="rounded-xl border border-red-200 bg-red-50/50 p-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-lg text-foreground">$247.50</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                New Dispute
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Visa 13.1 — Product Not Received</p>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-red-600">
              <Clock className="w-3 h-3" />
              21 days to respond
            </div>
          </motion.div>
          <motion.div
            className="flex items-center gap-2 text-xs text-emerald-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <Check className="w-3.5 h-3.5" />
            Auto-imported from Stripe in 2 seconds
          </motion.div>
        </motion.div>
      )}

      {activeDemo === 1 && (
        <motion.div
          key="analyse"
          className="rounded-2xl border border-border bg-card p-6 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            <Target className="w-3.5 h-3.5 text-primary" />
            Win Probability
          </div>
          <div className="flex items-center gap-6">
            <DemoGauge pct={82} color="hsl(142, 71%, 45%)" delay={0.2} />
            <div className="flex-1">
              <p className="font-bold text-foreground">Strong case — fight it</p>
              <p className="text-xs text-muted-foreground mt-1">
                You have delivery confirmation + signed receipt. This pushes your win rate well above the 45% baseline for
                &quot;Product Not Received.&quot;
              </p>
            </div>
          </div>
          <motion.div
            className="flex gap-2 flex-wrap"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            {["Delivery proof", "Customer emails", "Tracking #"].map((tag) => (
              <span key={tag} className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                {tag}
              </span>
            ))}
          </motion.div>
        </motion.div>
      )}

      {activeDemo === 2 && (
        <motion.div
          key="respond"
          className="rounded-2xl border border-border bg-card p-6 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            <FileText className="w-3.5 h-3.5 text-blue-500" />
            Generated Response
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-4 font-mono text-xs leading-relaxed text-foreground/80">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              Dear Dispute Review Team,
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-2">
              We are responding to Visa dispute 13.1 for transaction of $247.50. The cardholder claims the product was not
              received, however our records demonstrate...
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-2 text-primary"
            >
              <span className="inline-block w-2 h-4 bg-primary animate-pulse" />
            </motion.div>
          </div>
          <motion.div
            className="flex items-center gap-2 text-xs text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            AI-generated from your evidence + reason code requirements
          </motion.div>
        </motion.div>
      )}

      {activeDemo === 3 && (
        <motion.div
          key="win"
          className="rounded-2xl border border-border bg-card p-6 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            Results
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Win rate", value: 73, suffix: "%", color: "text-emerald-500" },
              { label: "Recovered", value: 4280, suffix: "", color: "text-foreground", prefix: "$" },
              { label: "Saved", value: 1650, suffix: "", color: "text-primary", prefix: "$" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                className="text-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.15 }}
              >
                <p className={`text-2xl font-bold ${stat.color}`}>
                  {stat.prefix}
                  <AnimatedNumber value={stat.value} suffix={stat.suffix} />
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </motion.div>
            ))}
          </div>
          <motion.p
            className="text-sm text-center text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            Track every dollar. Know what&apos;s working.
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─── progress dots ─── */
function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          className={`h-1.5 rounded-full transition-colors ${
            i <= current ? "bg-primary" : "bg-muted"
          }`}
          animate={{ width: i === current ? 32 : 12 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      ))}
    </div>
  );
}

/* ─── floating particles background ─── */
function FloatingOrbs() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {[
        { x: "10%", y: "20%", size: 300, color: "bg-primary/5", delay: 0 },
        { x: "80%", y: "60%", size: 200, color: "bg-blue-500/5", delay: 2 },
        { x: "50%", y: "80%", size: 250, color: "bg-emerald-500/5", delay: 4 },
      ].map((orb, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full ${orb.color} blur-3xl`}
          style={{ left: orb.x, top: orb.y, width: orb.size, height: orb.size }}
          animate={{
            y: [0, -30, 0],
            x: [0, 15, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            delay: orb.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   MAIN ONBOARDING PAGE
   ═════════════════════════════════════════════════════════════ */
export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [step, setStep] = useState<Step>("welcome");
  const [activeDemo, setActiveDemo] = useState(0);
  const [connecting, setConnecting] = useState(false);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);

  const stepIndex = useMemo(() => STEPS.indexOf(step), [step]);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  const next = useCallback(() => {
    const i = STEPS.indexOf(step);
    if (i < STEPS.length - 1) setStep(STEPS[i + 1]);
  }, [step]);

  const skip = useCallback(() => {
    router.push("/dashboard");
  }, [router]);

  async function handleConnect() {
    setConnecting(true);
    try {
      const { url } = await getConnectUrl();
      window.location.href = url;
    } catch {
      setConnecting(false);
    }
  }

  async function handleCheckout(tier: string) {
    setCheckingOut(tier);
    try {
      const { checkout_url } = await createCheckout(tier);
      window.location.href = checkout_url;
    } catch {
      setCheckingOut(null);
    }
  }

  // Auto-cycle demo cards
  useEffect(() => {
    if (step !== "how") return;
    const timer = setInterval(() => {
      setActiveDemo((prev) => (prev + 1) % 4);
    }, 4000);
    return () => clearInterval(timer);
  }, [step]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-background overflow-hidden">
      <FloatingOrbs />

      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <span className="font-semibold text-sm text-foreground">DisputeShield</span>
        </div>
        <div className="flex items-center gap-4">
          <StepIndicator current={stepIndex} total={STEPS.length} />
          <button
            onClick={skip}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip setup
          </button>
        </div>
      </div>

      {/* Step content */}
      <div className="min-h-screen flex items-center justify-center px-6 pt-16 pb-8">
        <AnimatePresence mode="wait">
          {/* ── STEP 1: Welcome ── */}
          {step === "welcome" && (
            <motion.div
              key="welcome"
              className="max-w-lg text-center"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -40 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div
                className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center mx-auto mb-8 shadow-xl shadow-primary/20"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
              >
                <Shield className="w-10 h-10 text-white" />
              </motion.div>

              <motion.h1
                className="text-4xl font-bold text-foreground mb-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                Welcome to DisputeShield
                {user.business_name ? (
                  <span className="block text-primary mt-1">{user.business_name}</span>
                ) : null}
              </motion.h1>

              <motion.p
                className="text-lg text-muted-foreground mb-4 leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                You&apos;re about to turn chargebacks from a headache into a competitive advantage.
              </motion.p>

              <motion.div
                className="flex items-center justify-center gap-8 mb-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                {[
                  { icon: Eye, label: "Know when to fight" },
                  { icon: FileText, label: "Win with AI" },
                  { icon: BarChart3, label: "Track every dollar" },
                ].map((item, i) => (
                  <motion.div
                    key={item.label}
                    className="flex flex-col items-center gap-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 + i * 0.1 }}
                  >
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{item.label}</span>
                  </motion.div>
                ))}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
              >
                <Button size="lg" onClick={next} className="h-12 px-8 text-base group">
                  Let&apos;s go
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </motion.div>
            </motion.div>
          )}

          {/* ── STEP 2: How It Works (interactive) ── */}
          {step === "how" && (
            <motion.div
              key="how"
              className="max-w-4xl w-full"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -40 }}
              transition={{ duration: 0.5 }}
            >
              <div className="text-center mb-10">
                <motion.h2
                  className="text-3xl font-bold text-foreground mb-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  Here&apos;s how it works
                </motion.h2>
                <motion.p
                  className="text-muted-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  Click each step to see it in action
                </motion.p>
              </div>

              <div className="grid md:grid-cols-2 gap-8 items-start">
                {/* Left: step cards */}
                <div className="space-y-3">
                  {[
                    {
                      icon: Zap,
                      title: "1. Chargeback detected",
                      description: "We monitor your Stripe account 24/7. When a dispute hits, we catch it instantly.",
                    },
                    {
                      icon: Target,
                      title: "2. AI analyses your odds",
                      description:
                        "Our engine scores your win probability based on reason code, evidence strength, and historical data.",
                    },
                    {
                      icon: Send,
                      title: "3. Response generated",
                      description:
                        "AI drafts a professional representment letter tailored to the exact reason code and card network.",
                    },
                    {
                      icon: TrendingUp,
                      title: "4. Track your results",
                      description:
                        "See your win rate climb. Track every dollar recovered. Know which fights are worth it.",
                    },
                  ].map((card, i) => (
                    <DemoCard
                      key={i}
                      icon={card.icon}
                      title={card.title}
                      description={card.description}
                      delay={0.1 + i * 0.1}
                      active={activeDemo === i}
                      onClick={() => setActiveDemo(i)}
                    />
                  ))}
                </div>

                {/* Right: live visual */}
                <div className="sticky top-24">
                  <DemoVisual activeDemo={activeDemo} />
                </div>
              </div>

              <motion.div
                className="text-center mt-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <Button size="lg" onClick={next} className="h-12 px-8 text-base group">
                  Got it — let&apos;s set up
                  <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </Button>
              </motion.div>
            </motion.div>
          )}

          {/* ── STEP 3: Connect Stripe ── */}
          {step === "connect" && (
            <motion.div
              key="connect"
              className="max-w-lg text-center"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -40 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div
                className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mx-auto mb-8 shadow-xl shadow-violet-500/20"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
              >
                <Link2 className="w-10 h-10 text-white" />
              </motion.div>

              <motion.h2
                className="text-3xl font-bold text-foreground mb-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                Connect your Stripe account
              </motion.h2>

              <motion.p
                className="text-muted-foreground mb-8 max-w-sm mx-auto leading-relaxed"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                We&apos;ll monitor your account for new chargebacks and auto-import evidence. Read-only access
                — we never touch your funds.
              </motion.p>

              {user.stripe_account_id ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4"
                >
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 font-medium text-sm">
                    <Check className="w-4 h-4" />
                    Stripe connected
                  </div>
                  <div>
                    <Button size="lg" onClick={next} className="h-12 px-8 text-base group">
                      Continue
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  className="space-y-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <div className="flex flex-col items-center gap-3">
                    <Button
                      size="lg"
                      onClick={handleConnect}
                      disabled={connecting}
                      className="h-12 px-8 text-base bg-violet-600 hover:bg-violet-700 group"
                    >
                      {connecting ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <ExternalLink className="w-4 h-4 mr-2" />
                      )}
                      Connect with Stripe
                    </Button>
                    <button
                      onClick={next}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      I&apos;ll do this later
                    </button>
                  </div>

                  {/* Trust signals */}
                  <motion.div
                    className="flex items-center justify-center gap-6 mt-6 text-xs text-muted-foreground"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                  >
                    {["256-bit encryption", "Read-only access", "Revoke anytime"].map((s) => (
                      <span key={s} className="flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-500" />
                        {s}
                      </span>
                    ))}
                  </motion.div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── STEP 4: Choose Plan ── */}
          {step === "plan" && (
            <motion.div
              key="plan"
              className="max-w-3xl w-full"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -40 }}
              transition={{ duration: 0.5 }}
            >
              <div className="text-center mb-10">
                <motion.h2
                  className="text-3xl font-bold text-foreground mb-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  Pick your plan
                </motion.h2>
                <motion.p
                  className="text-muted-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  Flat pricing. No percentage cut. Ever.
                </motion.p>
              </div>

              <div className="grid md:grid-cols-3 gap-5 mb-8">
                {[
                  {
                    tier: "starter",
                    name: "Starter",
                    price: 29,
                    features: [
                      "Up to 10 chargebacks/mo",
                      "Win probability scoring",
                      "Evidence compilation",
                      "Email notifications",
                    ],
                    popular: false,
                  },
                  {
                    tier: "growth",
                    name: "Growth",
                    price: 49,
                    features: [
                      "Unlimited chargebacks",
                      "AI response generation",
                      "Full analytics dashboard",
                      "Priority email support",
                      "Evidence guidance",
                    ],
                    popular: true,
                  },
                  {
                    tier: "agency",
                    name: "Agency",
                    price: 99,
                    features: [
                      "Everything in Growth",
                      "Multiple Stripe accounts",
                      "Team access",
                      "Dedicated support",
                      "Custom integrations",
                    ],
                    popular: false,
                  },
                ].map((plan, i) => (
                  <motion.div
                    key={plan.tier}
                    className={`relative rounded-2xl border p-6 flex flex-col ${
                      plan.popular
                        ? "border-primary bg-primary/5 shadow-xl shadow-primary/10 scale-105"
                        : "border-border bg-card"
                    }`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1">
                        <Crown className="w-3 h-3" />
                        Most Popular
                      </div>
                    )}
                    <h3 className="font-semibold text-foreground text-lg">{plan.name}</h3>
                    <div className="mt-2 mb-4">
                      <span className="text-3xl font-bold text-foreground">${plan.price}</span>
                      <span className="text-muted-foreground text-sm">/mo</span>
                    </div>
                    <ul className="space-y-2 mb-6 flex-1">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant={plan.popular ? "default" : "secondary"}
                      onClick={() => handleCheckout(plan.tier)}
                      disabled={checkingOut !== null}
                      className="w-full"
                    >
                      {checkingOut === plan.tier ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          Get {plan.name}
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </>
                      )}
                    </Button>
                  </motion.div>
                ))}
              </div>

              <motion.div
                className="text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <button
                  onClick={skip}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Start with the free trial — upgrade later
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
