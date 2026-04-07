"use client";

import Link from "next/link";
import { Lock, Zap, ArrowRight, Star } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import type { PlanAccess } from "@/services/subscription.service";

type Feature =
  | "canAccessPaidCourses"
  | "canAccessProCourses"
  | "hasCertificates"
  | "hasOfflineDownloads"
  | "hasAiRecommendations"
  | "hasInstructorQA"
  | "hasTeamManagement";

interface GateConfig {
  requiredPlan: "BASIC" | "PRO" | "ENTERPRISE";
  title: string;
  description: string;
  highlight?: string; // Short benefit blurb
}

const FEATURE_CONFIG: Record<Feature, GateConfig> = {
  canAccessPaidCourses: {
    requiredPlan: "BASIC",
    title: "Upgrade to access paid courses",
    description: "Start your learning journey with a Basic plan and unlock up to 5 premium courses.",
    highlight: "From $9/month",
  },
  canAccessProCourses: {
    requiredPlan: "PRO",
    title: "Pro plan required",
    description: "This content is exclusive to Pro and Enterprise subscribers. Get unlimited access to every course.",
    highlight: "Unlimited courses",
  },
  hasCertificates: {
    requiredPlan: "PRO",
    title: "Certificates require Pro",
    description: "Earn verifiable completion certificates to showcase your skills with a Pro subscription.",
    highlight: "Shareable on LinkedIn",
  },
  hasOfflineDownloads: {
    requiredPlan: "PRO",
    title: "Offline downloads require Pro",
    description: "Download lessons and watch them anywhere, even without an internet connection.",
    highlight: "Learn anywhere",
  },
  hasAiRecommendations: {
    requiredPlan: "PRO",
    title: "AI recommendations require Pro",
    description: "Get a personalized learning path powered by AI, tailored to your goals.",
    highlight: "Your personal mentor",
  },
  hasInstructorQA: {
    requiredPlan: "PRO",
    title: "Instructor Q&A requires Pro",
    description: "Ask instructors questions directly and get expert answers with a Pro subscription.",
    highlight: "Direct expert access",
  },
  hasTeamManagement: {
    requiredPlan: "ENTERPRISE",
    title: "Team management requires Enterprise",
    description: "Manage your team's learning, track progress, and control access with an Enterprise plan.",
    highlight: "Built for teams",
  },
};

const PLAN_COLORS: Record<string, string> = {
  BASIC: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
  PRO: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30",
  ENTERPRISE: "from-purple-500/20 to-purple-600/10 border-purple-500/30",
};

const PLAN_BADGE_COLORS: Record<string, string> = {
  BASIC: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  PRO: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  ENTERPRISE: "bg-purple-500/15 text-purple-400 border border-purple-500/30",
};

interface Props {
  feature: Feature;
  /** Override auto-detected plan access check */
  override?: boolean;
  /** Render nothing instead of gate if locked */
  silent?: boolean;
  /** Custom CTA text */
  ctaText?: string;
  /** Variant — inline is smaller, default is full card */
  variant?: "default" | "inline" | "banner";
  children: React.ReactNode;
}

export default function SubscriptionGate({
  feature,
  override,
  silent = false,
  ctaText,
  variant = "default",
  children,
}: Props) {
  const { planAccess, isLoading } = useSubscription();

  if (isLoading) {
    // Render a neutral skeleton so layout doesn't jump
    return (
      <div className="animate-pulse rounded-md bg-secondary/40 min-h-[80px]" />
    );
  }

  const hasAccess = override !== undefined ? override : (planAccess[feature] as boolean);

  if (hasAccess) return <>{children}</>;
  if (silent) return null;

  const config = FEATURE_CONFIG[feature];

  if (variant === "inline") {
    return (
      <InlineGate config={config} feature={feature} planAccess={planAccess} ctaText={ctaText} />
    );
  }

  if (variant === "banner") {
    return (
      <BannerGate config={config} feature={feature} planAccess={planAccess} ctaText={ctaText} />
    );
  }

  return (
    <CardGate config={config} feature={feature} planAccess={planAccess} ctaText={ctaText} />
  );
}

// ─── Card (full replacement) ──────────────────────────────────────────────────

function CardGate({
  config,
  planAccess,
  ctaText,
}: {
  config: GateConfig;
  feature: Feature;
  planAccess: PlanAccess;
  ctaText?: string;
}) {
  const gradient = PLAN_COLORS[config.requiredPlan];
  const badge = PLAN_BADGE_COLORS[config.requiredPlan];

  return (
    <div className={`rounded-2xl border bg-gradient-to-br ${gradient} p-8 text-center space-y-5`}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
          <Lock className="w-6 h-6 text-white/40" />
        </div>
        <span className={`text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full ${badge}`}>
          {config.requiredPlan} Plan Required
        </span>
        <h3 className="text-foreground font-bold text-lg">{config.title}</h3>
        <p className="text-muted-foreground text-sm max-w-md leading-relaxed">{config.description}</p>
        {config.highlight && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
            <Star className="w-3.5 h-3.5 text-amber-400" />
            {config.highlight}
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <Link
          href="/pricing"
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-6 py-2.5 rounded-md transition-colors"
        >
          <Zap className="w-4 h-4" />
          {ctaText ?? `Upgrade to ${config.requiredPlan}`}
        </Link>
        {planAccess.plan === "FREE" && (
          <Link
            href="/dashboard/subscription"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors flex items-center gap-1"
          >
            View plans <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}

// ─── Inline (small, fits inside UI) ──────────────────────────────────────────

function InlineGate({
  config,
  planAccess,
  ctaText,
}: {
  config: GateConfig;
  feature: Feature;
  planAccess: PlanAccess;
  ctaText?: string;
}) {
  const badge = PLAN_BADGE_COLORS[config.requiredPlan];

  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-md border border-border bg-secondary/40">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
          <Lock className="w-3.5 h-3.5 text-white/40" />
        </div>
        <div className="min-w-0">
          <p className="text-foreground text-sm font-medium truncate">{config.title}</p>
          <span className={`text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${badge}`}>
            {config.requiredPlan}
          </span>
        </div>
      </div>
      <Link
        href="/pricing"
        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex-shrink-0"
      >
        <Zap className="w-3.5 h-3.5" />
        {ctaText ?? "Upgrade"}
      </Link>
    </div>
  );
}

// ─── Banner (top-of-page strip) ───────────────────────────────────────────────

function BannerGate({
  config,
  ctaText,
}: {
  config: GateConfig;
  feature: Feature;
  planAccess: PlanAccess;
  ctaText?: string;
}) {
  const badge = PLAN_BADGE_COLORS[config.requiredPlan];

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-md border border-amber-500/20 bg-amber-500/5">
      <div className="flex items-start gap-3">
        <Lock className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-foreground text-sm font-medium">{config.title}</p>
          <p className="text-muted-foreground text-xs mt-0.5">{config.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${badge}`}>
          {config.requiredPlan}
        </span>
        <Link
          href="/pricing"
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <Zap className="w-3.5 h-3.5" />
          {ctaText ?? "Upgrade now"}
        </Link>
      </div>
    </div>
  );
}
