"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Upload,
  MapPin,
  AlertTriangle,
  Star,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getEvidenceGuide } from "@/lib/api";
import type { EvidenceGuide, EvidenceGuideItem } from "@/lib/types";

interface EvidenceChecklistProps {
  disputeId: string;
  onUploadClick: (evidenceType: string) => void;
  refreshTrigger: number;
}

export function EvidenceChecklist({
  disputeId,
  onUploadClick,
  refreshTrigger,
}: EvidenceChecklistProps) {
  const [guide, setGuide] = useState<EvidenceGuide | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getEvidenceGuide(disputeId);
        setGuide(data);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [disputeId, refreshTrigger]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!guide || guide.items.length === 0) {
    return null;
  }

  const required = guide.items.filter((i) => i.priority === "required");
  const recommended = guide.items.filter((i) => i.priority === "recommended");
  const collectedCount = guide.items.filter((i) => i.collected).length;
  const totalCount = guide.items.length;
  const progress = totalCount > 0 ? (collectedCount / totalCount) * 100 : 0;

  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <div className="p-5 bg-card border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
            Evidence Checklist
          </h3>
          <span className="text-xs text-muted-foreground">
            {collectedCount}/{totalCount} collected
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${
              progress === 100
                ? "bg-emerald-500"
                : progress >= 50
                  ? "bg-primary"
                  : "bg-amber-500"
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      </div>

      <div className="divide-y divide-border">
        {/* Required section */}
        {required.length > 0 && (
          <div>
            <div className="px-5 py-2.5 bg-red-50/50">
              <span className="text-xs font-semibold text-red-700 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" />
                Required
              </span>
            </div>
            {required.map((item) => (
              <ChecklistItem
                key={item.evidence_type}
                item={item}
                expanded={expandedItem === item.evidence_type}
                onToggle={() =>
                  setExpandedItem(
                    expandedItem === item.evidence_type
                      ? null
                      : item.evidence_type,
                  )
                }
                onUpload={() => onUploadClick(item.evidence_type)}
              />
            ))}
          </div>
        )}

        {/* Recommended section */}
        {recommended.length > 0 && (
          <div>
            <div className="px-5 py-2.5 bg-blue-50/50">
              <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                <Star className="w-3 h-3" />
                Recommended
              </span>
            </div>
            {recommended.map((item) => (
              <ChecklistItem
                key={item.evidence_type}
                item={item}
                expanded={expandedItem === item.evidence_type}
                onToggle={() =>
                  setExpandedItem(
                    expandedItem === item.evidence_type
                      ? null
                      : item.evidence_type,
                  )
                }
                onUpload={() => onUploadClick(item.evidence_type)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ChecklistItem({
  item,
  expanded,
  onToggle,
  onUpload,
}: {
  item: EvidenceGuideItem;
  expanded: boolean;
  onToggle: () => void;
  onUpload: () => void;
}) {
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-5 py-3.5 flex items-center gap-3 hover:bg-muted/30 transition-colors text-left"
      >
        {item.collected ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
        ) : (
          <Circle
            className={`w-5 h-5 shrink-0 ${
              item.priority === "required"
                ? "text-red-400"
                : "text-muted-foreground/40"
            }`}
          />
        )}
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-medium ${
              item.collected ? "text-muted-foreground line-through" : ""
            }`}
          >
            {item.label}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {item.description}
          </p>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 pl-13 space-y-3">
              {/* Why it matters */}
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Why it matters
                </p>
                <p className="text-sm text-foreground">
                  {item.why_it_matters}
                </p>
              </div>

              {/* Where to find */}
              <div className="rounded-lg bg-blue-50 border border-blue-100 p-3">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  Where to find it
                </p>
                <p className="text-sm text-blue-900">
                  {item.where_to_find}
                </p>
              </div>

              {/* Upload action */}
              {!item.collected && (
                <Button
                  size="sm"
                  variant={item.accepts_file ? "default" : "secondary"}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpload();
                  }}
                  className="w-full"
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  {item.accepts_file
                    ? `Upload ${item.label}`
                    : `Add ${item.label}`}
                </Button>
              )}

              {item.collected && (
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                  Collected
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
