"use client";

/**
 * FeaturePurchaseGate
 * Wraps content that requires a purchased platform add-on (e.g. Community).
 * Shows a purchase CTA when the student hasn't bought the feature yet.
 *
 * This is for one-time purchase access.
 * Admins and Instructors bypass this gate automatically via their role.
 *
 * Usage:
 *   <FeaturePurchaseGate feature="community" hasAccess={hasCommunityAccess}>
 *     <CommunityContent />
 *   </FeaturePurchaseGate>
 */

import Link from "next/link";
import { Lock, ShoppingCart, CheckCircle2, ArrowRight } from "lucide-react";
import { useFeatureInfo } from "@/hooks/useFeatureCatalog";

interface FeatureConfig {
  slug:        string;
  name:        string;
  description: string;
  price:       string;
  includes:    string[];
}

// Static fallback copy; name, description and price are overridden with
// live values from the add-on catalog (admins manage them in /admin/add-ons).
const FEATURE_CONFIG: Record<string, Omit<FeatureConfig, "price">> = {
  community: {
    slug:        "community",
    name:        "Community Access",
    description: "Join the full community experience — post in forums, create study groups, give and receive peer reviews.",
    includes: [
      "Post & reply in discussion forums",
      "Create and join study groups",
      "Submit work for peer review",
      "Full activity feed participation",
    ],
  },
};

interface Props {
  /** Feature slug (must match PlatformFeature.slug in DB) */
  feature:   string;
  /** Pre-computed access flag (from usePurchasedFeatures or server-side check) */
  hasAccess: boolean;
  /** Loading state — shows skeleton while determining access */
  isLoading?: boolean;
  /** Render nothing instead of gate when locked */
  silent?: boolean;
  /** "default" = full card, "banner" = top-of-page strip, "inline" = compact row */
  variant?: "default" | "banner" | "inline";
  children: React.ReactNode;
}

export default function FeaturePurchaseGate({
  feature,
  hasAccess,
  isLoading = false,
  silent    = false,
  variant   = "default",
  children,
}: Props) {
  const live = useFeatureInfo(feature);

  if (isLoading) {
    return <div className="animate-pulse rounded-md bg-secondary/40 min-h-[80px]" />;
  }

  if (hasAccess) return <>{children}</>;
  if (silent)    return null;

  const fallback = FEATURE_CONFIG[feature] ?? {
    slug:        feature,
    name:        feature,
    description: "Purchase this feature to get access.",
    includes:    [],
  };
  const config: FeatureConfig = {
    ...fallback,
    name:        live?.name ?? fallback.name,
    description: live?.description ?? fallback.description,
    price:       live ? `₹${live.price.toLocaleString("en-IN")} one-time` : "One-time purchase",
  };

  if (variant === "banner") return <BannerGate config={config} />;
  if (variant === "inline") return <InlineGate config={config} />;
  return <CardGate config={config} />;
}

// ─── Card (full replacement) ──────────────────────────────────────────────────

function CardGate({ config }: { config: FeatureConfig }) {
  return (
    <div className="rounded-md border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 p-8 text-center space-y-5">
      <div className="flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-md bg-white/5 border border-white/10 flex items-center justify-center">
          <Lock className="w-6 h-6 text-primary/60" />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
          Add-on Required
        </span>
        <h3 className="text-foreground font-bold text-lg">{config.name}</h3>
        <p className="text-muted-foreground text-sm max-w-md leading-relaxed">{config.description}</p>
      </div>

      {config.includes.length > 0 && (
        <ul className="inline-flex flex-col gap-2 text-left">
          {config.includes.map((item) => (
            <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <Link
          href={`/features/${config.slug}`}
          className="btn-primary !px-6 !py-2.5 !text-sm !font-semibold !rounded-md"
        >
          <ShoppingCart className="w-4 h-4" />
          Buy {config.name} — {config.price}
        </Link>
        <Link
          href="/features"
          className="text-muted-foreground hover:text-foreground text-sm transition-colors flex items-center gap-1"
        >
          View all add-ons <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

// ─── Inline (compact row) ─────────────────────────────────────────────────────

function InlineGate({ config }: { config: FeatureConfig }) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-md border border-border bg-secondary/40">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
          <Lock className="w-3.5 h-3.5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-foreground text-sm font-medium truncate">{config.name} required</p>
          <span className="text-[11px] text-muted-foreground">{config.price}</span>
        </div>
      </div>
      <Link
        href={`/features/${config.slug}`}
        className="btn-primary !px-4 !py-2 !text-xs !font-semibold !rounded-lg flex-shrink-0"
      >
        <ShoppingCart className="w-3.5 h-3.5" />
        Buy Access
      </Link>
    </div>
  );
}

// ─── Banner (top-of-page strip) ───────────────────────────────────────────────

function BannerGate({ config }: { config: FeatureConfig }) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-md border border-primary/20 bg-primary/5">
      <div className="flex items-start gap-3">
        <Lock className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-foreground text-sm font-medium">{config.name} required</p>
          <p className="text-muted-foreground text-xs mt-0.5">{config.description}</p>
        </div>
      </div>
      <Link
        href={`/features/${config.slug}`}
        className="btn-primary !px-4 !py-2 !text-xs !font-semibold !rounded-lg flex-shrink-0"
      >
        <ShoppingCart className="w-3.5 h-3.5" />
        Buy {config.price}
      </Link>
    </div>
  );
}
