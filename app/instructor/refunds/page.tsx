"use client";

/**
 * /instructor/refunds — Instructor view of processed refunds impacting earnings.
 * Read-only: instructors cannot approve or reject refunds.
 */
import { useEffect, useState } from "react";
import {
  Loader2, AlertCircle, RefreshCw, TrendingDown, BookOpen, RotateCcw,
} from "lucide-react";
import GlassCard from "@/components/GlassCard";
import { cn } from "@/lib/utils";

interface RefundEntry {
  id:              string;
  courseId:        string;
  courseTitle:     string;
  progressPercent: number;
  refundPercent:   number;
  originalAmount:  number;
  instructorLoss:  number;
  processedAt:     string | null;
}

interface ByCourse {
  courseId: string;
  title:    string;
  count:    number;
  loss:     number;
}

interface ImpactData {
  summary:  { count: number; totalLoss: number };
  byCourse: ByCourse[];
  refunds:  RefundEntry[];
}

function ProgressBar({ value }: { value: number }) {
  const pct = Math.min(value, 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-border overflow-hidden">
        <div
          className={cn("h-full rounded-full", pct >= 50 ? "bg-amber-500" : "bg-emerald-500")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">{pct.toFixed(0)}%</span>
    </div>
  );
}

export default function InstructorRefundsPage() {
  const [data,    setData]    = useState<ImpactData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/instructor/refunds");
      if (!res.ok) throw new Error("Failed to load refund data.");
      setData(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <GlassCard className="text-center py-12">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">{error || "No data."}</p>
        <button onClick={load} className="btn-primary mt-4 inline-flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </GlassCard>
    );
  }

  const { summary, byCourse, refunds } = data;
  const maxLoss = Math.max(...byCourse.map((c) => c.loss), 1);

  return (
    <div className="space-y-6 sm:space-y-8">

      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Refund Impact</h1>
          <button
            onClick={load}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all flex-shrink-0"
            title="Refresh"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>
        <p className="text-muted-foreground/70 text-sm">
          Refunds are proportional to unused course content. You only lose the amount for content students didn&apos;t consume.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <GlassCard padding="sm" className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
            <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-foreground">{summary.count}</div>
            <div className="text-[11px] sm:text-xs text-muted-foreground">Processed Refunds</div>
          </div>
        </GlassCard>
        <GlassCard padding="sm" className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
            <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-red-400">
              −₹{summary.totalLoss.toLocaleString("en-IN")}
            </div>
            <div className="text-[11px] sm:text-xs text-muted-foreground">Earnings Lost</div>
          </div>
        </GlassCard>
      </div>

      {summary.count === 0 ? (
        <GlassCard className="text-center py-16">
          <TrendingDown className="w-12 h-12 text-muted-foreground/25 mx-auto mb-4" />
          <p className="text-foreground font-semibold mb-1">No refunds yet</p>
          <p className="text-muted-foreground text-sm">
            Refund impact will appear here when students request refunds on your courses.
          </p>
        </GlassCard>
      ) : (
        <>
          {/* Per-course breakdown */}
          {byCourse.length > 0 && (
            <GlassCard>
              <h2 className="text-base font-semibold text-foreground mb-4">Loss by Course</h2>
              <div className="space-y-4">
                {byCourse.map((c) => (
                  <div key={c.courseId}>
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <BookOpen className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-foreground line-clamp-2">{c.title}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          {c.count} refund{c.count !== 1 ? "s" : ""}
                        </span>
                        <span className="text-sm font-bold text-red-400">
                          −₹{c.loss.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-border overflow-hidden">
                      <div
                        className="h-full rounded-full bg-red-500/60 transition-all"
                        style={{ width: `${(c.loss / maxLoss) * 100}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 sm:hidden">
                      {c.count} refund{c.count !== 1 ? "s" : ""}
                    </p>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Refund history — card list */}
          <div>
            <h2 className="text-base font-semibold text-foreground mb-3">Refund History</h2>
            <div className="space-y-2.5">
              {refunds.map((r) => (
                <GlassCard key={r.id} padding="sm">
                  {/* Row 1: course title + loss */}
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-foreground line-clamp-2 flex-1">{r.courseTitle}</p>
                    <span className="text-sm font-bold text-red-400 flex-shrink-0">
                      −₹{r.instructorLoss.toLocaleString("en-IN")}
                    </span>
                  </div>

                  {/* Row 2: progress bar */}
                  <div className="mt-2">
                    <ProgressBar value={r.progressPercent} />
                  </div>

                  {/* Row 3: meta */}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                    <span>{r.progressPercent.toFixed(0)}% progress</span>
                    <span>·</span>
                    <span>{r.refundPercent.toFixed(0)}% refunded</span>
                    <span>·</span>
                    <span>Order ₹{r.originalAmount.toLocaleString("en-IN")}</span>
                    {r.processedAt && (
                      <>
                        <span>·</span>
                        <span>{new Date(r.processedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                      </>
                    )}
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>

          {/* Policy note */}
          <GlassCard className="bg-secondary/30">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Refund policy:</strong> Students are eligible for a refund if they have completed less than 80% of a course.
              The refund amount is proportional to unused content — if a student completed 40%, they receive a 60% refund.
              Your earnings are only reduced by your share of the refund (not the full order amount).
            </p>
          </GlassCard>
        </>
      )}
    </div>
  );
}
