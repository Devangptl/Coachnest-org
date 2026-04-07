/**
 * /admin/messages — Admin contact messages list
 */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Search,
  Mail,
  Clock,
  Eye,
  Reply,
  Trash2,
  Loader2,
  Inbox,
  User,
  FileText,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  status: string;
  adminReply: string | null;
  repliedAt: string | null;
  createdAt: string;
}

interface StatusCounts {
  ALL: number;
  UNREAD: number;
  READ: number;
  REPLIED: number;
}

const STATUS_BADGE: Record<string, string> = {
  UNREAD: "bg-orange-500/15 text-orange-300 border-orange-400/25",
  READ: "bg-blue-500/15 text-blue-300 border-blue-400/25",
  REPLIED: "bg-green-500/15 text-green-400 border-green-400/25",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  UNREAD: <Mail className="w-3 h-3" />,
  READ: <Eye className="w-3 h-3" />,
  REPLIED: <Reply className="w-3 h-3" />,
};

const TABS = ["ALL", "UNREAD", "READ", "REPLIED"] as const;

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [counts, setCounts] = useState<StatusCounts>({ ALL: 0, UNREAD: 0, READ: 0, REPLIED: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab !== "ALL") params.set("status", activeTab);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/contact?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setMessages(data.messages);
      setCounts(data.statusCounts);
    } catch {
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, [activeTab, search]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this message?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/contact/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Message deleted");
      fetchMessages();
    } catch {
      toast.error("Failed to delete message");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-orange-500/15 border border-orange-400/25 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-orange-400" />
            </div>
            Messages
          </h1>
          <p className="text-muted-foreground text-sm mt-1.5">
            {counts.UNREAD > 0 && (
              <span className="text-orange-400 font-semibold">{counts.UNREAD} unread · </span>
            )}
            {counts.ALL} total message{counts.ALL !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Status tabs */}
        <div className="flex gap-1 bg-card border border-border rounded-lg p-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5",
                activeTab === tab
                  ? "bg-orange-500/15 text-orange-400 border border-orange-400/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              {tab}
              {tab !== "ALL" && (
                <span className="text-[10px] opacity-70">
                  {counts[tab as keyof StatusCounts]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or subject..."
            className="input-glass pl-9 py-2 text-sm"
          />
        </div>
      </div>

      {/* Messages List */}
      {loading ? (
        <div className="glass p-12 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
          <span className="ml-3 text-muted-foreground text-sm">Loading messages...</span>
        </div>
      ) : messages.length === 0 ? (
        <div className="glass text-center py-20">
          <Inbox className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-foreground font-semibold text-lg mb-2">No messages found</p>
          <p className="text-muted-foreground text-sm">
            {search ? "No messages match your search." : "No contact messages yet."}
          </p>
        </div>
      ) : (
        <div className="glass overflow-hidden">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 border-b border-border text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            <div className="col-span-3 flex items-center gap-2">
              <User className="w-3 h-3" /> Sender
            </div>
            <div className="col-span-3 flex items-center gap-2">
              <FileText className="w-3 h-3" /> Subject
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <Mail className="w-3 h-3" /> Status
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <Clock className="w-3 h-3" /> Received
            </div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-border/50">
            <AnimatePresence mode="popLayout">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={cn(
                    "grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-center px-5 py-4 hover:bg-secondary/30 transition-colors group",
                    msg.status === "UNREAD" && "bg-orange-500/[.03]"
                  )}
                >
                  {/* Sender */}
                  <div className="col-span-3 min-w-0">
                    <Link href={`/admin/messages/${msg.id}`} className="block">
                      <p className={cn("text-sm truncate", msg.status === "UNREAD" ? "text-foreground font-semibold" : "text-foreground font-medium")}>
                        {msg.name}
                      </p>
                      <p className="text-muted-foreground text-xs truncate">{msg.email}</p>
                    </Link>
                  </div>

                  {/* Subject */}
                  <div className="col-span-3 min-w-0">
                    <Link href={`/admin/messages/${msg.id}`} className="block">
                      <p className="text-muted-foreground text-sm truncate">
                        {msg.subject || <span className="italic opacity-50">No subject</span>}
                      </p>
                      <p className="text-muted-foreground/60 text-xs truncate mt-0.5">
                        {msg.message.substring(0, 60)}...
                      </p>
                    </Link>
                  </div>

                  {/* Status */}
                  <div className="col-span-2">
                    <span className={cn("badge border", STATUS_BADGE[msg.status])}>
                      {STATUS_ICON[msg.status]}
                      {msg.status}
                    </span>
                  </div>

                  {/* Time */}
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-sm">{timeAgo(msg.createdAt)}</p>
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/messages/${msg.id}`}
                      className="btn-ghost text-xs px-3 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </Link>
                    <button
                      onClick={() => handleDelete(msg.id)}
                      disabled={deleting === msg.id}
                      className="btn-danger text-xs px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {deleting === msg.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
