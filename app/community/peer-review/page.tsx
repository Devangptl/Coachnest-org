"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ClipboardCheck, Plus, FileText, Star, Lock } from "lucide-react";
import toast from "react-hot-toast";
import { usePurchasedFeatures } from "@/hooks/usePurchasedFeatures";
import CommunityAccessNotice from "@/components/CommunityAccessNotice";

interface Assignment {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  submittedBy?: { id: string; name: string; avatar: string | null };
  _count: { reviews: number };
}

export default function PeerReviewPage() {
  const { hasCommunityAccess: hasInstructorQA, isLoading: subLoading } = usePurchasedFeatures();
  const [tab, setTab] = useState<"submissions" | "review-queue">("submissions");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => { load(); }, [tab]);

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
    <div className="py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Peer Review</h1>
          <p className="text-muted-foreground text-sm mt-1">Submit work for feedback or review others&apos; assignments.</p>
        </div>

        {hasInstructorQA ? (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors flex-shrink-0"
          >
            <Plus className="w-4 h-4" /> Submit Work
          </button>
        ) : (
          <button
            onClick={handleLockedClick}
            disabled={subLoading}
            className="flex items-center gap-2 bg-secondary border border-border text-muted-foreground text-sm font-semibold px-4 py-2.5 rounded-lg cursor-not-allowed flex-shrink-0 opacity-60"
            title="Requires Community Access add-on"
          >
            <Lock className="w-3.5 h-3.5" /> Submit Work
          </button>
        )}
      </div>

      {/* Pro upgrade notice */}
      {!subLoading && !hasInstructorQA && <CommunityAccessNotice action="peer-review" />}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-secondary rounded-lg w-fit">
        {[
          { key: "submissions", label: "My Submissions" },
          { key: "review-queue", label: "Review Queue" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
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
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="h-24 rounded-lg bg-secondary/50 animate-pulse" />
          ))}
        </div>
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
              className="block p-5 rounded-md border border-border bg-card  transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-foreground font-semibold text-sm  transition-colors flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    {a.title}
                  </p>
                  <p className="text-muted-foreground text-xs mt-1 line-clamp-2">{a.content}</p>
                  <div className="flex items-center gap-3 mt-2 text-muted-foreground/60 text-xs">
                    {a.submittedBy && <span>by {a.submittedBy.name}</span>}
                    <span>{new Date(a.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs flex-shrink-0 bg-secondary/60 px-2.5 py-1.5 rounded-lg">
                  <Star className="w-3.5 h-3.5" />
                  {a._count.reviews} review{a._count.reviews !== 1 ? "s" : ""}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Submit Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative bg-card border border-border rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <h2 className="text-lg font-bold text-foreground mb-4">Submit for Peer Review</h2>
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
