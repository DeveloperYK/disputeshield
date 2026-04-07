"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Link2,
  TrendingUp,
  Shield,
  Loader2,
  Mail,
  AlertTriangle,
  MessageCircle,
  Send,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

interface Conversation {
  user_id: string;
  email: string;
  business_name: string | null;
  latest_message: string;
  latest_at: string;
  unread: number;
}

interface ChatMessage {
  id: string;
  content: string;
  is_admin: boolean;
  read: boolean;
  created_at: string;
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

  // Conversations state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [conversationMessages, setConversationMessages] = useState<ChatMessage[]>([]);
  const [replyInput, setReplyInput] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);

  function getHeaders(): Record<string, string> {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/conversations`, { headers: getHeaders() });
      if (res.ok) {
        const data: Conversation[] = await res.json();
        setConversations(data);
      }
    } catch {
      // Network error — silently retry on next poll
    }
  }, []);

  const fetchConversationMessages = useCallback(async (userId: string) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`${API_URL}/admin/conversations/${userId}`, { headers: getHeaders() });
      if (res.ok) {
        const data: ChatMessage[] = await res.json();
        setConversationMessages(data);
      }
    } catch {
      // Network error — silently retry on next poll
    } finally {
      setLoadingMessages(false);
    }
  }, []);

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

    fetchConversations();
  }, [fetchConversations]);

  // Poll conversations every 10 seconds
  useEffect(() => {
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  // Fetch messages when selecting a conversation
  useEffect(() => {
    if (selectedUserId) {
      fetchConversationMessages(selectedUserId);
    }
  }, [selectedUserId, fetchConversationMessages]);

  // Poll selected conversation messages every 10 seconds
  useEffect(() => {
    if (!selectedUserId) return;
    const interval = setInterval(() => fetchConversationMessages(selectedUserId), 10000);
    return () => clearInterval(interval);
  }, [selectedUserId, fetchConversationMessages]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationMessages]);

  // Focus reply input when selecting a conversation
  useEffect(() => {
    if (selectedUserId) setTimeout(() => replyInputRef.current?.focus(), 200);
  }, [selectedUserId]);

  async function handleSendReply() {
    const content = replyInput.trim();
    if (!content || sendingReply || !selectedUserId) return;

    setSendingReply(true);
    setReplyInput("");

    const optimistic: ChatMessage = {
      id: `temp-${Date.now()}`,
      content,
      is_admin: true,
      read: false,
      created_at: new Date().toISOString(),
    };
    setConversationMessages((prev) => [...prev, optimistic]);

    try {
      const res = await fetch(`${API_URL}/admin/conversations/${selectedUserId}/reply`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const sent: ChatMessage = await res.json();
        setConversationMessages((prev) =>
          prev.map((m) => (m.id === optimistic.id ? sent : m))
        );
        fetchConversations();
      }
    } catch {
      // Network error — optimistic message stays visible
    } finally {
      setSendingReply(false);
    }
  }

  function handleReplyKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  }

  function formatTime(iso: string): string {
    try {
      const d = new Date(iso);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      if (isToday) return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
      return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + " " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  }

  function selectConversation(userId: string) {
    setSelectedUserId(userId);
    setConversationMessages([]);
    setReplyInput("");
  }

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

      {/* Conversations */}
      <motion.div
        className="mt-8 rounded-xl border border-border bg-card shadow-sm overflow-hidden"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="p-5 border-b border-border">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-primary" />
            Conversations
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Support messages from users
          </p>
        </div>

        <div className="flex h-[500px]">
          {/* Conversation list — left 1/3 */}
          <div className="w-1/3 border-r border-border overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <MessageCircle className="w-8 h-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No conversations yet</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.user_id}
                  onClick={() => selectConversation(conv.user_id)}
                  className={`w-full text-left p-4 border-b border-border hover:bg-muted/30 transition-colors ${
                    selectedUserId === conv.user_id ? "bg-muted/50" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {conv.email}
                      </p>
                      {conv.business_name && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {conv.business_name}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {conv.latest_message}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatTime(conv.latest_at)}
                      </span>
                      {conv.unread > 0 && (
                        <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                          {conv.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Chat thread — right 2/3 */}
          <div className="w-2/3 flex flex-col">
            {!selectedUserId ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <MessageCircle className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Select a conversation to view messages
                </p>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="px-4 py-3 border-b border-border bg-muted/20">
                  <p className="text-sm font-medium text-foreground">
                    {conversations.find((c) => c.user_id === selectedUserId)?.email ?? "User"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {conversations.find((c) => c.user_id === selectedUserId)?.business_name ?? ""}
                  </p>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    </div>
                  ) : conversationMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-center">
                      <p className="text-sm text-muted-foreground">No messages in this conversation</p>
                    </div>
                  ) : (
                    conversationMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.is_admin ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                            msg.is_admin
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-muted text-foreground rounded-bl-md"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          <p
                            className={`text-[10px] mt-1 ${
                              msg.is_admin ? "text-primary-foreground/60" : "text-muted-foreground"
                            }`}
                          >
                            {formatTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Reply input */}
                <div className="px-4 py-3 border-t border-border">
                  <div className="flex items-end gap-2">
                    <textarea
                      ref={replyInputRef}
                      value={replyInput}
                      onChange={(e) => setReplyInput(e.target.value)}
                      onKeyDown={handleReplyKeyDown}
                      placeholder="Type a reply..."
                      rows={1}
                      className="flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary max-h-20"
                    />
                    <Button
                      size="sm"
                      onClick={handleSendReply}
                      disabled={!replyInput.trim() || sendingReply}
                      className="h-9 w-9 p-0 rounded-xl shrink-0"
                    >
                      {sendingReply ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
