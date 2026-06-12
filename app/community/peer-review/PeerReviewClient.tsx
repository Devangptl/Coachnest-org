"use client";

/**
 * Peer Review client component — receives server-fetched initial data.
 * Re-fetches only on tab change or submission.
 */
import { useState } from "react";
import Link from "next/link";
import { ClipboardCheck, Plus, FileText, Star, Lock } from "lucide-react";
import toast from "react-hot-toast";
import CommunityAccessNotice from "@/components/CommunityAccessNotice";
import { AssignmentListSkeleton } from "@/components/community/CommunitySkeletons";

interface Assignment {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  submittedBy?: { id: string; name: string; avatar: string | null };
  _count: { reviews: number };
}

interface PeerReviewClientProps {
  initialAssignments: Assignment[];
  hasCommunityAccess: boolean;
}

export default function PeerReviewClient({
  initialAssignments,
  hasCommunityAccess,
}: PeerReviewClientProps) {
  const [tab, setTab] = useState<"submissions" | "review-queue">("submissions");
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [creating, setCreating] = useState(false);

  async function load(t: string = tab) {
    setLoading(true);
    try {
      const res = await fetch(`/api/community/peer-review?tab=${t}`);
      const data = await res.json();
      setAssignments(data.assignments || []);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }

  function handleTabChange(t: "submissions" | "review-queue") {
    setTab(t);
    load(t);
  }

  function handleLockedClick() {
    toast("Community Access required for peer review.", { icon: "🔒" });
  }

  async function handleCreate() {
    if (!newTitle.trim() || !newContent.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/community/peer-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, content: newContent }),
      });
      if (!res.ok) throw new Error();
      toast.success("Assignment submitted!");
      setShowCreate(false);
      setNewTitle("");
      setNewContent("");
      setTab("submissions");
      load("submissions");
    } catch {
      toast.error("Failed to submit");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="py-6 sm:py-8 space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Peer Review</h1>
          <p className="text-muted-foreground text-sm mt-1">Submit work for feedback or review others&apos; assignments.</p>
        </div>

        {hasCommunityAccess ? (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors flex-shrink-0 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" /> Submit Work
          </button>
        ) : (
          <button
            onClick={handleLockedClick}
            className="flex items-center justify-center gap-2 bg-secondary border border-border text-muted-foreground text-sm font-semibold px-4 py-2.5 rounded-lg cursor-not-allowed flex-shrink-0 opacity-60 w-full sm:w-auto"
            title="Requires Community Access add-on"
          >
            <Lock className="w-3.5 h-3.5" /> Submit Work
          </button>
        )}
      </div>

      {/* Pro upgrade notice */}
      {!hasCommunityAccess && <CommunityAccessNotice action="peer-review" />}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-secondary rounded-lg w-full sm:w-fit">
        {[
          { key: "submissions", label: "My Submissions" },
          { key: "review-queue", label: "Review Queue" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => handleTabChange(t.key as typeof tab)}
            className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-all whitespace-nowrap ${
              tab === t.key
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Assignment List */}
      {loading ? (
        <AssignmentListSkeleton rows={4} />
      ) : assignments.length === 0 ? (
        <div className="rounded-md border border-border bg-card p-12 text-center">
          <ClipboardCheck className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-muted-foreground text-sm">
            {tab === "submissions"
              ? "No submissions yet. Submit your work for peer feedback!"
              : "No assignments in the review queue."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => (
            <Link
              key={a.id}
              href={`/community/peer-review/${a.id}`}
              className="block p-4 sm:p-5 rounded-md border border-border bg-card transition-all group"
            >
              <div className="flex items-start justify-between gap-3 sm:gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-foreground font-semibold text-sm transition-colors flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span className="truncate">{a.title}</span>
                  </p>
                  <p className="text-muted-foreground text-xs mt-1 line-clamp-2">{a.content}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-muted-foreground/60 text-xs">
                    {a.submittedBy && <span className="truncate max-w-[160px]">by {a.submittedBy.name}</span>}
                    <span>{new Date(a.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs flex-shrink-0 bg-secondary/60 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg whitespace-nowrap">
                  <Star className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{a._count.reviews} review{a._count.reviews !== 1 ? "s" : ""}</span>
                  <span className="sm:hidden">{a._count.reviews}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Submit Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative bg-card border border-border rounded-md p-4 sm:p-6 w-full max-w-lg shadow-2xl my-auto max-h-[calc(100vh-2rem)] overflow-y-auto">
            <h2 className="text-base sm:text-lg font-bold text-foreground mb-4">Submit for Peer Review</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. My React Portfolio Project"
                  autoFocus
                  className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Content / Description</label>
                <textarea
                  rows={6}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Paste your work, describe your project, include links..."
                  className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 resize-none"
                />
              </div>
              <div className="flex items-center justify-end gap-3">
                <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating || !newTitle.trim() || !newContent.trim()}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
                >
                  {creating ? "Submitting…" : "Submit"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
