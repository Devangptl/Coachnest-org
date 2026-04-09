/**
 * GET /api/subscriptions/status
 * Returns the current user's subscription and full plan access details.
 *
 * If the DB has no subscription record but the user has a Stripe customer ID,
 * this endpoint attempts a live sync from Stripe so the UI always reflects
 * the true billing state (handles cases where webhooks were missed).
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { getPlanAccess, getPeriodDates, planFromPriceId, BASIC_COURSE_LIMIT } from "@/services/subscription.service";
import type Stripe from "stripe";

async function syncFromStripe(userId: string, stripeCustomerId: string): Promise<boolean> {
  try {
    const stripe = getStripe();
    const { data: subs } = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status:   "all",
      limit:    5,
      expand:   ["data.items.data.price"],
    });

    const active = subs.find((s) => s.status === "active" || s.status === "trialing") ?? subs[0];
    if (!active) return false;

    const priceId = active.items.data[0]?.price?.id;
    const plan    = priceId ? planFromPriceId(priceId) : null;
    if (!plan) return false;

    const status = active.status === "trialing" ? "TRIAL" : "ACTIVE";

    const { startDate, endDate } = getPeriodDates(active);

    await prisma.subscription.upsert({
      where:  { userId },
      create: {
        userId, plan, status,
        stripeSubId: active.id,
        startDate,
        endDate,
        trialEndsAt: active.trial_end ? new Date(active.trial_end * 1000) : undefined,
      },
      update: {
        plan, status,
        stripeSubId: active.id,
        startDate,
        endDate,
        ...(active.trial_end ? { trialEndsAt: new Date(active.trial_end * 1000) } : {}),
      },
    });

    // Activation notification (once per activation)
    const recent = await prisma.notification.findFirst({
      where: { userId, type: "PURCHASE", link: "/courses" },
      orderBy: { createdAt: "desc" },
    });
    if (!recent || Date.now() - recent.createdAt.getTime() > 60_000) {
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

    return true;
  } catch (err) {
    console.error("[status] stripe sync failed:", err);
    return false;
  }
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.userId;

    // Get DB subscription + user's Stripe customer ID in one query
    const [dbSub, user] = await Promise.all([
      prisma.subscription.findUnique({ where: { userId } }),
      prisma.user.findUnique({
        where:  { id: userId },
        select: { stripeCustomerId: true },
      }),
    ]);

    // If no active subscription in DB but user has a Stripe customer,
    // sync live from Stripe (catches missed webhooks)
    const needsSync =
      user?.stripeCustomerId &&
      (!dbSub || dbSub.plan === "FREE" || dbSub.status === "EXPIRED");

    if (needsSync) {
      await syncFromStripe(userId, user!.stripeCustomerId!);
    }

    // Re-read after potential sync
    const [subscription, planAccess] = await Promise.all([
      prisma.subscription.findUnique({ where: { userId } }),
      getPlanAccess(userId),
    ]);

    return NextResponse.json({ subscription, planAccess });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
