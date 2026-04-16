/**
 * GET /api/subscriptions/status
 *
 * Returns purchase-based access info: purchased course count, owned feature slugs.
 * The platform uses a direct-purchase model — no subscription records exist.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlanAccess } from "@/services/subscription.service";

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

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const summary = await getStudentAccessSummary(session.userId);
    return NextResponse.json(summary);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
