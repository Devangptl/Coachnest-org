/**
 * GET /api/student/purchases
 * Returns everything a student has purchased on the platform:
 *   - Enrolled courses (paid + free)
 *   - Purchased feature add-ons (e.g. Community)
 *
 * Used by the student dashboard to show owned content and gate feature access.
 * Also returns `hasAccess` flags for all active platform features.
 *
 * Access: STUDENT only (admins and instructors use their own dashboards)
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== "STUDENT") {
      return NextResponse.json(
        { error: "This endpoint is for students only." },
        { status: 403 }
      );
    }

    const userId = session.userId;

    // Fetch all owned content in parallel
    const [enrollments, featurePurchases, allFeatures] = await Promise.all([
      prisma.enrollment.findMany({
        where:   { userId },
        include: {
          course: {
            select: {
              id:           true,
              title:        true,
              slug:         true,
              thumbnail:    true,
              isFree:       true,
              totalLessons: true,
              level:        true,
              createdBy:    { select: { name: true } },
              category:     { select: { name: true } },
            },
          },
        },
        orderBy: { enrolledAt: "desc" },
      }),
      prisma.featurePurchase.findMany({
        where:   { userId },
        include: {
          feature: { select: { id: true, name: true, slug: true, description: true } },
          order:   { select: { amount: true, createdAt: true } },
        },
        orderBy: { purchasedAt: "desc" },
      }),
      prisma.platformFeature.findMany({
        where:   { isActive: true },
        select:  { id: true, name: true, slug: true, description: true, price: true },
        orderBy: { name: "asc" },
      }),
    ]);

    // Build a set of owned feature IDs for fast lookup
    const ownedFeatureIds = new Set(featurePurchases.map((fp) => fp.feature.id));

    // Attach lesson progress summary to each enrolled course
    const coursesWithProgress = await Promise.all(
      enrollments.map(async (e) => {
        const [completedCount, totalCount] = await Promise.all([
          prisma.lessonProgress.count({
            where: { userId, lesson: { courseId: e.courseId }, completed: true },
          }),
          prisma.lesson.count({ where: { courseId: e.courseId } }),
        ]);
        return {
          ...e,
          progressPercent: totalCount > 0
            ? Math.round((completedCount / totalCount) * 100)
            : 0,
          completedLessons: completedCount,
          totalLessons:     totalCount,
        };
      })
    );

    return NextResponse.json({
      // Purchased / enrolled courses
      courses: coursesWithProgress.map((e) => ({
        enrollmentId:     e.id,
        enrolledAt:       e.enrolledAt,
        completedAt:      e.completedAt,
        progressPercent:  e.progressPercent,
        completedLessons: e.completedLessons,
        totalLessons:     e.totalLessons,
        course:           e.course,
      })),

      // Purchased feature add-ons
      features: featurePurchases.map((fp) => ({
        featureId:   fp.feature.id,
        name:        fp.feature.name,
        slug:        fp.feature.slug,
        description: fp.feature.description,
        purchasedAt: fp.purchasedAt,
        paidAmount:  fp.order ? Number(fp.order.amount) : null,
      })),

      // All available features with hasAccess flag — useful for displaying upgrade prompts
      availableFeatures: allFeatures.map((f) => ({
        ...f,
        price:     Number(f.price),
        hasAccess: ownedFeatureIds.has(f.id),
      })),

      summary: {
        totalCourses:   enrollments.length,
        totalFeatures:  featurePurchases.length,
        ownedFeatureSlugs: featurePurchases.map((fp) => fp.feature.slug),
      },
    });
  } catch (err) {
    console.error("[GET /api/student/purchases]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
