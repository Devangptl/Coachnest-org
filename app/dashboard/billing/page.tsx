"use client";

/**
 * /dashboard/billing — Billing management page (no Stripe portal redirects).
 * All actions happen in-UI: add card, remove card, set default, view invoices.
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  CreditCard, FileText, Download, ExternalLink, Loader2,
  CheckCircle2, XCircle, Clock, AlertCircle,
  Crown, ChevronRight, Receipt, Calendar, IndianRupee, RefreshCcw, CalendarX2,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/Dialog";
import { cn } from "@/lib/utils";
import { StripeProvider } from "@/components/billing/StripeProvider";
import { PaymentMethodsSection } from "@/components/billing/PaymentMethodsSection";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  upcomingAmount: number | null;
  upcomingDate:   string | null;
}

interface StudentOrder {
  id:        string;
  amount:    number;   // stored in rupees, NOT paise
  status:    string;
  type:      "course" | "feature";
  title:     string;
  createdAt: string;
}

interface SubData {
  plan:        string;
  status:      string;
  endDate:     string | null;
  startDate:   string;
  cancelledAt: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  paid:          { label: "Paid",   color: "text-emerald-400", icon: CheckCircle2 },
  open:          { label: "Open",   color: "text-yellow-400",  icon: Clock        },
  void:          { label: "Void",   color: "text-slate-400",   icon: XCircle      },
  uncollectible: { label: "Failed", color: "text-red-400",     icon: AlertCircle  },
  draft:         { label: "Draft",  color: "text-slate-400",   icon: FileText     },
};

const PLAN_COLOR: Record<string, string> = {
  BASIC:      "text-blue-400",
  PRO:        "text-orange-400",
  ENTERPRISE: "text-purple-400",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const [billing,           setBilling]           = useState<BillingData | null>(null);
  const [sub,               setSub]               = useState<SubData | null>(null);
  const [loading,           setLoading]           = useState(true);
  const [cancelling,        setCancelling]        = useState(false);
  const [showCancelDialog,  setShowCancelDialog]  = useState(false);
  const [accessModel,       setAccessModel]       = useState<"purchase" | "subscription" | null>(null);
  const [studentOrders,     setStudentOrders]     = useState<StudentOrder[]>([]);
  const [orderSummary,      setOrderSummary]      = useState<{ totalOrders: number; totalSpent: number } | null>(null);

  async function loadData() {
    try {
      const [billingRes, statusRes] = await Promise.all([
        fetch("/api/billing"),
        fetch("/api/subscriptions/status"),
      ]);
      const [billingData, statusData] = await Promise.all([
        billingRes.json(),
        statusRes.json(),
      ]);

      setAccessModel(statusData.accessModel ?? null);

      if (statusData.accessModel === "purchase") {
        // Student: billing API returns order history
        // Map raw orders → derive title from course or feature
        const mapped: StudentOrder[] = (billingData.orders ?? []).map((o: any) => ({
          id:        o.id,
          amount:    o.amount, // already in rupees
          status:    o.status,
          type:      o.type,
          title:     o.course?.title ?? o.feature?.name ?? "Purchase",
          createdAt: o.createdAt,
        }));
        setStudentOrders(mapped);
        setOrderSummary(billingData.summary ?? null);
      } else {
        setBilling(billingData);
        setSub(statusData.subscription ?? null);
      }
    } catch {
      toast.error("Could not load billing information");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  async function handleConfirmCancel() {
    setCancelling(true);
    try {
      const res  = await fetch("/api/subscriptions/cancel", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to cancel");
      // Update state from server response — get the accurate Stripe endDate
      if (data.subscription) setSub(data.subscription);
      toast.success("Subscription cancelled. You keep access until the period ends.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Cancellation failed");
    } finally {
      setCancelling(false);
      setShowCancelDialog(false);
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-40 bg-secondary rounded-lg" />
        <div className="h-32 bg-secondary rounded-md" />
        <div className="h-40 bg-secondary rounded-md" />
        <div className="h-64 bg-secondary rounded-md" />
      </div>
    );
  }

  // ── Student purchase history view ────────────────────────────────────────────
  if (accessModel === "purchase") {
    return (
      <StripeProvider>
        <div className="space-y-8">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Billing</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Your purchase history — courses and platform add-ons.
              </p>
            </div>
            <Link href="/dashboard/subscription" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              My Purchases <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Summary */}
          {orderSummary && (
            <div className="grid grid-cols-2 gap-4">
              <div className="glass rounded-md border border-border p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Total Orders</p>
                <p className="text-2xl font-bold text-foreground">{orderSummary.totalOrders}</p>
              </div>
              <div className="glass rounded-md border border-border p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Total Spent</p>
                <p className="text-2xl font-bold text-foreground">
                  ₹{orderSummary.totalSpent.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          )}

          {/* Payment methods */}
          <div className="glass rounded-md border border-border p-5">
            <div className="flex items-center gap-2 mb-5">
              <CreditCard className="w-4 h-4 text-orange-400" />
              <h2 className="font-semibold text-foreground">Payment Methods</h2>
            </div>
            <PaymentMethodsSection onUpdate={loadData} />
          </div>

          {/* Order history */}
          <div className="glass rounded-md border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <Receipt className="w-4 h-4 text-orange-400" />
              <h2 className="font-semibold text-foreground">Order History</h2>
              {studentOrders.length > 0 && (
                <span className="ml-auto text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                  {studentOrders.length} order{studentOrders.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {studentOrders.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No orders yet.</p>
                <p className="text-muted-foreground/60 text-xs mt-1">Your purchases will appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {studentOrders.map((order) => {
                  const isPaid = order.status === "PAID";
                  return (
                    <div key={order.id} className="px-5 py-3.5 flex items-center gap-4">
                      <div className={`flex-shrink-0 ${isPaid ? "text-emerald-400" : "text-muted-foreground"}`}>
                        {isPaid ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{order.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {order.type === "feature" ? "Add-on" : "Course"} · {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="flex items-center gap-1 text-foreground font-semibold text-sm">
                          <IndianRupee className="w-3.5 h-3.5 text-muted-foreground" />
                          {order.amount.toLocaleString("en-IN")}
                        </div>
                        <p className={`text-[11px] font-semibold mt-0.5 ${isPaid ? "text-emerald-400" : "text-muted-foreground"}`}>
                          {isPaid ? "Paid" : order.status}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </StripeProvider>
    );
  }

  const isActive  = sub?.status === "ACTIVE" || sub?.status === "TRIAL" ||
                    (sub?.status === "CANCELLED" && sub.endDate && new Date(sub.endDate) > new Date());
  const isPaidPlan = sub && sub.plan !== "FREE";

  return (
    <StripeProvider>
      <div className="space-y-8">

        {/* ── Page header ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Billing</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage your payment methods, view invoices, and control your plan.
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

        {/* ── Current plan summary ─────────────────────────────────────────── */}
        {isPaidPlan && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-md border border-border p-5"
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
                href="/dashboard/subscription"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 border border-orange-400/20 text-orange-300 text-sm font-medium transition-colors"
              >
                <Crown className="w-4 h-4" />
                Change Plan
              </Link>

              {(sub?.status === "ACTIVE" || sub?.status === "TRIAL") && (
                <button
                  onClick={() => setShowCancelDialog(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  Cancel Plan
                </button>
              )}

              {sub?.status === "CANCELLED" && (
                <Link
                  href="/dashboard/subscription"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-sm font-medium transition-colors"
                >
                  <RefreshCcw className="w-4 h-4" />
                  Resubscribe
                </Link>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Payment methods ───────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass rounded-md border border-border p-5"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-orange-400" />
              Payment Methods
            </h2>
          </div>

          {/* PaymentMethodsSection handles its own fetch + add/remove/default actions */}
          <PaymentMethodsSection onUpdate={loadData} />
        </motion.div>

        {/* ── Invoice history ───────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-md border border-border overflow-hidden"
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
                const s    = STATUS_STYLE[inv.status ?? "draft"] ?? STATUS_STYLE.draft;
                const Icon = s.icon;

                return (
                  <motion.div
                    key={inv.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.12 + i * 0.04 }}
                    className="px-5 py-3.5 flex items-center gap-4 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className={cn("flex-shrink-0", s.color)}>
                      <Icon className="w-4 h-4" />
                    </div>

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

                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1 text-foreground font-semibold text-sm">
                        <IndianRupee className="w-3.5 h-3.5 text-muted-foreground" />
                        {(inv.amountPaid / 100).toLocaleString("en-IN")}
                      </div>
                      <p className="text-xs text-muted-foreground">{formatDate(inv.created)}</p>
                    </div>

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

        {/* ── No subscription state ─────────────────────────────────────────── */}
        {!isPaidPlan && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-md border border-border p-8 text-center"
          >
            <Crown className="w-10 h-10 text-orange-400/40 mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-1">No active subscription</h3>
            <p className="text-muted-foreground text-sm mb-5">
              Subscribe to unlock all-access to every course on CoachNest.
            </p>
            <Link
              href="/dashboard/subscription"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-gradient-to-r from-orange-500 to-orange-400 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <Crown className="w-4 h-4" /> View Plans
            </Link>
          </motion.div>
        )}
      </div>

      {/* ── Cancel confirmation dialog ──────────────────────────────────────── */}
      <Dialog open={showCancelDialog} onOpenChange={(v) => !v && setShowCancelDialog(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="w-12 h-12 rounded-md bg-red-500/10 flex items-center justify-center mb-1">
              <CalendarX2 className="w-6 h-6 text-red-400" />
            </div>
            <DialogTitle>Cancel subscription?</DialogTitle>
            <DialogDescription>
              Your plan will not renew. You will keep full access to all your courses
              {sub?.endDate ? (
                <> until <span className="font-semibold text-foreground">
                  {new Date(sub.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                </span></>
              ) : " until the end of your current billing period"}.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-yellow-400/20 bg-yellow-500/5 px-4 py-3 text-sm text-yellow-300 flex items-start gap-2 mt-1">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              You can resume your subscription at any time before it expires and your card
              will not be charged again until the renewal date.
            </span>
          </div>

          <div className="flex gap-3 mt-2">
            <button
              onClick={() => setShowCancelDialog(false)}
              className="flex-1 py-2.5 rounded-md border border-border text-sm font-medium text-foreground hover:bg-secondary/60 transition-all"
            >
              Keep subscription
            </button>
            <button
              onClick={handleConfirmCancel}
              disabled={cancelling}
              className="flex-1 py-2.5 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {cancelling
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Cancelling…</>
                : <><XCircle className="w-4 h-4" /> Yes, cancel plan</>}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </StripeProvider>
  );
}
