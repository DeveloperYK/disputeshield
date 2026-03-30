"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Clock,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  SkipForward,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { WinGaugeMini } from "./win-gauge";
import type { Dispute } from "@/lib/types";

function formatCurrency(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function getTimeLeft(dueDate: string | null): string | null {
  if (!dueDate) return null;
  const now = new Date();
  const due = new Date(dueDate);
  const diff = due.getTime() - now.getTime();
  if (diff <= 0) return "Expired";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Due today";
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

function getTimeLeftColor(dueDate: string | null): string {
  if (!dueDate) return "text-muted-foreground";
  const now = new Date();
  const due = new Date(dueDate);
  const days = Math.floor(
    (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (days <= 0) return "text-destructive";
  if (days <= 3) return "text-orange-600";
  if (days <= 7) return "text-amber-600";
  return "text-muted-foreground";
}

const statusConfig: Record<
  string,
  {
    label: string;
    icon: typeof Clock;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  needs_response: {
    label: "Needs Response",
    icon: AlertTriangle,
    variant: "destructive",
  },
  under_review: {
    label: "Under Review",
    icon: Clock,
    variant: "secondary",
  },
  response_submitted: {
    label: "Submitted",
    icon: CheckCircle2,
    variant: "outline",
  },
  won: { label: "Won", icon: CheckCircle2, variant: "default" },
  lost: { label: "Lost", icon: XCircle, variant: "destructive" },
  skipped: { label: "Skipped", icon: SkipForward, variant: "secondary" },
};

interface DisputeCardProps {
  dispute: Dispute;
  index: number;
}

export function DisputeCard({ dispute, index }: DisputeCardProps) {
  const config = statusConfig[dispute.status] || statusConfig.needs_response;
  const StatusIcon = config.icon;
  const timeLeft = getTimeLeft(dispute.evidence_due_by);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Link href={`/disputes/${dispute.id}`}>
        <div className="group rounded-xl border border-border bg-card p-5 hover:border-primary/30 hover:shadow-elevated transition-all duration-200 cursor-pointer">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xl font-bold text-foreground">
                  {formatCurrency(dispute.amount, dispute.currency)}
                </span>
                <Badge variant={config.variant} className="text-xs">
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {config.label}
                </Badge>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5" />
                  {dispute.reason_label || dispute.reason.replace("_", " ")}
                </span>
                {dispute.network && (
                  <span className="capitalize">{dispute.network}</span>
                )}
                {dispute.customer_name && (
                  <span className="truncate">{dispute.customer_name}</span>
                )}
              </div>

              {timeLeft && dispute.status === "needs_response" && (
                <div
                  className={`flex items-center gap-1 text-sm mt-2 ${getTimeLeftColor(dispute.evidence_due_by)}`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  {timeLeft}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {dispute.win_probability !== null && (
                <WinGaugeMini probability={dispute.win_probability} />
              )}
              <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
