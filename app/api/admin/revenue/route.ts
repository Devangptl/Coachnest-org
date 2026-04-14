/**
 * GET /api/admin/revenue
 * Platform revenue dashboard — breaks down earnings by source.
 *
 * Query params:
 *   from?  — ISO date string (default: 30 days ago)
 *   to?    — ISO date string (default: now)
 *
 * Response:
 *   {
 *     summary: {
 *       totalRevenue,          // all PAID orders
 *       platformRevenue,       // platform's cut (course sales + 100% feature sales)
 *       instructorRevenue,     // total paid out / owed to instructors
 *       courseRevenue,         // revenue from course purchases only
 *       featureRevenue,        // revenue from feature add-on purchases only
 *     },
 *     topInstructors: [{ instructorId, name, email, totalEarnings, coursesSold }],
 *     topCourses:     [{ courseId, title, revenue, enrollments }],
 *     topFeatures:    [{ featureId, name, revenue, purchases }],
 *   }
 *
 * Access: ADMIN only
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { searchParams } = req.nextUrl;
    const to   = searchParams.get("to")   ? new Date(searchParams.get("to")!)   : new Date();
    const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const dateFilter = { gte: from, lte: to };

    // ── Overall summary ────────────────────────────────────────────────────
    const [courseAgg, featureAgg] = await Promise.all([
      prisma.order.aggregate({
        where: { status: "PAID", courseId: { not: null }, createdAt: dateFilter },
        _sum: { amount: true, instructorRevenue: true, platformRevenue: true },
        _count: { id: true },
      }),
      prisma.order.aggregate({
        where: { status: "PAID", featureId: { not: null }, createdAt: dateFilter },
        _sum: { amount: true, platformRevenue: true },
        _count: { id: true },
      }),
    ]);

    const courseRevenue      = Number(courseAgg._sum.amount           ?? 0);
    const featureRevenue     = Number(featureAgg._sum.amount          ?? 0);
    const instructorRevenue  = Number(courseAgg._sum.instructorRevenue ?? 0);
    const platformFromCourse = Number(courseAgg._sum.platformRevenue   ?? 0);
    const platformFromFeature= Number(featureAgg._sum.platformRevenue  ?? 0);

    // ── Top instructors by earnings ────────────────────────────────────────
    const instructorOrders = await prisma.order.groupBy({
      by: ["userId"],
      where: {
        status: "PAID",
        courseId: { not: null },
        course: { createdById: { not: undefined } },
        createdAt: dateFilter,
      },
      _sum: { instructorRevenue: true },
      _count: { id: true },
      orderBy: { _sum: { instructorRevenue: "desc" } },
      take: 10,
    });

    // Enrich with instructor names — group by course creator
    const courseOrdersRaw = await prisma.order.findMany({
      where: { status: "PAID", courseId: { not: null }, createdAt: dateFilter },
      select: {
        instructorRevenue: true,
        course: { select: { createdById: true, createdBy: { select: { id: true, name: true, email: true } } } },
      },
    });

    const instructorMap = new Map<string, { name: string; email: string; totalEarnings: number; coursesSold: number }>();
    for (const o of courseOrdersRaw) {
      if (!o.course?.createdBy) continue;
      const { id, name, email } = o.course.createdBy;
      const entry = instructorMap.get(id) ?? { name, email, totalEarnings: 0, coursesSold: 0 };
      entry.totalEarnings += Number(o.instructorRevenue ?? 0);
      entry.coursesSold   += 1;
      instructorMap.set(id, entry);
    }
    const topInstructors = [...instructorMap.entries()]
      .map(([instructorId, data]) => ({ instructorId, ...data }))
      .sort((a, b) => b.totalEarnings - a.totalEarnings)
      .slice(0, 10);

    // ── Top courses by revenue ─────────────────────────────────────────────
    const topCourseOrders = await prisma.order.groupBy({
      by: ["courseId"],
      where: { status: "PAID", courseId: { not: null }, createdAt: dateFilter },
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 10,
    });

    const topCourses = await Promise.all(
      topCourseOrders.map(async (o) => {
        const course = await prisma.course.findUnique({
          where: { id: o.courseId! },
          select: { id: true, title: true },
        });
        return {
          courseId:    o.courseId,
          title:       course?.title ?? "Unknown",
          revenue:     Number(o._sum.amount ?? 0),
          enrollments: o._count.id,
        };
      })
    );

    // ── Top features by revenue ────────────────────────────────────────────
    const topFeatureOrders = await prisma.order.groupBy({
      by: ["featureId"],
      where: { status: "PAID", featureId: { not: null }, createdAt: dateFilter },
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 10,
    });

    const topFeatures = await Promise.all(
      topFeatureOrders.map(async (o) => {
        const feature = await prisma.platformFeature.findUnique({
          where: { id: o.featureId! },
          select: { id: true, name: true },
        });
        return {
          featureId: o.featureId,
          name:      feature?.name ?? "Unknown",
          revenue:   Number(o._sum.amount ?? 0),
          purchases: o._count.id,
        };
      })
    );

    return NextResponse.json({
      period: { from, to },
      summary: {
        totalRevenue:      courseRevenue + featureRevenue,
        platformRevenue:   platformFromCourse + platformFromFeature,
        instructorRevenue,
        courseRevenue,
        featureRevenue,
        totalOrders:       courseAgg._count.id + featureAgg._count.id,
      },
      topInstructors,
      topCourses,
      topFeatures,
    });
  } catch (err) {
    console.error("[GET /api/admin/revenue]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
