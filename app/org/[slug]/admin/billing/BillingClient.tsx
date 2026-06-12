"use client";

/**
 * Org billing — current plan card, renew / change plan (Razorpay modal),
 * complete-pending-payment, transaction history with invoice downloads.
 */
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Loader2, RefreshCw, ArrowUpRight, FileDown, AlertCircle, CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import RazorpayCustomForm, {
  type RazorpayOrderInfo,
} from "@/components/checkout/RazorpayCustomForm";
import type { RazorpaySuccessResponse } from "@/types/razorpay";

interface Summary {
  orgStatus: string;
  subscription: {
    id: string;
    status: string;
    billingCycle: "MONTHLY" | "YEARLY";
    amount: number;
    startDate: string | null;
    endDate: string | null;
    plan: { id: string; name: string };
    pendingPlanId: string | null;
  } | null;
  pendingTransaction: { id: string; type: string; amount: number; razorpayOrderId: string | null } | null;
}

interface Txn {
  id: string;
  type: string;
  status: string;
  amount: number;
  refundAmount: number | null;
  createdAt: string;
}

interface Plan {
  id: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
}

const TXN_STATUS_STYLES: Record<string, string> = {
  PAID: "bg-green-500/10 text-green-500",
  PENDING: "bg-amber-500/10 text-amber-500",
  FAILED: "bg-red-500/10 text-red-400",
  REFUNDED: "bg-red-500/10 text-red-400",
  PARTIALLY_REFUNDED: "bg-amber-500/10 text-amber-500",
};

export default function BillingClient({ slug }: { slug: string }) {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [cycle, setCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [payment, setPayment] = useState<{ orderInfo: RazorpayOrderInfo; transactionId: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [sRes, tRes, pRes] = await Promise.all([
        fetch(`/api/org/${slug}/billing/summary`),
        fetch(`/api/org/${slug}/billing/transactions`),
        fetch("/api/org/plans"),
      ]);
      const s = await sRes.json();
      const t = await tRes.json();
      const p = await pRes.json();
      if (!sRes.ok) throw new Error(s.error);
      setSummary(s);
      setTxns(t.items ?? []);
      setPlans(p.plans ?? []);
      if (s.subscription) setCycle(s.subscription.billingCycle);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load billing");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  function openPayment(data: {
    transactionId: string;
    razorpayOrderId: string;
    amount: number;
    razorpayKeyId: string;
  }) {
    setPayment({
      transactionId: data.transactionId,
      orderInfo: {
        razorpayOrderId: data.razorpayOrderId,
        dbOrderId: data.transactionId,
        amount: data.amount,
        currency: "INR",
        key: data.razorpayKeyId,
        type: "org",
      },
    });
  }

  async function handleRenew() {
    setActing(true);
    try {
      const res = await fetch(`/api/org/${slug}/billing/renew`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      openPayment(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start renewal");
    } finally {
      setActing(false);
    }
  }

  async function handleChangePlan(planId: string) {
    setActing(true);
    try {
      const res = await fetch(`/api/org/${slug}/billing/change-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, billingCycle: cycle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.scheduled) {
        toast.success(`Downgrade to ${data.planName} scheduled for your next renewal.`);
        setShowPlans(false);
        load();
      } else {
        openPayment(data);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change plan");
    } finally {
      setActing(false);
    }
  }

  async function handlePaymentSuccess(response: RazorpaySuccessResponse) {
    if (!payment) return;
    const res = await fetch("/api/org/verify-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transactionId: payment.transactionId,
        razorpayOrderId: response.razorpay_order_id,
        razorpayPaymentId: response.razorpay_payment_id,
        razorpaySignature: response.razorpay_signature,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Payment verification failed");
    }
    toast.success("Payment successful — subscription updated!");
    setPayment(null);
    setShowPlans(false);
    setLoading(true);
    load();
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (payment) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 max-w-xl">
        <RazorpayCustomForm
          orderInfo={payment.orderInfo}
          description="Organization subscription payment"
          onSuccess={handlePaymentSuccess}
          onError={(msg) => toast.error(msg)}
          onBack={() => setPayment(null)}
        />
      </div>
    );
  }

  const sub = summary?.subscription;
  const expired = summary?.orgStatus !== "ACTIVE";

  return (
    <div className="space-y-6">
      {expired && (
        <div className="flex items-start gap-2.5 bg-amber-500/10 border border-amber-500/25 rounded-lg px-4 py-3.5">
          <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-amber-500 text-sm">
            Your workspace is inactive. Complete or renew your subscription to restore member access.
          </p>
        </div>
      )}

      {summary?.pendingTransaction?.razorpayOrderId && (
        <div className="bg-card border border-orange-500/30 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Payment pending</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {summary.pendingTransaction.type} · ₹{summary.pendingTransaction.amount.toLocaleString("en-IN")}
            </p>
          </div>
          <button
            className="btn-primary"
            onClick={() =>
              openPayment({
                transactionId: summary.pendingTransaction!.id,
                razorpayOrderId: summary.pendingTransaction!.razorpayOrderId!,
                amount: summary.pendingTransaction!.amount,
                razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "",
              })
            }
          >
            Complete Payment
          </button>
        </div>
      )}

      {/* Current plan */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Current plan</p>
            <p className="text-2xl font-bold text-foreground">
              {sub ? sub.plan.name : "No plan"}
              {sub && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ₹{sub.amount.toLocaleString("en-IN")}/{sub.billingCycle === "YEARLY" ? "yr" : "mo"}
                </span>
              )}
            </p>
            {sub?.endDate && (
              <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" />
                {sub.status === "ACTIVE" ? "Renews by" : "Ended"}{" "}
                {new Date(sub.endDate).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            )}
            {sub?.pendingPlanId && (
              <p className="text-xs text-amber-500 mt-1.5">A plan change is scheduled for your next renewal.</p>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={handleRenew} className="btn-primary" disabled={acting || !sub}>
              {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Renew
            </button>
            <button onClick={() => setShowPlans((s) => !s)} className="btn-secondary" disabled={acting || !sub}>
              <ArrowUpRight className="w-4 h-4" /> Change Plan
            </button>
          </div>
        </div>

        {showPlans && (
          <div className="mt-5 pt-5 border-t border-border animate-fade-in">
            <div className="flex items-center gap-1 bg-secondary rounded-lg p-1 w-fit mb-4">
              {(["MONTHLY", "YEARLY"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCycle(c)}
                  className={cn(
                    "px-4 py-1.5 rounded-md text-xs font-medium transition-colors",
                    cycle === c ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
                  )}
                >
                  {c === "MONTHLY" ? "Monthly" : "Yearly"}
                </button>
              ))}
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              {plans.map((p) => {
                const amount = cycle === "YEARLY" ? p.priceYearly : p.priceMonthly;
                const isCurrent = sub?.plan.id === p.id && sub?.billingCycle === cycle;
                return (
                  <button
                    key={p.id}
                    disabled={isCurrent || acting}
                    onClick={() => handleChangePlan(p.id)}
                    className={cn(
                      "text-left border rounded-xl p-4 transition-colors",
                      isCurrent
                        ? "border-orange-500 bg-orange-500/5 cursor-default"
                        : "border-border hover:border-orange-500/40",
                    )}
                  >
                    <p className="font-semibold text-foreground text-sm">
                      {p.name} {isCurrent && <span className="text-[10px] text-orange-500">(current)</span>}
                    </p>
                    <p className="text-lg font-bold text-foreground mt-1">
                      ₹{amount.toLocaleString("en-IN")}
                      <span className="text-xs font-normal text-muted-foreground">/{cycle === "YEARLY" ? "yr" : "mo"}</span>
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Transaction history */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Billing history</h2>
        </div>
        {txns.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground text-center">No transactions yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {txns.map((t) => (
              <div key={t.id} className="px-5 py-3 flex items-center gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {t.type === "REFUND" ? "Refund" : t.type.charAt(0) + t.type.slice(1).toLowerCase()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(t.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}
                  </p>
                </div>
                <span
                  className={cn(
                    "text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap",
                    TXN_STATUS_STYLES[t.status] ?? "bg-secondary text-muted-foreground",
                  )}
                >
                  {t.status.replace("_", " ")}
                </span>
                <p
                  className={cn(
                    "text-sm font-semibold whitespace-nowrap",
                    t.type === "REFUND" ? "text-red-400" : "text-foreground",
                  )}
                >
                  {t.type === "REFUND" ? "-" : ""}₹{t.amount.toLocaleString("en-IN")}
                </p>
                {(t.status === "PAID" || t.status === "REFUNDED" || t.status === "PARTIALLY_REFUNDED") &&
                  t.type !== "REFUND" && (
                    <a
                      href={`/api/org/${slug}/billing/invoices/${t.id}`}
                      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      aria-label="Download invoice"
                    >
                      <FileDown className="w-4 h-4" />
                    </a>
                  )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
