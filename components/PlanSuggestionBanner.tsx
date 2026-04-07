"use client";

import Link from "next/link";
import { X, Zap, ArrowRight, Crown } from "lucide-react";
import { useState } from "react";
import { useSubscription } from "@/hooks/useSubscription";

interface Props {
  /** Which scenario triggers the banner */
  context:
    | "free-courses"       // User is FREE browsing course catalog
    | "basic-limit"        // BASIC user about to hit or hit slot limit
    | "pro-feature"        // User tried to use a PRO-only feature
    | "certificate"        // Course completion without certificate access
    | "ai-recommendations" // Used in courses sidebar
    | "community";         // Community landing page
  /** If user can dismiss, store key so it stays dismissed */
  dismissKey?: string;
  className?: string;
}

const COPY: Record<Props["context"], { icon: "zap" | "crown"; title: string; body: string; cta: string; plan: string; color: string }> = {
  "free-courses": {
    icon: "zap",
    title: "Unlock Premium Courses",
    body: "You're on the Free plan. Upgrade to Basic to enroll in up to 5 paid courses.",
    cta: "Upgrade to Basic",
    plan: "BASIC",
    color: "border-blue-500/20 bg-blue-500/5",
  },
  "basic-limit": {
    icon: "crown",
    title: "Course Slot Limit Reached",
    body: "You've used all 5 Basic slots. Upgrade to Pro for unlimited course access.",
    cta: "Upgrade to Pro",
    plan: "PRO",
    color: "border-amber-500/20 bg-amber-500/5",
  },
  "pro-feature": {
    icon: "crown",
    title: "Pro Feature",
    body: "This feature is available on Pro and Enterprise plans.",
    cta: "View Pro Plans",
    plan: "PRO",
    color: "border-emerald-500/20 bg-emerald-500/5",
  },
  "certificate": {
    icon: "crown",
    title: "Earn a Certificate",
    body: "Upgrade to Pro to receive a verifiable certificate when you complete this course.",
    cta: "Get Certificates",
    plan: "PRO",
    color: "border-purple-500/20 bg-purple-500/5",
  },
  "ai-recommendations": {
    icon: "zap",
    title: "Personalized Learning Path",
    body: "Pro subscribers get AI-powered course recommendations tailored to their goals.",
    cta: "Try Pro",
    plan: "PRO",
    color: "border-emerald-500/20 bg-emerald-500/5",
  },
  "community": {
    icon: "crown",
    title: "Join the Pro Community",
    body: "Forums, study groups, and peer review are exclusive to Pro and Enterprise members.",
    cta: "Upgrade for Community",
    plan: "PRO",
    color: "border-emerald-500/20 bg-emerald-500/5",
  },
};

function shouldShow(context: Props["context"], plan: string, limitReached: boolean): boolean {
  if (context === "free-courses") return plan === "FREE";
  if (context === "basic-limit") return plan === "BASIC" && limitReached;
  if (context === "pro-feature") return plan === "FREE" || plan === "BASIC";
  if (context === "certificate") return plan === "FREE" || plan === "BASIC";
  if (context === "ai-recommendations") return plan === "FREE" || plan === "BASIC";
  if (context === "community") return plan === "FREE" || plan === "BASIC";
  return false;
}

export default function PlanSuggestionBanner({ context, dismissKey, className = "" }: Props) {
  const { plan, planAccess, isLoading } = useSubscription();

  const storageKey = dismissKey ? `cn_banner_dismissed_${dismissKey}` : null;
  const [dismissed, setDismissed] = useState(() => {
    if (!storageKey) return false;
    if (typeof window === "undefined") return false;
    return localStorage.getItem(storageKey) === "1";
  });

  if (isLoading || dismissed) return null;
  if (!shouldShow(context, plan, planAccess.limitReached)) return null;

  const cfg = COPY[context];

  function dismiss() {
    setDismissed(true);
    if (storageKey) localStorage.setItem(storageKey, "1");
  }

  return (
    <div className={`flex items-start sm:items-center justify-between gap-3 p-4 rounded-md border ${cfg.color} ${className}`}>
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
          {cfg.icon === "crown" ? (
            <Crown className="w-4 h-4 text-amber-400" />
          ) : (
            <Zap className="w-4 h-4 text-emerald-400" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-foreground text-sm font-semibold">{cfg.title}</p>
          <p className="text-muted-foreground text-xs mt-0.5 leading-relaxed">{cfg.body}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <Link
          href="/pricing"
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
        >
          <Zap className="w-3.5 h-3.5" />
          {cfg.cta}
          <ArrowRight className="w-3 h-3" />
        </Link>
        {dismissKey && (
          <button
            onClick={dismiss}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
