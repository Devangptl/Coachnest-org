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
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Refund Impact</h1>
          <p className="text-muted-foreground/70 text-sm mt-1">
            Refunds are proportional to unused course content. You only lose the amount for content students didn&apos;t consume.
          </p>
        </div>
        <button onClick={load} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all" title="Refresh">
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <GlassCard className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
            <RotateCcw className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">{summary.count}</div>
            <div className="text-xs text-muted-foreground">Processed Refunds</div>
          </div>
        </GlassCard>
        <GlassCard className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
            <TrendingDown className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-red-400">
              −₹{summary.totalLoss.toLocaleString("en-IN")}
            </div>
            <div className="text-xs text-muted-foreground">Total Earnings Lost</div>
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
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <BookOpen className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm text-foreground truncate">{c.title}</span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs text-muted-foreground">{c.count} refund{c.count !== 1 ? "s" : ""}</span>
                        <span className="text-sm font-bold text-red-400">−₹{c.loss.toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-border overflow-hidden">
                      <div
                        className="h-full rounded-full bg-red-500/60 transition-all"
                        style={{ width: `${(c.loss / maxLoss) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Refund history */}
          <GlassCard>
            <h2 className="text-base font-semibold text-foreground mb-4">Refund History</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-left">
                    <th className="pb-2 font-medium pr-4">Course</th>
                    <th className="pb-2 font-medium text-right">Progress</th>
                    <th className="pb-2 font-medium text-right">Refund %</th>
                    <th className="pb-2 font-medium text-right">Order Amt</th>
                    <th className="pb-2 font-medium text-right">Your Loss</th>
                    <th className="pb-2 font-medium text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {refunds.map((r) => (
                    <tr key={r.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="py-2.5 pr-4 font-medium text-foreground max-w-[180px] truncate">{r.courseTitle}</td>
                      <td className="py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-border overflow-hidden">
                            <div
                              className={cn("h-full rounded-full", r.progressPercent >= 50 ? "bg-amber-500" : "bg-emerald-500")}
                              style={{ width: `${r.progressPercent}%` }}
                            />
                          </div>
                          <span className="text-muted-foreground text-xs w-8 text-right">{r.progressPercent.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-right text-muted-foreground">{r.refundPercent.toFixed(0)}%</td>
                      <td className="py-2.5 text-right text-muted-foreground">₹{r.originalAmount.toLocaleString("en-IN")}</td>
                      <td className="py-2.5 text-right text-red-400 font-semibold">−₹{r.instructorLoss.toLocaleString("en-IN")}</td>
                      <td className="py-2.5 text-right text-muted-foreground text-xs">
                        {r.processedAt ? new Date(r.processedAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>

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
