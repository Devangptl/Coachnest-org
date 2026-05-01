/**
 * /admin/messages/[id] — Admin message detail + reply page
 */
"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Mail,
  User,
  Clock,
  FileText,
  Send,
  Loader2,
  CheckCircle2,
  Trash2,
  MessageSquare,
  Reply,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  status: string;
  adminReply: string | null;
  repliedAt: string | null;
  repliedById: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_BADGE: Record<string, string> = {
  UNREAD: "bg-orange-500/15 text-orange-300 border-[#d97757]/25",
  READ: "bg-blue-500/15 text-blue-300 border-blue-400/25",
  REPLIED: "bg-green-500/15 text-green-400 border-green-400/25",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminMessageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [msg, setMsg] = useState<ContactMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function fetch_msg() {
      try {
        const res = await fetch(`/api/admin/contact/${id}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setMsg(data.message);
        if (data.message.adminReply) {
          setReply(data.message.adminReply);
        }
      } catch {
        toast.error("Failed to load message");
      } finally {
        setLoading(false);
      }
    }
    fetch_msg();
  }, [id]);

  async function handleReply() {
    if (!reply.trim()) {
      toast.error("Reply cannot be empty");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/admin/contact/${id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply: reply.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send reply");
      }
      const data = await res.json();
      setMsg(data.message);
      toast.success("Reply sent! Email notification delivered.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send reply");
    } finally {
      setSending(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Permanently delete this message?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/contact/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Message deleted");
      router.push("/admin/messages");
    } catch {
      toast.error("Failed to delete message");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-32 rounded-lg skeleton" />
        <div className="glass p-8 space-y-4">
          <div className="h-6 w-48 rounded skeleton" />
          <div className="h-4 w-64 rounded skeleton" />
          <div className="h-32 rounded-lg skeleton" />
        </div>
      </div>
    );
  }

  if (!msg) {
    return (
      <div className="glass p-12 text-center">
        <MessageSquare className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
        <p className="text-foreground font-semibold text-lg mb-2">Message not found</p>
        <Link href="/admin/messages" className="btn-secondary mt-4">
          <ArrowLeft className="w-4 h-4" /> Back to Messages
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/messages"
          className="btn-ghost text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Messages
        </Link>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="btn-danger text-sm"
        >
          {deleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
          Delete
        </button>
      </div>

      {/* Message Card */}
      <div className="glass p-6 sm:p-8">
        {/* Status + Time */}
        <div className="flex items-center justify-between mb-6">
          <span className={cn("badge border text-xs", STATUS_BADGE[msg.status])}>
            {msg.status}
          </span>
          <span className="text-muted-foreground text-xs flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {formatDate(msg.createdAt)}
          </span>
        </div>

        {/* Sender Info */}
        <div className="flex items-start gap-4 mb-6 pb-6 border-b border-border">
          <div className="w-12 h-12 rounded-md bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-[#d97757]/20 flex items-center justify-center flex-shrink-0">
            <User className="w-6 h-6 text-[#d97757]" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-foreground text-lg font-bold">{msg.name}</h2>
            <div className="flex items-center gap-2 text-muted-foreground text-sm mt-0.5">
              <Mail className="w-3.5 h-3.5" />
              <a href={`mailto:${msg.email}`} className="hover:text-[#d97757] transition-colors">
                {msg.email}
              </a>
            </div>
            {msg.subject && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm mt-1">
                <FileText className="w-3.5 h-3.5" />
                <span className="text-foreground font-medium">{msg.subject}</span>
              </div>
            )}
          </div>
        </div>

        {/* Message body */}
        <div className="mb-6">
          <h3 className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-3">
            Message
          </h3>
          <div className="bg-secondary/50 border border-border rounded-lg p-5">
            <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
              {msg.message}
            </p>
          </div>
        </div>

        {/* Admin Reply (if already replied) */}
        {msg.status === "REPLIED" && msg.adminReply && (
          <div className="mb-6">
            <h3 className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
              Your Reply
              {msg.repliedAt && (
                <span className="text-muted-foreground/60 font-normal normal-case">
                  · {formatDate(msg.repliedAt)}
                </span>
              )}
            </h3>
            <div className="bg-green-500/5 border border-green-400/15 border-l-2 border-l-green-400/40 rounded-lg p-5">
              <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
                {msg.adminReply}
              </p>
            </div>
          </div>
        )}

        {/* Reply Form */}
        <div className="border-t border-border pt-6">
          <h3 className="text-foreground text-sm font-semibold mb-3 flex items-center gap-2">
            <Reply className="w-4 h-4 text-[#d97757]" />
            {msg.status === "REPLIED" ? "Update Reply" : "Send Reply"}
          </h3>
          <p className="text-muted-foreground text-xs mb-4">
            Your reply will be emailed directly to {msg.name} at {msg.email}.
          </p>
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Type your reply here..."
            rows={5}
            className="input-glass resize-none mb-4"
          />
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">
              {reply.length} / 10,000
            </span>
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleReply}
              disabled={sending || !reply.trim()}
              className="btn-primary"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Reply & Email
                </>
              )}
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
