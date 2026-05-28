"use client";

/**
 * PayoutsAdminClient — full admin payout management UI.
 * Actions: APPROVE (PENDING → APPROVED), PROCESS (APPROVED → PROCESSED via Razorpay Route),
 *          REJECT (PENDING/APPROVED → REJECTED, refunds balance).
 */
import { useEffect, useState, useCallback } from "react";
import {
  Loader2, AlertCircle, RefreshCw, CheckCircle2, XCircle, Clock,
  BadgeCheck, ChevronDown, ChevronUp, Search, DollarSign,
  Users, TrendingUp, ArrowDownToLine, Filter,
} from "lucide-react";
import GlassCard from "@/components/GlassCard";
import Avatar from "@/components/Avatar";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

interface PayoutRequest {
  id:             string;
  amount:         number;
  currency:       string;
  status:         "PENDING" | "APPROVED" | "REJECTED" | "PROCESSED";
  bankDetails:    Record<string, string> | null;
  notes:          string | null;
  adminNotes:     string | null;
  requestedAt:    string;
  processedAt:    string | null;
  totalEarned:    number;
  totalWithdrawn: number;
  razorpayLinkedAccountId: string | null;
  razorpayTransferId:      string | null;
  razorpayTransferStatus:  string | null;
  instructor: {
    id:     string;
    name:   string;
    email:  string;
    avatar: string | null;
  };
}

interface StatEntry { status: string; count: number; total: number }

// ── Status config ──────────────────────────────────────────────────────────────

const STATUS_CFG = {
  PENDING:   { label: "Pending",   color: "text-amber-400",   bg: "bg-amber-500/10",   icon: Clock },
  APPROVED:  { label: "Approved",  color: "text-blue-400",    bg: "bg-blue-500/10",    icon: BadgeCheck },
  PROCESSED: { label: "Processed", color: "text-emerald-400", bg: "bg-emerald-500/10", icon: CheckCircle2 },
  REJECTED:  { label: "Rejected",  color: "text-red-400",     bg: "bg-red-500/10",     icon: XCircle },
} as const;

const ALL_STATUSES = ["ALL", "PENDING", "APPROVED", "PROCESSED", "REJECTED"] as const;
type FilterStatus = (typeof ALL_STATUSES)[number];

// ── Confirm action modal ───────────────────────────────────────────────────────

function ActionModal({
  request,
  action,
  onClose,
  onDone,
}: {
  request: PayoutRequest;
  action:  "APPROVE" | "REJECT" | "PROCESS";
  onClose: () => void;
  onDone:  () => void;
}) {
  const [notes,   setNotes]   = useState(request.adminNotes ?? "");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const ACTION_CFG = {
    APPROVE: {
      label:   "Approve",
      color:   "bg-blue-600 hover:bg-blue-500",
      confirm: "Approve this payout request?",
    },
    REJECT: {
      label:   "Reject",
      color:   "bg-red-600 hover:bg-red-500",
      confirm: "Reject & refund balance to instructor?",
    },
    PROCESS: {
      label:   "Transfer via Razorpay Route",
      color:   "bg-emerald-600 hover:bg-emerald-500",
      confirm: "Initiate Razorpay Route transfer to instructor's bank account? Funds settle within T+2 business days.",
    },
  };

  async function submit() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/payouts/${request.id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action, adminNotes: notes }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed.");
      }
      onDone();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  const cfg = ACTION_CFG[action];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-md shadow-2xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">{cfg.confirm}</h2>

        <div className="text-sm text-muted-foreground space-y-1">
          <p><span className="text-foreground font-medium">{request.instructor.name}</span> — {request.instructor.email}</p>
          <p>Amount: <span className="text-foreground font-semibold">₹{request.amount.toLocaleString()}</span></p>
        </div>

        {action === "PROCESS" && !request.bankDetails?.pan && (
          <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            No PAN on file. This request was submitted before PAN was required — ask the instructor to re-submit with their PAN.
          </p>
        )}

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Admin Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Reason, bank reference, notes…"
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none"
          />
        </div>

        {error && (
          <p className="text-sm text-red-400 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" /> {error}
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className={cn("flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50", cfg.color)}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : cfg.label}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Row expander ───────────────────────────────────────────────────────────────

function PayoutRow({
  req,
  onAction,
}: {
  req:      PayoutRequest;
  onAction: (req: PayoutRequest, action: "APPROVE" | "REJECT" | "PROCESS") => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CFG[req.status];
  const Icon = cfg.icon;

  // Filter out PAN from the displayed bank details (shown separately / sensitive)
  const displayBankDetails = req.bankDetails
    ? Object.fromEntries(Object.entries(req.bankDetails).filter(([k]) => k !== "pan"))
    : null;

  return (
    <>
      <tr
        className="hover:bg-secondary/30 transition-colors cursor-pointer"
        onClick={() => setExpanded((p) => !p)}
      >
        {/* Instructor */}
        <td className="py-3 px-4">
          <div className="flex items-center gap-3">
            <Avatar
              name={req.instructor.name}
              avatar={req.instructor.avatar}
              seed={req.instructor.id}
              size="w-8 h-8"
              className="flex-shrink-0"
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{req.instructor.name}</p>
              <p className="text-xs text-muted-foreground truncate">{req.instructor.email}</p>
            </div>
          </div>
        </td>

        {/* Amount */}
        <td className="py-3 px-4 text-right font-semibold text-foreground whitespace-nowrap">
          ₹{req.amount.toLocaleString()}
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
                  className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-medium hover:bg-blue-500/20 transition-colors"
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
            {req.status === "APPROVED" && (
              <>
                <button
                  onClick={() => onAction(req, "PROCESS")}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors"
                >
                  Process
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

      {/* Expanded detail row */}
      {expanded && (
        <tr className="bg-secondary/10">
          <td colSpan={5} className="px-4 pb-4 pt-2">
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              {/* Bank details (PAN hidden) */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Bank Details</p>
                {displayBankDetails && Object.keys(displayBankDetails).length > 0 ? (
                  <div className="space-y-1">
                    {Object.entries(displayBankDetails).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-muted-foreground capitalize">{k.replace(/([A-Z])/g, " $1").trim()}:</span>
                        <span className="font-medium text-foreground font-mono">{v}</span>
                      </div>
                    ))}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">PAN:</span>
                      <span className="font-medium text-foreground font-mono">
                        {req.bankDetails?.pan ? "✓ on file" : "—"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-xs">No bank details provided.</p>
                )}
              </div>

              {/* Notes + wallet info */}
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Instructor Notes</p>
                  <p className="text-muted-foreground text-xs">{req.notes || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Admin Notes</p>
                  <p className="text-muted-foreground text-xs">{req.adminNotes || "—"}</p>
                </div>
                <div className="flex gap-4 text-xs">
                  <div>
                    <p className="text-muted-foreground">Total Earned</p>
                    <p className="font-semibold text-foreground">₹{req.totalEarned.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Withdrawn</p>
                    <p className="font-semibold text-foreground">₹{req.totalWithdrawn.toLocaleString()}</p>
                  </div>
                  {req.processedAt && (
                    <div>
                      <p className="text-muted-foreground">Processed At</p>
                      <p className="font-semibold text-foreground">{new Date(req.processedAt).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>

                {/* Razorpay Route transfer reference */}
                {req.razorpayTransferId && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Razorpay Route Transfer</p>
                    <div className="space-y-1 text-xs">
                      {req.razorpayLinkedAccountId && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Linked Account</span>
                          <code className="text-blue-400 font-mono">{req.razorpayLinkedAccountId}</code>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Transfer ID</span>
                        <code className="text-emerald-400 font-mono">{req.razorpayTransferId}</code>
                      </div>
                      {req.razorpayTransferStatus && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status</span>
                          <span className={`font-semibold capitalize ${
                            req.razorpayTransferStatus === "settled" ? "text-emerald-400"
                            : req.razorpayTransferStatus === "reversed" ? "text-red-400"
                            : "text-amber-400"
                          }`}>
                            {req.razorpayTransferStatus}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Main client component ──────────────────────────────────────────────────────

export default function PayoutsAdminClient() {
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [stats,    setStats]    = useState<StatEntry[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [filter,   setFilter]   = useState<FilterStatus>("ALL");
  const [search,   setSearch]   = useState("");
  const [modal,    setModal]    = useState<{ req: PayoutRequest; action: "APPROVE" | "REJECT" | "PROCESS" } | null>(null);

  const load = useCallback(async (status?: string) => {
    setLoading(true);
    setError("");
    try {
      const url = status && status !== "ALL"
        ? `/api/admin/payouts?status=${status}`
        : "/api/admin/payouts";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load payouts.");
      const d = await res.json();
      setRequests(d.requests);
      setStats(d.stats);
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
  const totalCount     = stats.reduce((s, v) => s + v.count, 0);

  // Search filter (client-side)
  const visible = requests.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.instructor.name?.toLowerCase().includes(q) ||
      r.instructor.email?.toLowerCase().includes(q)
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
          { label: "Total Requests",   value: totalCount,     sub: "all time",            icon: Users,           color: "text-violet-400",  bg: "bg-violet-500/10",  isCount: true },
          { label: "Pending Amount",   value: totalPending,   sub: `${countPending} pending`, icon: Clock,       color: "text-amber-400",   bg: "bg-amber-500/10"  },
          { label: "Total Processed",  value: totalProcessed, sub: "disbursed",            icon: ArrowDownToLine, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Total Volume",     value: totalAll,       sub: "all requests",         icon: TrendingUp,      color: "text-blue-400",    bg: "bg-blue-500/10"   },
        ].map(({ label, value, sub, icon: Icon, color, bg, isCount }) => (
          <GlassCard key={label} className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", bg)}>
              <Icon className={cn("w-5 h-5", color)} />
            </div>
            <div className="min-w-0">
              <div className="text-xl font-bold text-foreground">
                {isCount ? value : `₹${Number(value).toLocaleString()}`}
              </div>
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="text-[10px] text-muted-foreground/60">{sub}</div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Filter + Search bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 flex-wrap">
          {ALL_STATUSES.map((s) => {
            const count = s === "ALL" ? totalCount : (stats.find((x) => x.status === s)?.count ?? 0);
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
                <span className={cn(
                  "ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]",
                  filter === s ? "bg-white/20" : "bg-secondary"
                )}>
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
            placeholder="Search instructor…"
            className="pl-8 pr-3 py-1.5 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-orange-500 w-52"
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
            <DollarSign className="w-10 h-10 text-muted-foreground/25 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No payout requests found.</p>
          </div>
        ) : (
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-left">
                <th className="pb-2 px-4 font-medium">Instructor</th>
                <th className="pb-2 px-4 font-medium text-right">Amount</th>
                <th className="pb-2 px-4 font-medium text-right">Requested</th>
                <th className="pb-2 px-4 font-medium text-right">Status</th>
                <th className="pb-2 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.map((req) => (
                <PayoutRow
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
