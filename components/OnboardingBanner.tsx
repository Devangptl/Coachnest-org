"use client";

/**
 * OnboardingBanner
 * Shown on the dashboard when the student has not yet completed onboarding.
 * Dismisses by navigating to /onboarding.
 */

import Link from "next/link";
import { Sparkles, ArrowRight, X } from "lucide-react";
import { useState } from "react";

export default function OnboardingBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="mb-8 rounded-md border border-orange-500/25 bg-orange-500/10 px-5 py-4
                    flex items-center justify-between gap-4 animate-fade-in">
      <div className="flex items-center gap-3.5">
        <div className="w-9 h-9 rounded-lg bg-orange-500/20 border border-orange-500/20
                        flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4.5 h-4.5 text-[#d97757]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            Personalise your experience
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tell us your profession and we&apos;ll recommend the best courses for you.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Link
          href="/onboarding"
          className="btn-primary text-xs py-2 px-3.5 inline-flex items-center gap-1.5"
        >
          Set up <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground
                     hover:bg-secondary transition-all"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
