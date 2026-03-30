"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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

  if (loading || !dispute) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

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

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
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

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5" />
              {dispute.reason_label || dispute.reason.replace("_", " ")}
              {dispute.network && (
                <span className="capitalize ml-1">({dispute.network})</span>
              )}
            </span>
            {dispute.customer_name && (
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                {dispute.customer_name}
              </span>
            )}
            {dispute.customer_email && (
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" />
                {dispute.customer_email}
              </span>
            )}
            {dispute.evidence_due_by && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Due {formatDate(dispute.evidence_due_by)}
              </span>
            )}
          </div>

          {/* Plain English explanation of what this dispute means */}
          {dispute.reason_description && (
            <p className="text-sm text-muted-foreground/80 mt-3 max-w-xl leading-relaxed">
              {dispute.reason_description}
            </p>
          )}
        </div>

        {/* Win probability gauge */}
        {(dispute.win_probability !== null || analysis) && (
          <WinGauge
            probability={analysis?.win_probability ?? dispute.win_probability ?? 0}
            size={140}
          />
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left column: Actions + Analysis */}
        <div className="md:col-span-2 space-y-6">
          {/* Action buttons */}
          {dispute.status === "needs_response" && (
            <div className="flex flex-wrap gap-3">
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

          {/* AI Analysis */}
          <AnimatePresence>
            {(analysis || dispute.win_explanation) && (
              <motion.div
                className="rounded-xl border border-border bg-card p-6 noise"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold">AI Analysis</h3>
                </div>

                {analysis && (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <Badge
                        variant={
                          analysis.recommendation === "fight"
                            ? "default"
                            : analysis.recommendation === "skip"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        Recommendation:{" "}
                        {analysis.recommendation.toUpperCase()}
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                      {analysis.explanation}
                    </p>

                    {analysis.key_factors.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                          Key Factors
                        </h4>
                        <ul className="space-y-1">
                          {analysis.key_factors.map((f, i) => (
                            <li
                              key={i}
                              className="text-sm flex items-start gap-2"
                            >
                              <Check className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {analysis.missing_evidence.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                          Missing Evidence
                        </h4>
                        <ul className="space-y-1">
                          {analysis.missing_evidence.map((e, i) => (
                            <li
                              key={i}
                              className="text-sm flex items-start gap-2 text-amber-400"
                            >
                              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                              {evidenceTypeLabels[e] || e}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}

                {!analysis && dispute.win_explanation && (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {dispute.win_explanation}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Generated Response */}
          <AnimatePresence>
            {letter && (
              <motion.div
                className="rounded-xl border border-border bg-card p-6 noise"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
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
                        <CheckCheck className="w-4 h-4 text-win" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                    {dispute.status === "needs_response" && (
                      <Button size="sm" onClick={handleSubmit}>
                        <Send className="w-4 h-4 mr-1" />
                        Submit
                      </Button>
                    )}
                  </div>
                </div>
                <div className="prose prose-sm prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-sans leading-relaxed bg-transparent border-0 p-0">
                    {letter.letter_text}
                  </pre>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right column: Evidence */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
              Evidence ({evidence.length})
            </h3>
            <Dialog open={addEvidenceOpen} onOpenChange={setAddEvidenceOpen}>
              <DialogTrigger
                className="inline-flex items-center justify-center rounded-md text-sm font-medium h-8 w-8 hover:bg-accent hover:text-accent-foreground transition-colors"
              >
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
                    <div>
                      <p className="text-sm font-medium">{ev.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {evidenceTypeLabels[ev.evidence_type] ||
                          ev.evidence_type}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {ev.source === "stripe_auto" ? "Auto" : "Manual"}
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
