/**
 * GET /api/subscriptions/status
 *
 * For STUDENT role:
 *   Students use the direct-purchase model — no subscription exists.
 *   Returns purchase-based access info: purchased course count, owned feature slugs.
 *
 * For INSTRUCTOR / ADMIN role:
 *   Returns the DB subscription record + full plan access details.
 *   If the DB has no subscription but the user has a Stripe customer ID,
 *   attempts a live sync from Stripe so the UI always reflects the true
 *   billing state (handles missed webhooks).
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import {
  getPlanAccess,
  getPeriodDates,
  planFromPriceId,
  BASIC_COURSE_LIMIT,
} from "@/services/subscription.service";
import type Stripe from "stripe";

// ─── Student: purchase-based access summary ───────────────────────────────────

async function getStudentAccessSummary(userId: string) {
  const [enrollments, featurePurchases] = await Promise.all([
    prisma.enrollment.findMany({
      where: { userId },
      select: {
        courseId:   true,
        enrolledAt: true,
        course: { select: { id: true, title: true, thumbnail: true } },
      },
    }),
    prisma.featurePurchase.findMany({
      where: { userId },
      select: {
        purchasedAt: true,
        feature: { select: { slug: true, name: true } },
      },
    }),
  ]);

  return {
    accessModel:           "purchase",
    subscription:          null,
    purchasedCourseCount:  enrollments.length,
    purchasedFeatureSlugs: featurePurchases.map((fp) => fp.feature.slug),
    enrollments:           enrollments.map((e) => ({
      courseId:   e.courseId,
      title:      e.course.title,
      thumbnail:  e.course.thumbnail,
      enrolledAt: e.enrolledAt,
    })),
    ownedFeatures: featurePurchases.map((fp) => ({
      slug:        fp.feature.slug,
      name:        fp.feature.name,
      purchasedAt: fp.purchasedAt,
    })),
  };
}

// ─── Instructor/Admin: Stripe sync + plan access ──────────────────────────────

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
      where:   { userId, type: "PURCHASE", link: "/courses" },
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

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Students: return purchase-based access, no subscription ───────────────
    if (session.role === "STUDENT") {
      const summary = await getStudentAccessSummary(session.userId);
      return NextResponse.json(summary);
    }

    // ── Instructors / Admins: return Stripe subscription status ───────────────
    const userId = session.userId;

    const [dbSub, user] = await Promise.all([
      prisma.subscription.findUnique({ where: { userId } }),
      prisma.user.findUnique({
        where:  { id: userId },
        select: { stripeCustomerId: true },
      }),
    ]);

    const needsSync =
      user?.stripeCustomerId &&
      (!dbSub || dbSub.plan === "FREE" || dbSub.status === "EXPIRED");

    if (needsSync) {
      await syncFromStripe(userId, user!.stripeCustomerId!);
    }

    const [subscription, planAccess] = await Promise.all([
      prisma.subscription.findUnique({ where: { userId } }),
      getPlanAccess(userId),
    ]);

    return NextResponse.json({ accessModel: "subscription", subscription, planAccess });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
