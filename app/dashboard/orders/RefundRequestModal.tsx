"use client";

/**
 * RefundRequestModal — shown when a student clicks "Request Refund".
 * Fetches eligibility first, then lets the student confirm and submit.
 */
import { useState, useEffect } from "react";
import { X, Loader2, AlertCircle, CheckCircle2, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface EligibilityData {
  eligible:         boolean;
  reason?:          string;
  progressPercent?: number;
  completedLessons?: number;
  totalLessons?:    number;
  refundPercent?:   number;
  originalAmount?:  number;
  refundAmount?:    number;
  instructorLoss?:  number;
  platformLoss?:    number;
  courseTitle?:     string;
  existingStatus?:  string;
}

export default function RefundRequestModal({
  orderId,
  courseTitle,
  onClose,
  onSuccess,
}: {
  orderId:     string;
  courseTitle: string;
  onClose:     () => void;
  onSuccess:   () => void;
}) {
  const [eligibility, setEligibility] = useState<EligibilityData | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [submitting,  setSubmitting]  = useState(false);
  const [reason,      setReason]      = useState("");
  const [error,       setError]       = useState("");

  useEffect(() => {
    fetch(`/api/refunds/eligibility?orderId=${orderId}`)
      .then((r) => r.json())
      .then((d) => setEligibility(d.data ?? d))
      .catch(() => setError("Failed to check eligibility."))
      .finally(() => setLoading(false));
  }, [orderId]);

  async function handleSubmit() {
    if (!eligibility?.eligible) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/refunds", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ orderId, reason: reason.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit refund request.");
      toast.success("Refund request submitted! We'll review it within 1–2 business days.");
      onSuccess();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error submitting request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Request Refund</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
            </div>
          ) : !eligibility ? (
            <p className="text-red-400 text-sm text-center">{error || "Could not load eligibility."}</p>
          ) : !eligibility.eligible ? (
            /* Ineligible state */
            <div className="space-y-4">
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-red-400 text-sm font-medium">Not eligible for refund</p>
                    <p className="text-muted-foreground text-xs mt-1">{eligibility.reason}</p>
                  </div>
                </div>
              </div>
              {eligibility.progressPercent !== undefined && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Your progress</span>
                    <span className="text-foreground font-medium">{eligibility.progressPercent.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full rounded-full bg-red-500 transition-all"
                      style={{ width: `${Math.min(eligibility.progressPercent, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Refunds require less than 80% course completion.
                  </p>
                </div>
              )}
              <button onClick={onClose} className="w-full py-2 rounded-lg bg-secondary text-sm text-muted-foreground hover:text-foreground transition-all">
                Close
              </button>
            </div>
          ) : (
            /* Eligible state */
            <div className="space-y-4">
              {/* Progress summary */}
              <div className="rounded-lg bg-secondary/50 p-4 space-y-2 text-sm">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Refund Breakdown</p>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Course</span>
                  <span className="text-foreground truncate max-w-[180px]">{courseTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Progress completed</span>
                  <span className="text-foreground">{eligibility.progressPercent?.toFixed(1)}% ({eligibility.completedLessons}/{eligibility.totalLessons} lessons)</span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1 py-1">
                  <div className="h-1.5 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-all"
                      style={{ width: `${Math.min(eligibility.progressPercent ?? 0, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(100 - (eligibility.progressPercent ?? 0)).toFixed(1)}% unused — this is your refund percentage
                  </p>
                </div>

                <div className="border-t border-border pt-2 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount paid</span>
                    <span className="text-foreground">₹{eligibility.originalAmount?.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span className="text-muted-foreground">Refund amount ({eligibility.refundPercent?.toFixed(0)}%)</span>
                    <span className="text-emerald-400">₹{eligibility.refundAmount?.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-400">
                Refunds are reviewed within 1–2 business days. If approved, funds arrive in 5–10 business days.
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Reason (optional)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Why are you requesting a refund?"
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none"
                />
              </div>

              {error && (
                <p className="text-sm text-red-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> {error}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <><TrendingDown className="w-3.5 h-3.5" /> Submit Request</>
                  }
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
