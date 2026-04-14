"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronUp, ChevronDown, MessageSquare, Send, Clock, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { usePurchasedFeatures } from "@/hooks/usePurchasedFeatures";
import CommunityProNotice from "@/components/CommunityProNotice";

interface Reply {
  id: string;
  body: string;
  authorId: string;
  parentId: string | null;
  createdAt: string;
  author: { id: string; name: string; avatar: string | null };
  score: number;
  userVote: number;
  _count: { children: number };
}

interface Thread {
  id: string;
  title: string;
  body: string;
  isPinned: boolean;
  isResolved: boolean;
  createdAt: string;
  author: { id: string; name: string; avatar: string | null };
  replies: Reply[];
}

export default function ThreadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { hasCommunityAccess: hasInstructorQA } = usePurchasedFeatures();
  const [thread, setThread] = useState<Thread | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);

  async function loadThread() {
    try {
      const res = await fetch(`/api/community/forums/${id}`);
      const data = await res.json();
      setThread(data.thread);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadThread(); }, [id]);

  async function handleReply() {
    if (!replyBody.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/community/forums/${id}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: replyBody }),
      });
      if (!res.ok) throw new Error();
      toast.success("Reply posted!");
      setReplyBody("");
      loadThread();
    } catch {
      toast.error("Failed to post reply");
    } finally {
      setSending(false);
    }
  }

  async function handleVote(replyId: string, value: number) {
    try {
      await fetch(`/api/community/forums/${id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replyId, value }),
      });
      loadThread();
    } catch {
      toast.error("Vote failed");
    }
  }

  if (loading) {
    return (
      <div className="py-8 space-y-4">
        <div className="h-8 w-32 rounded bg-secondary/50 animate-pulse" />
        <div className="h-48 rounded-md bg-secondary/50 animate-pulse" />
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 rounded-lg bg-secondary/50 animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">Thread not found.</p>
        <Link href="/community/forums" className="text-emerald-400 text-sm mt-2 inline-block hover:underline">← Back to forums</Link>
      </div>
    );
  }

  return (
    <div className="py-8 space-y-6">
      <Link href="/community/forums" className="inline-flex items-center gap-1.5 text-muted-foreground text-sm hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Forums
      </Link>

      {/* Thread */}
      <div className="rounded-md border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-3">
          {thread.isPinned && <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">Pinned</span>}
          {thread.isResolved && (
            <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              <CheckCircle className="w-3 h-3" /> Resolved
            </span>
          )}
        </div>
        <h1 className="text-xl font-bold text-foreground mb-3">{thread.title}</h1>
        <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">{thread.body}</p>
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border">
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-foreground text-xs font-bold">
            {thread.author.avatar ? (
              <img src={thread.author.avatar} alt="" className="w-full h-full rounded-full object-cover" />
            ) : thread.author.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-foreground text-sm font-medium">{thread.author.name}</p>
            <p className="text-muted-foreground text-xs flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(thread.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
            </p>
          </div>
        </div>
      </div>

      {/* Replies */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          {thread.replies.length} {thread.replies.length === 1 ? "Reply" : "Replies"}
        </h2>
        {thread.replies.length === 0 ? (
          <div className="rounded-md border border-border bg-card p-8 text-center">
            <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
            <p className="text-muted-foreground text-sm">No replies yet. Be the first!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {thread.replies.filter(r => !r.parentId).map((reply) => (
              <div key={reply.id} className="rounded-md border border-border bg-card p-5">
                <div className="flex gap-3">
                  {/* Vote buttons */}
                  <div className="flex flex-col items-center gap-1 pt-1">
                    <button
                      onClick={() => handleVote(reply.id, 1)}
                      className={`p-1 rounded transition-colors ${reply.userVote === 1 ? "text-emerald-400" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <ChevronUp className="w-5 h-5" />
                    </button>
                    <span className={`text-xs font-bold ${reply.score > 0 ? "text-emerald-400" : reply.score < 0 ? "text-red-400" : "text-muted-foreground"}`}>
                      {reply.score}
                    </span>
                    <button
                      onClick={() => handleVote(reply.id, -1)}
                      className={`p-1 rounded transition-colors ${reply.userVote === -1 ? "text-red-400" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <ChevronDown className="w-5 h-5" />
                    </button>
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">{reply.body}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-foreground text-[10px] font-bold">
                        {reply.author.avatar ? (
                          <img src={reply.author.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : reply.author.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-muted-foreground text-xs">{reply.author.name}</span>
                      <span className="text-muted-foreground/40 text-xs">·</span>
                      <span className="text-muted-foreground/60 text-xs">{new Date(reply.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reply Form / Upgrade notice */}
      {hasInstructorQA ? (
        <div className="rounded-md border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Post a Reply</h3>
          <textarea
            rows={4}
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder="Write your reply..."
            className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 resize-none"
          />
          <div className="flex justify-end mt-3">
            <button
              onClick={handleReply}
              disabled={sending || !replyBody.trim()}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              <Send className="w-4 h-4" />
              {sending ? "Posting…" : "Post Reply"}
            </button>
          </div>
        </div>
      ) : (
        <CommunityProNotice action="reply" />
      )}
    </div>
  );
}
