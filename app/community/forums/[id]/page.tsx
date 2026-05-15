"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronUp, ChevronDown, MessageSquare, Send, Clock, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { usePurchasedFeatures } from "@/hooks/usePurchasedFeatures";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import CommunityAccessNotice from "@/components/CommunityAccessNotice";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import AuthorActionsMenu from "@/components/AuthorActionsMenu";
import { usePostgresChanges } from "@/hooks/useRealtimeChannel";

interface Reply {
  id: string;
  body: string;
  authorId: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  author: { id: string; name: string; avatar: string | null };
  score: number;
  userVote: number;
  _count: { children: number };
}

interface Thread {
  id: string;
  title: string;
  body: string;
  authorId: string;
  isPinned: boolean;
  isResolved: boolean;
  createdAt: string;
  updatedAt: string;
  author: { id: string; name: string; avatar: string | null };
  replies: Reply[];
}

function wasEdited(createdAt: string, updatedAt: string) {
  // Tolerate ~1s clock jitter between insert and trigger update.
  return new Date(updatedAt).getTime() - new Date(createdAt).getTime() > 1000;
}

export default function ThreadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useCurrentUser();
  const { hasCommunityAccess: hasInstructorQA } = usePurchasedFeatures();
  const [thread, setThread] = useState<Thread | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);

  // Edit state — null when not editing, else the id being edited
  const [editingThread, setEditingThread] = useState(false);
  const [threadDraft, setThreadDraft] = useState({ title: "", body: "" });
  const [savingThread, setSavingThread] = useState(false);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [savingReply, setSavingReply] = useState(false);

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

  // Postgres Changes catch all writes — broadcast subscription is redundant.
  usePostgresChanges("forum_replies", () => loadThread(), { filter: `thread_id=eq.${id}` });
  usePostgresChanges("forum_votes",   () => loadThread());

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

  function startEditThread() {
    if (!thread) return;
    setThreadDraft({ title: thread.title, body: thread.body });
    setEditingThread(true);
  }

  async function saveThreadEdit() {
    if (!thread) return;
    if (!threadDraft.title.trim() || !threadDraft.body.trim()) return;
    setSavingThread(true);
    try {
      const res = await fetch(`/api/community/forums/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(threadDraft),
      });
      if (!res.ok) throw new Error();
      toast.success("Thread updated");
      setEditingThread(false);
      loadThread();
    } catch {
      toast.error("Failed to update thread");
    } finally {
      setSavingThread(false);
    }
  }

  async function deleteThread() {
    if (!confirm("Delete this thread and all replies? This can't be undone.")) return;
    try {
      const res = await fetch(`/api/community/forums/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Thread deleted");
      router.push("/community/forums");
    } catch {
      toast.error("Failed to delete thread");
    }
  }

  function startEditReply(reply: Reply) {
    setEditingReplyId(reply.id);
    setReplyDraft(reply.body);
  }

  async function saveReplyEdit() {
    if (!editingReplyId || !replyDraft.trim()) return;
    setSavingReply(true);
    try {
      const res = await fetch(`/api/community/forums/${id}/replies/${editingReplyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: replyDraft }),
      });
      if (!res.ok) throw new Error();
      toast.success("Reply updated");
      setEditingReplyId(null);
      setReplyDraft("");
      loadThread();
    } catch {
      toast.error("Failed to update reply");
    } finally {
      setSavingReply(false);
    }
  }

  async function deleteReply(replyId: string) {
    if (!confirm("Delete this reply?")) return;
    try {
      const res = await fetch(`/api/community/forums/${id}/replies/${replyId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Reply deleted");
      loadThread();
    } catch {
      toast.error("Failed to delete reply");
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

  const isAdmin = user?.role === "ADMIN" || user?.role === "INSTRUCTOR";
  const isThreadAuthor = !!user && thread.authorId === user.userId;
  const threadEdited = wasEdited(thread.createdAt, thread.updatedAt);

  return (
    <div className="py-6 sm:py-8 space-y-5 sm:space-y-6">
      <Link href="/community/forums" className="inline-flex items-center gap-1.5 text-muted-foreground text-sm hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Forums
      </Link>

      {/* Thread */}
      <div className="rounded-md border border-border bg-card p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 mb-3 flex-1 min-w-0">
            {thread.isPinned && <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">Pinned</span>}
            {thread.isResolved && (
              <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                <CheckCircle className="w-3 h-3" /> Resolved
              </span>
            )}
            {threadEdited && (
              <span className="text-[10px] text-muted-foreground/60">(edited)</span>
            )}
          </div>
          <AuthorActionsMenu
            canEdit={isThreadAuthor}
            canDelete={isThreadAuthor || isAdmin}
            onEdit={startEditThread}
            onDelete={deleteThread}
          />
        </div>

        {editingThread ? (
          <div className="space-y-3">
            <input
              value={threadDraft.title}
              onChange={(e) => setThreadDraft({ ...threadDraft, title: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-base font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50"
              placeholder="Thread title"
            />
            <textarea
              rows={6}
              value={threadDraft.body}
              onChange={(e) => setThreadDraft({ ...threadDraft, body: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 resize-none"
              placeholder="Body (Markdown supported)"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setEditingThread(false)}
                className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveThreadEdit}
                disabled={savingThread || !threadDraft.title.trim() || !threadDraft.body.trim()}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {savingThread ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-lg sm:text-xl font-bold text-foreground mb-3 break-words">{thread.title}</h1>
            <div className="text-sm leading-relaxed break-words">
              <MarkdownRenderer content={thread.body} compact />
            </div>
          </>
        )}

        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border">
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-foreground text-xs font-bold flex-shrink-0">
            {thread.author.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thread.author.avatar} alt="" className="w-full h-full rounded-full object-cover" />
            ) : thread.author.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-foreground text-sm font-medium truncate">{thread.author.name}</p>
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
            {thread.replies.filter(r => !r.parentId).map((reply) => {
              const isReplyAuthor = !!user && reply.authorId === user.userId;
              const isEditingThis = editingReplyId === reply.id;
              const replyEdited = wasEdited(reply.createdAt, reply.updatedAt);
              return (
                <div key={reply.id} className="rounded-md border border-border bg-card p-3 sm:p-5">
                  <div className="flex gap-2 sm:gap-3">
                    {/* Vote buttons */}
                    <div className="flex flex-col items-center gap-1 pt-1 flex-shrink-0">
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
                      {isEditingThis ? (
                        <div className="space-y-2">
                          <textarea
                            rows={4}
                            value={replyDraft}
                            onChange={(e) => setReplyDraft(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 resize-none"
                            placeholder="Edit your reply (Markdown supported)"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => { setEditingReplyId(null); setReplyDraft(""); }}
                              className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={saveReplyEdit}
                              disabled={savingReply || !replyDraft.trim()}
                              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
                            >
                              {savingReply ? "Saving…" : "Save"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm leading-relaxed break-words">
                          <MarkdownRenderer content={reply.body} compact />
                        </div>
                      )}
                      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mt-3">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-foreground text-[10px] font-bold flex-shrink-0">
                            {reply.author.avatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={reply.author.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : reply.author.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-muted-foreground text-xs">{reply.author.name}</span>
                          <span className="text-muted-foreground/40 text-xs">·</span>
                          <span className="text-muted-foreground/60 text-xs">{new Date(reply.createdAt).toLocaleDateString()}</span>
                          {replyEdited && <span className="text-muted-foreground/60 text-[10px]">(edited)</span>}
                        </div>
                        {!isEditingThis && (
                          <AuthorActionsMenu
                            size="sm"
                            canEdit={isReplyAuthor}
                            canDelete={isReplyAuthor || isAdmin}
                            onEdit={() => startEditReply(reply)}
                            onDelete={() => deleteReply(reply.id)}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reply Form / Upgrade notice */}
      {hasInstructorQA ? (
        <div className="rounded-md border border-border bg-card p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Post a Reply</h3>
          <textarea
            rows={4}
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder="Write your reply (Markdown supported — **bold**, `code`, links, etc.)"
            className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 resize-none"
          />
          <div className="flex justify-end mt-3">
            <button
              onClick={handleReply}
              disabled={sending || !replyBody.trim()}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors w-full sm:w-auto"
            >
              <Send className="w-4 h-4" />
              {sending ? "Posting…" : "Post Reply"}
            </button>
          </div>
        </div>
      ) : (
        <CommunityAccessNotice action="reply" />
      )}
    </div>
  );
}
