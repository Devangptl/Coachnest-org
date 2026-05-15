"use client";

/**
 * Forums client component — receives server-fetched initial data.
 * Re-fetches only when user changes sort or navigates pages.
 */
import { useState } from "react";
import Link from "next/link";
import { MessageSquare, Plus, Search, CheckCircle, Lock } from "lucide-react";
import toast from "react-hot-toast";
import CommunityAccessNotice from "@/components/CommunityAccessNotice";

interface Thread {
  id: string;
  title: string;
  body: string;
  courseId: string | null;
  isPinned: boolean;
  isResolved: boolean;
  createdAt: string;
  author: { id: string; name: string; avatar: string | null };
  _count: { replies: number };
}

interface ForumsClientProps {
  initialThreads: Thread[];
  initialTotal: number;
  initialTotalPages: number;
  hasCommunityAccess: boolean;
}

export default function ForumsClient({
  initialThreads,
  initialTotal,
  initialTotalPages,
  hasCommunityAccess,
}: ForumsClientProps) {
  const [threads, setThreads] = useState<Thread[]>(initialThreads);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"recent" | "popular">("recent");
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialTotalPages);

  async function load(p = 1, s = sort) {
    setLoading(true);
    try {
      const res = await fetch(`/api/community/forums?page=${p}&sort=${s}`);
      const data = await res.json();
      setThreads(data.threads || []);
      setTotalPages(data.totalPages || 1);
      setPage(p);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }

  function handleSortChange(s: "recent" | "popular") {
    setSort(s);
    load(1, s);
  }

  function handleLockedClick() {
    toast("Community Access required to post in forums.", { icon: "🔒" });
  }

  async function handleCreate() {
    if (!newTitle.trim() || !newBody.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/community/forums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, body: newBody }),
      });
      if (!res.ok) throw new Error();
      toast.success("Thread created!");
      setShowCreate(false);
      setNewTitle("");
      setNewBody("");
      load();
    } catch {
      toast.error("Failed to create thread");
    } finally {
      setCreating(false);
    }
  }

  const filtered = threads.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="py-6 sm:py-8 space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Discussion Forums</h1>
          <p className="text-muted-foreground text-sm mt-1">Ask questions, share knowledge, and learn together.</p>
        </div>

        {hasCommunityAccess ? (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors flex-shrink-0 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" /> New Thread
          </button>
        ) : (
          <button
            onClick={handleLockedClick}
            className="flex items-center justify-center gap-2 bg-secondary border border-border text-muted-foreground text-sm font-semibold px-4 py-2.5 rounded-lg cursor-not-allowed flex-shrink-0 opacity-60 w-full sm:w-auto"
            title="Requires Community Access add-on"
          >
            <Lock className="w-3.5 h-3.5" /> New Thread
          </button>
        )}
      </div>

      {/* Pro upgrade notice */}
      {!hasCommunityAccess && <CommunityAccessNotice action="post" />}

      {/* Toolbar — search + sort */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search discussions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-secondary/20 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all"
          />
        </div>
        <div className="flex gap-1 p-1 bg-secondary rounded-lg flex-shrink-0 self-start sm:self-auto">
          {(["recent", "popular"] as const).map((s) => (
            <button
              key={s}
              onClick={() => handleSortChange(s)}
              className={`flex-1 sm:flex-initial px-3 py-1.5 text-xs font-medium rounded-md transition-all capitalize ${
                sort === s ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Thread List */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-20 rounded-lg bg-secondary/50 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-md border border-border bg-card p-12 text-center">
          <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-muted-foreground text-sm">
            {search ? "No threads match your search." : "No discussions yet. Be the first to start one!"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <Link
              key={t.id}
              href={`/community/forums/${t.id}`}
              className="block p-4 sm:p-5 rounded-md border border-border bg-card transition-all group"
            >
              <div className="flex items-start justify-between gap-3 sm:gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                    {t.isPinned && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                        Pinned
                      </span>
                    )}
                    {t.isResolved && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-3 h-3" /> Resolved
                      </span>
                    )}
                  </div>
                  <p className="text-foreground font-semibold text-sm transition-colors line-clamp-2">{t.title}</p>
                  <p className="text-muted-foreground text-xs mt-1 line-clamp-1">{t.body}</p>
                  <p className="text-muted-foreground/60 text-xs mt-2 truncate">
                    {t.author.name} · {new Date(t.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs flex-shrink-0 bg-secondary/60 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg">
                  <MessageSquare className="w-3.5 h-3.5" />
                  {t._count.replies}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4 flex-wrap">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => load(p)}
              className={`w-9 h-9 sm:w-8 sm:h-8 rounded-lg text-xs font-medium transition-all ${
                p === page
                  ? "bg-emerald-600 text-white"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Create Thread Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative bg-card border border-border rounded-md p-4 sm:p-6 w-full max-w-lg shadow-2xl my-auto max-h-[calc(100vh-2rem)] overflow-y-auto">
            <h2 className="text-base sm:text-lg font-bold text-foreground mb-4">Start a New Discussion</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="What's your question or topic?"
                  autoFocus
                  className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Body</label>
                <textarea
                  rows={5}
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  placeholder="Describe your question or share your thoughts..."
                  className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 resize-none"
                />
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating || !newTitle.trim() || !newBody.trim()}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
                >
                  {creating ? "Creating…" : "Post Thread"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
