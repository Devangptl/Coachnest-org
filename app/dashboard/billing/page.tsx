"use client";

/**
 * /dashboard/billing — Custom billing management page.
 * Shows payment method, invoice history, upcoming charge, and plan actions.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  CreditCard, FileText, Download, ExternalLink, Loader2,
  CheckCircle2, XCircle, Clock, AlertCircle, RefreshCcw,
  Crown, ChevronRight, Receipt, Calendar, IndianRupee,
  ShieldCheck, Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PaymentMethod {
  id:       string;
  brand:    string;
  last4:    string;
  expMonth: number;
  expYear:  number;
}

interface Invoice {
  id:          string;
  number:      string | null;
  status:      string | null;
  amountDue:   number;
  amountPaid:  number;
  currency:    string;
  created:     string;
  periodStart: string;
  periodEnd:   string;
  pdfUrl:      string | null;
  hostedUrl:   string | null;
}

interface BillingData {
  invoices:       Invoice[];
  paymentMethod:  PaymentMethod | null;
  upcomingAmount: number | null;
  upcomingDate:   string | null;
}

interface SubData {
  plan:        string;
  status:      string;
  endDate:     string | null;
  startDate:   string;
  cancelledAt: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CARD_LOGOS: Record<string, string> = {
  visa:       "VISA",
  mastercard: "MC",
  amex:       "AMEX",
  rupay:      "RuPay",
  discover:   "DISC",
};

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style:    "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

const STATUS_STYLE: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  paid:           { label: "Paid",     color: "text-emerald-400", icon: CheckCircle2 },
  open:           { label: "Open",     color: "text-yellow-400",  icon: Clock },
  void:           { label: "Void",     color: "text-slate-400",   icon: XCircle },
  uncollectible:  { label: "Failed",   color: "text-red-400",     icon: AlertCircle },
  draft:          { label: "Draft",    color: "text-slate-400",   icon: FileText },
};

const PLAN_COLOR: Record<string, string> = {
  BASIC:      "text-blue-400",
  PRO:        "text-orange-400",
  ENTERPRISE: "text-purple-400",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const router = useRouter();

  const [billing,   setBilling]   = useState<BillingData | null>(null);
  const [sub,       setSub]       = useState<SubData | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [billingRes, statusRes] = await Promise.all([
          fetch("/api/billing"),
          fetch("/api/subscriptions/status"),
        ]);
        const [billingData, statusData] = await Promise.all([
          billingRes.json(),
          statusRes.json(),
        ]);
        setBilling(billingData);
        setSub(statusData.subscription ?? null);
      } catch {
        toast.error("Could not load billing information");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleCancel() {
    if (!confirm("Cancel your subscription? You'll keep access until the end of your billing period.")) return;
    setCancelling(true);
    try {
      const res  = await fetch("/api/subscriptions/cancel", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to cancel");
      toast.success("Subscription cancelled. Access continues until period end.");
      setSub((prev) => prev ? { ...prev, status: "CANCELLED" } : prev);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Cancellation failed");
    } finally {
      setCancelling(false);
    }
  }

  // Stripe portal — used only for updating payment method
  async function handleUpdatePayment() {
    setPortalLoading(true);
    try {
      const res  = await fetch("/api/subscriptions/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to open portal");
      if (data.url) window.location.href = data.url;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not open billing portal");
    } finally {
      setPortalLoading(false);
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 w-40 bg-secondary rounded-lg" />
        <div className="h-32 bg-secondary rounded-xl" />
        <div className="h-24 bg-secondary rounded-xl" />
        <div className="h-64 bg-secondary rounded-xl" />
      </div>
    );
  }

  const isActive   = sub?.status === "ACTIVE" || sub?.status === "TRIAL" ||
                     (sub?.status === "CANCELLED" && sub.endDate && new Date(sub.endDate) > new Date());
  const isPaidPlan = sub && sub.plan !== "FREE";

  return (
    <div className="max-w-3xl mx-auto space-y-8">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Billing</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your payment method, view invoices, and control your plan.
          </p>
        </div>
        <Link
          href="/dashboard/subscription"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Crown className="w-4 h-4 text-orange-400" />
          Subscription settings
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* ── Current plan summary ─────────────────────────────────────────────── */}
      {isPaidPlan && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl border border-border p-5"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Crown className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Active Plan</p>
                <h2 className={cn("text-xl font-black", PLAN_COLOR[sub!.plan] ?? "text-foreground")}>
                  {sub!.plan.charAt(0) + sub!.plan.slice(1).toLowerCase()}
                </h2>
              </div>
            </div>

            {/* Status + dates */}
            <div className="flex flex-col items-end gap-1 text-right">
              <span className={cn(
                "text-xs font-semibold px-2.5 py-1 rounded-full border",
                sub!.status === "ACTIVE"    && "text-emerald-400 border-emerald-400/20 bg-emerald-500/10",
                sub!.status === "TRIAL"     && "text-blue-400    border-blue-400/20    bg-blue-500/10",
                sub!.status === "CANCELLED" && "text-yellow-400  border-yellow-400/20  bg-yellow-500/10",
                sub!.status === "EXPIRED"   && "text-red-400     border-red-400/20     bg-red-500/10",
              )}>
                {sub!.status === "CANCELLED" ? "Cancels at period end" : sub!.status}
              </span>
              {sub!.endDate && (
                <p className="text-xs text-muted-foreground">
                  {sub!.status === "CANCELLED" ? "Access until" : "Renews"}{" "}
                  <span className="text-foreground font-medium">{formatDate(sub!.endDate)}</span>
                </p>
              )}
            </div>
          </div>

          {/* Upcoming charge */}
          {billing?.upcomingAmount != null && billing.upcomingDate && sub!.status !== "CANCELLED" && (
            <div className="mt-4 pt-4 border-t border-border flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">
                Next charge of{" "}
                <span className="text-foreground font-semibold">
                  {formatAmount(billing.upcomingAmount, "inr")}
                </span>{" "}
                on{" "}
                <span className="text-foreground font-medium">{formatDate(billing.upcomingDate)}</span>
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/pricing"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 border border-orange-400/20 text-orange-300 text-sm font-medium transition-colors"
            >
              <Crown className="w-4 h-4" />
              Upgrade Plan
            </Link>

            {isActive && sub?.status !== "CANCELLED" && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Cancel Plan
              </button>
            )}

            {sub?.status === "CANCELLED" && (
              <button
                onClick={() => router.push("/pricing")}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-sm font-medium transition-colors"
              >
                <RefreshCcw className="w-4 h-4" />
                Resubscribe
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Payment method ────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass rounded-xl border border-border p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-orange-400" />
            Payment Method
          </h2>
          <button
            onClick={handleUpdatePayment}
            disabled={portalLoading}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border hover:border-orange-400/30 rounded-lg px-3 py-1.5 transition-all disabled:opacity-50"
          >
            {portalLoading
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Pencil className="w-3.5 h-3.5" />}
            Update
          </button>
        </div>

        {billing?.paymentMethod ? (
          <div className="flex items-center gap-4">
            {/* Card chip graphic */}
            <div className="relative w-20 h-12 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 border border-white/10 flex items-center justify-center flex-shrink-0 shadow-md">
              <span className="text-white font-black text-[10px] tracking-wider uppercase">
                {CARD_LOGOS[billing.paymentMethod.brand] ?? billing.paymentMethod.brand.toUpperCase()}
              </span>
              <div className="absolute bottom-1.5 right-2 w-4 h-3 rounded-sm bg-yellow-400/80" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-foreground font-semibold text-sm">
                •••• •••• •••• {billing.paymentMethod.last4}
              </p>
              <p className="text-muted-foreground text-xs mt-0.5">
                Expires {String(billing.paymentMethod.expMonth).padStart(2, "0")} / {billing.paymentMethod.expYear}
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              Default
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 py-3">
            <CreditCard className="w-8 h-8 text-muted-foreground/40" />
            <div>
              <p className="text-sm text-muted-foreground">No payment method on file.</p>
              <button
                onClick={handleUpdatePayment}
                disabled={portalLoading}
                className="text-xs text-orange-400 hover:text-orange-300 underline mt-0.5 disabled:opacity-50"
              >
                Add a card
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* ── Invoice history ───────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-xl border border-border overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Receipt className="w-4 h-4 text-orange-400" />
          <h2 className="font-semibold text-foreground">Invoice History</h2>
          {billing?.invoices.length ? (
            <span className="ml-auto text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
              {billing.invoices.length} invoice{billing.invoices.length !== 1 ? "s" : ""}
            </span>
          ) : null}
        </div>

        {!billing?.invoices.length ? (
          <div className="px-5 py-10 text-center">
            <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No invoices yet.</p>
            <p className="text-muted-foreground/60 text-xs mt-1">
              Invoices appear here after your first payment.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {billing.invoices.map((inv, i) => {
              const s = STATUS_STYLE[inv.status ?? "draft"] ?? STATUS_STYLE.draft;
              const Icon = s.icon;

              return (
                <motion.div
                  key={inv.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.12 + i * 0.04 }}
                  className="px-5 py-3.5 flex items-center gap-4 hover:bg-white/[0.02] transition-colors"
                >
                  {/* Status icon */}
                  <div className={cn("flex-shrink-0", s.color)}>
                    <Icon className="w-4 h-4" />
                  </div>

                  {/* Invoice details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">
                        {inv.number ?? inv.id.slice(-8).toUpperCase()}
                      </span>
                      <span className={cn("text-[11px] font-semibold", s.color)}>
                        {s.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
                    </p>
                  </div>

                  {/* Amount */}
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-1 text-foreground font-semibold text-sm">
                      <IndianRupee className="w-3.5 h-3.5 text-muted-foreground" />
                      {(inv.amountPaid / 100).toLocaleString("en-IN")}
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDate(inv.created)}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {inv.pdfUrl && (
                      <a
                        href={inv.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Download PDF"
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {inv.hostedUrl && (
                      <a
                        href={inv.hostedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="View invoice"
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* ── No subscription state ────────────────────────────────────────────── */}
      {!isPaidPlan && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl border border-border p-8 text-center"
        >
          <Crown className="w-10 h-10 text-orange-400/40 mx-auto mb-3" />
          <h3 className="font-semibold text-foreground mb-1">No active subscription</h3>
          <p className="text-muted-foreground text-sm mb-5">
            Subscribe to unlock all-access to every course on CoachNest.
          </p>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-400 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Crown className="w-4 h-4" /> View Plans
          </Link>
        </motion.div>
      )}
    </div>
  );
}
