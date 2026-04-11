/**
 * POST /api/billing/change-plan
 * Upgrades or downgrades an existing active Stripe subscription in-place.
 * Prorates immediately — Stripe generates a one-time invoice for the difference.
 *
 * Special case: if the current Stripe subscription is `incomplete` (initial
 * payment was never confirmed), we cancel it and create a fresh one instead,
 * because Stripe forbids price-change updates on incomplete subscriptions.
 *
 * Body: { plan: "BASIC"|"PRO"|"ENTERPRISE", billing: "monthly"|"yearly" }
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { sendPlanChangeEmail } from "@/lib/email";

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

    const stripe    = getStripe();
    const stripeSub = await stripe.subscriptions.retrieve(dbSub.stripeSubId, {
      expand: ["items.data.price"],
    });

    // Block only when the exact same price (plan + billing cycle) is already active
    const currentPriceId = (stripeSub as any).items?.data?.[0]?.price?.id as string | undefined;
    if (dbSub.plan === planUpper && currentPriceId === priceId) {
      return NextResponse.json({ error: `You are already on the ${planUpper} plan with this billing cycle.` }, { status: 400 });
    }

    // ── Incomplete subscription: cancel the stale one and create a new sub ──────
    // Stripe does not allow item/price changes on `incomplete` subscriptions.
    if (stripeSub.status === "incomplete" || stripeSub.status === "incomplete_expired") {
      // Cancel if it's still cancellable
      if (stripeSub.status === "incomplete") {
        await stripe.subscriptions.cancel(dbSub.stripeSubId);
      }

      const customerId =
        typeof stripeSub.customer === "string" ? stripeSub.customer : stripeSub.customer.id;

      const newSub = await stripe.subscriptions.create({
        customer:         customerId,
        items:            [{ price: priceId }],
        payment_behavior: "default_incomplete",
        payment_settings: {
          save_default_payment_method: "on_subscription",
          payment_method_types:        ["card"],
        },
        expand:   ["latest_invoice.payment_intent"],
        metadata: { userId: session.userId, plan: planUpper, billing },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const invoice       = (newSub as any).latest_invoice;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const paymentIntent = (invoice as any)?.payment_intent;

      if (paymentIntent?.id) {
        await stripe.paymentIntents.update(paymentIntent.id, {
          description: `CoachNest ${planUpper} subscription (${billing})`,
        });
      }

      // Payment succeeded immediately
      if (newSub.status === "active" || newSub.status === "trialing") {
        const item    = newSub.items?.data?.[0];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const startTs = (item as any)?.current_period_start ?? newSub.created;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const endTs   = (item as any)?.current_period_end   ?? (startTs + 30 * 24 * 60 * 60);
        const dbSub2  = await prisma.subscription.update({
          where: { userId: session.userId },
          data:  {
            plan:        planUpper as "BASIC" | "PRO" | "ENTERPRISE",
            status:      "ACTIVE",
            stripeSubId: newSub.id,
            startDate:   new Date(startTs * 1000),
            endDate:     new Date(endTs   * 1000),
            cancelledAt: null,
          },
        });
        return NextResponse.json({ success: true, plan: planUpper, subscription: dbSub2 });
      }

      // 3DS / further action required
      return NextResponse.json({
        requiresAction: true,
        clientSecret:   paymentIntent?.client_secret ?? null,
        subId:          newSub.id,
      });
    }

    // ── Normal active/trialing/past_due subscription: swap the price in-place ──
    const itemId = stripeSub.items.data[0]?.id;
    if (!itemId) {
      return NextResponse.json({ error: "Subscription item not found" }, { status: 400 });
    }

    // Swap to the new price with immediate proration.
    // Also clear cancel_at_period_end in case the user previously cancelled
    // but is now upgrading/downgrading — the intent is clearly to keep the sub.
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

    const updatedSub = await prisma.subscription.update({
      where: { userId: session.userId },
      data:  {
        plan:        planUpper as "BASIC" | "PRO" | "ENTERPRISE",
        status:      "ACTIVE",
        startDate:   new Date(startTs * 1000),
        endDate:     new Date(endTs   * 1000),
        cancelledAt: null,
      },
    });

    // Fire-and-forget plan change email
    const user = await prisma.user.findUnique({
      where:  { id: session.userId },
      select: { email: true, name: true },
    });
    if (user) {
      sendPlanChangeEmail(user.email, user.name, dbSub.plan ?? "FREE", planUpper, billing)
        .catch(console.error);
    }

    return NextResponse.json({ success: true, plan: planUpper, subscription: updatedSub });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
