/**
 * Subscription Service — handles all-access subscription logic.
 *
 * Plan access rules:
 *   FREE       → no paid courses
 *   BASIC      → paid courses, up to BASIC_COURSE_LIMIT enrolled
 *   PRO        → all paid courses, unlimited
 *   ENTERPRISE → all paid courses, unlimited + team features
 *
 * minPlan on Course controls which plan tier is required:
 *   BASIC → accessible to BASIC, PRO, ENTERPRISE
 *   PRO   → accessible to PRO and ENTERPRISE only
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
  status: "ACTIVE" | "CANCELLED" | "EXPIRED" | "TRIAL" | null;
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
  /** PRO or ENTERPRISE: can access courses with minPlan=PRO */
  canAccessProCourses: boolean;
  hasCertificates: boolean;
  hasOfflineDownloads: boolean;
  hasAiRecommendations: boolean;
  hasInstructorQA: boolean;
  hasTeamManagement: boolean;
}

// ─── getPlanAccess ────────────────────────────────────────────────────────────

export async function getPlanAccess(userId: string): Promise<PlanAccess> {
  const [sub, enrolledCount] = await Promise.all([
    prisma.subscription.findUnique({
      where:  { userId },
      select: {
        plan: true, status: true,
        endDate: true, startDate: true,
        cancelledAt: true, trialEndsAt: true,
      },
    }),
    // Only count paid course enrollments — free courses don't use subscription slots
    prisma.enrollment.count({
      where: { userId, course: { isFree: false } },
    }),
  ]);

  if (!sub || sub.plan === "FREE") {
    return noAccess(enrolledCount);
  }

  // A CANCELLED subscription still grants access until endDate (period end)
  const now = new Date();
  const isActive =
    (sub.status === "ACTIVE" || sub.status === "TRIAL") &&
    (sub.endDate === null || sub.endDate > now)
    ||
    (sub.status === "CANCELLED" &&
     sub.endDate !== null &&
     sub.endDate > now);

  const plan = sub.plan as PlanAccess["plan"];

  const enrollmentLimit  = plan === "BASIC" ? BASIC_COURSE_LIMIT : null;
  const limitReached     = plan === "BASIC" && enrolledCount >= BASIC_COURSE_LIMIT;

  const isBasic      = plan === "BASIC";
  const isPro        = plan === "PRO" || plan === "ENTERPRISE";
  const isEnterprise = plan === "ENTERPRISE";

  return {
    isActive,
    isPaid: true,
    plan,
    status: sub.status as PlanAccess["status"],
    endDate:     sub.endDate     ? sub.endDate.toISOString()     : null,
    cancelledAt: sub.cancelledAt ? sub.cancelledAt.toISOString() : null,
    trialEndsAt: sub.trialEndsAt ? sub.trialEndsAt.toISOString() : null,

    enrollmentLimit,
    enrolledCount,
    limitReached: isActive ? limitReached : false,

    canAccessPaidCourses: isActive,
    canAccessProCourses:  isActive && isPro,
    hasCertificates:      isActive,
    hasOfflineDownloads:  isActive && isPro,
    hasAiRecommendations: isActive && isPro,
    hasInstructorQA:      isActive && isPro,
    hasTeamManagement:    isActive && isEnterprise,
  };

  function noAccess(count: number): PlanAccess {
    return {
      isActive: false, isPaid: false,
      plan: sub?.plan as PlanAccess["plan"] ?? "FREE",
      status: sub?.status as PlanAccess["status"] ?? null,
      endDate: null, cancelledAt: null, trialEndsAt: null,
      enrollmentLimit: null, enrolledCount: count, limitReached: false,
      canAccessPaidCourses: false, canAccessProCourses: false,
      hasCertificates: false, hasOfflineDownloads: false,
      hasAiRecommendations: false, hasInstructorQA: false, hasTeamManagement: false,
    };
  }
}

/** Check whether a user's plan meets or exceeds the course's minPlan requirement */
export function planMeetsRequirement(
  userPlan: string,
  courseMinPlan: string
): boolean {
  return (PLAN_RANK[userPlan] ?? 0) >= (PLAN_RANK[courseMinPlan] ?? 0);
}

// ─── Create Stripe Subscription Checkout Session ──────────────────────────────

export async function createSubscriptionCheckout(
  userId: string,
  plan: string,
  billing: "monthly" | "yearly"
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, stripeCustomerId: true },
  });
  if (!user) throw new Error("User not found");

  const existing = await prisma.subscription.findUnique({ where: { userId } });
  if (existing?.status === "ACTIVE" && existing.plan === plan) {
    throw new Error(`You are already on the ${plan} plan.`);
  }

  const priceId = PRICE_IDS[plan.toUpperCase()]?.[billing];
  if (!priceId) {
    throw new Error(
      `Stripe price ID not configured for ${plan} ${billing}. ` +
      `Set STRIPE_PRICE_${plan.toUpperCase()}_${billing.toUpperCase()} in your environment.`
    );
  }

  const stripe  = getStripe();
  const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  let customerId = user.stripeCustomerId ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name:  user.name,
      metadata: { userId },
    });
    customerId = customer.id;
    await prisma.user.update({
      where: { id: userId },
      data:  { stripeCustomerId: customerId },
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode:                        "subscription",
    customer:                    customerId,
    payment_method_types:        ["card"],
    billing_address_collection:  "required",   // required by RBI for Indian merchants
    customer_update:             { address: "auto", name: "auto" }, // persist billing info to customer
    line_items:                  [{ price: priceId, quantity: 1 }],
    metadata:                    { userId, plan: plan.toUpperCase(), billing },
    subscription_data:           { metadata: { userId, plan: plan.toUpperCase(), billing } },
    success_url: `${appUrl}/dashboard/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${appUrl}/pricing?cancelled=true`,
  });

  return { url: session.url, sessionId: session.id };
}

// ─── Get current subscription ─────────────────────────────────────────────────

export async function getUserSubscription(userId: string) {
  return prisma.subscription.findUnique({ where: { userId } });
}

// ─── Access check (backward-compat shim — use getPlanAccess for new code) ─────

export async function hasAllAccess(userId: string): Promise<boolean> {
  const access = await getPlanAccess(userId);
  return access.isActive && access.canAccessPaidCourses;
}

// ─── Cancel subscription (at period end, preserve access until then) ──────────

export async function cancelSubscription(userId: string) {
  const sub = await prisma.subscription.findUnique({
    where:  { userId },
    select: { stripeSubId: true, status: true },
  });
  if (!sub?.stripeSubId) throw new Error("No active Stripe subscription found.");
  if (sub.status === "CANCELLED") throw new Error("Subscription is already cancelled.");

  const stripe = getStripe();

  // cancel_at_period_end=true: Stripe sets cancel_at to the exact period end timestamp.
  // Use cancel_at directly — it's the most reliable source with API version 2026-03-25.dahlia
  // where current_period_end moved to the item level and may not be on the top-level object.
  const updated = await stripe.subscriptions.update(sub.stripeSubId, {
    cancel_at_period_end: true,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cancelAt = (updated as any).cancel_at as number | null | undefined;
  let cancelEndDate: Date;

  if (cancelAt) {
    cancelEndDate = new Date(cancelAt * 1000);
  } else {
    // Fallback: retrieve with expanded items to get period dates
    const fullSub = await stripe.subscriptions.retrieve(sub.stripeSubId, {
      expand: ["items"],
    });
    cancelEndDate = getPeriodDates(fullSub).endDate;
  }

  const dbSub = await prisma.subscription.update({
    where: { userId },
    data:  {
      status:      "CANCELLED",
      cancelledAt: new Date(),
      // Preserve access until the paid period actually ends
      endDate:     cancelEndDate,
    },
  });

  // Fire-and-forget cancellation email
  prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } })
    .then((u) => {
      if (u && dbSub.plan) {
        sendSubscriptionCancelledEmail(u.email, u.name, dbSub.plan, cancelEndDate)
          .catch(console.error);
      }
    })
    .catch(console.error);

  return { success: true, subscription: dbSub };
}

// ─── Resume subscription (undo cancel_at_period_end) ─────────────────────────

export async function resumeSubscription(userId: string) {
  const sub = await prisma.subscription.findUnique({
    where:  { userId },
    select: { stripeSubId: true, status: true },
  });
  if (!sub?.stripeSubId) throw new Error("No subscription found.");
  if (sub.status !== "CANCELLED") throw new Error("Subscription is not in a cancelled state.");

  const stripe = getStripe();

  const updated = await stripe.subscriptions.update(sub.stripeSubId, {
    cancel_at_period_end: false,
  });

  const { endDate } = getPeriodDates(updated);

  const dbSub = await prisma.subscription.update({
    where: { userId },
    data:  {
      status:      "ACTIVE",
      cancelledAt: null,
      endDate,
    },
  });

  // Fire-and-forget resume email
  prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } })
    .then((u) => {
      if (u && dbSub.plan) {
        sendSubscriptionResumedEmail(u.email, u.name, dbSub.plan).catch(console.error);
      }
    })
    .catch(console.error);

  return { success: true, subscription: dbSub };
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
  const userId = session.metadata?.userId;
  const plan   = session.metadata?.plan;
  if (!userId || !plan || session.mode !== "subscription") return;

  const subId = typeof session.subscription === "string"
    ? session.subscription
    : (session.subscription as Stripe.Subscription | null)?.id;
  if (!subId) return;

  const stripe = getStripe();
  const sub    = await stripe.subscriptions.retrieve(subId, {
    expand: ["items.data.price"],
  });

  const planLabel = plan.charAt(0) + plan.slice(1).toLowerCase();
  const limitNote = plan === "BASIC"
    ? `Access up to ${BASIC_COURSE_LIMIT} courses.`
    : "Unlimited access to every course.";

  const { startDate, endDate } = getPeriodDates(sub);

  await prisma.subscription.upsert({
    where:  { userId },
    create: {
      userId,
      plan:        plan as "BASIC" | "PRO" | "ENTERPRISE",
      status:      sub.status === "trialing" ? "TRIAL" : "ACTIVE",
      stripeSubId: sub.id,
      startDate,
      endDate,
      trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : undefined,
    },
    update: {
      plan:        plan as "BASIC" | "PRO" | "ENTERPRISE",
      status:      sub.status === "trialing" ? "TRIAL" : "ACTIVE",
      stripeSubId: sub.id,
      startDate,
      endDate,
      trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : undefined,
      cancelledAt: null,
    },
  });

  // Send activation notification
  await prisma.notification.create({
    data: {
      userId,
      title: `${planLabel} Plan Activated!`,
      body:  `Welcome to CoachNest ${planLabel}. ${limitNote} Start learning now!`,
      type:  "PURCHASE",
      link:  "/courses",
    },
  });
}

// ─── Webhook handlers ─────────────────────────────────────────────────────────

// handleSubscriptionCreated is kept for direct Stripe Dashboard / API activations
// that bypass the Checkout flow. For normal checkouts, handleSubscriptionCheckoutCompleted
// already wrote the record, so this upsert is idempotent.
export async function handleSubscriptionCreated(event: Stripe.Event) {
  const sub    = event.data.object as Stripe.Subscription;
  const userId = sub.metadata?.userId;
  const plan   = sub.metadata?.plan;
  if (!userId || !plan) return;

  const { startDate, endDate } = getPeriodDates(sub);

  await prisma.subscription.upsert({
    where:  { userId },
    create: {
      userId,
      plan:        plan as "BASIC" | "PRO" | "ENTERPRISE",
      status:      sub.status === "trialing" ? "TRIAL" : "ACTIVE",
      stripeSubId: sub.id,
      startDate,
      endDate,
      trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : undefined,
    },
    update: {
      plan:        plan as "BASIC" | "PRO" | "ENTERPRISE",
      status:      sub.status === "trialing" ? "TRIAL" : "ACTIVE",
      stripeSubId: sub.id,
      startDate,
      endDate,
      trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : undefined,
      cancelledAt: null,
    },
  });
}

export async function handleSubscriptionUpdated(event: Stripe.Event) {
  const sub    = event.data.object as Stripe.Subscription;
  const userId = sub.metadata?.userId;
  if (!userId) return;

  let status: "ACTIVE" | "CANCELLED" | "EXPIRED" | "TRIAL" = "ACTIVE";
  if (sub.status === "trialing")          status = "TRIAL";
  else if (sub.cancel_at_period_end)      status = "CANCELLED";
  else if (sub.status !== "active")       status = "EXPIRED";

  // For CANCELLED: use cancel_at (exact period end set by Stripe when cancel_at_period_end=true)
  // For others: use getPeriodDates
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cancelAt = (sub as any).cancel_at as number | null | undefined;
  const endDate = (status === "CANCELLED" && cancelAt)
    ? new Date(cancelAt * 1000)
    : getPeriodDates(sub).endDate;

  // Resolve plan from metadata or price ID (handles external plan changes via Stripe Dashboard)
  const metaPlan = sub.metadata?.plan?.toUpperCase() as "BASIC" | "PRO" | "ENTERPRISE" | undefined;
  const priceId  = (sub as any).items?.data?.[0]?.price?.id as string | undefined;
  const resolvedPlan = metaPlan ?? (priceId ? planFromPriceId(priceId) : null);

  await prisma.subscription.update({
    where: { userId },
    data:  {
      status,
      endDate,
      cancelledAt: status === "CANCELLED" ? new Date() : (status === "ACTIVE" ? null : undefined),
      ...(resolvedPlan ? { plan: resolvedPlan } : {}),
    },
  });
}

export async function handleSubscriptionDeleted(event: Stripe.Event) {
  const sub    = event.data.object as Stripe.Subscription;
  const userId = sub.metadata?.userId;
  if (!userId) return;

  await prisma.subscription.update({
    where: { userId },
    data:  { status: "EXPIRED", endDate: new Date() },
  });

  await prisma.notification.create({
    data: {
      userId,
      title: "Subscription Ended",
      body:  "Your subscription has expired. Renew anytime to regain access.",
      type:  "SYSTEM",
      link:  "/pricing",
    },
  });
}

export async function handleInvoicePaymentFailed(event: Stripe.Event) {
  const invoice    = event.data.object as Stripe.Invoice;
  const customerId = typeof invoice.customer === "string"
    ? invoice.customer
    : invoice.customer?.id;
  if (!customerId) return;

  const user = await prisma.user.findUnique({
    where:  { stripeCustomerId: customerId },
    select: { id: true },
  });
  if (!user) return;

  await prisma.notification.create({
    data: {
      userId: user.id,
      title:  "Payment Failed",
      body:   "We could not process your subscription payment. Please update your billing details.",
      type:   "SYSTEM",
      link:   "/dashboard/subscription",
    },
  });

  // Fire-and-forget payment failed email
  const userRecord = await prisma.user.findUnique({
    where:  { id: user.id },
    select: { email: true, name: true },
  }).catch(() => null);
  if (userRecord) {
    sendPaymentFailedEmail(userRecord.email, userRecord.name).catch(console.error);
  }
}
