/**
 * POST /api/billing/subscribe
 * Creates a new Stripe subscription using the customer's saved default payment method.
 * No redirect — everything happens in-UI.
 *
 * Body: { plan: "BASIC"|"PRO"|"ENTERPRISE", billing: "monthly"|"yearly" }
 *
 * Response:
 *   { success: true, plan }                         — payment succeeded immediately
 *   { requiresAction: true, clientSecret, subId }   — 3DS / further auth needed (client confirms)
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { sendSubscriptionEmail } from "@/lib/email";

// ─── Price ID map (mirrors subscription.service.ts) ──────────────────────────
const PRICE_IDS: Record<string, Record<string, string | undefined>> = {
  BASIC:      { monthly: process.env.STRIPE_PRICE_BASIC_MONTHLY,      yearly: process.env.STRIPE_PRICE_BASIC_YEARLY      },
  PRO:        { monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,        yearly: process.env.STRIPE_PRICE_PRO_YEARLY        },
  ENTERPRISE: { monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY, yearly: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY },
};

export async function POST() {
  return NextResponse.json(
    {
      error: "Subscription plans are no longer available. Please purchase courses or enrollments directly.",
      code: "SUBSCRIPTION_MODEL_REMOVED",
    },
    { status: 410 }
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function upsertSubscription(
  userId: string,
  plan:   string,
  billing: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sub: any
) {
  const item      = sub.items?.data?.[0];
  const startTs   = item?.current_period_start ?? sub.current_period_start ?? sub.billing_cycle_anchor ?? sub.created;
  const endTs     = item?.current_period_end   ?? sub.current_period_end   ?? (startTs + 30 * 24 * 60 * 60);

  await prisma.subscription.upsert({
    where:  { userId },
    create: {
      userId,
      plan:        plan as "BASIC" | "PRO" | "ENTERPRISE",
      status:      sub.status === "trialing" ? "TRIAL" : "ACTIVE",
      stripeSubId: sub.id,
      startDate:   new Date(startTs * 1000),
      endDate:     new Date(endTs   * 1000),
      trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : undefined,
    },
    update: {
      plan:        plan as "BASIC" | "PRO" | "ENTERPRISE",
      status:      sub.status === "trialing" ? "TRIAL" : "ACTIVE",
      stripeSubId: sub.id,
      startDate:   new Date(startTs * 1000),
      endDate:     new Date(endTs   * 1000),
      trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : undefined,
      cancelledAt: null,
    },
  });

  const planLabel = plan.charAt(0) + plan.slice(1).toLowerCase();

  // Deduplicate: skip if a PURCHASE notification was sent in the last 5 minutes
  const recent = await prisma.notification.findFirst({
    where:   { userId, type: "PURCHASE", link: "/courses" },
    orderBy: { createdAt: "desc" },
  });
  const fiveMin = 5 * 60 * 1000;
  if (!recent || Date.now() - recent.createdAt.getTime() > fiveMin) {
    const limitNote = plan === "BASIC"
      ? `Access up to 5 courses.`
      : "Unlimited access to every course.";
    await prisma.notification.create({
      data: {
        userId,
        title: `${planLabel} Plan Activated!`,
        body:  `Welcome to CoachNest ${planLabel}. ${limitNote} Start learning now!`,
        type:  "PURCHASE",
        link:  "/courses",
      },
    });

    // Send subscription confirmation email (fire-and-forget)
    const user = await prisma.user.findUnique({
      where:  { id: userId },
      select: { email: true, name: true },
    });
    if (user) {
      sendSubscriptionEmail(user.email, user.name, plan, billing).catch(console.error);
    }
  }
}
