"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  X,
  FileText,
  Image,
  File,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { uploadEvidence } from "@/lib/api";
import type { Evidence } from "@/lib/types";

const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "application/pdf",
  "text/plain",
];
const MAX_SIZE_MB = 20;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const evidenceTypeOptions: { value: string; label: string }[] = [
  { value: "receipt", label: "Receipt" },
  { value: "screenshot", label: "Screenshot" },
  { value: "customer_communication", label: "Customer Communication" },
  { value: "customer_signature", label: "Customer Signature" },
  { value: "delivery_confirmation", label: "Delivery Confirmation" },
  { value: "shipping_tracking", label: "Shipping Tracking" },
  { value: "refund_policy", label: "Refund Policy" },
  { value: "custom_document", label: "Custom Document" },
];

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return Image;
  if (type === "application/pdf") return FileText;
  return File;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface EvidenceUploadProps {
  disputeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded: (evidence: Evidence) => void;
  defaultEvidenceType?: string;
}

export function EvidenceUpload({
  disputeId,
  open,
  onOpenChange,
  onUploaded,
  defaultEvidenceType,
}: EvidenceUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [evidenceType, setEvidenceType] = useState(defaultEvidenceType || "receipt");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (defaultEvidenceType) {
      setEvidenceType(defaultEvidenceType);
    }
  }, [defaultEvidenceType]);

  function reset() {
    setFile(null);
    setTitle("");
    setDescription("");
    setEvidenceType("receipt");
    setError(null);
    setSuccess(false);
  }

  function validateFile(f: File): string | null {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      return `File type not supported. Accepted: PNG, JPG, GIF, PDF, TXT.`;
    }
    if (f.size > MAX_SIZE_BYTES) {
      return `File too large (${formatFileSize(f.size)}). Maximum: ${MAX_SIZE_MB}MB.`;
    }
    return null;
  }

  function handleFileSelect(f: File) {
    const err = validateFile(f);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setFile(f);
    if (!title) {
      setTitle(f.name.replace(/\.[^.]+$/, ""));
    }
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFileSelect(dropped);
    },
    [title],
  );

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) handleFileSelect(selected);
  }

  async function handleUpload() {
    if (!file || !title) return;

    setUploading(true);
    setError(null);

    try {
      const result = await uploadEvidence(disputeId, {
        file,
        evidence_type: evidenceType,
        title,
        description: description || undefined,
      });
      setSuccess(true);
      onUploaded(result);
      setTimeout(() => {
        reset();
        onOpenChange(false);
      }, 1200);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Upload failed. Please try again.";
      setError(message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Evidence File</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => inputRef.current?.click()}
            className={`relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200 ${
              dragOver
                ? "border-primary bg-primary/5 scale-[1.02]"
                : file
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept=".png,.jpg,.jpeg,.gif,.pdf,.txt"
              onChange={handleInputChange}
            />

            <AnimatePresence mode="wait">
              {file ? (
                <motion.div
                  key="file-selected"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col items-center gap-2"
                >
                  {(() => {
                    const IconComp = getFileIcon(file.type);
                    return (
                      <IconComp className="w-8 h-8 text-emerald-600" />
                    );
                  })()}
                  <p className="text-sm font-medium text-emerald-800">
                    {file.name}
                  </p>
                  <p className="text-xs text-emerald-600">
                    {formatFileSize(file.size)}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      setError(null);
                    }}
                    className="absolute top-3 right-3 p-1 rounded-full hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="dropzone"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-2"
                >
                  <Upload
                    className={`w-8 h-8 ${dragOver ? "text-primary" : "text-muted-foreground/50"}`}
                  />
                  <p className="text-sm font-medium text-muted-foreground">
                    Drop a file here or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    PNG, JPG, GIF, PDF, or TXT up to {MAX_SIZE_MB}MB
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Evidence type */}
          <div>
            <Label>Evidence Type</Label>
            <select
              className="w-full mt-1 h-10 rounded-md border border-input bg-muted/50 px-3 text-sm"
              value={evidenceType}
              onChange={(e) => setEvidenceType(e.target.value)}
            >
              {evidenceTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <Label>Title</Label>
            <Input
              className="mt-1 bg-muted/50"
              placeholder="e.g. Delivery receipt photo"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description (optional) */}
          <div>
            <Label>
              Description <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              className="mt-1 bg-muted/50"
              placeholder="Brief description of this evidence"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Upload button */}
          <Button
            className="w-full"
            onClick={handleUpload}
            disabled={!file || !title || uploading || success}
          >
            {success ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-300" />
                Uploaded
              </>
            ) : uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading to Stripe...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Evidence
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
