/**
 * /dashboard/subscription — Subscription management page.
 * Shows current plan, status, next billing date, and cancel / manage billing actions.
 */
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Crown, Zap, Building2, CheckCircle2, XCircle,
  Clock, AlertCircle, Loader2, ExternalLink, RefreshCcw, TrendingUp, RefreshCw,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type PlanType   = "FREE" | "BASIC" | "PRO" | "ENTERPRISE";
type SubStatus  = "ACTIVE" | "CANCELLED" | "EXPIRED" | "TRIAL";

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
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  features: string[];
}> = {
  FREE: {
    label: "Free",
    icon: Zap,
    color: "text-slate-400",
    bg: "bg-slate-500/10",
    border: "border-slate-500/20",
    features: ["Free courses only", "Community forum", "Basic progress tracking"],
  },
  BASIC: {
    label: "Basic",
    icon: Zap,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    features: ["Access to paid courses (up to 5)", "Download certificates", "Priority support", "Mobile app access"],
  },
  PRO: {
    label: "Pro",
    icon: Crown,
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
    features: ["Everything in Basic", "Unlimited courses", "Offline downloads", "AI recommendations", "Instructor Q&A", "Early access"],
  },
  ENTERPRISE: {
    label: "Enterprise",
    icon: Building2,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    features: ["Everything in Pro", "Team management (50 seats)", "Custom org branding", "Dedicated account manager", "SSO / SAML"],
  },
};

const STATUS_META: Record<SubStatus, { label: string; color: string; icon: React.ElementType }> = {
  ACTIVE:    { label: "Active",             color: "text-green-400",  icon: CheckCircle2 },
  TRIAL:     { label: "Trial",              color: "text-blue-400",   icon: Clock },
  CANCELLED: { label: "Cancels at period end", color: "text-yellow-400", icon: AlertCircle },
  EXPIRED:   { label: "Expired",            color: "text-red-400",    icon: XCircle },
};

// ─── Available upgrade plans ──────────────────────────────────────────────────

const UPGRADE_PLANS = [
  { id: "BASIC",      label: "Basic",      monthlyPrice: 499,  yearlyPrice: 3999  },
  { id: "PRO",        label: "Pro",        monthlyPrice: 999,  yearlyPrice: 7999,  popular: true },
  { id: "ENTERPRISE", label: "Enterprise", monthlyPrice: 4999, yearlyPrice: 39999 },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function SubscriptionPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [sub,          setSub]          = useState<Subscription | null>(null);
  const [planAccess,   setPlanAccess]   = useState<PlanAccessData | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [syncing,      setSyncing]      = useState(false);
  const [cancelling,   setCancelling]   = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [billing,      setBilling]      = useState<"monthly" | "yearly">("monthly");

  const isSuccessRedirect = searchParams.get("success") === "true";
  const sessionId         = searchParams.get("session_id");

  useEffect(() => {
    let cancelled = false;

    async function loadAndSync() {
      try {
        // Step 1 — if returning from Stripe checkout, sync the subscription first
        if (isSuccessRedirect) {
          const syncRes = await fetch("/api/subscriptions/sync", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ sessionId: sessionId ?? undefined }),
          });
          if (!syncRes.ok) {
            const err = await syncRes.json().catch(() => ({}));
            console.warn("[subscription] sync failed:", err.error);
          }
        }

        // Step 2 — load fresh status from DB
        const r    = await fetch("/api/subscriptions/status");
        const data = await r.json();

        if (!cancelled) {
          setSub(data.subscription ?? null);
          setPlanAccess(data.planAccess ?? null);
          setLoading(false);

          if (isSuccessRedirect && data.subscription?.plan && data.subscription.plan !== "FREE") {
            toast.success("Subscription activated! Welcome to all-access.");
            router.replace("/dashboard/subscription");
          }
        }
      } catch {
        if (!cancelled) {
          setLoading(false);
          toast.error("Could not load subscription");
        }
      }
    }

    loadAndSync();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubscribe(planId: string) {
    setCheckoutLoading(planId);
    try {
      const res  = await fetch("/api/subscriptions/checkout", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ plan: planId, billing }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Checkout failed");
      if (data.url) window.location.href = data.url;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to start checkout");
    } finally {
      setCheckoutLoading(null);
    }
  }

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

  async function handleSync() {
    setSyncing(true);
    try {
      const res  = await fetch("/api/subscriptions/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sync failed");

      // Reload status
      const r2    = await fetch("/api/subscriptions/status");
      const data2 = await r2.json();
      setSub(data2.subscription ?? null);
      setPlanAccess(data2.planAccess ?? null);
      toast.success("Subscription synced!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not sync subscription");
    } finally {
      setSyncing(false);
    }
  }


  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        {isSuccessRedirect && (
          <div className="flex items-center gap-3 bg-orange-500/10 border border-orange-400/20 rounded-xl px-5 py-4">
            <Loader2 className="w-5 h-5 text-orange-400 animate-spin flex-shrink-0" />
            <div>
              <p className="text-orange-300 font-semibold text-sm">Activating your subscription…</p>
              <p className="text-orange-400/60 text-xs">This takes just a moment.</p>
            </div>
          </div>
        )}
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-secondary rounded-lg" />
          <div className="h-48 bg-secondary rounded-xl" />
          <div className="h-64 bg-secondary rounded-xl" />
        </div>
      </div>
    );
  }

  const meta        = sub ? PLAN_META[sub.plan]   : null;
  const statusMeta  = sub ? STATUS_META[sub.status] : null;
  // CANCELLED subs with future endDate still have active access
  const isActive    = planAccess?.isActive ?? false;
  const isPaidPlan  = sub && sub.plan !== "FREE";
  const BASIC_LIMIT = 5;

  return (
    <div className="max-w-3xl mx-auto space-y-8">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Subscription</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your all-access plan and billing.
        </p>
      </div>

      {/* ── Current plan card ────────────────────────────────────────────────── */}
      {sub && isPaidPlan ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "glass rounded-xl p-6 border",
            meta!.border
          )}
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            {/* Plan info */}
            <div className="flex items-center gap-3">
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", meta!.bg)}>
                {(() => { const Icon = meta!.icon; return <Icon className={cn("w-6 h-6", meta!.color)} />; })()}
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Current Plan</p>
                <h2 className={cn("text-2xl font-black", meta!.color)}>{meta!.label}</h2>
              </div>
            </div>

            {/* Status badge */}
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border",
              statusMeta!.color,
              `border-current/20 bg-current/5`
            )}>
              {(() => { const Icon = statusMeta!.icon; return <Icon className="w-3.5 h-3.5" />; })()}
              {statusMeta!.label}
            </div>
          </div>

          {/* Dates */}
          <div className="mt-5 grid grid-cols-2 gap-4">
            {sub.startDate && (
              <div className="bg-background/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Started</p>
                <p className="text-sm font-medium text-foreground">
                  {new Date(sub.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            )}
            {sub.endDate && (
              <div className="bg-background/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">
                  {sub.status === "CANCELLED" ? "Access until" : "Renews on"}
                </p>
                <p className="text-sm font-medium text-foreground">
                  {new Date(sub.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            )}
            {sub.trialEndsAt && sub.status === "TRIAL" && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 col-span-2">
                <p className="text-xs text-blue-400 mb-1">Trial ends</p>
                <p className="text-sm font-medium text-blue-300">
                  {new Date(sub.trialEndsAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            )}
          </div>

          {/* Features included */}
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
              {planAccess.limitReached ? (
                <p className="text-xs text-amber-400 mt-2 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  All slots used.{" "}
                  <Link href="/pricing" className="underline hover:text-amber-300">Upgrade to PRO</Link>
                  {" "}for unlimited access.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground/60 mt-2">
                  {BASIC_LIMIT - planAccess.enrolledCount} slot{BASIC_LIMIT - planAccess.enrolledCount !== 1 ? "s" : ""} remaining.
                  Upgrade to PRO for unlimited.
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
              <ExternalLink className="w-4 h-4" />
              Manage Billing
            </Link>

            {isActive && sub?.status !== "CANCELLED" && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-sm font-medium text-red-400 transition-colors disabled:opacity-50"
              >
                {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Cancel Plan
              </button>
            )}

            {sub.status === "CANCELLED" && (
              <button
                onClick={() => router.push("/pricing")}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 text-sm font-medium text-orange-400 transition-colors"
              >
                <RefreshCcw className="w-4 h-4" />
                Resubscribe
              </button>
            )}
          </div>
        </motion.div>
      ) : (
        /* ── No active subscription ──────────────────────────────────────────── */
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl p-6 border border-border text-center"
        >
          <div className="w-14 h-14 bg-orange-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Crown className="w-7 h-7 text-orange-400" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">No Active Subscription</h2>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-5">
            Subscribe to get all-access to every course on CoachNest — no per-course purchases needed.
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

      {/* ── Upgrade / choose plan section ────────────────────────────────────── */}
      {(!isPaidPlan || sub?.status === "CANCELLED" || sub?.status === "EXPIRED") && (
        <div>
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <h2 className="text-lg font-bold text-foreground">
              {isPaidPlan ? "Resubscribe" : "Choose a Plan"}
            </h2>
            {/* Billing toggle */}
            <div className="flex items-center gap-1 bg-secondary rounded-lg p-1 text-sm">
              {(["monthly", "yearly"] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => setBilling(b)}
                  className={cn(
                    "px-3 py-1.5 rounded-md font-medium capitalize transition-all",
                    billing === b
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {b}
                  {b === "yearly" && (
                    <span className="ml-1.5 text-[10px] text-green-400 font-bold">-33%</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {UPGRADE_PLANS.map((plan) => {
              const pm   = PLAN_META[plan.id as PlanType];
              const Icon = pm.icon;
              const price = billing === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
              const isLoading = checkoutLoading === plan.id;

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "glass rounded-xl p-5 border flex flex-col relative",
                    plan.popular ? "border-orange-400/30 shadow-glow" : "border-border"
                  )}
                >
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-orange-400 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow">
                      Most Popular
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
                    <span className="text-muted-foreground text-xs mb-1">/{billing === "monthly" ? "mo" : "yr"}</span>
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
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={isLoading}
                    className={cn(
                      "w-full py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2",
                      plan.popular
                        ? "bg-gradient-to-r from-orange-500 to-orange-400 text-white hover:opacity-90"
                        : "bg-secondary text-foreground hover:bg-secondary/70",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {isLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting…</>
                    ) : (
                      `Get ${plan.label}`
                    )}
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
