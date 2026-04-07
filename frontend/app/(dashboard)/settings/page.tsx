"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Settings,
  Link2,
  Sparkles,
  Loader2,
  Check,
  ExternalLink,
  Unlink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import {
  getConnectUrl,
  disconnectStripe,
} from "@/lib/api";

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  async function handleConnect() {
    setConnecting(true);
    try {
      const { url } = await getConnectUrl();
      window.location.href = url;
    } catch {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await disconnectStripe();
      await refreshUser();
    } catch {
      // handle error
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your account and integrations
        </p>
      </div>

      {/* Account */}
      <motion.section
        className="rounded-xl border border-border bg-card p-6 mb-6 shadow-card"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="font-semibold mb-4 flex items-center gap-2 text-foreground">
          <Settings className="w-4 h-4 text-primary" />
          Account
        </h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Email</span>
            <span className="text-foreground">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Business</span>
            <span className="text-foreground">
              {user?.business_name || "Not set"}
            </span>
          </div>
        </div>
      </motion.section>

      {/* Stripe Connection */}
      <motion.section
        className="rounded-xl border border-border bg-card p-6 mb-6 shadow-card"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="font-semibold mb-4 flex items-center gap-2 text-foreground">
          <Link2 className="w-4 h-4 text-primary" />
          Stripe Connection
        </h2>

        {user?.stripe_account_id ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-win" />
                <span className="text-sm text-foreground">Connected</span>
                <Badge variant="outline" className="text-xs font-mono">
                  {user.stripe_account_id}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="text-destructive hover:text-destructive"
              >
                {disconnecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Unlink className="w-4 h-4 mr-1" />
                    Disconnect
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              DisputeShield is monitoring this account for new chargebacks.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Connect your Stripe account to automatically import chargebacks
              and pull evidence.
            </p>
            <Button onClick={handleConnect} disabled={connecting}>
              {connecting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ExternalLink className="w-4 h-4 mr-2" />
              )}
              Connect Stripe
            </Button>
          </div>
        )}
      </motion.section>

      {/* Plan */}
      <motion.section
        className="rounded-xl border border-border bg-card p-6 shadow-card"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="font-semibold mb-4 flex items-center gap-2 text-foreground">
          <Sparkles className="w-4 h-4 text-primary" />
          Plan
        </h2>

        <div className="flex items-center gap-3 mb-3">
          <Badge variant="secondary" className="text-sm">
            <Sparkles className="w-3 h-3 mr-1" />
            Free Beta
          </Badge>
        </div>

        <p className="text-sm text-foreground mb-1">
          You&apos;re on the free beta — full access to everything.
        </p>
        <p className="text-xs text-muted-foreground">
          We&apos;ll let you know before paid plans launch. Early users will get a special deal.
        </p>
      </motion.section>
    </div>
  );
}
