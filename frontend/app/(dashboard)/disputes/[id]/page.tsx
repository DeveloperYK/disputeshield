"use client";

import { useEffect, useState, use } from "react";
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

export default function DisputeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
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
      const updated = await getDispute(id);
      setDispute(updated);
    } catch {
      // handle error
    } finally {
      setGenerating(false);
    }
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

  // Derive recommendation from analysis or stored win_probability
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

          {/* Win probability gauge — properly spaced */}
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

        {/* Recommendation banner — appears after analysis */}
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
          {/* AI Analysis */}
          <AnimatePresence>
            {(analysis || dispute.win_explanation) && (
              <motion.div
                className={`rounded-2xl border overflow-hidden ${
                  theme ? `${theme.border}` : "border-border"
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
              >
                {/* Gradient top strip */}
                <div
                  className={`h-1 ${
                    recommendation === "fight"
                      ? "bg-gradient-to-r from-emerald-400 to-emerald-600"
                      : recommendation === "borderline"
                        ? "bg-gradient-to-r from-amber-400 to-amber-600"
                        : "bg-gradient-to-r from-red-400 to-red-600"
                  }`}
                />

                <div className="p-6 bg-card">
                  <div className="flex items-center gap-2 mb-5">
                    <Sparkles
                      className={`w-4 h-4 ${theme?.iconColor ?? "text-primary"}`}
                    />
                    <h3 className="font-semibold">AI Analysis</h3>
                  </div>

                  {analysis && (
                    <div className="space-y-5">
                      {/* Rendered markdown explanation */}
                      <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-headings:font-semibold prose-headings:text-base prose-p:text-muted-foreground prose-p:leading-relaxed prose-li:text-muted-foreground prose-strong:text-foreground prose-ul:my-2 prose-li:my-0.5">
                        <ReactMarkdown>{analysis.explanation}</ReactMarkdown>
                      </div>

                      {/* Key Factors */}
                      {analysis.key_factors.length > 0 && (
                        <div className="rounded-xl bg-muted/30 border border-border/50 p-4">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                            Key Factors
                          </h4>
                          <ul className="space-y-2">
                            {analysis.key_factors.map((f, i) => (
                              <motion.li
                                key={i}
                                className="text-sm flex items-start gap-2"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 * i }}
                              >
                                <Check
                                  className={`w-4 h-4 mt-0.5 shrink-0 ${theme?.iconColor ?? "text-primary"}`}
                                />
                                <span>{f}</span>
                              </motion.li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Missing Evidence */}
                      {analysis.missing_evidence.length > 0 && (
                        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
                          <h4 className="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-3">
                            Missing Evidence
                          </h4>
                          <ul className="space-y-2">
                            {analysis.missing_evidence.map((e, i) => (
                              <motion.li
                                key={i}
                                className="text-sm flex items-start gap-2 text-amber-800"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 * i }}
                              >
                                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                                <span>
                                  {evidenceTypeLabels[e] || e}
                                </span>
                              </motion.li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {!analysis && dispute.win_explanation && (
                    <div className="prose prose-sm max-w-none prose-p:text-muted-foreground prose-p:leading-relaxed prose-strong:text-foreground">
                      <ReactMarkdown>
                        {dispute.win_explanation}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Generated Response */}
          <AnimatePresence>
            {letter && (
              <motion.div
                className="rounded-2xl border border-border overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
              >
                <div className="h-1 bg-gradient-to-r from-primary to-blue-600" />
                <div className="p-6 bg-card">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      <h3 className="font-semibold">Representment Letter</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyLetter}
                      >
                        {copied ? (
                          <CheckCheck className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
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
                  <div className="prose prose-sm max-w-none prose-p:text-muted-foreground prose-p:leading-relaxed prose-strong:text-foreground prose-headings:text-foreground">
                    <ReactMarkdown>{letter.letter_text}</ReactMarkdown>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right column: Evidence Guide + Evidence */}
        <div className="space-y-4">
          {/* Guided evidence checklist */}
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

          {/* File upload dialog */}
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
