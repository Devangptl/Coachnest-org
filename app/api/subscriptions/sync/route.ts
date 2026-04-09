/**
 * POST /api/subscriptions/sync
 * Syncs a Stripe subscription to the DB without relying on webhooks.
 *
 * Body (optional): { sessionId?: string }
 *   - With sessionId  → retrieves that specific checkout session from Stripe
 *   - Without         → lists subscriptions on the user's Stripe customer
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getPeriodDates, planFromPriceId, BASIC_COURSE_LIMIT } from "@/services/subscription.service";
import type Stripe from "stripe";

type PlanKey = "BASIC" | "PRO" | "ENTERPRISE";

function planFromMeta(meta: Stripe.Metadata | null): PlanKey | null {
  const p = meta?.plan?.toUpperCase();
  if (p === "BASIC" || p === "PRO" || p === "ENTERPRISE") return p;
  return null;
}

async function writeSubscription(userId: string, sub: Stripe.Subscription, plan: PlanKey) {
  const status = sub.status === "trialing" ? "TRIAL" : "ACTIVE";
  const { startDate, endDate } = getPeriodDates(sub);

  await prisma.subscription.upsert({
    where:  { userId },
    create: {
      userId,
      plan,
      status,
      stripeSubId: sub.id,
      startDate,
      endDate,
      ...(sub.trial_end ? { trialEndsAt: new Date(sub.trial_end * 1000) } : {}),
    },
    update: {
      plan,
      status,
      stripeSubId: sub.id,
      startDate,
      endDate,
      ...(sub.trial_end ? { trialEndsAt: new Date(sub.trial_end * 1000) } : {}),
    },
  });

  // Activation notification — deduplicated (skip if sent in last 5 minutes)
  const recent = await prisma.notification.findFirst({
    where:   { userId, type: "PURCHASE", link: "/courses" },
    orderBy: { createdAt: "desc" },
  });
  const fiveMin = 5 * 60 * 1000;
  if (!recent || Date.now() - recent.createdAt.getTime() > fiveMin) {
    const label     = plan.charAt(0) + plan.slice(1).toLowerCase();
    const limitNote = plan === "BASIC"
      ? `Access up to ${BASIC_COURSE_LIMIT} courses.`
      : "Unlimited access to every course.";
    await prisma.notification.create({
      data: {
        userId,
        title: `${label} Plan Activated!`,
        body:  `Welcome to CoachNest ${label}. ${limitNote} Start learning now!`,
        type:  "PURCHASE",
        link:  "/courses",
      },
    });
  }
}

export async function POST(req: Request) {
  try {
    const authSession = await getSession();
    if (!authSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = authSession.userId;
    const stripe  = getStripe();

    // Parse body — tolerate empty / non-JSON bodies
    let sessionId: string | undefined;
    try {
      const body = await req.json();
      sessionId = body?.sessionId;
    } catch { /* no body */ }

    // ── Strategy 1: sync via checkout session ID ────────────────────────────
    if (sessionId) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
          expand: ["subscription"],
        });

        if (session.metadata?.userId && session.metadata.userId !== userId) {
          return NextResponse.json(
            { error: "Session does not belong to this user" },
            { status: 403 }
          );
        }

        if (session.mode === "subscription" && session.subscription) {
          const stripeSub = session.subscription as Stripe.Subscription;
          const plan = planFromMeta(session.metadata)
            ?? planFromPriceId(stripeSub.items?.data[0]?.price?.id ?? "");

          if (plan) {
            await writeSubscription(userId, stripeSub, plan);
            const saved = await prisma.subscription.findUnique({ where: { userId } });
            return NextResponse.json({ success: true, subscription: saved });
          }
        }
        // Fall through to strategy 2 if we can't resolve plan
      } catch (err) {
        console.error("[sync] session strategy failed:", err instanceof Error ? err.message : err);
        // Fall through to strategy 2
      }
    }

    // ── Strategy 2: list subscriptions on the Stripe customer ───────────────
    const user = await prisma.user.findUnique({
      where:  { id: userId },
      select: { stripeCustomerId: true },
    });

    if (!user?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No Stripe customer linked to this account. Please complete a checkout first." },
        { status: 404 }
      );
    }

    const { data: stripeSubs } = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      limit:    10,
      expand:   ["data.items.data.price"],
    });

    // Pick best subscription: active/trialing > cancelled > most recent
    const preferred =
      stripeSubs.find((s) => s.status === "active" || s.status === "trialing") ??
      stripeSubs.find((s) => s.status === "canceled") ??
      stripeSubs[0];

    if (!preferred) {
      return NextResponse.json(
        { error: "No subscription found on your Stripe account." },
        { status: 404 }
      );
    }

    const priceId = preferred.items?.data[0]?.price?.id ?? "";
    const plan = planFromMeta(preferred.metadata) ?? planFromPriceId(priceId);

    if (!plan) {
      return NextResponse.json(
        {
          error: `Could not map price "${priceId}" to a plan. ` +
                 "Check that STRIPE_PRICE_* env vars match your Stripe Dashboard.",
        },
        { status: 400 }
      );
    }

    await writeSubscription(userId, preferred, plan);
    const saved = await prisma.subscription.findUnique({ where: { userId } });
    return NextResponse.json({ success: true, subscription: saved });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("[sync] unhandled error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
