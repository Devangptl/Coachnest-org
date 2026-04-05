/**
 * POST /api/billing/change-plan
 * Upgrades or downgrades an existing active Stripe subscription in-place.
 * Prorates immediately — Stripe generates a one-time invoice for the difference.
 *
 * Body: { plan: "BASIC"|"PRO"|"ENTERPRISE", billing: "monthly"|"yearly" }
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

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
      return NextResponse.json({ error: `Price not configured for ${planUpper} ${billing}` }, { status: 400 });
    }

    const dbSub = await prisma.subscription.findUnique({
      where:  { userId: session.userId },
      select: { stripeSubId: true, plan: true, status: true },
    });

    if (!dbSub?.stripeSubId) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 400 });
    }
    if (dbSub.status === "EXPIRED") {
      return NextResponse.json({ error: "Subscription is expired. Please subscribe again." }, { status: 400 });
    }
    if (dbSub.plan === planUpper) {
      return NextResponse.json({ error: `You are already on the ${planUpper} plan.` }, { status: 400 });
    }

    const stripe   = getStripe();
    const stripeSub = await stripe.subscriptions.retrieve(dbSub.stripeSubId);
    const itemId    = stripeSub.items.data[0]?.id;

    if (!itemId) {
      return NextResponse.json({ error: "Subscription item not found" }, { status: 400 });
    }

    // Swap to the new price with immediate proration.
    // Also clear cancel_at_period_end in case the user previously cancelled
    // but is now upgrading/downgrading — the intent is clearly to keep the subscription.
    const updated = await stripe.subscriptions.update(dbSub.stripeSubId, {
      items:                [{ id: itemId, price: priceId }],
      proration_behavior:   "always_invoice",
      cancel_at_period_end: false,
      metadata:             { userId: session.userId, plan: planUpper, billing },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const item    = (updated as any).items?.data?.[0];
    const startTs = item?.current_period_start ?? (updated as any).current_period_start ?? updated.created;
    const endTs   = item?.current_period_end   ?? (updated as any).current_period_end   ?? (startTs + 30 * 24 * 60 * 60);

    await prisma.subscription.update({
      where: { userId: session.userId },
      data:  {
        plan:        planUpper as "BASIC" | "PRO" | "ENTERPRISE",
        status:      "ACTIVE",
        startDate:   new Date(startTs * 1000),
        endDate:     new Date(endTs   * 1000),
        cancelledAt: null,
      },
    });

    return NextResponse.json({ success: true, plan: planUpper });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
