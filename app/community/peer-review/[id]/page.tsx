"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { ArrowLeft, Star, Send, FileText, Clock, User } from "lucide-react";
import toast from "react-hot-toast";

interface Review {
  id: string;
  rating: number;
  feedback: string;
  rubricScores: Record<string, number> | null;
  createdAt: string;
  reviewer: { id: string; name: string; avatar: string | null };
}

interface Assignment {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  submittedBy: { id: string; name: string; avatar: string | null };
  reviews: Review[];
}

const RUBRIC_KEYS = ["clarity", "depth", "structure", "originality"];

export default function PeerReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [rubric, setRubric] = useState<Record<string, number>>({});
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  async function loadAssignment() {
    try {
      const [aRes, meRes] = await Promise.all([
        fetch(`/api/community/peer-review/${id}`),
        fetch("/api/auth/me"),
      ]);
      const aData = await aRes.json();
      const meData = await meRes.json();
      setAssignment(aData.assignment);
      setCurrentUserId(meData.user?.id || null);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAssignment(); }, [id]);

  async function handleSubmitReview() {
    if (!rating || !feedback.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/community/peer-review/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, feedback, rubricScores: Object.keys(rubric).length ? rubric : null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Review submitted!");
      setRating(0);
      setFeedback("");
      setRubric({});
      loadAssignment();
    } catch (e: any) {
      toast.error(e.message || "Failed to submit review");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="py-8 space-y-4">
        <div className="h-8 w-32 rounded bg-secondary/50 animate-pulse" />
        <div className="h-60 rounded-md bg-secondary/50 animate-pulse" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">Assignment not found.</p>
        <Link href="/community/peer-review" className="text-emerald-400 text-sm mt-2 inline-block hover:underline">← Back</Link>
      </div>
    );
  }

  const isOwnSubmission = assignment.submittedBy.id === currentUserId;
  const alreadyReviewed = assignment.reviews.some(r => r.reviewer.id === currentUserId);
  const avgRating = assignment.reviews.length
    ? (assignment.reviews.reduce((s, r) => s + r.rating, 0) / assignment.reviews.length).toFixed(1)
    : "—";

  return (
    <div className="py-6 sm:py-8 space-y-5 sm:space-y-6">
      <Link href="/community/peer-review" className="inline-flex items-center gap-1.5 text-muted-foreground text-sm hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Peer Review
      </Link>

      {/* Assignment */}
      <div className="rounded-md border border-border bg-card p-4 sm:p-6">
        <div className="flex items-start gap-2 mb-3">
          <FileText className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
          <h1 className="text-lg sm:text-xl font-bold text-foreground break-words">{assignment.title}</h1>
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap break-words">{assignment.content}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5 truncate max-w-full">
            <User className="w-3.5 h-3.5 flex-shrink-0" /> <span className="truncate">{assignment.submittedBy.name}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> {new Date(assignment.createdAt).toLocaleDateString()}
          </span>
          <span className="flex items-center gap-1.5 sm:ml-auto">
            <Star className="w-3.5 h-3.5 text-amber-400" /> {avgRating} ({assignment.reviews.length})
          </span>
        </div>
      </div>

      {/* Existing Reviews */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Reviews ({assignment.reviews.length})
        </h2>
        {assignment.reviews.length === 0 ? (
          <div className="rounded-md border border-border bg-card p-8 text-center">
            <Star className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
            <p className="text-muted-foreground text-sm">No reviews yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {assignment.reviews.map((r) => (
              <div key={r.id} className="rounded-md border border-border bg-card p-4 sm:p-5">
                <div className="flex items-center gap-1 mb-2">
                  {[1,2,3,4,5].map((s) => (
                    <Star key={s} className={`w-4 h-4 ${s <= r.rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />
                  ))}
                </div>
                <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap break-words">{r.feedback}</p>
                {r.rubricScores && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {Object.entries(r.rubricScores as Record<string, number>).map(([key, val]) => (
                      <span key={key} className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-secondary text-muted-foreground capitalize">
                        {key}: {val}/5
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-3 text-muted-foreground text-xs">
                  <span className="truncate max-w-[180px]">{r.reviewer.name}</span>
                  <span>·</span>
                  <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit Review Form */}
      {!isOwnSubmission && !alreadyReviewed && (
        <div className="rounded-md border border-border bg-card p-4 sm:p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Write a Review</h3>

          {/* Star Rating */}
          <div className="mb-4">
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Overall Rating</label>
            <div className="flex gap-1">
              {[1,2,3,4,5].map((s) => (
                <button
                  key={s}
                  onClick={() => setRating(s)}
                  className="transition-transform hover:scale-110 p-1 -m-1"
                >
                  <Star className={`w-6 h-6 ${s <= rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />
                </button>
              ))}
            </div>
          </div>

          {/* Rubric Scores */}
          <div className="mb-4">
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Rubric Scores (optional)</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              {RUBRIC_KEYS.map((key) => (
                <div key={key} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-secondary">
                  <span className="text-xs text-muted-foreground capitalize truncate">{key}</span>
                  <div className="flex gap-0.5 flex-shrink-0">
                    {[1,2,3,4,5].map((v) => (
                      <button
                        key={v}
                        onClick={() => setRubric(prev => ({ ...prev, [key]: v }))}
                        className="transition-transform hover:scale-110 p-0.5"
                      >
                        <Star className={`w-3.5 h-3.5 ${v <= (rubric[key] || 0) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/20"}`} />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Feedback */}
          <div className="mb-4">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Feedback</label>
            <textarea
              rows={4}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Provide constructive, detailed feedback..."
              className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 resize-none"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSubmitReview}
              disabled={sending || !rating || !feedback.trim()}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors w-full sm:w-auto"
            >
              <Send className="w-4 h-4" />
              {sending ? "Submitting…" : "Submit Review"}
            </button>
          </div>
        </div>
      )}

      {alreadyReviewed && !isOwnSubmission && (
        <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
          <p className="text-emerald-400 text-sm font-medium">✓ You&apos;ve already reviewed this assignment</p>
        </div>
      )}
    </div>
  );
}
