"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Link2,
  TrendingUp,
  Shield,
  Loader2,
  Mail,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface AdminStats {
  total_users: number;
  recent_signups: number;
  connected_users: number;
  total_disputes: number;
}

interface AdminUser {
  id: string;
  email: string;
  business_name: string | null;
  created_at: string | null;
  stripe_connected: boolean;
  subscription_tier: string;
  dispute_count: number;
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  delay,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      className="rounded-xl border border-border bg-card p-5 shadow-sm"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <p className="text-3xl font-bold text-foreground tabular-nums">{value}</p>
    </motion.div>
  );
}

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    Promise.all([
      fetch(`${API_URL}/admin/stats`, { headers }).then((r) => {
        if (!r.ok) throw new Error(r.status === 403 ? "Admin access required" : "Failed to load");
        return r.json();
      }),
      fetch(`${API_URL}/admin/users`, { headers }).then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      }),
    ])
      .then(([statsData, usersData]) => {
        setStats(statsData);
        setUsers(usersData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
          <p className="text-foreground font-medium">{error}</p>
          <p className="text-sm text-muted-foreground mt-1">
            You need admin access to view this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Platform overview and user management
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Users} label="Total Users" value={stats.total_users} color="bg-blue-50 text-blue-600" delay={0} />
          <StatCard icon={TrendingUp} label="This Week" value={stats.recent_signups} color="bg-emerald-50 text-emerald-600" delay={0.05} />
          <StatCard icon={Link2} label="Stripe Connected" value={stats.connected_users} color="bg-violet-50 text-violet-600" delay={0.1} />
          <StatCard icon={Shield} label="Total Disputes" value={stats.total_disputes} color="bg-amber-50 text-amber-600" delay={0.15} />
        </div>
      )}

      {/* Users table */}
      <motion.div
        className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="p-5 border-b border-border">
          <h2 className="font-semibold text-foreground">All Users</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-3 font-medium text-muted-foreground">Email</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Business</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Signed Up</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Stripe</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Disputes</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="p-3 text-foreground font-medium">{u.email}</td>
                  <td className="p-3 text-muted-foreground">{u.business_name || "—"}</td>
                  <td className="p-3 text-muted-foreground">
                    {u.created_at
                      ? new Date(u.created_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </td>
                  <td className="p-3 text-center">
                    {u.stripe_connected ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        Not connected
                      </Badge>
                    )}
                  </td>
                  <td className="p-3 text-center text-foreground tabular-nums">{u.dispute_count}</td>
                  <td className="p-3 text-center">
                    <a
                      href={`mailto:${u.email}`}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted transition-colors"
                      title={`Email ${u.email}`}
                    >
                      <Mail className="w-4 h-4 text-muted-foreground" />
                    </a>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No users yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
