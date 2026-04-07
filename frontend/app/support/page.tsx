"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Shield,
  Mail,
  Bug,
  Lightbulb,
  MessageCircle,
  ArrowLeft,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const faqs = [
  {
    q: "How does DisputeShield work?",
    a: "Connect your Stripe account, and we automatically import chargebacks. Our AI analyses each dispute, scores your win probability, and generates a professional response letter.",
  },
  {
    q: "Is my Stripe data safe?",
    a: "We use read-only access to pull dispute and transaction data. We never touch your funds, and you can revoke access at any time from Settings.",
  },
  {
    q: "What does the win probability score mean?",
    a: "It's an AI-generated estimate of how likely you are to win the dispute based on the reason code, your evidence strength, and historical patterns. Green (70%+) means fight, red (below 30%) means it's probably not worth your time.",
  },
  {
    q: "How much does it cost?",
    a: "DisputeShield is completely free during our beta. We'll notify all users before introducing paid plans, and early adopters will get a special deal.",
  },
  {
    q: "How do I submit evidence to Stripe?",
    a: "Once you've reviewed the AI analysis and generated response, click 'Submit to Stripe' on the dispute detail page. We handle the evidence formatting and submission.",
  },
];

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <span className="font-bold text-lg text-foreground">DisputeShield</span>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl font-bold text-foreground mb-4">How can we help?</h1>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto">
            We&apos;re a small team and we read every message. Reach out anytime.
          </p>
        </motion.div>

        {/* Contact options */}
        <div className="grid md:grid-cols-3 gap-5 mb-16">
          {[
            {
              icon: Bug,
              title: "Report a bug",
              description: "Something broken? Let us know and we'll fix it fast.",
              color: "bg-red-50 text-red-600",
            },
            {
              icon: Lightbulb,
              title: "Request a feature",
              description: "Got an idea that would make DisputeShield better?",
              color: "bg-amber-50 text-amber-600",
            },
            {
              icon: MessageCircle,
              title: "General support",
              description: "Questions about your account, disputes, or anything else.",
              color: "bg-blue-50 text-blue-600",
            },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.1 }}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${item.color}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">{item.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Email CTA */}
        <motion.div
          className="rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Mail className="w-8 h-8 text-primary mx-auto mb-3" />
          <h2 className="text-xl font-bold text-foreground mb-2">Email us directly</h2>
          <a
            href="mailto:support@disputeshield.com"
            className="text-primary text-lg font-medium hover:underline"
          >
            support@disputeshield.com
          </a>
          <div className="flex items-center justify-center gap-1 mt-3 text-sm text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            We typically respond within a few hours
          </div>
        </motion.div>

        {/* FAQs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
            Frequently asked questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-card p-5"
              >
                <h3 className="font-semibold text-foreground mb-2">{faq.q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
