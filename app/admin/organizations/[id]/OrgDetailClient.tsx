"use client";

/**
 * Platform admin → Organization detail: profile, members, courses,
 * subscription history, transactions with full/partial refund + retry,
 * and suspend/reactivate.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft, Loader2, Ban, CheckCircle2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrgDetail {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  status: string;
  createdAt: string;
  members: { userId: string; role: string; joinedAt: string; user: { name: string; email: string } }[];
  courses: { id: string; title: string; status: string; _count: { enrollments: number } }[];
  subscriptions: {
    id: string;
    status: string;
    billingCycle: string;
    amount: number;
    startDate: string | null;
    endDate: string | null;
    plan: { name: string };
  }[];
  transactions: {
    id: string;
    type: string;
    status: string;
    amount: number;
    refundAmount: number | null;
    refundStatus: string | null;
    razorpayPaymentId: string | null;
    createdAt: string;
  }[];
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-green-500/10 text-green-500",
  PAID: "bg-green-500/10 text-green-500",
  PENDING: "bg-amber-500/10 text-amber-500",
  PARTIALLY_REFUNDED: "bg-amber-500/10 text-amber-500",
  EXPIRED: "bg-red-500/10 text-red-400",
  SUSPENDED: "bg-red-500/10 text-red-400",
  REFUNDED: "bg-red-500/10 text-red-400",
  FAILED: "bg-red-500/10 text-red-400",
  CANCELLED: "bg-red-500/10 text-red-400",
};

function Badge({ value }: { value: string }) {
  return (
    <span
      className={cn(
        "text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap",
        STATUS_STYLES[value] ?? "bg-secondary text-muted-foreground",
      )}
    >
      {value.replace(/_/g, " ")}
    </span>
  );
}

export default function OrgDetailClient({ orgId }: { orgId: string }) {
  const [org, setOrg] = useState<OrgDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [refundTxn, setRefundTxn] = useState<OrgDetail["transactions"][number] | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOrg(data.organization);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load organization");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(status: "ACTIVE" | "SUSPENDED") {
    if (!confirm(`${status === "SUSPENDED" ? "Suspend" : "Reactivate"} this organization?`)) return;
    setActing(true);
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Organization ${status === "SUSPENDED" ? "suspended" : "reactivated"}`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActing(false);
    }
  }

  async function submitRefund() {
    if (!refundTxn) return;
    setActing(true);
    try {
      const res = await fetch(`/api/admin/organizations/transactions/${refundTxn.id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(refundAmount ? { amount: parseFloat(refundAmount) } : {}),
          reason: refundReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(
        `Refund of ₹${data.refundAmount.toLocaleString("en-IN")} processed${data.isFullRefund ? " (full — subscription cancelled)" : ""}`,
      );
      setRefundTxn(null);
      setRefundAmount("");
      setRefundReason("");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Refund failed");
    } finally {
      setActing(false);
    }
  }

  async function retryRefund(txnId: string) {
    setActing(true);
    try {
      const res = await fetch(`/api/admin/organizations/transactions/${txnId}/retry`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Refund retried successfully");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!org) return <p className="text-sm text-muted-foreground">Organization not found.</p>;

  return (
    <div>
      <Link
        href="/admin/organizations"
        className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Organizations
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">{org.name}</h1>
            <Badge value={org.status} />
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            /org/{org.slug} · {org.email ?? "no email"} {org.phone ? `· ${org.phone}` : ""}
          </p>
        </div>
        {org.status === "SUSPENDED" ? (
          <button onClick={() => setStatus("ACTIVE")} className="btn-secondary" disabled={acting}>
            <CheckCircle2 className="w-4 h-4" /> Reactivate
          </button>
        ) : (
          <button
            onClick={() => setStatus("SUSPENDED")}
            className="btn-secondary !text-red-400 hover:!bg-red-500/10"
            disabled={acting}
          >
            <Ban className="w-4 h-4" /> Suspend
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Subscriptions */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Subscriptions</h2>
          </div>
          <div className="divide-y divide-border">
            {org.subscriptions.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted-foreground text-center">No subscriptions.</p>
            ) : (
              org.subscriptions.map((s) => (
                <div key={s.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {s.plan.name} · {s.billingCycle === "YEARLY" ? "Yearly" : "Monthly"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {s.endDate
                        ? `Until ${new Date(s.endDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}`
                        : "Not started"}
                    </p>
                  </div>
                  <Badge value={s.status} />
                  <p className="text-sm font-semibold text-foreground whitespace-nowrap">
                    ₹{s.amount.toLocaleString("en-IN")}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Members */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Members ({org.members.length})</h2>
          </div>
          <div className="divide-y divide-border max-h-72 overflow-y-auto">
            {org.members.map((m) => (
              <div key={m.userId} className="px-5 py-2.5 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground truncate">{m.user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.user.email}</p>
                </div>
                <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                  {m.role.replace("ORG_", "")}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="bg-card border border-border rounded-xl overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Transactions</h2>
        </div>
        <div className="divide-y divide-border">
          {org.transactions.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted-foreground text-center">No transactions.</p>
          ) : (
            org.transactions.map((t) => (
              <div key={t.id} className="px-5 py-3 flex items-center gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{t.type}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(t.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                    {t.refundAmount ? ` · refunded ₹${t.refundAmount.toLocaleString("en-IN")}` : ""}
                  </p>
                </div>
                <Badge value={t.status} />
                <p className="text-sm font-semibold text-foreground whitespace-nowrap w-24 text-right">
                  {t.type === "REFUND" ? "-" : ""}₹{t.amount.toLocaleString("en-IN")}
                </p>
                {t.status === "PAID" && t.type !== "REFUND" && t.razorpayPaymentId && !t.refundStatus && (
                  <button
                    onClick={() => {
                      setRefundTxn(t);
                      setRefundAmount("");
                      setRefundReason("");
                    }}
                    className="text-xs text-red-400 hover:text-red-300 font-medium"
                    disabled={acting}
                  >
                    Refund
                  </button>
                )}
                {t.refundStatus === "FAILED" && (
                  <button
                    onClick={() => retryRefund(t.id)}
                    className="text-xs text-amber-500 hover:text-amber-400 font-medium inline-flex items-center gap-1"
                    disabled={acting}
                  >
                    <RotateCcw className="w-3 h-3" /> Retry refund
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Courses */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Courses ({org.courses.length})</h2>
        </div>
        <div className="divide-y divide-border">
          {org.courses.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted-foreground text-center">No courses.</p>
          ) : (
            org.courses.map((c) => (
              <div key={c.id} className="px-5 py-3 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground truncate">{c.title}</p>
                  <p className="text-xs text-muted-foreground">{c._count.enrollments} enrolled</p>
                </div>
                <Badge value={c.status} />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Refund modal */}
      {refundTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md animate-fade-in">
            <h3 className="text-lg font-semibold text-foreground mb-1">Refund transaction</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {refundTxn.type} · ₹{refundTxn.amount.toLocaleString("en-IN")} — leave the amount blank
              for a full refund (cancels the subscription and locks the workspace).
            </p>
            <div className="space-y-3">
              <div>
                <label className="label" htmlFor="refundAmount">Amount (optional, ₹)</label>
                <input
                  id="refundAmount" type="number" min={1} max={refundTxn.amount} step="0.01"
                  className="input-glass" placeholder={`Full: ₹${refundTxn.amount}`}
                  value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="refundReason">Reason *</label>
                <textarea
                  id="refundReason" className="input-glass min-h-[80px]" placeholder="Why is this being refunded?"
                  value={refundReason} onChange={(e) => setRefundReason(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setRefundTxn(null)} className="btn-secondary flex-1" disabled={acting}>
                Cancel
              </button>
              <button
                onClick={submitRefund}
                className="btn-primary flex-1 !bg-red-500 hover:!bg-red-600"
                disabled={acting || refundReason.trim().length < 3}
              >
                {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Process Refund
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
