"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Shield, Check, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { connectStripe } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      setStatus("error");
      setErrorMsg("No authorization code received from Stripe.");
      return;
    }

    async function exchange() {
      try {
        await connectStripe(code!);
        await refreshUser();
        setStatus("success");
        setTimeout(() => router.push("/onboarding"), 2000);
      } catch (err) {
        setStatus("error");
        setErrorMsg(err instanceof Error ? err.message : "Failed to connect Stripe account.");
      }
    }

    exchange();
  }, [searchParams, refreshUser, router]);

  return (
    <motion.div
      className="max-w-sm text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-center mb-6">
        <Shield className="w-8 h-8 text-primary" />
      </div>

      {status === "loading" && (
        <div className="space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <h2 className="text-xl font-semibold text-foreground">
            Connecting your Stripe account...
          </h2>
          <p className="text-sm text-muted-foreground">
            This will only take a moment.
          </p>
        </div>
      )}

      {status === "success" && (
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <motion.div
            className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <Check className="w-8 h-8 text-emerald-600" />
          </motion.div>
          <h2 className="text-xl font-semibold text-foreground">
            Stripe connected!
          </h2>
          <p className="text-sm text-muted-foreground">
            We&apos;re monitoring your account for chargebacks. Redirecting you back...
          </p>
        </motion.div>
      )}

      {status === "error" && (
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            Connection failed
          </h2>
          <p className="text-sm text-muted-foreground">{errorMsg}</p>
          <Button onClick={() => router.push("/settings")} variant="secondary">
            Go to settings
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}

export default function StripeCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-background">
      <Suspense
        fallback={
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        }
      >
        <CallbackHandler />
      </Suspense>
    </div>
  );
}
