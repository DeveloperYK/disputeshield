"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  DollarSign,
  Trophy,
  Inbox,
  SkipForward,
  Loader2,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { getAnalytics } from "@/lib/api";
import type { Analytics } from "@/lib/types";
import { StatCard } from "@/components/dashboard/stat-card";

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getAnalytics();
        setAnalytics(data);
      } catch {
        // handle error
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

  if (!analytics) return null;

  const chartData = analytics.reason_code_breakdown.map((rc) => ({
    code: rc.reason_code,
    won: rc.won,
    lost: rc.lost,
    total: rc.count,
    amount: formatCurrency(rc.total_amount_cents),
  }));

  const hasData = analytics.total_disputes > 0;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track your chargeback defense performance
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <StatCard
          label="Total disputes"
          value={analytics.total_disputes}
          icon={Inbox}
          delay={0}
        />
        <StatCard
          label="Won"
          value={analytics.total_won}
          icon={Trophy}
          color="text-win"
          delay={0.05}
        />
        <StatCard
          label="Lost"
          value={analytics.total_lost}
          icon={TrendingUp}
          color="text-destructive"
          delay={0.1}
        />
        <StatCard
          label="Recovered"
          value={Math.round(analytics.total_recovered_cents / 100)}
          prefix="$"
          icon={DollarSign}
          color="text-win"
          delay={0.15}
        />
        <StatCard
          label="Saved by skipping"
          value={Math.round(analytics.money_saved_by_skipping_cents / 100)}
          prefix="$"
          icon={SkipForward}
          color="text-primary"
          delay={0.2}
        />
      </div>

      {/* Win rate hero */}
      {hasData && (
        <motion.div
          className="rounded-2xl border border-border bg-card p-8 mb-8 text-center shadow-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <p className="text-sm text-muted-foreground uppercase tracking-wider mb-2">
            Overall Win Rate
          </p>
          <div className="text-6xl font-bold text-gradient tabular-nums">
            {Math.round(analytics.win_rate * 100)}%
          </div>
          <p className="text-muted-foreground text-sm mt-2">
            {analytics.total_won} won out of{" "}
            {analytics.total_won + analytics.total_lost} resolved
          </p>
        </motion.div>
      )}

      {/* Reason code breakdown chart */}
      {chartData.length > 0 && (
        <motion.div
          className="rounded-xl border border-border bg-card p-6 shadow-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">
              Reason Code Breakdown
            </h3>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis
                  dataKey="code"
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    color: "#0a0f1e",
                    fontSize: "12px",
                    boxShadow:
                      "0 4px 8px rgba(0,0,0,0.04), 0 12px 24px rgba(0,0,0,0.05)",
                  }}
                />
                <Bar
                  dataKey="won"
                  name="Won"
                  stackId="a"
                  radius={[0, 0, 0, 0]}
                >
                  {chartData.map((_, i) => (
                    <Cell key={`won-${i}`} fill="#059669" />
                  ))}
                </Bar>
                <Bar
                  dataKey="lost"
                  name="Lost"
                  stackId="a"
                  radius={[4, 4, 0, 0]}
                >
                  {chartData.map((_, i) => (
                    <Cell key={`lost-${i}`} fill="#dc2626" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded"
                style={{ background: "#059669" }}
              />
              <span className="text-muted-foreground">Won</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded"
                style={{ background: "#dc2626" }}
              />
              <span className="text-muted-foreground">Lost</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Empty state */}
      {!hasData && (
        <motion.div
          className="rounded-2xl border border-dashed border-border bg-card p-16 text-center shadow-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2 text-foreground">
            No data yet
          </h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Analytics will appear here once you start resolving chargebacks.
            Connect your Stripe account and let the data flow in.
          </p>
        </motion.div>
      )}
    </div>
  );
}
