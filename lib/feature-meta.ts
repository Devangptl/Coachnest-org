/**
 * Shared display metadata for platform feature add-ons.
 * Single source of truth for the listing (/features), detail
 * (/features/[slug]) and checkout (/checkout/feature/[slug]) pages.
 */
import type { ElementType } from "react";
import { Users, Package } from "lucide-react";

export interface FeatureMeta {
  icon:     ElementType;
  tagline:  string;
  includes: string[];
}

export const FEATURE_META: Record<string, FeatureMeta> = {
  community: {
    icon:    Users,
    tagline: "Connect, collaborate, and grow with fellow learners.",
    includes: [
      "Post and reply in discussion forums",
      "Create and join study groups",
      "Submit work for peer review",
      "Full activity feed participation",
    ],
  },
};

export const DEFAULT_FEATURE_META: FeatureMeta = {
  icon:     Package,
  tagline:  "Unlock this platform feature with a one-time purchase.",
  includes: [],
};

export function getFeatureMeta(slug: string): FeatureMeta {
  return FEATURE_META[slug] ?? DEFAULT_FEATURE_META;
}
