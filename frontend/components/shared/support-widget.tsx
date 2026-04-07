"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircleQuestion,
  X,
  Bug,
  Lightbulb,
  Mail,
  Send,
  Loader2,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

type MessageType = "bug" | "feature" | "general";

export function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<MessageType | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    if (!message.trim() || !type) return;
    setSending(true);
    try {
      const token = localStorage.getItem("token");
      await fetch(`${API_URL}/support/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          type,
          message,
          page_url: window.location.href,
        }),
      });
      setSent(true);
      setTimeout(() => {
        setSent(false);
        setType(null);
        setMessage("");
        setOpen(false);
      }, 2000);
    } catch {
      // silently fail
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center"
        title="Help & Feedback"
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircleQuestion className="w-5 h-5" />}
      </button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 right-6 z-50 w-[360px] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
          >
            <div className="p-5">
              <h3 className="font-semibold text-foreground mb-1">Help & Feedback</h3>
              <p className="text-xs text-muted-foreground mb-4">
                We read every message and respond quickly.
              </p>

              {sent ? (
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="flex flex-col items-center py-8"
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                    <Check className="w-6 h-6 text-emerald-600" />
                  </div>
                  <p className="font-medium text-foreground">Message sent!</p>
                  <p className="text-xs text-muted-foreground mt-1">We&apos;ll get back to you soon.</p>
                </motion.div>
              ) : !type ? (
                <div className="space-y-2">
                  {[
                    { key: "bug" as const, icon: Bug, label: "Report a bug", desc: "Something isn't working right" },
                    { key: "feature" as const, icon: Lightbulb, label: "Request a feature", desc: "Tell us what you need" },
                    { key: "general" as const, icon: Mail, label: "General message", desc: "Questions, feedback, anything" },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setType(opt.key)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all text-left"
                    >
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <opt.icon className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.desc}</p>
                      </div>
                    </button>
                  ))}

                  <div className="pt-3 border-t border-border mt-3">
                    <p className="text-xs text-muted-foreground">
                      Or email us directly at{" "}
                      <a href="mailto:support@disputeshield.com" className="text-primary hover:underline">
                        support@disputeshield.com
                      </a>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={() => setType(null)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    &larr; Back
                  </button>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={
                      type === "bug"
                        ? "What happened? What did you expect?"
                        : type === "feature"
                          ? "What would you like us to build?"
                          : "How can we help?"
                    }
                    className="w-full h-32 rounded-xl border border-border bg-background p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    autoFocus
                  />
                  <Button
                    onClick={handleSubmit}
                    disabled={!message.trim() || sending}
                    className="w-full"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Send message
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
