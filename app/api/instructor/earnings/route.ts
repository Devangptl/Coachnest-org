/**
 * GET /api/instructor/earnings
 * Returns the authenticated instructor's full earnings summary including:
 *   - wallet balance, totalEarned, totalWithdrawn
 *   - revenue breakdown by course
 *   - revenue breakdown by sale source (ORGANIC/REFERRAL/COUPON/ADS)
 *   - monthly earnings (last 6 months)
 *   - recent orders
 *
 * Query params:
 *   from?     — ISO date string (default: 30 days ago)
 *   to?       — ISO date string (default: now)
 *   courseId? — filter by specific course
 */
import { NextRequest, NextResponse } from "next/server";
import { startOfDay, endOfDay, parseISO } from "date-fns";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DAY_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function parseBound(value: string | null, edge: "start" | "end"): Date | null {
  if (!value) return null;
  // Plain dates are whole-day bounds in local time; full ISO strings pass through.
  if (DAY_ONLY.test(value)) {
    return edge === "start" ? startOfDay(parseISO(value)) : endOfDay(parseISO(value));
  }
  return new Date(value);
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "INSTRUCTOR" && session.role !== "ADMIN")) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { searchParams } = req.nextUrl;
    const to   = parseBound(searchParams.get("to"), "end")     ?? new Date();
    const from = parseBound(searchParams.get("from"), "start") ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const courseId = searchParams.get("courseId") || undefined;

    // All courses owned by this instructor
    const instructorCourseIds = await prisma.course
      .findMany({ where: { createdById: session.userId }, select: { id: true } })
      .then((rows) => rows.map((r) => r.id));

    const where = {
      status:   "PAID" as const,
      courseId: courseId
        ? (instructorCourseIds.includes(courseId) ? courseId : "__NONE__")
        : { in: instructorCourseIds },
      createdAt: { gte: from, lte: to },
    };

    // Wallet snapshot
    const wallet = await prisma.instructorWallet.findUnique({
      where:  { userId: session.userId },
      select: { balance: true, totalEarned: true, totalWithdrawn: true },
    });

    // Summary aggregate
    const agg = await prisma.order.aggregate({
      where,
      _sum:   { instructorRevenue: true, platformRevenue: true, amount: true },
      _count: { id: true },
    });

    // Per-course breakdown
    const perCourseRaw = await prisma.order.groupBy({
      by:      ["courseId"],
      where,
      _sum:    { instructorRevenue: true, platformRevenue: true, amount: true },
      _count:  { id: true },
      orderBy: { _sum: { instructorRevenue: "desc" } },
    });

    const perCourse = await Promise.all(
      perCourseRaw.map(async (row) => {
        const course = await prisma.course.findUnique({
          where:  { id: row.courseId! },
          select: { id: true, title: true, instructorRevenuePercent: true },
        });
        return {
          courseId:       row.courseId,
          title:          course?.title ?? "Unknown",
          revenuePercent: course?.instructorRevenuePercent ?? 70,
          earnings:       Number(row._sum.instructorRevenue ?? 0),
          platformCut:    Number(row._sum.platformRevenue   ?? 0),
          orders:         row._count.id,
        };
      })
    );

    // Revenue by sale source
    const allOrders = await prisma.order.findMany({
      where,
      select: {
        id:                true,
        amount:            true,
        instructorRevenue: true,
        platformRevenue:   true,
        saleSource:        true,
        instructorPercent: true,
        courseId:          true,
        course:            { select: { id: true, title: true } },
        createdAt:         true,
      },
      orderBy: { createdAt: "desc" },
    });

    const bySource = { ORGANIC: 0, REFERRAL: 0, COUPON: 0, ADS: 0 } as Record<string, number>;
    for (const o of allOrders) {
      bySource[o.saleSource] = (bySource[o.saleSource] ?? 0) + Number(o.instructorRevenue ?? 0);
    }

    // Monthly earnings — last 6 months (all-time, ignoring date filter)
    const allTimeOrders = await prisma.order.findMany({
      where:  { status: "PAID", courseId: { in: instructorCourseIds } },
      select: { instructorRevenue: true, createdAt: true },
    });
    const now    = new Date();
    const monthly = [];
    for (let i = 5; i >= 0; i--) {
      const d     = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString("default", { month: "short", year: "2-digit" });
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const rev   = allTimeOrders
        .filter((o) => o.createdAt >= start && o.createdAt <= end)
        .reduce((s, o) => s + Number(o.instructorRevenue ?? 0), 0);
      monthly.push({ month: label, revenue: parseFloat(rev.toFixed(2)) });
    }

    return NextResponse.json({
      period: { from, to },
      wallet: {
        balance:        Number(wallet?.balance        ?? 0),
        totalEarned:    Number(wallet?.totalEarned    ?? 0),
        totalWithdrawn: Number(wallet?.totalWithdrawn ?? 0),
      },
      summary: {
        totalEarnings: Number(agg._sum.instructorRevenue ?? 0),
        platformCut:   Number(agg._sum.platformRevenue   ?? 0),
        totalRevenue:  Number(agg._sum.amount            ?? 0),
        totalOrders:   agg._count.id,
      },
      perCourse,
      bySource,
      monthly,
      recentOrders: allOrders.slice(0, 20).map((o) => ({
        id:                o.id,
        amount:            Number(o.amount),
        instructorRevenue: Number(o.instructorRevenue ?? 0),
        platformRevenue:   Number(o.platformRevenue   ?? 0),
        saleSource:        o.saleSource,
        instructorPercent: Number(o.instructorPercent ?? 0),
        courseId:          o.courseId,
        courseTitle:       o.course?.title ?? "—",
        createdAt:         o.createdAt,
      })),
    });
  } catch (err) {
    console.error("[GET /api/instructor/earnings]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
