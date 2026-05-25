"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  MessageCircle,
  Loader2,
  ArrowLeft,
  Send,
  ChevronUp,
  CheckCircle2,
  HelpCircle,
  Pin,
  PinOff,
  Trash2,
  Tag as TagIcon,
  X,
  Megaphone,
  MessagesSquare,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

type Kind = "GENERAL" | "QUESTION" | "ANNOUNCEMENT_REPLY";
type Filter = "all" | "unanswered" | "mine" | "resolved";
type Sort = "recent" | "top" | "replies";

type Author = { id: string; name: string; avatar: string | null };

type Discussion = {
  id: string;
  classId: string;
  authorId: string;
  kind: Kind;
  title: string;
  body: string;
  parentId: string | null;
  resolved: boolean;
  pinned: boolean;
  tags: string[];
  acceptedReplyId: string | null;
  createdAt: string;
  updatedAt: string;
  author: Author;
  voteCount: number;
  myVote: boolean;
  _count?: { replies: number; votes: number };
};

type Reply = Discussion;

type Thread = Discussion & { replies: Reply[] };

const KIND_META: Record<Kind, { label: string; cls: string; Icon: React.ComponentType<{ className?: string }> }> = {
  QUESTION:           { label: "Question",     cls: "bg-violet-500/15 text-violet-400 border-violet-400/30", Icon: HelpCircle },
  GENERAL:            { label: "Discussion",   cls: "bg-sky-500/15 text-sky-400 border-sky-400/30",            Icon: MessagesSquare },
  ANNOUNCEMENT_REPLY: { label: "Announcement", cls: "bg-amber-500/15 text-amber-400 border-amber-400/30",     Icon: Megaphone },
};

export default function ClassDiscussions({
  classId,
  isStaff = false,
  currentUserId,
}: {
  classId: string;
  isStaff?: boolean;
  currentUserId?: string;
}) {
  const [items, setItems] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<string | null>(null);

  // List filters
  const [filter, setFilter] = useState<Filter>("all");
  const [kindFilter, setKindFilter] = useState<Kind | "ANY">("ANY");
  const [sort, setSort] = useState<Sort>("recent");
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  // Composer
  const [composerOpen, setComposerOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("filter", filter);
      if (kindFilter !== "ANY") params.set("kind", kindFilter);
      if (sort !== "recent") params.set("sort", sort);
      if (tagFilter) params.set("tag", tagFilter);
      const r = await fetch(`/api/classes/${classId}/discussions?${params}`);
      const d = await r.json();
      setItems(d.discussions ?? []);
    } finally {
      setLoading(false);
    }
  }, [classId, filter, kindFilter, sort, tagFilter]);

  useEffect(() => { load(); }, [load]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) for (const t of it.tags) set.add(t);
    return Array.from(set).sort();
  }, [items]);

  if (active) {
    return (
      <ThreadView
        classId={classId}
        threadId={active}
        isStaff={isStaff}
        currentUserId={currentUserId}
        onBack={() => { setActive(null); load(); }}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold text-base flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-amber-400" /> Discussions
          </h2>
          <p className="text-xs text-muted-foreground">
            Questions, announcements, and conversations.
          </p>
        </div>
        <Button size="sm" onClick={() => setComposerOpen(true)}>
          New post
        </Button>
      </div>

      {composerOpen && (
        <Composer
          classId={classId}
          onClose={() => setComposerOpen(false)}
          onPosted={() => { setComposerOpen(false); load(); }}
        />
      )}

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>All</FilterChip>
        <FilterChip active={filter === "unanswered"} onClick={() => setFilter("unanswered")}>Unanswered</FilterChip>
        <FilterChip active={filter === "resolved"} onClick={() => setFilter("resolved")}>Resolved</FilterChip>
        <FilterChip active={filter === "mine"} onClick={() => setFilter("mine")}>Mine</FilterChip>
        <span className="text-muted-foreground/50">·</span>
        <FilterChip active={kindFilter === "ANY"} onClick={() => setKindFilter("ANY")}>All types</FilterChip>
        <FilterChip active={kindFilter === "QUESTION"} onClick={() => setKindFilter("QUESTION")}>Questions</FilterChip>
        <FilterChip active={kindFilter === "GENERAL"} onClick={() => setKindFilter("GENERAL")}>Discussions</FilterChip>
        <span className="text-muted-foreground/50">·</span>
        <select
          className="bg-secondary border border-border rounded-md px-2 py-1 text-xs"
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
        >
          <option value="recent">Most recent</option>
          <option value="top">Most voted</option>
          <option value="replies">Most replies</option>
        </select>
      </div>

      {/* Tag filter row */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {allTags.map((t) => (
            <button
              key={t}
              onClick={() => setTagFilter(tagFilter === t ? null : t)}
              className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                tagFilter === t
                  ? "bg-amber-500/15 text-amber-400 border-amber-400/30"
                  : "bg-secondary text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              <TagIcon className="w-2.5 h-2.5" /> {t}
            </button>
          ))}
          {tagFilter && (
            <button
              onClick={() => setTagFilter(null)}
              className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <X className="w-3 h-3" /> clear
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="text-center py-10">
          <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="glass p-10 rounded-xl text-center text-sm text-muted-foreground">
          <MessageCircle className="w-10 h-10 text-amber-400/40 mx-auto mb-2" />
          No discussions match these filters.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((d) => (
            <DiscussionListItem
              key={d.id}
              discussion={d}
              onOpen={() => setActive(d.id)}
              onVote={async () => {
                const prevVoted = d.myVote;
                // Optimistic update
                setItems((arr) =>
                  arr.map((x) =>
                    x.id === d.id
                      ? { ...x, myVote: !prevVoted, voteCount: x.voteCount + (prevVoted ? -1 : 1) }
                      : x,
                  ),
                );
                try {
                  const r = await fetch(
                    `/api/classes/${classId}/discussions/${d.id}/vote`,
                    { method: "POST" },
                  );
                  if (!r.ok) throw new Error();
                } catch {
                  setItems((arr) =>
                    arr.map((x) =>
                      x.id === d.id
                        ? { ...x, myVote: prevVoted, voteCount: x.voteCount + (prevVoted ? 1 : -1) }
                        : x,
                    ),
                  );
                  toast.error("Vote failed");
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── List item ────────────────────────────────────────────────────────────────

function DiscussionListItem({
  discussion: d,
  onOpen,
  onVote,
}: {
  discussion: Discussion;
  onOpen: () => void;
  onVote: () => void;
}) {
  const KindIcon = KIND_META[d.kind].Icon;
  const isQuestion = d.kind === "QUESTION";
  return (
    <div className="glass rounded-lg p-3 flex gap-3 hover:bg-secondary/30 transition-colors">
      <button
        onClick={(e) => { e.stopPropagation(); onVote(); }}
        className={`flex flex-col items-center justify-start pt-0.5 gap-0.5 rounded-md px-2 py-1 transition-colors ${
          d.myVote
            ? "bg-amber-500/15 text-amber-400"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
        }`}
        title={d.myVote ? "Remove vote" : "Upvote"}
      >
        <ChevronUp className="w-4 h-4" />
        <span className="text-xs font-semibold">{d.voteCount}</span>
      </button>

      <button onClick={onOpen} className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          {d.pinned && <Pin className="w-3 h-3 text-amber-400" />}
          <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 ${KIND_META[d.kind].cls}`}>
            <KindIcon className="w-3 h-3" />
            {KIND_META[d.kind].label}
          </span>
          {isQuestion && d.resolved && (
            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border bg-emerald-500/15 text-emerald-400 border-emerald-400/30 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Answered
            </span>
          )}
          {d.tags.map((t) => (
            <span
              key={t}
              className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border bg-secondary text-muted-foreground border-border"
            >
              {t}
            </span>
          ))}
        </div>
        <div className="font-semibold text-sm leading-tight">{d.title}</div>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{d.body}</p>
        <div className="text-[11px] text-muted-foreground mt-2 flex items-center gap-2 flex-wrap">
          <span className="font-medium text-foreground">{d.author.name}</span>
          <span>· {timeAgo(d.createdAt)}</span>
          <span>· {d._count?.replies ?? 0} repl{d._count?.replies === 1 ? "y" : "ies"}</span>
        </div>
      </button>
    </div>
  );
}

// ─── Thread view ──────────────────────────────────────────────────────────────

function ThreadView({
  classId,
  threadId,
  isStaff,
  currentUserId,
  onBack,
}: {
  classId: string;
  threadId: string;
  isStaff: boolean;
  currentUserId?: string;
  onBack: () => void;
}) {
  const [thread, setThread] = useState<Thread | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyBody, setReplyBody] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/classes/${classId}/discussions/${threadId}`);
      const d = await r.json();
      setThread(d.discussion ?? null);
    } finally {
      setLoading(false);
    }
  }, [classId, threadId]);

  useEffect(() => { load(); }, [load]);

  async function vote(targetId: string) {
    if (!thread) return;
    const prevState = JSON.stringify(thread);
    setThread((t) => {
      if (!t) return t;
      if (t.id === targetId) {
        return { ...t, myVote: !t.myVote, voteCount: t.voteCount + (t.myVote ? -1 : 1) };
      }
      return {
        ...t,
        replies: t.replies.map((r) =>
          r.id === targetId
            ? { ...r, myVote: !r.myVote, voteCount: r.voteCount + (r.myVote ? -1 : 1) }
            : r,
        ),
      };
    });
    try {
      const r = await fetch(`/api/classes/${classId}/discussions/${targetId}/vote`, {
        method: "POST",
      });
      if (!r.ok) throw new Error();
    } catch {
      setThread(JSON.parse(prevState));
      toast.error("Vote failed");
    }
  }

  async function submitReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyBody.trim()) return;
    setBusy(true);
    try {
      const r = await fetch(
        `/api/classes/${classId}/discussions/${threadId}/replies`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: replyBody }),
        },
      );
      if (!r.ok) throw new Error();
      setReplyBody("");
      load();
    } catch {
      toast.error("Failed to post reply");
    } finally {
      setBusy(false);
    }
  }

  async function patch(input: Record<string, unknown>) {
    try {
      const r = await fetch(`/api/classes/${classId}/discussions/${threadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed");
      }
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function deleteThread() {
    if (!confirm("Delete this thread? All replies will be lost.")) return;
    try {
      const r = await fetch(`/api/classes/${classId}/discussions/${threadId}`, {
        method: "DELETE",
      });
      if (!r.ok) throw new Error();
      toast.success("Deleted");
      onBack();
    } catch {
      toast.error("Failed");
    }
  }

  if (loading) {
    return <div className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>;
  }
  if (!thread) {
    return (
      <div className="text-sm text-muted-foreground py-10 text-center">
        Discussion not found.
        <div className="mt-3">
          <Button size="sm" variant="secondary" onClick={onBack}>Back</Button>
        </div>
      </div>
    );
  }

  const isAuthor = currentUserId === thread.authorId;
  const canMarkAnswer = (isAuthor || isStaff) && thread.kind === "QUESTION";
  const acceptedId = thread.acceptedReplyId;
  const KindIcon = KIND_META[thread.kind].Icon;

  // Sort replies: accepted first, then by upvotes desc, then chronological.
  const replies = [...thread.replies].sort((a, b) => {
    if (a.id === acceptedId) return -1;
    if (b.id === acceptedId) return 1;
    if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
    return +new Date(a.createdAt) - +new Date(b.createdAt);
  });

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
      >
        <ArrowLeft className="w-3 h-3" /> Back to all discussions
      </button>

      {/* Thread head */}
      <div className="glass rounded-xl p-4 flex gap-3">
        <button
          onClick={() => vote(thread.id)}
          className={`flex flex-col items-center justify-start pt-0.5 gap-0.5 rounded-md px-2 py-1 transition-colors ${
            thread.myVote
              ? "bg-amber-500/15 text-amber-400"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <ChevronUp className="w-4 h-4" />
          <span className="text-xs font-semibold">{thread.voteCount}</span>
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            {thread.pinned && <Pin className="w-3 h-3 text-amber-400" />}
            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 ${KIND_META[thread.kind].cls}`}>
              <KindIcon className="w-3 h-3" />
              {KIND_META[thread.kind].label}
            </span>
            {thread.kind === "QUESTION" && thread.resolved && (
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border bg-emerald-500/15 text-emerald-400 border-emerald-400/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Answered
              </span>
            )}
            {thread.tags.map((t) => (
              <span
                key={t}
                className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border bg-secondary text-muted-foreground border-border"
              >
                {t}
              </span>
            ))}
          </div>
          <h3 className="font-semibold text-base mb-1">{thread.title}</h3>
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">
            {thread.body}
          </p>
          <div className="text-[11px] text-muted-foreground mt-3 flex items-center gap-2">
            <span className="font-medium text-foreground">{thread.author.name}</span>
            <span>· {timeAgo(thread.createdAt)}</span>
            {(isStaff || isAuthor) && (
              <>
                <span className="text-muted-foreground/50">·</span>
                {isStaff && (
                  <button
                    onClick={() => patch({ pinned: !thread.pinned })}
                    className="inline-flex items-center gap-0.5 hover:text-foreground"
                  >
                    {thread.pinned ? (
                      <><PinOff className="w-3 h-3" /> Unpin</>
                    ) : (
                      <><Pin className="w-3 h-3" /> Pin</>
                    )}
                  </button>
                )}
                {thread.kind === "QUESTION" && (isStaff || isAuthor) && (
                  <button
                    onClick={() =>
                      patch({
                        resolved: !thread.resolved,
                        ...(thread.resolved ? { acceptedReplyId: null } : {}),
                      })
                    }
                    className="inline-flex items-center gap-0.5 hover:text-foreground"
                  >
                    {thread.resolved ? "Reopen" : "Close as answered"}
                  </button>
                )}
                <button
                  onClick={deleteThread}
                  className="inline-flex items-center gap-0.5 hover:text-red-400"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Replies */}
      <div className="space-y-2">
        <h4 className="text-xs uppercase font-bold text-muted-foreground tracking-wide">
          {replies.length} repl{replies.length === 1 ? "y" : "ies"}
        </h4>
        {replies.length === 0 ? (
          <div className="glass p-6 rounded-lg text-center text-sm text-muted-foreground">
            No replies yet — be the first to respond.
          </div>
        ) : (
          replies.map((r) => {
            const isAccepted = r.id === acceptedId;
            return (
              <div
                key={r.id}
                className={`glass rounded-lg p-3 flex gap-3 ${
                  isAccepted ? "border border-emerald-400/40 bg-emerald-500/5" : ""
                }`}
              >
                <button
                  onClick={() => vote(r.id)}
                  className={`flex flex-col items-center justify-start pt-0.5 gap-0.5 rounded-md px-2 py-1 transition-colors ${
                    r.myVote
                      ? "bg-amber-500/15 text-amber-400"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <ChevronUp className="w-4 h-4" />
                  <span className="text-xs font-semibold">{r.voteCount}</span>
                </button>
                <div className="flex-1 min-w-0">
                  {isAccepted && (
                    <div className="text-[10px] uppercase font-bold text-emerald-400 mb-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Accepted answer
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{r.body}</p>
                  <div className="text-[11px] text-muted-foreground mt-2 flex items-center gap-2">
                    <span className="font-medium text-foreground">{r.author.name}</span>
                    <span>· {timeAgo(r.createdAt)}</span>
                    {canMarkAnswer && (
                      <>
                        <span className="text-muted-foreground/50">·</span>
                        <button
                          onClick={() =>
                            patch({
                              acceptedReplyId: isAccepted ? null : r.id,
                            })
                          }
                          className={`inline-flex items-center gap-0.5 hover:text-emerald-400 ${
                            isAccepted ? "text-emerald-400" : ""
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          {isAccepted ? "Unmark answer" : "Mark as answer"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Reply composer */}
      <form onSubmit={submitReply} className="glass rounded-xl p-3 space-y-2">
        <textarea
          className="input-glass min-h-[80px]"
          value={replyBody}
          onChange={(e) => setReplyBody(e.target.value)}
          placeholder="Write a reply…"
        />
        <div className="flex justify-end">
          <Button size="sm" type="submit" loading={busy}>
            <Send className="w-3.5 h-3.5" /> Post reply
          </Button>
        </div>
      </form>
    </div>
  );
}

// ─── Composer ─────────────────────────────────────────────────────────────────

function Composer({
  classId,
  onClose,
  onPosted,
}: {
  classId: string;
  onClose: () => void;
  onPosted: () => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<Kind>("QUESTION");
  const [tagsRaw, setTagsRaw] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const tags = tagsRaw
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0 && t.length <= 30)
        .slice(0, 8);
      const r = await fetch(`/api/classes/${classId}/discussions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, kind, tags }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed");
      }
      toast.success("Posted");
      onPosted();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="glass rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">New discussion</div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(["QUESTION", "GENERAL"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`text-[10px] uppercase font-bold px-2 py-1 rounded border flex items-center gap-1 ${
              kind === k
                ? KIND_META[k].cls
                : "bg-secondary text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            {KIND_META[k].label}
          </button>
        ))}
      </div>
      <input
        className="input-glass"
        placeholder={kind === "QUESTION" ? "What's your question?" : "Discussion title"}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        minLength={3}
        maxLength={200}
      />
      <textarea
        className="input-glass min-h-[120px]"
        placeholder={
          kind === "QUESTION"
            ? "Describe what you've tried and what you're stuck on…"
            : "Share your thoughts…"
        }
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
      />
      <input
        className="input-glass"
        placeholder="Tags, comma-separated (e.g. assignment-3, jsx)"
        value={tagsRaw}
        onChange={(e) => setTagsRaw(e.target.value)}
      />
      <div className="flex justify-end">
        <Button size="sm" type="submit" loading={busy}>
          Post
        </Button>
      </div>
    </form>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 rounded-md border text-xs font-medium transition-colors ${
        active
          ? "bg-amber-500/10 text-foreground border-amber-400/30"
          : "bg-secondary text-muted-foreground border-border hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.round(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
