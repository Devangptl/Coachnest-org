"use client";

/**
 * RefundsAdminClient — admin refund management UI.
 * Displays all refund requests with filters, stats, and approve/reject actions.
 */
import { useEffect, useState, useCallback } from "react";
import {
  Loader2, AlertCircle, RefreshCw, CheckCircle2, XCircle, Clock,
  ChevronDown, ChevronUp, Search, RotateCcw, TrendingDown,
  BookOpen, BarChart3, Filter,
} from "lucide-react";
import GlassCard from "@/components/GlassCard";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

// ── Types ──────────────────────────────────────────────────────────────────────

interface RefundRequest {
  id:               string;
  orderId:          string;
  status:           "PENDING" | "PROCESSING" | "PROCESSED" | "REJECTED" | "FAILED";
  progressPercent:  number;
  completedLessons: number;
  totalLessons:     number;
  refundPercent:    number;
  originalAmount:   number;
  refundAmount:     number;
  instructorLoss:   number;
  platformLoss:     number;
  reason:           string | null;
  adminNotes:       string | null;
  admin:            { name: string } | null;
  stripeRefundId:   string | null;
  requestedAt:      string;
  reviewedAt:       string | null;
  processedAt:      string | null;
  saleSource:       string;
  user:  { id: string; name: string; email: string; avatar: string | null };
  course:{ id: string; title: string };
}

interface StatEntry { status: string; count: number; total: number }

// ── Status config ──────────────────────────────────────────────────────────────

const STATUS_CFG = {
  PENDING:    { label: "Pending",    color: "text-amber-400",   bg: "bg-amber-500/10",   icon: Clock },
  PROCESSING: { label: "Processing", color: "text-blue-400",    bg: "bg-blue-500/10",    icon: Loader2 },
  PROCESSED:  { label: "Processed",  color: "text-emerald-400", bg: "bg-emerald-500/10", icon: CheckCircle2 },
  REJECTED:   { label: "Rejected",   color: "text-red-400",     bg: "bg-red-500/10",     icon: XCircle },
  FAILED:     { label: "Failed",     color: "text-[#d97757]",  bg: "bg-orange-500/10",  icon: AlertCircle },
} as const;

const ALL_STATUSES = ["ALL", "PENDING", "PROCESSING", "PROCESSED", "REJECTED", "FAILED"] as const;
type FilterStatus = (typeof ALL_STATUSES)[number];

// ── Action modal ───────────────────────────────────────────────────────────────

function ActionModal({
  request,
  action,
  onClose,
  onDone,
}: {
  request: RefundRequest;
  action:  "APPROVE" | "REJECT";
  onClose: () => void;
  onDone:  () => void;
}) {
  const [notes,   setNotes]   = useState(request.adminNotes ?? "");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const isApprove = action === "APPROVE";

  async function submit() {
    setLoading(true);
    setError("");
    try {
      const endpoint = isApprove
        ? `/api/admin/refunds/${request.id}/approve`
        : `/api/admin/refunds/${request.id}/reject`;

      const res = await fetch(endpoint, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ adminNotes: notes }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed.");
      toast.success(data.message || (isApprove ? "Refund processed!" : "Request rejected."));
      onDone();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-md shadow-2xl w-full max-w-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          {isApprove ? "Approve & Process Refund" : "Reject Refund Request"}
        </h2>

        {/* Summary */}
        <div className="rounded-lg bg-secondary/50 p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Student</span>
            <span className="text-foreground font-medium">{request.user.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Course</span>
            <span className="text-foreground truncate max-w-[200px]">{request.course.title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Progress</span>
            <span className="text-foreground">{request.progressPercent.toFixed(1)}% ({request.completedLessons}/{request.totalLessons} lessons)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Original Paid</span>
            <span className="text-foreground">₹{request.originalAmount.toLocaleString("en-IN")}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2 mt-1">
            <span className="text-muted-foreground">Refund Amount ({request.refundPercent.toFixed(0)}%)</span>
            <span className={cn("font-bold", isApprove ? "text-emerald-400" : "text-foreground")}>
              ₹{request.refundAmount.toLocaleString("en-IN")}
            </span>
          </div>
          {isApprove && (
            <>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Instructor loss</span>
                <span className="text-red-400">−₹{request.instructorLoss.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Platform loss</span>
                <span className="text-red-400">−₹{request.platformLoss.toLocaleString("en-IN")}</span>
              </div>
            </>
          )}
        </div>

        {request.reason && (
          <div className="text-sm">
            <p className="text-xs font-medium text-muted-foreground mb-1">Student Reason</p>
            <p className="text-foreground bg-secondary/30 rounded p-2 text-xs">{request.reason}</p>
          </div>
        )}

        {isApprove && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-400">
            This will immediately issue a Stripe refund, revoke course access, and debit the instructor wallet.
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Admin Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder={isApprove ? "Internal note for this refund…" : "Reason for rejection (shown to student)…"}
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none"
          />
        </div>

        {error && (
          <p className="text-sm text-red-400 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" /> {error}
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className={cn(
              "flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50",
              isApprove ? "bg-emerald-600 hover:bg-emerald-500" : "bg-red-600 hover:bg-red-500"
            )}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
            ) : (
              isApprove ? "Approve & Refund" : "Reject Request"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-border overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pct >= 80 ? "bg-red-500" : pct >= 50 ? "bg-amber-500" : "bg-emerald-500"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground w-10 text-right">{value.toFixed(0)}%</span>
    </div>
  );
}

// ── Table row ─────────────────────────────────────────────────────────────────

function RefundRow({
  req,
  onAction,
}: {
  req:      RefundRequest;
  onAction: (req: RefundRequest, action: "APPROVE" | "REJECT") => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg  = STATUS_CFG[req.status];
  const Icon = cfg.icon;

  return (
    <>
      <tr
        className="hover:bg-secondary/30 transition-colors cursor-pointer"
        onClick={() => setExpanded((p) => !p)}
      >
        {/* Student */}
        <td className="py-3 px-4">
          <div className="flex items-center gap-3">
            {req.user.avatar ? (
              <img src={req.user.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
                {req.user.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{req.user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{req.user.email}</p>
            </div>
          </div>
        </td>

        {/* Course */}
        <td className="py-3 px-4 max-w-[160px]">
          <p className="text-sm text-foreground truncate">{req.course.title}</p>
        </td>

        {/* Progress */}
        <td className="py-3 px-4 w-36">
          <ProgressBar value={req.progressPercent} />
        </td>

        {/* Refund amount */}
        <td className="py-3 px-4 text-right">
          <p className="text-sm font-semibold text-foreground">
            ₹{req.refundAmount.toLocaleString("en-IN")}
          </p>
          <p className="text-xs text-muted-foreground">{req.refundPercent.toFixed(0)}% of ₹{req.originalAmount.toLocaleString("en-IN")}</p>
        </td>

        {/* Requested */}
        <td className="py-3 px-4 text-right text-muted-foreground text-sm whitespace-nowrap">
          {new Date(req.requestedAt).toLocaleDateString()}
        </td>

        {/* Status */}
        <td className="py-3 px-4 text-right">
          <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium", cfg.bg, cfg.color)}>
            <Icon className="w-3 h-3" /> {cfg.label}
          </span>
        </td>

        {/* Actions */}
        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-2">
            {req.status === "PENDING" && (
              <>
                <button
                  onClick={() => onAction(req, "APPROVE")}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors"
                >
                  Approve
                </button>
                <button
                  onClick={() => onAction(req, "REJECT")}
                  className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors"
                >
                  Reject
                </button>
              </>
            )}
            <button className="p-1 text-muted-foreground hover:text-foreground transition-colors">
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </td>
      </tr>

      {/* Expanded detail */}
      {expanded && (
        <tr className="bg-secondary/10">
          <td colSpan={7} className="px-4 pb-4 pt-2">
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              {/* Financial breakdown */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Financial Breakdown</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Original paid</span>
                    <span className="font-medium text-foreground">₹{req.originalAmount.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Refund ({req.refundPercent.toFixed(0)}%)</span>
                    <span className="font-medium text-emerald-400">₹{req.refundAmount.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">→ Instructor loss</span>
                    <span className="text-red-400">−₹{req.instructorLoss.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">→ Platform loss</span>
                    <span className="text-red-400">−₹{req.platformLoss.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>

              {/* Progress + reason */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Details</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="text-foreground">{req.completedLessons}/{req.totalLessons} lessons ({req.progressPercent.toFixed(1)}%)</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Sale source</span>
                    <span className="text-foreground">{req.saleSource}</span>
                  </div>
                  {req.stripeRefundId && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Stripe refund</span>
                      <code className="text-blue-400 font-mono">{req.stripeRefundId}</code>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Notes</p>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Student reason</p>
                    <p className="text-xs text-foreground bg-secondary/30 rounded p-1.5">{req.reason || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Admin notes</p>
                    <p className="text-xs text-foreground bg-secondary/30 rounded p-1.5">{req.adminNotes || "—"}</p>
                  </div>
                  {req.admin && (
                    <p className="text-xs text-muted-foreground">Reviewed by {req.admin.name}</p>
                  )}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function RefundsAdminClient() {
  const [requests, setRequests] = useState<RefundRequest[]>([]);
  const [stats,    setStats]    = useState<StatEntry[]>([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [filter,   setFilter]   = useState<FilterStatus>("ALL");
  const [search,   setSearch]   = useState("");
  const [modal,    setModal]    = useState<{ req: RefundRequest; action: "APPROVE" | "REJECT" } | null>(null);

  const load = useCallback(async (status?: string) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (status && status !== "ALL") params.set("status", status);
      const res = await fetch(`/api/admin/refunds?${params}`);
      if (!res.ok) throw new Error("Failed to load refund requests.");
      const d = await res.json();
      setRequests(d.data);
      setStats(d.stats);
      setTotal(d.total);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(filter); }, [filter, load]);

  // Aggregate stats
  const totalPending   = stats.find((s) => s.status === "PENDING")?.total   ?? 0;
  const countPending   = stats.find((s) => s.status === "PENDING")?.count   ?? 0;
  const totalProcessed = stats.find((s) => s.status === "PROCESSED")?.total ?? 0;
  const totalAll       = stats.reduce((s, v) => s + v.total, 0);

  // Client-side search filter
  const visible = requests.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.user.name?.toLowerCase().includes(q) ||
      r.user.email?.toLowerCase().includes(q) ||
      r.course.title?.toLowerCase().includes(q)
    );
  });

  if (error) {
    return (
      <GlassCard className="text-center py-12">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">{error}</p>
        <button onClick={() => load(filter)} className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Requests",  value: total,          sub: "all time",       icon: RotateCcw,    color: "text-violet-400",  bg: "bg-violet-500/10",  isCount: true },
          { label: "Pending Amount",  value: totalPending,   sub: `${countPending} pending`, icon: Clock, color: "text-amber-400",  bg: "bg-amber-500/10"  },
          { label: "Total Refunded",  value: totalProcessed, sub: "disbursed",      icon: TrendingDown, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Total Volume",    value: totalAll,       sub: "all requests",   icon: BarChart3,    color: "text-blue-400",    bg: "bg-blue-500/10"   },
        ].map(({ label, value, sub, icon: Icon, color, bg, isCount }) => (
          <GlassCard key={label} className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", bg)}>
              <Icon className={cn("w-5 h-5", color)} />
            </div>
            <div className="min-w-0">
              <div className="text-xl font-bold text-foreground">
                {isCount ? value : `₹${Number(value).toLocaleString("en-IN")}`}
              </div>
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="text-[10px] text-muted-foreground/60">{sub}</div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Filter + search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 flex-wrap">
          {ALL_STATUSES.map((s) => {
            const count = s === "ALL" ? total : (stats.find((x) => x.status === s)?.count ?? 0);
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                  filter === s
                    ? "bg-orange-500 text-white border-orange-500"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                {s === "ALL" ? "All" : STATUS_CFG[s as keyof typeof STATUS_CFG].label}
                <span className={cn("ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]", filter === s ? "bg-white/20" : "bg-secondary")}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student or course…"
            className="pl-8 pr-3 py-1.5 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-orange-500 w-56"
          />
        </div>

        <button
          onClick={() => load(filter)}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          title="Refresh"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </button>
      </div>

      {/* Table */}
      <GlassCard className="overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-16">
            <RotateCcw className="w-10 h-10 text-muted-foreground/25 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No refund requests found.</p>
          </div>
        ) : (
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-left">
                <th className="pb-2 px-4 font-medium">Student</th>
                <th className="pb-2 px-4 font-medium">Course</th>
                <th className="pb-2 px-4 font-medium">Progress</th>
                <th className="pb-2 px-4 font-medium text-right">Refund</th>
                <th className="pb-2 px-4 font-medium text-right">Requested</th>
                <th className="pb-2 px-4 font-medium text-right">Status</th>
                <th className="pb-2 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.map((req) => (
                <RefundRow
                  key={req.id}
                  req={req}
                  onAction={(r, a) => setModal({ req: r, action: a })}
                />
              ))}
            </tbody>
          </table>
        )}
      </GlassCard>

      {/* Action modal */}
      {modal && (
        <ActionModal
          request={modal.req}
          action={modal.action}
          onClose={() => setModal(null)}
          onDone={() => { setModal(null); load(filter); }}
        />
      )}
    </div>
  );
}
