"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Inbox,
  TrendingUp,
  DollarSign,
  Trophy,
  SkipForward,
  Shield,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { listDisputes, getAnalytics } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Dispute, Analytics } from "@/lib/types";
import { DisputeCard } from "@/components/disputes/dispute-card";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function DashboardPage() {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [disputeData, analyticsData] = await Promise.all([
          listDisputes(),
          getAnalytics(),
        ]);
        setDisputes(disputeData.disputes);
        setAnalytics(analyticsData);
      } catch {
        // Silently handle — empty states will show
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const needsResponse = disputes.filter(
    (d) => d.status === "needs_response",
  );
  const hasStripe = !!user?.stripe_account_id;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">
          {user?.business_name
            ? `${user.business_name}`
            : "Dashboard"}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {needsResponse.length > 0
            ? `${needsResponse.length} dispute${needsResponse.length === 1 ? "" : "s"} need${needsResponse.length === 1 ? "s" : ""} your attention`
            : "All caught up"}
        </p>
      </div>

      {/* Stats */}
      {analytics && (analytics.total_disputes > 0 || disputes.length > 0) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total disputes"
            value={analytics.total_disputes}
            icon={Inbox}
            delay={0}
          />
          <StatCard
            label="Win rate"
            value={Math.round(analytics.win_rate * 100)}
            suffix="%"
            icon={Trophy}
            color="text-win"
            delay={0.1}
          />
          <StatCard
            label="Recovered"
            value={Math.round(analytics.total_recovered_cents / 100)}
            prefix="$"
            icon={DollarSign}
            color="text-win"
            delay={0.2}
          />
          <StatCard
            label="Saved by skipping"
            value={Math.round(
              analytics.money_saved_by_skipping_cents / 100,
            )}
            prefix="$"
            icon={SkipForward}
            color="text-primary"
            delay={0.3}
          />
        </div>
      )}

      {/* Disputes list */}
      {disputes.length > 0 ? (
        <div>
          {needsResponse.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Needs Response
              </h2>
              <div className="space-y-3">
                {needsResponse.map((d, i) => (
                  <DisputeCard key={d.id} dispute={d} index={i} />
                ))}
              </div>
            </div>
          )}

          {disputes.filter((d) => d.status !== "needs_response").length >
            0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
                All Disputes
              </h2>
              <div className="space-y-3">
                {disputes
                  .filter((d) => d.status !== "needs_response")
                  .map((d, i) => (
                    <DisputeCard
                      key={d.id}
                      dispute={d}
                      index={i}
                    />
                  ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Empty state */
        <motion.div
          className="rounded-2xl border border-dashed border-border bg-card p-16 text-center shadow-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-primary" />
          </div>

          {!hasStripe ? (
            <>
              <h3 className="text-xl font-semibold mb-2">
                Connect your Stripe account
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                DisputeShield monitors your Stripe account for new chargebacks
                and imports them automatically. Connect to get started.
              </p>
              <Link href="/settings">
                <Button>
                  Connect Stripe
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </>
          ) : (
            <>
              <h3 className="text-xl font-semibold mb-2">
                No chargebacks yet
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-2">
                That&apos;s a good thing! When a chargeback hits your Stripe
                account, it&apos;ll appear here automatically.
              </p>
              <p className="text-sm text-muted-foreground">
                Your Stripe account is connected and monitoring for disputes.
              </p>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}
