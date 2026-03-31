"use client";

import { useEffect, useRef, useState, use } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  Brain,
  FileText,
  Loader2,
  Plus,
  Send,
  SkipForward,
  Clock,
  CreditCard,
  User,
  Mail,
  Check,
  AlertTriangle,
  Sparkles,
  Copy,
  CheckCheck,
  Shield,
  ShieldX,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  Upload,
  Image,
  Paperclip,
  ArrowDown,
  Target,
  XCircle,
  Lightbulb,
  Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WinGauge } from "@/components/disputes/win-gauge";
import { EvidenceUpload } from "@/components/disputes/evidence-upload";
import { EvidenceChecklist } from "@/components/disputes/evidence-checklist";
import {
  getDispute,
  listEvidence,
  analyzeDispute,
  generateResponse,
  skipDispute,
  submitResponse,
  addEvidence,
} from "@/lib/api";
import type {
  Dispute,
  Evidence,
  DisputeAnalysis,
  RepresentmentLetter,
} from "@/lib/types";
import Link from "next/link";

function formatCurrency(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const evidenceTypeLabels: Record<string, string> = {
  transaction_record: "Transaction Record",
  customer_communication: "Customer Communication",
  shipping_tracking: "Shipping Tracking",
  delivery_confirmation: "Delivery Confirmation",
  refund_policy: "Refund Policy",
  customer_signature: "Customer Signature",
  receipt: "Receipt",
  screenshot: "Screenshot",
  email_thread: "Email Thread",
  custom_document: "Custom Document",
};

type Recommendation = "fight" | "skip" | "borderline";

function getRecommendationTheme(rec: Recommendation) {
  switch (rec) {
    case "fight":
      return {
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        accent: "text-emerald-700",
        badgeBg: "bg-emerald-100 text-emerald-800 border-emerald-300",
        icon: Shield,
        iconColor: "text-emerald-600",
        glow: "shadow-[0_0_30px_-5px_rgba(16,185,129,0.2)]",
        label: "Worth Fighting",
        sublabel: "Strong case — gather evidence and submit",
        gradient: "from-emerald-500/10 via-transparent to-transparent",
        trendIcon: TrendingUp,
      };
    case "borderline":
      return {
        bg: "bg-amber-50",
        border: "border-amber-200",
        accent: "text-amber-700",
        badgeBg: "bg-amber-100 text-amber-800 border-amber-300",
        icon: ShieldAlert,
        iconColor: "text-amber-600",
        glow: "shadow-[0_0_30px_-5px_rgba(245,158,11,0.2)]",
        label: "Borderline",
        sublabel: "Could go either way — depends on your evidence",
        gradient: "from-amber-500/10 via-transparent to-transparent",
        trendIcon: TrendingUp,
      };
    case "skip":
      return {
        bg: "bg-red-50",
        border: "border-red-200",
        accent: "text-red-700",
        badgeBg: "bg-red-100 text-red-800 border-red-300",
        icon: ShieldX,
        iconColor: "text-red-500",
        glow: "shadow-[0_0_30px_-5px_rgba(239,68,68,0.2)]",
        label: "Skip This One",
        sublabel: "Low chance of winning — save your time",
        gradient: "from-red-500/10 via-transparent to-transparent",
        trendIcon: TrendingDown,
      };
  }
}

/* ── Parse AI explanation into structured sections ── */
interface AnalysisSections {
  verdict: string;
  strengthens: string[];
  weakens: string[];
  details: string;
  action: string;
}

function parseAnalysis(explanation: string): AnalysisSections {
  const lines = explanation.split("\n");
  const strengthens: string[] = [];
  const weakens: string[] = [];
  let verdict = "";
  let action = "";
  let details = "";
  let currentSection = "general";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (/why\s+\d+%/i.test(trimmed) || /win\s+probability/i.test(trimmed)) {
      // Extract the verdict line (strip markdown bold/heading markers)
      verdict = trimmed.replace(/^[#*\s]+/, "").replace(/\*\*/g, "");
      currentSection = "verdict";
      continue;
    }
    if (/strengthen/i.test(trimmed) || /evidence\s+assessment/i.test(trimmed)) {
      currentSection = "evidence";
      continue;
    }
    if (/recommended\s+action/i.test(trimmed)) {
      currentSection = "action";
      continue;
    }
    if (/instead.*focus/i.test(trimmed) || /prevention/i.test(trimmed)) {
      currentSection = "prevention";
      continue;
    }
    if (/the\s+problem/i.test(trimmed)) {
      currentSection = "problem";
      continue;
    }

    if (currentSection === "evidence") {
      const cleaned = trimmed.replace(/^[-*]\s*/, "").replace(/\*\*/g, "");
      if (/^✅|strengthen/i.test(cleaned)) {
        strengthens.push(cleaned.replace(/^✅\s*/, "").replace(/^strengthens?\s*case:\s*/i, ""));
      } else if (/^❌|weaken/i.test(cleaned)) {
        weakens.push(cleaned.replace(/^❌\s*/, "").replace(/^weakens?\s*case:\s*/i, ""));
      }
      continue;
    }
    if (currentSection === "action" || currentSection === "prevention") {
      const cleaned = trimmed.replace(/^[-*]\s*/, "").replace(/\*\*/g, "");
      if (cleaned) action += (action ? "\n" : "") + cleaned;
      continue;
    }
    if (currentSection === "problem") {
      const cleaned = trimmed.replace(/^[-*]\s*/, "").replace(/\*\*/g, "");
      details += (details ? "\n" : "") + cleaned;
      continue;
    }
    if (currentSection === "verdict" || currentSection === "general") {
      const cleaned = trimmed.replace(/^[-*]\s*/, "").replace(/\*\*/g, "");
      if (!verdict && cleaned) verdict = cleaned;
      else details += (details ? "\n" : "") + cleaned;
    }
  }

  return { verdict, strengthens, weakens, details, action };
}

/* ── Structured Analysis Display ── */
function AnalysisCards({
  analysis,
  theme,
  recommendation,
}: {
  analysis: DisputeAnalysis;
  theme: ReturnType<typeof getRecommendationTheme> | null;
  recommendation: Recommendation | null;
}) {
  const sections = parseAnalysis(analysis.explanation);

  return (
    <div className="space-y-4">
      {/* Verdict card */}
      {sections.verdict && (
        <motion.div
          className={`rounded-xl border p-5 ${
            theme ? `${theme.border} ${theme.bg}` : "border-border bg-card"
          }`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                theme ? theme.badgeBg : "bg-primary/10"
              }`}
            >
              <Scale className={`w-5 h-5 ${theme?.iconColor ?? "text-primary"}`} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Verdict
              </p>
              <p className="text-sm leading-relaxed text-foreground">
                {sections.verdict}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Evidence strength — two-column: helps / hurts */}
      {(sections.strengthens.length > 0 || sections.weakens.length > 0) && (
        <motion.div
          className="grid grid-cols-2 gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {/* Helps */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-3 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              Helps your case
            </p>
            {sections.strengthens.length > 0 ? (
              <ul className="space-y-2">
                {sections.strengthens.map((s, i) => (
                  <motion.li
                    key={i}
                    className="text-sm text-emerald-800 flex items-start gap-2"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.08 }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                    {s}
                  </motion.li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-emerald-600/60 italic">No supporting evidence found</p>
            )}
          </div>

          {/* Hurts */}
          <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-red-700 mb-3 flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5" />
              Hurts your case
            </p>
            {sections.weakens.length > 0 ? (
              <ul className="space-y-2">
                {sections.weakens.map((w, i) => (
                  <motion.li
                    key={i}
                    className="text-sm text-red-800 flex items-start gap-2"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.08 }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 mt-1.5" />
                    {w}
                  </motion.li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-red-600/60 italic">Nothing working against you</p>
            )}
          </div>
        </motion.div>
      )}

      {/* Details / Problem section */}
      {sections.details && (
        <motion.div
          className="rounded-xl border border-border bg-muted/30 p-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Target className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Key Details
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {sections.details}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Recommended Action */}
      {sections.action && (
        <motion.div
          className={`rounded-xl border p-5 ${
            recommendation === "fight"
              ? "border-emerald-200 bg-emerald-50/30"
              : recommendation === "skip"
                ? "border-red-200 bg-red-50/30"
                : "border-amber-200 bg-amber-50/30"
          }`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-start gap-3">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                recommendation === "fight"
                  ? "bg-emerald-100"
                  : recommendation === "skip"
                    ? "bg-red-100"
                    : "bg-amber-100"
              }`}
            >
              <Lightbulb
                className={`w-4 h-4 ${
                  recommendation === "fight"
                    ? "text-emerald-600"
                    : recommendation === "skip"
                      ? "text-red-600"
                      : "text-amber-600"
                }`}
              />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Recommended Action
              </p>
              <p className="text-sm leading-relaxed whitespace-pre-line">
                {sections.action}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Key factors + missing evidence pills */}
      {(analysis.key_factors.length > 0 || analysis.missing_evidence.length > 0) && (
        <motion.div
          className="flex flex-wrap gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {analysis.key_factors.map((f, i) => (
            <span
              key={`kf-${i}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
            >
              <Check className="w-3 h-3" />
              {f}
            </span>
          ))}
          {analysis.missing_evidence.map((e, i) => (
            <span
              key={`me-${i}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-medium"
            >
              <AlertTriangle className="w-3 h-3" />
              {evidenceTypeLabels[e] || e}
            </span>
          ))}
        </motion.div>
      )}
    </div>
  );
}

/* ── Letter ready notification ── */
function LetterReadyBanner({ onClick }: { onClick: () => void }) {
  return (
    <motion.div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 40, scale: 0.95 }}
    >
      <button
        onClick={onClick}
        className="flex items-center gap-3 px-5 py-3 rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/25 hover:shadow-primary/35 transition-shadow"
      >
        <Sparkles className="w-4 h-4" />
        <span className="font-medium text-sm">Response letter ready</span>
        <ArrowDown className="w-4 h-4 animate-bounce" />
      </button>
    </motion.div>
  );
}

export default function DisputeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const letterRef = useRef<HTMLDivElement>(null);
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [analysis, setAnalysis] = useState<DisputeAnalysis | null>(null);
  const [letter, setLetter] = useState<RepresentmentLetter | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [addEvidenceOpen, setAddEvidenceOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadPreselect, setUploadPreselect] = useState<string | undefined>(undefined);
  const [evidenceRefresh, setEvidenceRefresh] = useState(0);
  const [showLetterBanner, setShowLetterBanner] = useState(false);
  const [newEvidence, setNewEvidence] = useState({
    evidence_type: "customer_communication",
    title: "",
    description: "",
    content: "",
  });

  useEffect(() => {
    async function load() {
      try {
        const [d, ev] = await Promise.all([
          getDispute(id),
          listEvidence(id),
        ]);
        setDispute(d);
        setEvidence(ev);
      } catch {
        router.push("/dashboard");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, router]);

  async function handleAnalyze() {
    setAnalyzing(true);
    try {
      const result = await analyzeDispute(id);
      setAnalysis(result);
      const updated = await getDispute(id);
      setDispute(updated);
    } catch {
      // handle error
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const result = await generateResponse(id);
      setLetter(result);
      setShowLetterBanner(true);
      const updated = await getDispute(id);
      setDispute(updated);
    } catch {
      // handle error
    } finally {
      setGenerating(false);
    }
  }

  function scrollToLetter() {
    setShowLetterBanner(false);
    letterRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleSkip() {
    try {
      const updated = await skipDispute(id);
      setDispute(updated);
    } catch {
      // handle error
    }
  }

  async function handleSubmit() {
    try {
      const updated = await submitResponse(id);
      setDispute(updated);
    } catch {
      // handle error
    }
  }

  async function handleAddEvidence() {
    try {
      const ev = await addEvidence(id, newEvidence);
      setEvidence((prev) => [...prev, ev]);
      setEvidenceRefresh((n) => n + 1);
      setAddEvidenceOpen(false);
      setNewEvidence({
        evidence_type: "customer_communication",
        title: "",
        description: "",
        content: "",
      });
    } catch {
      // handle error
    }
  }

  function handleCopyLetter() {
    if (letter) {
      navigator.clipboard.writeText(letter.letter_text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function deriveRecommendation(d: Dispute): Recommendation | null {
    if (analysis?.recommendation) return analysis.recommendation;
    const wp = d.win_probability;
    if (wp === null) return null;
    if (wp >= 0.45) return "fight";
    if (wp >= 0.25) return "borderline";
    return "skip";
  }

  if (loading || !dispute) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const recommendation = deriveRecommendation(dispute);
  const theme = recommendation ? getRecommendationTheme(recommendation) : null;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Letter-ready floating banner */}
      <AnimatePresence>
        {showLetterBanner && <LetterReadyBanner onClick={scrollToLetter} />}
      </AnimatePresence>

      {/* Back */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to disputes
      </Link>

      {/* Header card */}
      <motion.div
        className={`rounded-2xl border p-6 mb-8 transition-all duration-700 ${
          theme
            ? `${theme.border} ${theme.bg} ${theme.glow}`
            : "border-border bg-card"
        }`}
        layout
      >
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-3xl font-bold">
                {formatCurrency(dispute.amount, dispute.currency)}
              </h1>
              <Badge
                variant={
                  dispute.status === "won"
                    ? "default"
                    : dispute.status === "lost" ||
                        dispute.status === "needs_response"
                      ? "destructive"
                      : "secondary"
                }
              >
                {dispute.status.replace("_", " ")}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground mb-3">
              <span className="flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" />
                {dispute.reason_label || dispute.reason.replace("_", " ")}
                {dispute.network && (
                  <span className="capitalize">({dispute.network})</span>
                )}
              </span>
              {dispute.customer_name && (
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  {dispute.customer_name}
                </span>
              )}
              {dispute.customer_email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  {dispute.customer_email}
                </span>
              )}
              {dispute.evidence_due_by && (() => {
                const hours = (new Date(dispute.evidence_due_by).getTime() - Date.now()) / (1000 * 60 * 60);
                const urgent = hours > 0 && hours <= 48;
                const expired = hours <= 0;
                return (
                  <span className={`flex items-center gap-1.5 ${
                    expired ? "text-red-600 font-semibold" : urgent ? "text-red-600 font-semibold" : ""
                  }`}>
                    {urgent ? (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                      </span>
                    ) : (
                      <Clock className="w-3.5 h-3.5" />
                    )}
                    {expired ? "Deadline passed" : `Due ${formatDate(dispute.evidence_due_by)}`}
                  </span>
                );
              })()}
            </div>

            {dispute.reason_description && (
              <p className="text-sm text-muted-foreground/70 max-w-xl leading-relaxed">
                {dispute.reason_description}
              </p>
            )}
          </div>

          {(dispute.win_probability !== null || analysis) && (
            <div className="shrink-0 flex flex-col items-center gap-1">
              <WinGauge
                probability={
                  analysis?.win_probability ?? dispute.win_probability ?? 0
                }
                size={140}
              />
            </div>
          )}
        </div>

        <AnimatePresence>
          {theme && recommendation && (
            <motion.div
              className={`mt-5 pt-5 border-t ${theme.border} flex items-center gap-3`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <div
                className={`w-10 h-10 rounded-xl ${theme.badgeBg} border flex items-center justify-center`}
              >
                <theme.icon className={`w-5 h-5 ${theme.iconColor}`} />
              </div>
              <div>
                <p className={`font-semibold ${theme.accent}`}>
                  {theme.label}
                </p>
                <p className="text-sm text-muted-foreground">
                  {theme.sublabel}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Action buttons */}
      {dispute.status === "needs_response" && (
        <div className="flex flex-wrap gap-3 mb-6">
          <Button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="glow-primary"
          >
            {analyzing ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Brain className="w-4 h-4 mr-2" />
            )}
            {analyzing ? "Analysing..." : "Analyse dispute"}
          </Button>

          {(analysis || dispute.win_probability !== null) && (
            <Button
              onClick={handleGenerate}
              disabled={generating}
              variant="secondary"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              {generating ? "Generating..." : "Generate response"}
            </Button>
          )}

          <Button onClick={handleSkip} variant="ghost">
            <SkipForward className="w-4 h-4 mr-2" />
            Skip
          </Button>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left column: Analysis + Letter */}
        <div className="md:col-span-2 space-y-6">
          {/* AI Analysis — structured cards */}
          <AnimatePresence>
            {analysis && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles
                    className={`w-4 h-4 ${theme?.iconColor ?? "text-primary"}`}
                  />
                  <h3 className="font-semibold">AI Analysis</h3>
                </div>
                <AnalysisCards
                  analysis={analysis}
                  theme={theme}
                  recommendation={recommendation}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Fallback: stored explanation (no fresh analysis) */}
          <AnimatePresence>
            {!analysis && dispute.win_explanation && (
              <motion.div
                className="rounded-2xl border border-border overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="h-1 bg-gradient-to-r from-primary to-blue-600" />
                <div className="p-6 bg-card">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold">AI Analysis</h3>
                  </div>
                  <div className="prose prose-sm max-w-none prose-p:text-muted-foreground prose-p:leading-relaxed prose-strong:text-foreground">
                    <ReactMarkdown>
                      {dispute.win_explanation}
                    </ReactMarkdown>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Generated Response */}
          <AnimatePresence>
            {letter && (
              <motion.div
                ref={letterRef}
                className="rounded-2xl border border-primary/30 overflow-hidden shadow-lg shadow-primary/5"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
              >
                <div className="h-1.5 bg-gradient-to-r from-primary via-blue-500 to-violet-500" />
                <div className="p-6 bg-card">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Representment Letter</h3>
                        <p className="text-xs text-muted-foreground">Ready to submit</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyLetter}
                      >
                        {copied ? (
                          <>
                            <CheckCheck className="w-4 h-4 text-emerald-600 mr-1" />
                            <span className="text-xs text-emerald-600">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-1" />
                            <span className="text-xs">Copy</span>
                          </>
                        )}
                      </Button>
                      {dispute.status === "needs_response" && (
                        <Button size="sm" onClick={handleSubmit}>
                          <Send className="w-4 h-4 mr-1" />
                          Submit to Stripe
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/20 p-5">
                    <div className="prose prose-sm max-w-none prose-p:text-muted-foreground prose-p:leading-relaxed prose-strong:text-foreground prose-headings:text-foreground">
                      <ReactMarkdown>{letter.letter_text}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right column: Evidence Guide + Evidence */}
        <div className="space-y-4">
          {dispute.status === "needs_response" && (
            <EvidenceChecklist
              disputeId={id}
              refreshTrigger={evidenceRefresh}
              onUploadClick={(evidenceType) => {
                setUploadPreselect(evidenceType);
                setUploadOpen(true);
              }}
            />
          )}

          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
              Evidence ({evidence.length})
            </h3>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setUploadOpen(true)}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium h-8 w-8 hover:bg-accent hover:text-accent-foreground transition-colors"
                title="Upload file"
              >
                <Upload className="w-4 h-4" />
              </button>
              <Dialog open={addEvidenceOpen} onOpenChange={setAddEvidenceOpen}>
                <DialogTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium h-8 w-8 hover:bg-accent hover:text-accent-foreground transition-colors" title="Add text evidence">
                  <Plus className="w-4 h-4" />
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Evidence</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>Type</Label>
                    <select
                      className="w-full mt-1 h-10 rounded-md border border-input bg-muted/50 px-3 text-sm"
                      value={newEvidence.evidence_type}
                      onChange={(e) =>
                        setNewEvidence({
                          ...newEvidence,
                          evidence_type: e.target.value,
                        })
                      }
                    >
                      {Object.entries(evidenceTypeLabels).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Title</Label>
                    <Input
                      className="mt-1 bg-muted/50"
                      placeholder="e.g. FedEx tracking confirmation"
                      value={newEvidence.title}
                      onChange={(e) =>
                        setNewEvidence({
                          ...newEvidence,
                          title: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input
                      className="mt-1 bg-muted/50"
                      placeholder="Brief description"
                      value={newEvidence.description}
                      onChange={(e) =>
                        setNewEvidence({
                          ...newEvidence,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Content</Label>
                    <textarea
                      className="w-full mt-1 min-h-[100px] rounded-md border border-input bg-muted/50 px-3 py-2 text-sm"
                      placeholder="Paste the evidence content here..."
                      value={newEvidence.content}
                      onChange={(e) =>
                        setNewEvidence({
                          ...newEvidence,
                          content: e.target.value,
                        })
                      }
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleAddEvidence}
                    disabled={!newEvidence.title}
                  >
                    Add evidence
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            </div>
          </div>

          <EvidenceUpload
            disputeId={id}
            open={uploadOpen}
            onOpenChange={(open) => {
              setUploadOpen(open);
              if (!open) setUploadPreselect(undefined);
            }}
            onUploaded={(ev) => {
              setEvidence((prev) => [...prev, ev]);
              setEvidenceRefresh((n) => n + 1);
            }}
            defaultEvidenceType={uploadPreselect}
          />

          {evidence.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center">
              <FileText className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No evidence yet. Add evidence to strengthen your case.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {evidence.map((ev, i) => (
                <motion.div
                  key={ev.id}
                  className="rounded-lg border border-border bg-card/50 p-3"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      {ev.stripe_file_id ? (
                        <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          {ev.file_name?.match(/\.(png|jpg|jpeg|gif)$/i) ? (
                            <Image className="w-3.5 h-3.5 text-primary" />
                          ) : (
                            <Paperclip className="w-3.5 h-3.5 text-primary" />
                          )}
                        </div>
                      ) : null}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{ev.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {evidenceTypeLabels[ev.evidence_type] ||
                            ev.evidence_type}
                        </p>
                        {ev.file_name && (
                          <p className="text-xs text-muted-foreground/70 truncate mt-0.5">
                            {ev.file_name}
                            {ev.file_size ? ` (${(ev.file_size / 1024).toFixed(0)} KB)` : ""}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {ev.source === "stripe_auto"
                        ? "Auto"
                        : ev.stripe_file_id
                          ? "File"
                          : "Manual"}
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
