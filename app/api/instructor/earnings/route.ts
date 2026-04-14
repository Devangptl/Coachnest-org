/**
 * GET /api/instructor/earnings
 * Returns revenue earned by the authenticated instructor from their courses.
 *
 * Query params:
 *   from?    — ISO date string (default: 30 days ago)
 *   to?      — ISO date string (default: now)
 *   courseId? — filter by a specific course
 *
 * Response:
 *   {
 *     summary: { totalEarnings, platformCut, totalOrders },
 *     perCourse: [{ courseId, title, earnings, platformCut, orders, revenuePercent }],
 *     recentOrders: [{ id, amount, instructorRevenue, platformRevenue, createdAt, course }]
 *   }
 *
 * Access: INSTRUCTOR or ADMIN
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "INSTRUCTOR" && session.role !== "ADMIN")) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { searchParams } = req.nextUrl;
    const to       = searchParams.get("to")       ? new Date(searchParams.get("to")!)       : new Date();
    const from     = searchParams.get("from")     ? new Date(searchParams.get("from")!)     : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const courseId = searchParams.get("courseId") || undefined;

    // Find all courses owned by this instructor
    const instructorCourseIds = await prisma.course
      .findMany({
        where: { createdById: session.userId },
        select: { id: true },
      })
      .then((rows) => rows.map((r) => r.id));

    const where = {
      status: "PAID" as const,
      courseId: courseId
        ? (instructorCourseIds.includes(courseId) ? courseId : "__NONE__")
        : { in: instructorCourseIds },
      createdAt: { gte: from, lte: to },
    };

    // Summary
    const agg = await prisma.order.aggregate({
      where,
      _sum: { instructorRevenue: true, platformRevenue: true, amount: true },
      _count: { id: true },
    });

    // Per-course breakdown
    const perCourseRaw = await prisma.order.groupBy({
      by: ["courseId"],
      where,
      _sum: { instructorRevenue: true, platformRevenue: true, amount: true },
      _count: { id: true },
      orderBy: { _sum: { instructorRevenue: "desc" } },
    });

    const perCourse = await Promise.all(
      perCourseRaw.map(async (row) => {
        const course = await prisma.course.findUnique({
          where: { id: row.courseId! },
          select: { id: true, title: true, instructorRevenuePercent: true },
        });
        return {
          courseId:       row.courseId,
          title:          course?.title ?? "Unknown",
          revenuePercent: course?.instructorRevenuePercent ?? 70,
          earnings:       Number(row._sum.instructorRevenue ?? 0),
          platformCut:    Number(row._sum.platformRevenue  ?? 0),
          orders:         row._count.id,
        };
      })
    );

    // Recent orders (last 20)
    const recentOrders = await prisma.order.findMany({
      where,
      select: {
        id:               true,
        amount:           true,
        instructorRevenue: true,
        platformRevenue:  true,
        createdAt:        true,
        course: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({
      period: { from, to },
      summary: {
        totalEarnings: Number(agg._sum.instructorRevenue ?? 0),
        platformCut:   Number(agg._sum.platformRevenue   ?? 0),
        totalRevenue:  Number(agg._sum.amount            ?? 0),
        totalOrders:   agg._count.id,
      },
      perCourse,
      recentOrders,
    });
  } catch (err) {
    console.error("[GET /api/instructor/earnings]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
