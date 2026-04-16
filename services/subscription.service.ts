/**
 * Subscription Service — stubs retained for interface compatibility.
 *
 * The platform uses a direct-purchase model. All access checks return true.
 */
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import type Stripe from "stripe";
import {
  sendSubscriptionCancelledEmail,
  sendSubscriptionResumedEmail,
  sendPaymentFailedEmail,
} from "@/lib/email";

// ─── Constants ────────────────────────────────────────────────────────────────

export const BASIC_COURSE_LIMIT = 5;

/**
 * Stripe API "2026-03-25.dahlia" (SDK v21) moved current_period_start/end
 * from the Subscription root to sub.items.data[0]. This helper reads from
 * the item level first, then falls back to root-level (older API versions).
 */
export function getPeriodDates(sub: Stripe.Subscription) {
  const s = sub as any;
  const item  = s.items?.data?.[0];
  const start = item?.current_period_start ?? s.current_period_start ?? s.billing_cycle_anchor ?? s.created;
  const end   = item?.current_period_end   ?? s.current_period_end   ?? (start + 30 * 24 * 60 * 60);
  return {
    startDate: new Date(start * 1000),
    endDate:   new Date(end   * 1000),
  };
}

/** Maps a Stripe price ID to a plan key. Returns null if unrecognised. */
export function planFromPriceId(priceId: string): "BASIC" | "PRO" | "ENTERPRISE" | null {
  const env = process.env;
  const map: Array<[string | undefined, "BASIC" | "PRO" | "ENTERPRISE"]> = [
    [env.STRIPE_PRICE_BASIC_MONTHLY,      "BASIC"],
    [env.STRIPE_PRICE_BASIC_YEARLY,       "BASIC"],
    [env.STRIPE_PRICE_PRO_MONTHLY,        "PRO"],
    [env.STRIPE_PRICE_PRO_YEARLY,         "PRO"],
    [env.STRIPE_PRICE_ENTERPRISE_MONTHLY, "ENTERPRISE"],
    [env.STRIPE_PRICE_ENTERPRISE_YEARLY,  "ENTERPRISE"],
  ];
  for (const [id, plan] of map) {
    if (id && id === priceId) return plan;
  }
  return null;
}

/** Numeric rank for plan comparison (higher = more access) */
const PLAN_RANK: Record<string, number> = {
  FREE: 0, BASIC: 1, PRO: 2, ENTERPRISE: 3,
};

// ─── Stripe Price IDs ─────────────────────────────────────────────────────────

const PRICE_IDS: Record<string, Record<string, string | undefined>> = {
  BASIC: {
    monthly: process.env.STRIPE_PRICE_BASIC_MONTHLY,
    yearly:  process.env.STRIPE_PRICE_BASIC_YEARLY,
  },
  PRO: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
    yearly:  process.env.STRIPE_PRICE_PRO_YEARLY,
  },
  ENTERPRISE: {
    monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
    yearly:  process.env.STRIPE_PRICE_ENTERPRISE_YEARLY,
  },
};

// ─── PlanAccess type ──────────────────────────────────────────────────────────

export interface PlanAccess {
  /** Subscription is currently valid — paid content is accessible */
  isActive: boolean;
  /** Has any paid plan (false for FREE or no subscription) */
  isPaid: boolean;
  plan: "FREE" | "BASIC" | "PRO" | "ENTERPRISE";
  status: string | null;
  endDate: string | null;
  cancelledAt: string | null;
  trialEndsAt: string | null;

  // BASIC-specific limits
  /** null for PRO/ENTERPRISE (unlimited) */
  enrollmentLimit: number | null;
  /** Current total enrollments for this user */
  enrolledCount: number;
  /** true when BASIC user has used all 5 slots */
  limitReached: boolean;

  // Feature flags (derived from plan)
  canAccessPaidCourses: boolean;
  canAccessProCourses: boolean;
  hasCertificates: boolean;
  hasOfflineDownloads: boolean;
  hasAiRecommendations: boolean;
  hasInstructorQA: boolean;
  hasTeamManagement: boolean;
}

// ─── getPlanAccess ────────────────────────────────────────────────────────────

export async function getPlanAccess(userId: string): Promise<PlanAccess> {
  const enrolledCount = await prisma.enrollment.count({
    where: { userId },
  });

  // Plan functionality removed: everyone is treated as having full access to features.
  return {
    isActive: true,
    isPaid: true,
    plan: "FREE",
    status: "ACTIVE",
    endDate: null,
    cancelledAt: null,
    trialEndsAt: null,

    enrollmentLimit: null,
    enrolledCount,
    limitReached: false,

    canAccessPaidCourses: true,
    canAccessProCourses:  true,
    hasCertificates:      true,
    hasOfflineDownloads:  true,
    hasAiRecommendations: true,
    hasInstructorQA:      true,
    hasTeamManagement:    true,
  };
}

/** Retained for interface compatibility — always returns true. */
export function planMeetsRequirement(): boolean {
  return true;
}

// ─── Create Stripe Subscription Checkout Session ──────────────────────────────

export async function createSubscriptionCheckout(
  userId: string,
  plan: string,
  billing: "monthly" | "yearly"
) {
  throw new Error("Subscription plans are no longer available. Please purchase courses directly.");
}

// ─── Get current subscription ─────────────────────────────────────────────────

export async function getUserSubscription(_userId: string) {
  return null;
}

// ─── Access check (backward-compat shim — use getPlanAccess for new code) ─────

export async function hasAllAccess(userId: string): Promise<boolean> {
  const access = await getPlanAccess(userId);
  return access.isActive && access.canAccessPaidCourses;
}

// ─── Cancel subscription (at period end, preserve access until then) ──────────

export async function cancelSubscription(userId: string) {
  return { success: true };
}

// ─── Resume subscription (undo cancel_at_period_end) ─────────────────────────

export async function resumeSubscription(userId: string) {
  return { success: true };
}

// ─── Stripe Customer Portal (billing management) ──────────────────────────────

export async function createBillingPortalSession(userId: string) {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { stripeCustomerId: true },
  });
  if (!user?.stripeCustomerId) {
    throw new Error("No billing account found. Please subscribe first.");
  }

  const stripe  = getStripe();
  const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const session = await stripe.billingPortal.sessions.create({
    customer:   user.stripeCustomerId,
    return_url: `${appUrl}/dashboard/subscription`,
  });

  return { url: session.url };
}

// ─── Checkout session completed (subscription mode) ───────────────────────────
//
// This fires BEFORE the user is redirected back from Stripe, so writing the
// subscription record here guarantees it exists when the success page loads.
// The customer.subscription.created webhook may arrive later — it is idempotent.

export async function handleSubscriptionCheckoutCompleted(
  session: Stripe.Checkout.Session
) {
  // Plan functionality removed.
}

// ─── Webhook handlers ─────────────────────────────────────────────────────────

// handleSubscriptionCreated is kept for direct Stripe Dashboard / API activations
// that bypass the Checkout flow. For normal checkouts, handleSubscriptionCheckoutCompleted
// already wrote the record, so this upsert is idempotent.
export async function handleSubscriptionCreated(event: Stripe.Event) {
  // Plan functionality removed.
}

export async function handleSubscriptionUpdated(event: Stripe.Event) {
  // Plan functionality removed.
}

export async function handleSubscriptionDeleted(event: Stripe.Event) {
  // Plan functionality removed.
}

export async function handleInvoicePaymentFailed(event: Stripe.Event) {
  // Plan functionality removed.
}
