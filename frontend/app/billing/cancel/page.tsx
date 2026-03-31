"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Shield, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BillingCancelPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-background">
      <motion.div
        className="max-w-sm text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-center mb-6">
          <Shield className="w-8 h-8 text-primary" />
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-3">
          No worries
        </h1>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          You can upgrade anytime from Settings when you&apos;re ready.
          Your free trial continues — no chargebacks left behind.
        </p>

        <div className="flex flex-col gap-3">
          <Button onClick={() => router.push("/dashboard")} className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to dashboard
          </Button>
          <button
            onClick={() => router.push("/settings")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Go to settings
          </button>
        </div>
      </motion.div>
    </div>
  );
}
