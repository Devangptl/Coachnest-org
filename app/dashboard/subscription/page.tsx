/**
 * /dashboard/subscription — Subscription management page.
 * Subscribe, upgrade, downgrade, cancel, and resume — all in-UI, no redirects.
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStripe } from "@stripe/react-stripe-js";
import { motion } from "framer-motion";
import {
  Crown, Zap, Building2, CheckCircle2, XCircle,
  Clock, AlertCircle, Loader2, RefreshCcw, TrendingUp, RefreshCw,
  CreditCard, ArrowUpRight, ArrowDownRight, CalendarX2,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { StripeProvider } from "@/components/billing/StripeProvider";
import { AddCardModal } from "@/components/billing/AddCardModal";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/Dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

type PlanType  = "FREE" | "BASIC" | "PRO" | "ENTERPRISE";
type SubStatus = "ACTIVE" | "CANCELLED" | "EXPIRED" | "TRIAL";
type Billing   = "monthly" | "yearly";

interface Subscription {
  id:          string;
  plan:        PlanType;
  status:      SubStatus;
  startDate:   string;
  endDate:     string | null;
  cancelledAt: string | null;
  trialEndsAt: string | null;
}

interface PlanAccessData {
  isActive:        boolean;
  enrollmentLimit: number | null;
  enrolledCount:   number;
  limitReached:    boolean;
}

// ─── Plan metadata ────────────────────────────────────────────────────────────

const PLAN_META: Record<PlanType, {
  label:    string;
  icon:     React.ElementType;
  color:    string;
  bg:       string;
  border:   string;
  features: string[];
}> = {
  FREE: {
    label: "Free", icon: Zap,
    color: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/20",
    features: ["Free courses only", "Community forum", "Basic progress tracking"],
  },
  BASIC: {
    label: "Basic", icon: Zap,
    color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20",
    features: ["Paid courses (up to 5)", "Download certificates", "Priority support", "Mobile app access"],
  },
  PRO: {
    label: "Pro", icon: Crown,
    color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20",
    features: ["Everything in Basic", "Unlimited courses", "Offline downloads", "AI recommendations", "Instructor Q&A", "Early access"],
  },
  ENTERPRISE: {
    label: "Enterprise", icon: Building2,
    color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20",
    features: ["Everything in Pro", "Team management (50 seats)", "Custom org branding", "Dedicated account manager", "SSO / SAML"],
  },
};

const STATUS_META: Record<SubStatus, { label: string; color: string; icon: React.ElementType }> = {
  ACTIVE:    { label: "Active",                  color: "text-green-400",  icon: CheckCircle2 },
  TRIAL:     { label: "Trial",                   color: "text-blue-400",   icon: Clock        },
  CANCELLED: { label: "Cancels at period end",   color: "text-yellow-400", icon: AlertCircle  },
  EXPIRED:   { label: "Expired",                 color: "text-red-400",    icon: XCircle      },
};

const PLAN_RANK: Record<string, number> = { FREE: 0, BASIC: 1, PRO: 2, ENTERPRISE: 3 };

const UPGRADE_PLANS = [
  { id: "BASIC",      label: "Basic",      monthlyPrice: 499,  yearlyPrice: 3999             },
  { id: "PRO",        label: "Pro",        monthlyPrice: 999,  yearlyPrice: 7999,  popular: true },
  { id: "ENTERPRISE", label: "Enterprise", monthlyPrice: 4999, yearlyPrice: 39999            },
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });
}

/** Detect billing cycle from subscription date range */
function detectBilling(sub: Subscription | null): Billing {
  if (!sub?.startDate || !sub?.endDate) return "monthly";
  const diffDays =
    (new Date(sub.endDate).getTime() - new Date(sub.startDate).getTime()) /
    (1000 * 60 * 60 * 24);
  return diffDays > 300 ? "yearly" : "monthly";
}

// ─── Cancel confirmation dialog ───────────────────────────────────────────────

function CancelDialog({
  open,
  endDate,
  cancelling,
  onConfirm,
  onClose,
}: {
  open:       boolean;
  endDate:    string | null;
  cancelling: boolean;
  onConfirm:  () => void;
  onClose:    () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="w-12 h-12 rounded-md bg-red-500/10 flex items-center justify-center mb-1">
            <CalendarX2 className="w-6 h-6 text-red-400" />
          </div>
          <DialogTitle>Cancel subscription?</DialogTitle>
          <DialogDescription>
            Your plan will not renew. You will keep full access to all your courses
            {endDate ? (
              <>
                {" "}until{" "}
                <span className="font-semibold text-foreground">{fmtDate(endDate)}</span>
              </>
            ) : (
              " until the end of your current billing period"
            )}
            .
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-yellow-400/20 bg-yellow-500/5 px-4 py-3 text-sm text-yellow-300 flex items-start gap-2 mt-1">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            You can resume your subscription at any time before it expires and your
            card will not be charged again until the renewal date.
          </span>
        </div>

        <div className="flex gap-3 mt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-md border border-border text-sm font-medium text-foreground hover:bg-secondary/60 transition-all"
          >
            Keep subscription
          </button>
          <button
            onClick={onConfirm}
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
  );
}

// ─── Inner page (needs Stripe context) ───────────────────────────────────────

function SubscriptionPageContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const stripe       = useStripe();

  const [sub,               setSub]               = useState<Subscription | null>(null);
  const [planAccess,        setPlanAccess]         = useState<PlanAccessData | null>(null);
  const [hasPaymentMethod,  setHasPaymentMethod]   = useState(false);
  const [loading,           setLoading]            = useState(true);
  const [syncing,           setSyncing]            = useState(false);
  const [cancelling,        setCancelling]         = useState(false);
  const [resuming,          setResuming]           = useState(false);
  const [actionLoading,     setActionLoading]      = useState<string | null>(null);
  const [billing,           setBilling]            = useState<"monthly" | "yearly">("monthly");
  const [showCancelDialog,  setShowCancelDialog]   = useState(false);

  // AddCardModal — holds the plan to subscribe after card is added
  const [showAddCard,  setShowAddCard]  = useState(false);
  const [pendingPlan,  setPendingPlan]  = useState<string | null>(null);

  const isSuccessRedirect = searchParams.get("success") === "true";
  const sessionId         = searchParams.get("session_id");

  const loadStatus = useCallback(async (): Promise<Subscription | null> => {
    const [statusRes, pmRes] = await Promise.all([
      fetch("/api/subscriptions/status"),
      fetch("/api/billing/payment-methods"),
    ]);
    const [statusData, pmData] = await Promise.all([statusRes.json(), pmRes.json()]);
    const subscription: Subscription | null = statusData.subscription ?? null;
    setSub(subscription);
    setPlanAccess(statusData.planAccess ?? null);
    setHasPaymentMethod((pmData.paymentMethods ?? []).length > 0);
    return subscription;
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        if (isSuccessRedirect) {
          await fetch("/api/subscriptions/sync", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ sessionId: sessionId ?? undefined }),
          });
        }

        const loadedSub = await loadStatus();

        // Pre-select billing cycle from current subscription on first load
        if (!cancelled && loadedSub && loadedSub.plan !== "FREE" && !isSuccessRedirect) {
          setBilling(detectBilling(loadedSub));
        }

        if (!cancelled && isSuccessRedirect) {
          toast.success("Subscription activated! Welcome to all-access.");
          router.replace("/dashboard/subscription");
        }
      } catch {
        if (!cancelled) toast.error("Could not load subscription");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    init();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Subscribe in-UI with saved card (no redirect) ─────────────────────────
  async function subscribeDirect(planId: string) {
    setActionLoading(planId);
    try {
      const res  = await fetch("/api/billing/subscribe", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ plan: planId, billing }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Subscription failed");

      if (data.requiresAction && data.clientSecret && stripe) {
        const { error } = await stripe.confirmCardPayment(data.clientSecret);
        if (error) throw new Error(error.message ?? "Payment confirmation failed");
        await fetch("/api/subscriptions/sync", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}),
        });
      }

      await loadStatus();
      toast.success(`${planId.charAt(0) + planId.slice(1).toLowerCase()} plan activated!`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Subscription failed");
    } finally {
      setActionLoading(null);
    }
  }

  // ── Change plan (upgrade / downgrade / billing cycle switch) ──────────────
  async function changePlan(planId: string) {
    setActionLoading(planId);
    try {
      const res  = await fetch("/api/billing/change-plan", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ plan: planId, billing }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Plan change failed");

      // Handle 3DS / further action required (e.g., when incomplete sub was replaced)
      if (data.requiresAction && data.clientSecret && stripe) {
        const { error } = await stripe.confirmCardPayment(data.clientSecret);
        if (error) throw new Error(error.message ?? "Payment confirmation failed");
        await fetch("/api/subscriptions/sync", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}),
        });
      }

      await loadStatus();
      const label = planId.charAt(0) + planId.slice(1).toLowerCase();
      toast.success(`Switched to ${label} plan!`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Plan change failed");
    } finally {
      setActionLoading(null);
    }
  }

  // ── Clicked a plan button ───────────────────────────────��─────────────────
  async function handlePlanAction(planId: string) {
    // User has a live subscription (even if CANCELLED — it's still within the period)
    const hasLiveSub = sub && sub.plan !== "FREE" && sub.status !== "EXPIRED";

    if (hasLiveSub) {
      await changePlan(planId);          // upgrade / downgrade / billing cycle change
    } else if (!hasPaymentMethod) {
      setPendingPlan(planId);
      setShowAddCard(true);              // save card first, then subscribe in-UI
    } else {
      await subscribeDirect(planId);    // has saved card, no live sub → subscribe in-UI
    }
  }

  // After card is saved, subscribe in-UI with the newly saved card
  async function handleCardAdded(_pmId: string) {
    setShowAddCard(false);
    setHasPaymentMethod(true);
    if (pendingPlan) {
      const plan = pendingPlan;
      setPendingPlan(null);
      await subscribeDirect(plan);
    }
  }

  // ── Cancel ───────────────────────────────────────────────────────���────────
  async function handleConfirmCancel() {
    setCancelling(true);
    try {
      const res  = await fetch("/api/subscriptions/cancel", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to cancel");

      // Update state from server response — gets the accurate Stripe endDate
      if (data.subscription) setSub(data.subscription);
      toast.success("Subscription cancelled. You keep access until the period ends.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Cancellation failed");
    } finally {
      setCancelling(false);
      setShowCancelDialog(false);
    }
  }

  // ── Resume (un-cancel) ────────────────────────────────────────────────────
  async function handleResume() {
    setResuming(true);
    try {
      const res  = await fetch("/api/subscriptions/resume", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to resume");

      if (data.subscription) setSub(data.subscription);
      toast.success("Subscription resumed! It will renew as normal.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not resume subscription");
    } finally {
      setResuming(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      await fetch("/api/subscriptions/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      await loadStatus();
      toast.success("Subscription synced!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not sync subscription");
    } finally {
      setSyncing(false);
    }
  }

  // ── Loading ───────────────────────────��────────────────────────��───────────
  if (loading) {
    return (
      <div className="space-y-6">
        {isSuccessRedirect && (
          <div className="flex items-center gap-3 bg-orange-500/10 border border-orange-400/20 rounded-md px-5 py-4">
            <Loader2 className="w-5 h-5 text-orange-400 animate-spin flex-shrink-0" />
            <div>
              <p className="text-orange-300 font-semibold text-sm">Activating your subscription…</p>
              <p className="text-orange-400/60 text-xs">This takes just a moment.</p>
            </div>
          </div>
        )}
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-secondary rounded-lg" />
          <div className="h-48 bg-secondary rounded-md" />
          <div className="h-64 bg-secondary rounded-md" />
        </div>
      </div>
    );
  }

  const meta        = sub ? PLAN_META[sub.plan]    : null;
  const statusMeta  = sub ? STATUS_META[sub.status] : null;
  const isActive    = planAccess?.isActive ?? false;
  const isPaidPlan  = sub && sub.plan !== "FREE";
  const BASIC_LIMIT = 5;
  const currentRank = PLAN_RANK[sub?.plan ?? "FREE"] ?? 0;

  return (
    <>
      <div className="space-y-8">

        {/* ── Page header ────────────────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Subscription</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your all-access plan — subscribe, upgrade, or cancel anytime.
          </p>
        </div>

        {/* ── No payment method notice ─────────────────��────────────────── */}
        {!hasPaymentMethod && !isPaidPlan && (
          <div className="flex items-center gap-3 rounded-md border border-border bg-secondary/20 px-4 py-3">
            <CreditCard className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              No payment method saved.{" "}
              <Link href="/dashboard/billing" className="text-orange-400 hover:text-orange-300 underline">
                Add a card
              </Link>{" "}
              before subscribing, or click a plan below to add one now.
            </p>
          </div>
        )}

        {/* ── Current plan card ─────────────────────────────────────────── */}
        {sub && isPaidPlan ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("glass rounded-md p-6 border", meta!.border)}
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className={cn("w-12 h-12 rounded-md flex items-center justify-center", meta!.bg)}>
                  {(() => { const Icon = meta!.icon; return <Icon className={cn("w-6 h-6", meta!.color)} />; })()}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Current Plan</p>
                  <h2 className={cn("text-2xl font-black", meta!.color)}>{meta!.label}</h2>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-secondary text-muted-foreground border border-border capitalize">
                  {detectBilling(sub)} billing
                </span>
                <div className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border",
                  statusMeta!.color, "border-current/20 bg-current/5"
                )}>
                  {(() => { const Icon = statusMeta!.icon; return <Icon className="w-3.5 h-3.5" />; })()}
                  {statusMeta!.label}
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="mt-5 grid grid-cols-2 gap-4">
              {sub.startDate && (
                <div className="bg-background/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Started</p>
                  <p className="text-sm font-medium text-foreground">{fmtDate(sub.startDate)}</p>
                </div>
              )}
              {sub.endDate && (
                <div className="bg-background/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    {sub.status === "CANCELLED" ? "Access until" : sub.status === "EXPIRED" ? "Expired on" : "Renews on"}
                  </p>
                  <p className={cn(
                    "text-sm font-medium",
                    sub.status === "CANCELLED" ? "text-yellow-300" : "text-foreground"
                  )}>
                    {fmtDate(sub.endDate)}
                  </p>
                </div>
              )}
            </div>

            {/* Cancellation banner */}
            {sub.status === "CANCELLED" && sub.endDate && (
              <div className="mt-4 rounded-lg border border-yellow-400/20 bg-yellow-500/5 px-4 py-3 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-yellow-300 font-medium">
                    Cancels on {fmtDate(sub.endDate)}
                  </p>
                  <p className="text-xs text-yellow-400/70 mt-0.5">
                    You still have full access until then. Resume anytime to keep your plan.
                  </p>
                </div>
              </div>
            )}

            {/* Features */}
            <div className="mt-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3">Included</p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {meta!.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* BASIC usage bar */}
            {sub.plan === "BASIC" && isActive && planAccess && (
              <div className="mt-5 pt-5 border-t border-border">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Course Slots</p>
                  <span className={`text-xs font-semibold ${planAccess.limitReached ? "text-amber-400" : "text-muted-foreground"}`}>
                    {planAccess.enrolledCount} / {BASIC_LIMIT} used
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${planAccess.limitReached ? "bg-amber-400" : "bg-orange-400"}`}
                    style={{ width: `${Math.min(100, (planAccess.enrolledCount / BASIC_LIMIT) * 100)}%` }}
                  />
                </div>
                {planAccess.limitReached && (
                  <p className="text-xs text-amber-400 mt-2 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                    All slots used. Upgrade to PRO for unlimited access.
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/dashboard/billing"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-sm font-medium text-foreground transition-colors"
              >
                <CreditCard className="w-4 h-4" />
                Manage Billing
              </Link>

              {/* Resume — shown only when CANCELLED and still within period */}
              {sub.status === "CANCELLED" && (
                <button
                  onClick={handleResume}
                  disabled={resuming}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-sm font-medium text-emerald-400 transition-colors disabled:opacity-50"
                >
                  {resuming ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                  Resume subscription
                </button>
              )}

              {/* Cancel — shown only when ACTIVE or TRIAL */}
              {(sub.status === "ACTIVE" || sub.status === "TRIAL") && (
                <button
                  onClick={() => setShowCancelDialog(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-sm font-medium text-red-400 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  Cancel plan
                </button>
              )}
            </div>
          </motion.div>
        ) : (
          /* ── No active subscription ──────────────────────────────────── */
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-md p-6 border border-border text-center"
          >
            <div className="w-14 h-14 bg-orange-500/10 rounded-md flex items-center justify-center mx-auto mb-4">
              <Crown className="w-7 h-7 text-orange-400" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">No Active Subscription</h2>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-5">
              Subscribe to get all-access to every course — choose a plan below.
            </p>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-sm font-medium text-muted-foreground transition-colors disabled:opacity-50"
            >
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Already purchased? Sync from Stripe
            </button>
          </motion.div>
        )}

        {/* ── Plan picker ─────────────────────────────���─────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <h2 className="text-lg font-bold text-foreground">
              {isPaidPlan && sub?.status !== "EXPIRED" ? "Change Plan" : "Choose a Plan"}
            </h2>
            <div className="flex items-center gap-1 bg-secondary rounded-lg p-1 text-sm">
              {(["monthly", "yearly"] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => setBilling(b)}
                  className={cn(
                    "px-3 py-1.5 rounded-md font-medium capitalize transition-all",
                    billing === b ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {b}
                  {b === "yearly" && <span className="ml-1.5 text-[10px] text-green-400 font-bold">-33%</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Proration notice for active paid subscribers changing plans */}
          {isPaidPlan && sub?.status !== "EXPIRED" && sub?.status !== "CANCELLED" && (
            <div className="mb-4 flex items-start gap-2 rounded-md border border-orange-400/15 bg-orange-500/5 px-4 py-3 text-xs text-orange-300/80">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-orange-400/60" />
              <span>
                Upgrades are charged immediately on a prorated basis — you only pay for the remaining time in your billing cycle.
                Downgrades take effect at your next renewal date.
              </span>
            </div>
          )}

          <div className="grid sm:grid-cols-3 gap-4">
            {UPGRADE_PLANS.map((plan) => {
              const pm          = PLAN_META[plan.id as PlanType];
              const Icon        = pm.icon;
              const price       = billing === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
              const isLoading   = actionLoading === plan.id;
              const isCurrent   = sub?.plan === plan.id && sub?.status !== "EXPIRED";
              const planRank    = PLAN_RANK[plan.id] ?? 0;
              const isUpgrade   = planRank > currentRank;
              const isDowngrade = planRank < currentRank;
              // "live sub" = user has a subscription that isn't expired yet
              const hasLiveSub  = isPaidPlan && sub?.status !== "EXPIRED";

              // Detect if user wants to switch billing cycle on same plan
              const currentBillingCycle = detectBilling(sub);
              const isSamePlanDiffBilling = isCurrent && sub?.status === "ACTIVE" && billing !== currentBillingCycle;

              let buttonLabel = `Get ${plan.label}`;
              let ButtonIcon: React.ElementType | null = null;

              if (isCurrent && sub?.status === "ACTIVE" && !isSamePlanDiffBilling) {
                buttonLabel = "Current Plan";
              } else if (isSamePlanDiffBilling) {
                buttonLabel = `Switch to ${billing === "yearly" ? "Yearly" : "Monthly"}`;
                ButtonIcon  = RefreshCw;
              } else if (isCurrent && sub?.status === "CANCELLED") {
                buttonLabel = "Resume subscription";
                ButtonIcon  = RefreshCcw;
              } else if (hasLiveSub && isUpgrade) {
                buttonLabel = `Upgrade to ${plan.label}`;
                ButtonIcon  = ArrowUpRight;
              } else if (hasLiveSub && isDowngrade) {
                buttonLabel = `Downgrade to ${plan.label}`;
                ButtonIcon  = ArrowDownRight;
              }

              // Disable only when the plan + billing cycle is already active
              const isDisabled = isCurrent && sub?.status === "ACTIVE" && !isSamePlanDiffBilling;

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "glass rounded-md p-5 border flex flex-col relative",
                    plan.popular ? "border-orange-400/30 shadow-glow" : "border-border",
                    isCurrent && sub?.status === "ACTIVE" && "ring-1 ring-orange-400/30"
                  )}
                >
                  {plan.popular && !(isCurrent && sub?.status === "ACTIVE") && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-orange-400 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow">
                      Most Popular
                    </span>
                  )}
                  {isCurrent && sub?.status === "ACTIVE" && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-green-600 to-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Active
                    </span>
                  )}

                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-3", pm.bg)}>
                    <Icon className={cn("w-5 h-5", pm.color)} />
                  </div>
                  <h3 className="font-bold text-foreground mb-1">{plan.label}</h3>
                  <div className="flex items-end gap-1 mb-4">
                    <span className="text-2xl font-black text-foreground">
                      ₹{price.toLocaleString("en-IN")}
                    </span>
                    <span className="text-muted-foreground text-xs mb-1">
                      /{billing === "monthly" ? "mo" : "yr"}
                    </span>
                  </div>
                  <ul className="flex-1 space-y-2 mb-5">
                    {pm.features.slice(0, 4).map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => {
                      if (isCurrent && sub?.status === "CANCELLED") {
                        handleResume();  // clicking current plan when cancelled = resume
                      } else if (!isDisabled) {
                        handlePlanAction(plan.id);
                      }
                    }}
                    disabled={isLoading || isDisabled || resuming}
                    className={cn(
                      "w-full py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2",
                      isDisabled
                        ? "bg-secondary text-muted-foreground cursor-default"
                        : plan.popular
                          ? "bg-gradient-to-r from-orange-500 to-orange-400 text-white hover:opacity-90"
                          : "bg-secondary text-foreground hover:bg-secondary/70",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {isLoading || (isCurrent && sub?.status === "CANCELLED" && resuming) ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                    ) : (
                      <>
                        {ButtonIcon && <ButtonIcon className="w-4 h-4" />}
                        {buttonLabel}
                      </>
                    )}
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Cancel confirmation dialog ──────────────────────��─────────────── */}
      <CancelDialog
        open={showCancelDialog}
        endDate={sub?.endDate ?? null}
        cancelling={cancelling}
        onConfirm={handleConfirmCancel}
        onClose={() => setShowCancelDialog(false)}
      />

      {/* ── Add card modal ──────────────────���──────────────────────────────��� */}
      <AddCardModal
        open={showAddCard}
        onClose={() => { setShowAddCard(false); setPendingPlan(null); }}
        onSuccess={handleCardAdded}
        title="Add a payment method"
        description={pendingPlan
          ? `Save your card to subscribe to the ${pendingPlan.charAt(0) + pendingPlan.slice(1).toLowerCase()} plan.`
          : "Save your card to enable subscriptions."}
        submitLabel="Save & Subscribe"
      />
    </>
  );
}

// ─── Page wrapper (provides Stripe Elements context) ─────────────────────────

export default function SubscriptionPage() {
  return (
    <StripeProvider>
      <SubscriptionPageContent />
    </StripeProvider>
  );
}
