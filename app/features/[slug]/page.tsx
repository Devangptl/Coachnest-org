"use client";

/**
 * /features/[slug] — Feature add-on purchase page.
 * Shows feature details and initiates a Razorpay checkout for the purchase.
 */

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Users, CheckCircle2, ShoppingCart, ArrowLeft,
  Package, AlertCircle,
} from "lucide-react";
import GlassCard from "@/components/GlassCard";

interface Feature {
  id:          string;
  name:        string;
  slug:        string;
  description: string | null;
  price:       number;
  hasAccess:   boolean;
}

const FEATURE_META: Record<string, {
  icon:     React.ElementType;
  color:    string;
  bg:       string;
  includes: string[];
  tagline:  string;
}> = {
  community: {
    icon:    Users,
    color:   "text-emerald-400",
    bg:      "bg-emerald-500/15",
    tagline: "Connect, collaborate, and grow with fellow learners.",
    includes: [
      "Post and reply in discussion forums",
      "Create and join study groups",
      "Submit work for peer review",
      "Full activity feed participation",
      "Lifetime access — no renewal",
    ],
  },
};

const DEFAULT_META = {
  icon:     Package,
  color:    "text-[#d97757]",
  bg:       "bg-orange-500/15",
  tagline:  "Unlock this platform feature with a one-time purchase.",
  includes: [],
};

export default function FeaturePurchasePage() {
  const params      = useParams();
  const searchParams = useSearchParams();
  const slug        = params.slug as string;

  const [feature,   setFeature]   = useState<Feature | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const isSuccess = searchParams.get("success") === "true";

  useEffect(() => {
    fetch(`/api/features/${slug}`)
      .then((r) => {
        if (r.status === 404) throw new Error("Feature not found");
        return r.json();
      })
      .then((data) => {
        const f = data.feature;
        setFeature({
          id:          f.id,
          name:        f.name,
          slug:        f.slug,
          description: f.description,
          price:       Number(f.price),
          hasAccess:   f.hasAccess,
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  function handleBuy() {
    if (!feature) return;
    // Navigate to in-app Razorpay checkout
    window.location.href = `/checkout/feature/${feature.slug}`;
  }

  const meta = FEATURE_META[slug] ?? DEFAULT_META;
  const Icon = meta.icon;

  if (loading) {
    return (
      <div className="pt-4 pb-16 max-w-xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-secondary rounded-lg" />
          <div className="h-64 bg-secondary rounded-md" />
          <div className="h-12 bg-secondary rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !feature) {
    return (
      <div className="pt-4 pb-16 max-w-xl mx-auto text-center">
        <AlertCircle className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-foreground mb-2">Feature not found</h1>
        <p className="text-muted-foreground text-sm mb-6">{error ?? "This add-on doesn't exist or is no longer available."}</p>
        <Link href="/features" className="btn-primary inline-flex items-center gap-2 text-sm">
          <ArrowLeft className="w-4 h-4" /> View all add-ons
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-4 pb-16 max-w-xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-6">
        <Link href="/features" className="hover:text-foreground transition-colors flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Add-ons
        </Link>
        <span>/</span>
        <span className="text-foreground">{feature.name}</span>
      </div>

      {/* Success state */}
      {isSuccess && (
        <div className="mb-6 rounded-md border border-emerald-500/20 bg-emerald-500/10 p-5 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-emerald-300 font-semibold">Purchase successful!</p>
            <p className="text-emerald-400/70 text-sm mt-0.5">
              Your {feature.name} access is now active. Enjoy!
            </p>
          </div>
        </div>
      )}

      {/* Already owned */}
      {feature.hasAccess && !isSuccess && (
        <div className="mb-6 rounded-md border border-emerald-500/20 bg-emerald-500/10 p-5 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-emerald-300 font-semibold">You already have access!</p>
            <p className="text-emerald-400/70 text-sm mt-0.5">
              You purchased {feature.name} — it&apos;s ready to use.
            </p>
          </div>
        </div>
      )}

      {/* Feature card */}
      <GlassCard className={`space-y-6 ${feature.hasAccess ? "border-emerald-500/20" : "border-orange-500/20"}`}>
        {/* Icon + title */}
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-md flex items-center justify-center flex-shrink-0 ${meta.bg}`}>
            <Icon className={`w-8 h-8 ${meta.color}`} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{feature.name}</h1>
            <p className="text-muted-foreground text-sm">{meta.tagline}</p>
          </div>
        </div>

        {/* Description */}
        {feature.description && (
          <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
        )}

        {/* Includes list */}
        {meta.includes.length > 0 && (
          <ul className="space-y-2.5">
            {meta.includes.map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-[#d97757] flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        )}

        {/* Price + CTA */}
        <div className="pt-4 border-t border-border">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <p className="text-3xl font-black text-foreground">
                ₹{feature.price.toLocaleString("en-IN")}
              </p>
              <p className="text-muted-foreground text-xs mt-1">One-time payment · Lifetime access</p>
            </div>

            {feature.hasAccess ? (
              <Link
                href={`/${slug}`}
                className="flex items-center gap-2 px-6 py-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-semibold transition-colors"
              >
                Open {feature.name}
              </Link>
            ) : (
              <button
                onClick={handleBuy}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-orange-500 hover:bg-[#d97757] text-white font-semibold transition-colors"
              >
                <ShoppingCart className="w-4 h-4" /> Buy Now
              </button>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Trust note */}
      {!feature.hasAccess && (
        <p className="text-center text-muted-foreground text-xs mt-4">
          Secure checkout powered by Razorpay. Card, UPI — all on this page.
        </p>
      )}
    </div>
  );
}
