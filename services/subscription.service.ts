/**
 * Subscription Service — handles all-access subscription logic.
 *
 * Plan access rules:
 *   FREE       → no paid courses
 *   BASIC      → all-access (up to 5 courses tracked separately in UI)
 *   PRO        → all-access, unlimited
 *   ENTERPRISE → all-access + team features
 */
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import type Stripe from "stripe";

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

  // Get or create a Stripe Customer so billing history is preserved
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
    mode:                 "subscription",
    customer:             customerId,
    payment_method_types: ["card"],
    line_items:           [{ price: priceId, quantity: 1 }],
    metadata:             { userId, plan: plan.toUpperCase(), billing },
    subscription_data:    { metadata: { userId, plan: plan.toUpperCase(), billing } },
    success_url: `${appUrl}/dashboard/subscription?success=true`,
    cancel_url:  `${appUrl}/pricing?cancelled=true`,
  });

  return { url: session.url, sessionId: session.id };
}

// ─── Get current subscription ─────────────────────────────────────────────────

export async function getUserSubscription(userId: string) {
  return prisma.subscription.findUnique({ where: { userId } });
}

// ─── Access check — true when any paid plan is active ─────────────────────────

export async function hasAllAccess(userId: string): Promise<boolean> {
  const sub = await prisma.subscription.findUnique({
    where:  { userId },
    select: { status: true, plan: true, endDate: true },
  });
  if (!sub || sub.plan === "FREE") return false;
  if (sub.status !== "ACTIVE" && sub.status !== "TRIAL") return false;
  if (sub.endDate && sub.endDate < new Date()) return false;
  return true;
}

// ─── Cancel subscription (at period end) ─────────────────────────────────────

export async function cancelSubscription(userId: string) {
  const sub = await prisma.subscription.findUnique({
    where:  { userId },
    select: { stripeSubId: true, status: true },
  });
  if (!sub?.stripeSubId) throw new Error("No active Stripe subscription found.");
  if (sub.status === "CANCELLED") throw new Error("Subscription is already cancelled.");

  const stripe = getStripe();
  await stripe.subscriptions.update(sub.stripeSubId, {
    cancel_at_period_end: true,
  });

  await prisma.subscription.update({
    where: { userId },
    data:  { status: "CANCELLED" },
  });

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

// ─── Webhook handlers ─────────────────────────────────────────────────────────

export async function handleSubscriptionCreated(event: Stripe.Event) {
  const sub    = event.data.object as Stripe.Subscription;
  const userId = sub.metadata?.userId;
  const plan   = sub.metadata?.plan;
  if (!userId || !plan) return;

  await prisma.subscription.upsert({
    where:  { userId },
    create: {
      userId,
      plan:       plan as "BASIC" | "PRO" | "ENTERPRISE",
      status:     sub.status === "trialing" ? "TRIAL" : "ACTIVE",
      stripeSubId: sub.id,
      startDate:  new Date((sub as any).current_period_start * 1000),
      endDate:    new Date((sub as any).current_period_end   * 1000),
      trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : undefined,
    },
    update: {
      plan:       plan as "BASIC" | "PRO" | "ENTERPRISE",
      status:     sub.status === "trialing" ? "TRIAL" : "ACTIVE",
      stripeSubId: sub.id,
      startDate:  new Date((sub as any).current_period_start * 1000),
      endDate:    new Date((sub as any).current_period_end   * 1000),
      trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : undefined,
    },
  });

  await prisma.notification.create({
    data: {
      userId,
      title: `${plan} Plan Activated! 🎉`,
      body:  "You now have all-access to every course. Start learning now!",
      type:  "PURCHASE",
      link:  "/courses",
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

  await prisma.subscription.update({
    where: { userId },
    data:  {
      status,
      endDate: new Date((sub as any).current_period_end * 1000),
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
      body:  "Your subscription has expired. Renew anytime to regain all-access.",
      type:  "SYSTEM",
      link:  "/pricing",
    },
  });
}

export async function handleInvoicePaymentFailed(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
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
}
