/**
 * /pricing — Comprehensive subscription plans page with feature comparison.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Check, X, Minus, Zap, Shield, HelpCircle, ChevronDown,
  BookOpen, Users, Award, Download, Brain, MessageSquare,
  BarChart3, Crown, Building2, Star, ArrowRight, Sparkles,
  Clock, Globe, Lock, Loader2, Phone, BadgeCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import { useSubscription } from "@/hooks/useSubscription";

// ─── Plan data ────────────────────────────────────────────────────────────────

interface Plan {
  id: "free" | "basic" | "pro" | "enterprise";
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  description: string;
  badge?: string;
  popular?: boolean;
  color: string;
  borderColor: string;
  glowColor: string;
  iconBg: string;
  cta: string;
}

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: "Perfect for exploring and getting started with learning.",
    color: "text-slate-400",
    borderColor: "border-white/10",
    glowColor: "",
    iconBg: "bg-slate-500/15",
    cta: "Get Started Free",
  },
  {
    id: "basic",
    name: "Basic",
    monthlyPrice: 499,
    yearlyPrice: 3999,
    description: "For learners who want to dive into premium courses.",
    color: "text-blue-400",
    borderColor: "border-blue-500/25",
    glowColor: "shadow-blue-500/10",
    iconBg: "bg-blue-500/15",
    cta: "Start Basic",
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 999,
    yearlyPrice: 7999,
    description: "Everything you need to master new skills and advance your career.",
    badge: "Most Popular",
    popular: true,
    color: "text-emerald-400",
    borderColor: "border-emerald-500/40",
    glowColor: "shadow-emerald-500/15",
    iconBg: "bg-emerald-500/15",
    cta: "Go Pro",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyPrice: 4999,
    yearlyPrice: 39999,
    description: "Scalable learning for teams, organizations, and businesses.",
    badge: "For Teams",
    color: "text-purple-400",
    borderColor: "border-purple-500/25",
    glowColor: "shadow-purple-500/10",
    iconBg: "bg-purple-500/15",
    cta: "Contact Sales",
  },
];

// ─── Feature comparison rows ──────────────────────────────────────────────────

type CellValue = boolean | string | null;

interface FeatureRow {
  label: string;
  tooltip?: string;
  free: CellValue;
  basic: CellValue;
  pro: CellValue;
  enterprise: CellValue;
}

interface FeatureGroup {
  category: string;
  icon: React.ElementType;
  rows: FeatureRow[];
}

const FEATURE_GROUPS: FeatureGroup[] = [
  {
    category: "Course Access",
    icon: BookOpen,
    rows: [
      { label: "Free courses", free: true, basic: true, pro: true, enterprise: true },
      { label: "Paid course access", free: false, basic: "Up to 5 courses", pro: "Unlimited", enterprise: "Unlimited" },
      { label: "Pro-tier courses", free: false, basic: false, pro: true, enterprise: true },
      { label: "Course previews", free: true, basic: true, pro: true, enterprise: true },
      { label: "Early access to new releases", free: false, basic: false, pro: true, enterprise: true },
      { label: "Course bookmarking", free: true, basic: true, pro: true, enterprise: true },
    ],
  },
  {
    category: "Learning Tools",
    icon: Brain,
    rows: [
      { label: "Progress tracking", free: "Basic", basic: "Full", pro: "Full", enterprise: "Full" },
      { label: "Completion certificates", free: false, basic: false, pro: true, enterprise: true },
      { label: "Offline downloads", free: false, basic: false, pro: true, enterprise: true },
      { label: "AI-powered recommendations", free: false, basic: false, pro: true, enterprise: true },
      { label: "Streak & XP gamification", free: true, basic: true, pro: true, enterprise: true },
      { label: "Notes & bookmarks per lesson", free: false, basic: true, pro: true, enterprise: true },
      { label: "Quiz access", free: "Free courses only", basic: true, pro: true, enterprise: true },
    ],
  },
  {
    category: "Community",
    icon: Users,
    rows: [
      { label: "Read discussion forums", free: true, basic: true, pro: true, enterprise: true },
      { label: "Post & reply in forums", free: false, basic: false, pro: true, enterprise: true },
      { label: "Create & join study groups", free: false, basic: false, pro: true, enterprise: true },
      { label: "Peer review (submit & review)", free: false, basic: false, pro: true, enterprise: true },
      { label: "Activity feed", free: true, basic: true, pro: true, enterprise: true },
      { label: "Instructor Q&A", free: false, basic: false, pro: true, enterprise: true },
    ],
  },
  {
    category: "Support",
    icon: MessageSquare,
    rows: [
      { label: "Email support", free: false, basic: true, pro: true, enterprise: true },
      { label: "Priority support", free: false, basic: false, pro: true, enterprise: true },
      { label: "Dedicated account manager", free: false, basic: false, pro: false, enterprise: true },
      { label: "Onboarding assistance", free: false, basic: false, pro: false, enterprise: true },
      { label: "SLA guarantee", free: false, basic: false, pro: false, enterprise: true },
    ],
  },
  {
    category: "Team & Admin",
    icon: Building2,
    rows: [
      { label: "Team member seats", free: null, basic: null, pro: null, enterprise: "Up to 50" },
      { label: "Team progress analytics", free: false, basic: false, pro: false, enterprise: true },
      { label: "Custom organization branding", free: false, basic: false, pro: false, enterprise: true },
      { label: "Centralized billing", free: false, basic: false, pro: false, enterprise: true },
      { label: "SSO / SAML integration", free: false, basic: false, pro: false, enterprise: true },
      { label: "Role-based access control", free: false, basic: false, pro: false, enterprise: true },
      { label: "Admin dashboard", free: false, basic: false, pro: false, enterprise: true },
    ],
  },
];

// ─── Testimonials ─────────────────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    name: "Priya Sharma",
    role: "Frontend Developer",
    avatar: "PS",
    plan: "Pro",
    planColor: "text-emerald-400",
    quote: "The AI recommendations changed how I learn. It figured out my weak spots and built a path I never would have discovered myself.",
    rating: 5,
  },
  {
    name: "Arjun Mehta",
    role: "Startup Founder",
    avatar: "AM",
    plan: "Enterprise",
    planColor: "text-purple-400",
    quote: "We onboarded 30 engineers in a month. The team analytics helped us identify skill gaps and close them fast. ROI was immediate.",
    rating: 5,
  },
  {
    name: "Riya Kapoor",
    role: "UI/UX Designer",
    avatar: "RK",
    plan: "Basic",
    planColor: "text-blue-400",
    quote: "Started with Basic to test the waters — ended up completing 4 courses in 6 weeks. The quality is genuinely world-class.",
    rating: 5,
  },
];

// ─── FAQ ──────────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: "Can I switch between plans at any time?",
    a: "Yes. You can upgrade instantly — access changes immediately. Downgrades take effect at the end of your current billing period so you don't lose any paid access.",
  },
  {
    q: "Is there a free trial for paid plans?",
    a: "Pro plan includes a 7-day free trial with no credit card required. Basic plan has no trial but is covered by our 30-day money-back guarantee.",
  },
  {
    q: "What counts as a 'course slot' on the Basic plan?",
    a: "Only paid (premium) courses use your 5 slots. Free courses are completely unlimited and never count against your limit.",
  },
  {
    q: "What happens to my access if I downgrade?",
    a: "Your subscription remains active until the end of the billing period. After that, you retain access to free content and any courses you've completed.",
  },
  {
    q: "What payment methods do you accept?",
    a: "All major credit and debit cards, UPI, and net banking via Stripe. All transactions are secured with 256-bit SSL encryption.",
  },
  {
    q: "How do refunds work?",
    a: "We offer a full 30-day money-back guarantee on all paid plans — no questions asked. Contact support@coachnest.com to process your refund.",
  },
  {
    q: "Can I get an invoice for my purchase?",
    a: "Yes. Every payment generates a GST-compliant invoice available in your billing dashboard under Dashboard → Billing.",
  },
  {
    q: "How does Enterprise pricing work?",
    a: "Enterprise is billed per-seat. Contact our sales team for a custom quote based on your team size, contract length, and required features.",
  },
];

// ─── Stat counter ─────────────────────────────────────────────────────────────

const STATS = [
  { value: "12,000+", label: "Active learners" },
  { value: "340+",    label: "Expert courses" },
  { value: "4.9/5",   label: "Average rating" },
  { value: "93%",     label: "Completion rate on Pro" },
];

// ─── Helper ───────────────────────────────────────────────────────────────────

function Cell({ value, planId }: { value: CellValue; planId: string }) {
  if (value === null) {
    return (
      <div className="flex justify-center">
        <Minus className="w-4 h-4 text-white/15" />
      </div>
    );
  }
  if (value === true) {
    const color =
      planId === "pro" ? "text-emerald-400" :
      planId === "enterprise" ? "text-purple-400" :
      planId === "basic" ? "text-blue-400" :
      "text-slate-400";
    return (
      <div className="flex justify-center">
        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
          planId === "pro" ? "bg-emerald-500/15" :
          planId === "enterprise" ? "bg-purple-500/15" :
          planId === "basic" ? "bg-blue-500/15" :
          "bg-slate-500/15"
        }`}>
          <Check className={`w-3 h-3 ${color}`} />
        </div>
      </div>
    );
  }
  if (value === false) {
    return (
      <div className="flex justify-center">
        <X className="w-4 h-4 text-white/20" />
      </div>
    );
  }
  // string value
  const color =
    planId === "pro" ? "text-emerald-400" :
    planId === "enterprise" ? "text-purple-400" :
    planId === "basic" ? "text-blue-400" :
    "text-slate-400";
  return (
    <div className="flex justify-center">
      <span className={`text-xs font-medium text-center leading-tight ${color}`}>{value}</span>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/8 rounded-md overflow-hidden">
      <button
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-white/[0.03] transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="text-foreground font-medium text-sm">{q}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-5 pb-4">
          <p className="text-muted-foreground text-sm leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();
  const { plan: currentPlan, isActive, isLoading: subLoading } = useSubscription();

  function getPrice(plan: Plan) {
    return billing === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
  }

  function getMonthlyCost(plan: Plan) {
    if (billing === "monthly") return null;
    return Math.round(plan.yearlyPrice / 12);
  }

  function getSaving(plan: Plan) {
    if (plan.monthlyPrice === 0) return null;
    const annualMonthly = plan.monthlyPrice * 12;
    const saving = annualMonthly - plan.yearlyPrice;
    const pct = Math.round((saving / annualMonthly) * 100);
    return { saving, pct };
  }

  /** true if this plan matches the user's active subscription */
  function isCurrentPlan(plan: Plan) {
    return isActive && currentPlan === plan.id.toUpperCase();
  }

  async function handleSelect(plan: Plan) {
    if (plan.id === "free") { router.push("/signup"); return; }
    if (plan.id === "enterprise") {
      toast.success("Our sales team will reach out within 24 hours!");
      return;
    }

    setLoading(plan.id);
    try {
      // Check auth
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) {
        router.push("/login?from=/pricing");
        return;
      }

      // Already on this exact plan
      if (isCurrentPlan(plan)) {
        router.push("/dashboard/subscription");
        return;
      }

      // Has an active subscription → go to subscription page to change plan
      if (isActive && currentPlan !== "FREE") {
        router.push(`/dashboard/subscription`);
        return;
      }

      // No active subscription → go to checkout
      router.push(`/checkout?plan=${plan.id}&billing=${billing}`);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className=" pb-24">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center pt-16 pb-14"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-orange-400/25 bg-orange-500/10 text-orange-400 text-xs font-semibold uppercase tracking-wider mb-6">
          <Zap className="w-3.5 h-3.5" /> Simple, transparent pricing
        </div>
        <h1 className="text-4xl md:text-6xl font-black text-white mb-5 leading-tight">
          Invest in your future.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-emerald-400">
            Start learning today.
          </span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed mb-8">
          Choose a plan that fits your goals. Every plan includes access to our growing library of expert-crafted courses, gamification, and progress tracking.
        </p>

        {/* Stats strip */}
        <div className="flex flex-wrap justify-center gap-x-10 gap-y-3 text-sm">
          {STATS.map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center">
              <span className="text-white font-bold text-xl">{value}</span>
              <span className="text-muted-foreground text-xs">{label}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Billing toggle ────────────────────────────────────────────────── */}
      <div className="flex justify-center mb-12">
        <div className="flex items-center gap-1 p-1 bg-white/[0.04] border border-white/10 rounded-md">
          {(["monthly", "yearly"] as const).map((b) => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all capitalize flex items-center gap-2 ${
                billing === b
                  ? "bg-white/10 text-white shadow"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              {b}
              {b === "yearly" && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Save 33%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Pricing cards ─────────────────────────────────────────────────── */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {PLANS.map((plan, i) => {
          const price = getPrice(plan);
          const monthly = getMonthlyCost(plan);
          const saving = billing === "yearly" ? getSaving(plan) : null;
          const isLoading = loading === plan.id;

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className={`relative flex flex-col rounded-2xl border ${plan.borderColor} bg-white/[0.03] p-6 transition-all hover:-translate-y-1 duration-300 ${
                plan.popular ? `shadow-2xl ${plan.glowColor}` : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                  <span className="flex items-center gap-1 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-lg shadow-emerald-600/30">
                    <Sparkles className="w-3 h-3" /> Most Popular
                  </span>
                </div>
              )}
              {plan.badge && !plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                  <span className="bg-white/10 border border-white/15 text-white/70 text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                    {plan.badge}
                  </span>
                </div>
              )}

              {/* Plan header */}
              <div className="mb-5">
                <div className={`w-10 h-10 rounded-md ${plan.iconBg} flex items-center justify-center mb-3`}>
                  {plan.id === "free"       && <Globe className={`w-5 h-5 ${plan.color}`} />}
                  {plan.id === "basic"      && <BookOpen className={`w-5 h-5 ${plan.color}`} />}
                  {plan.id === "pro"        && <Crown className={`w-5 h-5 ${plan.color}`} />}
                  {plan.id === "enterprise" && <Building2 className={`w-5 h-5 ${plan.color}`} />}
                </div>
                <h3 className="text-white font-bold text-xl mb-1">{plan.name}</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">{plan.description}</p>
              </div>

              {/* Price */}
              <div className="mb-5 pb-5 border-b border-white/8">
                <div className="flex items-end gap-1.5">
                  <span className="text-4xl font-black text-white">
                    {price === 0 ? "Free" : `₹${price.toLocaleString("en-IN")}`}
                  </span>
                  {price > 0 && (
                    <span className="text-muted-foreground/60 text-sm mb-1.5">
                      /{billing === "yearly" ? "yr" : "mo"}
                    </span>
                  )}
                </div>
                {monthly && monthly > 0 && (
                  <p className="text-muted-foreground text-xs mt-1">
                    ≈ ₹{monthly.toLocaleString("en-IN")}/month
                  </p>
                )}
                {saving && saving.saving > 0 && (
                  <p className="text-emerald-400 text-xs mt-1 font-medium">
                    Save ₹{saving.saving.toLocaleString("en-IN")} ({saving.pct}% off)
                  </p>
                )}
              </div>

              {/* Current plan badge */}
              {!subLoading && isCurrentPlan(plan) && (
                <div className="flex items-center justify-center gap-1.5 mb-3 text-xs font-semibold text-emerald-400">
                  <BadgeCheck className="w-3.5 h-3.5" /> Your current plan
                </div>
              )}

              {/* CTA */}
              <button
                onClick={() => handleSelect(plan)}
                disabled={isLoading || (!subLoading && isCurrentPlan(plan))}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-semibold transition-all mb-5 ${
                  !subLoading && isCurrentPlan(plan)
                    ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 cursor-default"
                    : plan.popular
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25"
                    : plan.id === "enterprise"
                    ? "bg-purple-600 hover:bg-purple-500 text-white"
                    : "bg-white/8 hover:bg-white/12 text-white border border-white/10"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting…</>
                ) : !subLoading && isCurrentPlan(plan) ? (
                  <><BadgeCheck className="w-3.5 h-3.5" /> Current Plan</>
                ) : !subLoading && isActive && currentPlan !== "FREE" && plan.id !== "free" && plan.id !== "enterprise" ? (
                  // User has a different active plan → show upgrade/downgrade label
                  <>
                    {(["FREE", "BASIC", "PRO", "ENTERPRISE"].indexOf(plan.id.toUpperCase()) >
                      ["FREE", "BASIC", "PRO", "ENTERPRISE"].indexOf(currentPlan))
                      ? "Upgrade" : "Downgrade"
                    } <ArrowRight className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>{plan.cta} <ArrowRight className="w-3.5 h-3.5" /></>
                )}
              </button>

              {/* Key features list */}
              <ul className="space-y-2.5 flex-1">
                {getKeyFeatures(plan.id).map((feat) => (
                  <li key={feat} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                    <Check className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${plan.color}`} />
                    {feat}
                  </li>
                ))}
              </ul>
            </motion.div>
          );
        })}
      </div>

      {/* Yearly note */}
      {billing === "yearly" && (
        <p className="text-center text-muted-foreground/50 text-xs mb-16">
          Billed annually. Monthly billing available at a higher rate.
        </p>
      )}

      {/* ── Social proof strip ────────────────────────────────────────────── */}
      <div className="flex flex-wrap justify-center gap-6 py-10 mb-4 border-y border-white/5">
        {[
          { icon: Shield, label: "30-day money-back guarantee" },
          { icon: Zap,    label: "Instant access after payment" },
          { icon: Lock,   label: "Secure payments via Stripe" },
          { icon: Clock,  label: "Cancel anytime, no penalties" },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2 text-muted-foreground/60 text-sm">
            <Icon className="w-4 h-4 text-orange-400/70" />
            {label}
          </div>
        ))}
      </div>

      {/* ── Feature comparison table ──────────────────────────────────────── */}
      <section className="mt-20 mb-20">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-white mb-3">Compare every feature</h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">
            A full breakdown of what's included in each plan so you can choose with confidence.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/8">
          <table className="w-full min-w-[640px]">
            {/* Sticky plan header */}
            <thead>
              <tr className="border-b border-white/8">
                <th className="text-left py-5 px-5 text-muted-foreground text-xs font-semibold uppercase tracking-wider w-[38%]">
                  Features
                </th>
                {PLANS.map((plan) => (
                  <th key={plan.id} className="py-5 px-3 text-center w-[15.5%]">
                    <span className={`font-bold text-sm ${plan.color}`}>{plan.name}</span>
                    {plan.popular && (
                      <div className="mt-1">
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                          Popular
                        </span>
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {FEATURE_GROUPS.map((group, gi) => (
                <>
                  {/* Category header row */}
                  <tr key={`cat-${gi}`} className="bg-white/[0.015]">
                    <td colSpan={5} className="py-3 px-5">
                      <div className="flex items-center gap-2">
                        <group.icon className="w-4 h-4 text-orange-400" />
                        <span className="text-white font-semibold text-sm">{group.category}</span>
                      </div>
                    </td>
                  </tr>

                  {/* Feature rows */}
                  {group.rows.map((row, ri) => (
                    <tr
                      key={`${gi}-${ri}`}
                      className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3 px-5">
                        <span className="text-muted-foreground text-sm">{row.label}</span>
                      </td>
                      <td className="py-3 px-3"><Cell value={row.free} planId="free" /></td>
                      <td className="py-3 px-3"><Cell value={row.basic} planId="basic" /></td>
                      <td className="py-3 px-3 bg-emerald-500/[0.03]"><Cell value={row.pro} planId="pro" /></td>
                      <td className="py-3 px-3"><Cell value={row.enterprise} planId="enterprise" /></td>
                    </tr>
                  ))}
                </>
              ))}

              {/* Bottom CTA row */}
              <tr className="border-t border-white/8 bg-white/[0.015]">
                <td className="py-5 px-5 text-muted-foreground text-sm">Ready to get started?</td>
                {PLANS.map((plan) => (
                  <td key={plan.id} className={`py-5 px-3 text-center ${plan.popular ? "bg-emerald-500/[0.03]" : ""}`}>
                    <button
                      onClick={() => handleSelect(plan)}
                      disabled={loading === plan.id}
                      className={`text-xs font-semibold px-4 py-2 rounded-lg transition-all ${
                        plan.popular
                          ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                          : plan.id === "enterprise"
                          ? "bg-purple-600/80 hover:bg-purple-600 text-white"
                          : "bg-white/8 hover:bg-white/12 text-white border border-white/10"
                      }`}
                    >
                      {plan.cta}
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ── What makes each plan special ─────────────────────────────────── */}
      <section className="mb-20">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-white mb-3">What you unlock at each tier</h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">
            Every plan builds on the previous one. Here's what sets each tier apart.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {PLAN_HIGHLIGHTS.map((item) => (
            <div
              key={item.plan}
              className={`rounded-2xl border ${item.border} bg-gradient-to-br ${item.gradient} p-6`}
            >
              <div className="flex items-start gap-4 mb-5">
                <div className={`w-11 h-11 rounded-md ${item.iconBg} flex items-center justify-center flex-shrink-0`}>
                  <item.icon className={`w-5 h-5 ${item.iconColor}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className={`font-bold text-lg ${item.iconColor}`}>{item.plan}</h3>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${item.badge}`}>
                      {item.badgeText}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs mt-0.5">{item.tagline}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {item.highlights.map(({ icon: HIcon, text }) => (
                  <div key={text} className="flex items-start gap-2">
                    <HIcon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${item.iconColor}`} />
                    <span className="text-muted-foreground text-xs leading-relaxed">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────────────────────── */}
      <section className="mb-20">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-white mb-3">Loved by learners</h2>
          <p className="text-muted-foreground text-sm">Real reviews from real people who invested in their growth.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="rounded-2xl border border-white/8 bg-white/[0.03] p-6">
              {/* Stars */}
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                ))}
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed mb-5 italic">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-600 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {t.avatar}
                </div>
                <div>
                  <p className="text-foreground text-sm font-semibold">{t.name}</p>
                  <p className="text-muted-foreground/60 text-xs">{t.role} · <span className={`font-medium ${t.planColor}`}>{t.plan} Plan</span></p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Enterprise CTA ────────────────────────────────────────────────── */}
      <section className="mb-20">
        <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-purple-600/5 p-8 md:p-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start gap-5">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-7 h-7 text-purple-400" />
              </div>
              <div>
                <h3 className="text-white font-bold text-2xl mb-2">Building for a team?</h3>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-lg">
                  Enterprise gives you centralized billing, team progress analytics, custom branding, SSO integration, and a dedicated account manager. Scale learning across your entire organization.
                </p>
                <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-4">
                  {["Up to 50 seats", "Custom branding", "SSO / SAML", "Dedicated manager", "Priority SLA", "Admin dashboard"].map((f) => (
                    <div key={f} className="flex items-center gap-1.5 text-muted-foreground text-xs">
                      <Check className="w-3 h-3 text-purple-400" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3 flex-shrink-0">
              <button
                onClick={() => handleSelect(PLANS[3])}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-6 py-3 rounded-md transition-colors whitespace-nowrap"
              >
                <Phone className="w-4 h-4" /> Contact Sales
              </button>
              <p className="text-muted-foreground/50 text-xs text-center">Response within 24 hours</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section className="mb-20">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-white mb-3">Frequently asked questions</h2>
          <p className="text-muted-foreground text-sm">
            Can&apos;t find an answer?{" "}
            <Link href="/contact" className="text-orange-400 hover:text-orange-300 transition-colors">
              Contact our support team →
            </Link>
          </p>
        </div>
        <div className="max-w-3xl mx-auto grid sm:grid-cols-2 gap-3">
          {FAQ_ITEMS.map(({ q, a }) => (
            <FaqItem key={q} q={q} a={a} />
          ))}
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="text-center">
        <div className="rounded-2xl border border-white/8 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-emerald-500/20 border border-white/10 flex items-center justify-center mx-auto mb-5">
            <Sparkles className="w-8 h-8 text-orange-400" />
          </div>
          <h2 className="text-3xl font-black text-white mb-3">Start your learning journey today</h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto mb-8 leading-relaxed">
            Join 12,000+ learners already building skills with CoachNest. Free to start, easy to upgrade.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signup"
              className="flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/10 text-white text-sm font-semibold px-6 py-3 rounded-md transition-colors"
            >
              Start for free <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              onClick={() => handleSelect(PLANS[2])}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-6 py-3 rounded-md transition-colors shadow-lg shadow-emerald-600/20"
            >
              <Zap className="w-4 h-4" /> Go Pro — ₹{PLANS[2].monthlyPrice.toLocaleString("en-IN")}/mo
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── Static data helpers (outside component to avoid re-creation) ─────────────

function getKeyFeatures(id: string): string[] {
  switch (id) {
    case "free":       return ["Access to all free courses", "Progress tracking & XP", "Community read access", "Course previews & browsing"];
    case "basic":      return ["Up to 5 paid courses", "Full progress tracking", "Email support", "Notes per lesson", "Mobile-friendly"];
    case "pro":        return ["Unlimited paid courses", "Completion certificates", "Offline downloads", "AI recommendations", "Post in forums & groups", "Instructor Q&A access"];
    case "enterprise": return ["Everything in Pro", "50 team seats", "Team analytics dashboard", "Custom org branding", "SSO / SAML", "Dedicated account manager"];
    default:           return [];
  }
}

const PLAN_HIGHLIGHTS = [
  {
    plan: "Free",
    tagline: "Explore the platform with no commitment.",
    icon: Globe,
    iconColor: "text-slate-400",
    iconBg: "bg-slate-500/15",
    border: "border-white/8",
    gradient: "from-white/[0.03] to-transparent",
    badge: "bg-slate-500/15 text-slate-400 border border-slate-500/25",
    badgeText: "No credit card",
    highlights: [
      { icon: BookOpen,    text: "All free courses, no limit" },
      { icon: BarChart3,   text: "XP, streaks & gamification" },
      { icon: Globe,       text: "Browse full course catalog" },
      { icon: Users,       text: "Read community discussions" },
    ],
  },
  {
    plan: "Basic",
    tagline: "Dip your toes into premium learning.",
    icon: BookOpen,
    iconColor: "text-blue-400",
    iconBg: "bg-blue-500/15",
    border: "border-blue-500/20",
    gradient: "from-blue-500/[0.06] to-transparent",
    badge: "bg-blue-500/15 text-blue-400 border border-blue-500/25",
    badgeText: "₹499/mo",
    highlights: [
      { icon: BookOpen,    text: "5 premium course slots" },
      { icon: BarChart3,   text: "Full lesson notes & bookmarks" },
      { icon: MessageSquare, text: "Email support" },
      { icon: Clock,       text: "Mobile-optimized experience" },
    ],
  },
  {
    plan: "Pro",
    tagline: "The complete learning toolkit for serious learners.",
    icon: Crown,
    iconColor: "text-emerald-400",
    iconBg: "bg-emerald-500/15",
    border: "border-emerald-500/25",
    gradient: "from-emerald-500/[0.07] to-transparent",
    badge: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
    badgeText: "Most popular",
    highlights: [
      { icon: BookOpen,    text: "Unlimited course access" },
      { icon: Award,       text: "Verifiable certificates" },
      { icon: Download,    text: "Offline downloads" },
      { icon: Brain,       text: "AI learning recommendations" },
      { icon: Users,       text: "Full community participation" },
      { icon: MessageSquare, text: "Instructor Q&A access" },
    ],
  },
  {
    plan: "Enterprise",
    tagline: "Empower your entire team to grow together.",
    icon: Building2,
    iconColor: "text-purple-400",
    iconBg: "bg-purple-500/15",
    border: "border-purple-500/20",
    gradient: "from-purple-500/[0.06] to-transparent",
    badge: "bg-purple-500/15 text-purple-400 border border-purple-500/25",
    badgeText: "For teams",
    highlights: [
      { icon: Users,       text: "Manage up to 50 seats" },
      { icon: BarChart3,   text: "Team analytics & reporting" },
      { icon: Shield,      text: "SSO / SAML integration" },
      { icon: Globe,       text: "Custom org branding" },
      { icon: Star,        text: "Dedicated account manager" },
      { icon: Zap,         text: "Priority SLA support" },
    ],
  },
];
