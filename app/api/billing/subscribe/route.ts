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

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { plan, billing } = await req.json() as {
      plan:    string;
      billing: "monthly" | "yearly";
    };

    if (!plan || !billing) {
      return NextResponse.json({ error: "plan and billing are required" }, { status: 400 });
    }

    const planUpper = plan.toUpperCase();
    const priceId   = PRICE_IDS[planUpper]?.[billing];
    if (!priceId) {
      return NextResponse.json(
        { error: `Stripe price not configured for ${planUpper} ${billing}` },
        { status: 400 }
      );
    }

    const [user, existingSub] = await Promise.all([
      prisma.user.findUnique({
        where:  { id: session.userId },
        select: { id: true, email: true, name: true, stripeCustomerId: true },
      }),
      prisma.subscription.findUnique({
        where:  { userId: session.userId },
        select: { status: true, plan: true },
      }),
    ]);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Guard: don't create a duplicate subscription if already on a paid plan
    const paidPlans = ["BASIC", "PRO", "ENTERPRISE"];
    if (
      (existingSub?.status === "ACTIVE" || existingSub?.status === "TRIAL") &&
      existingSub.plan && paidPlans.includes(existingSub.plan)
    ) {
      return NextResponse.json(
        { error: `You already have an active ${existingSub.plan} subscription. Use change-plan to upgrade or downgrade.` },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    let customerId = user.stripeCustomerId ?? undefined;

    // Ensure Stripe customer exists with name + address (India export compliance)
    if (!customerId) {
      const customer = await stripe.customers.create({
        email:    user.email,
        name:     user.name ?? user.email,
        address:  { line1: "India", country: "IN" },
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
    } else {
      // Ensure existing customer has name + address
      await stripe.customers.update(customerId, {
        name:    user.name ?? user.email,
        address: { line1: "India", country: "IN" },
      });
    }

    // Create subscription — default_incomplete so we can confirm 3DS if needed
    const sub = await stripe.subscriptions.create({
      customer:         customerId,
      items:            [{ price: priceId }],
      payment_behavior: "default_incomplete",
      payment_settings: {
        save_default_payment_method: "on_subscription",
        payment_method_types:        ["card"],
      },
      expand:   ["latest_invoice.payment_intent"],
      metadata: { userId: user.id, plan: planUpper, billing },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoice       = (sub as any).latest_invoice;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const paymentIntent = (invoice as any)?.payment_intent;

    // Add description to the PaymentIntent (required for India export transactions)
    if (paymentIntent?.id) {
      await stripe.paymentIntents.update(paymentIntent.id, {
        description: `CoachNest ${planUpper} subscription (${billing})`,
      });
    }

    // ── 3DS / further client-side action required ─────────────────────────────
    if (
      paymentIntent?.status === "requires_action" ||
      paymentIntent?.status === "requires_payment_method"
    ) {
      return NextResponse.json({
        requiresAction: true,
        clientSecret:   paymentIntent.client_secret,
        subId:          sub.id,
      });
    }

    // ── Payment succeeded / trialing ──────────────────────────────────────────
    if (sub.status === "active" || sub.status === "trialing") {
      await upsertSubscription(user.id, planUpper, billing, sub);
      return NextResponse.json({ success: true, plan: planUpper });
    }

    // ── Incomplete — payment intent needs confirmation ────────────────────────
    return NextResponse.json({
      requiresAction: true,
      clientSecret:   paymentIntent?.client_secret ?? null,
      subId:          sub.id,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
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
