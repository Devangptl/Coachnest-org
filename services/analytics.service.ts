/**
 * Analytics Service — aggregated data queries for admin and instructor dashboards.
 * All methods return plain serialisable objects (safe to pass to Client Components).
 */
import { prisma } from "@/lib/prisma";
import { startOfMonth, subMonths, format } from "date-fns";

// ─── Admin-wide analytics ─────────────────────────────────────────────────────

export async function getAdminStats() {
  const [totalUsers, totalCourses, totalEnrollments, revenueResult] =
    await Promise.all([
      prisma.user.count(),
      prisma.course.count({ where: { status: "PUBLISHED" } }),
      prisma.enrollment.count(),
      prisma.order.aggregate({
        where: { status: "PAID" },
        _sum: { amount: true },
      }),
    ]);

  return {
    totalUsers,
    totalCourses,
    totalEnrollments,
    totalRevenue: Number(revenueResult._sum.amount ?? 0),
  };
}

/** Monthly revenue for the last N months (for the revenue chart). */
export async function getMonthlyRevenue(months = 6) {
  const since = subMonths(startOfMonth(new Date()), months - 1);

  const orders = await prisma.order.findMany({
    where: { status: "PAID", createdAt: { gte: since } },
    select: { amount: true, createdAt: true },
  });

  // Build a map month → total
  const map: Record<string, number> = {};
  for (let i = 0; i < months; i++) {
    const key = format(subMonths(new Date(), months - 1 - i), "MMM yyyy");
    map[key] = 0;
  }
  for (const o of orders) {
    const key = format(o.createdAt, "MMM yyyy");
    if (key in map) map[key] += Number(o.amount);
  }

  return Object.entries(map).map(([month, revenue]) => ({ month, revenue }));
}

/** Top 5 courses by enrollments. */
export async function getTopCourses(limit = 5) {
  const courses = await prisma.course.findMany({
    where: { status: "PUBLISHED" },
    select: {
      id: true,
      title: true,
      _count: { select: { enrollments: true } },
      reviews: { select: { rating: true } },
      orders: {
        where: { status: "PAID" },
        select: { amount: true },
      },
    },
    orderBy: { enrollments: { _count: "desc" } },
    take: limit,
  });

  return courses.map((c) => ({
    id:          c.id,
    title:       c.title,
    enrollments: c._count.enrollments,
    revenue:     c.orders.reduce((s, o) => s + Number(o.amount), 0),
    avgRating:
      c.reviews.length
        ? Number((c.reviews.reduce((s, r) => s + r.rating, 0) / c.reviews.length).toFixed(1))
        : 0,
  }));
}

/** Recent orders (last 10). */
export async function getRecentOrders(limit = 10) {
  return prisma.order.findMany({
    where: { status: "PAID" },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      amount: true,
      currency: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
      course: { select: { title: true } },
    },
  });
}

/** New user sign-ups per month (last N months). */
export async function getUserGrowth(months = 6) {
  const since = subMonths(startOfMonth(new Date()), months - 1);
  const users = await prisma.user.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
  });

  const map: Record<string, number> = {};
  for (let i = 0; i < months; i++) {
    const key = format(subMonths(new Date(), months - 1 - i), "MMM yyyy");
    map[key] = 0;
  }
  for (const u of users) {
    const key = format(u.createdAt, "MMM yyyy");
    if (key in map) map[key]++;
  }
  return Object.entries(map).map(([month, users]) => ({ month, users }));
}

// ─── Instructor analytics ─────────────────────────────────────────────────────

export async function getInstructorStats(instructorId: string) {
  const courses = await prisma.course.findMany({
    where: { createdById: instructorId },
    select: {
      id: true,
      title: true,
      _count: { select: { enrollments: true, reviews: true } },
      reviews: { select: { rating: true } },
      orders: {
        where: { status: "PAID" },
        select: { amount: true },
      },
    },
  });

  const totalRevenue = courses.reduce(
    (sum, c) => sum + c.orders.reduce((s, o) => s + Number(o.amount), 0),
    0
  );
  const totalStudents = courses.reduce((s, c) => s + c._count.enrollments, 0);

  return {
    totalCourses: courses.length,
    totalStudents,
    totalRevenue,
    courses: courses.map((c) => ({
      id:          c.id,
      title:       c.title,
      enrollments: c._count.enrollments,
      revenue:     c.orders.reduce((s, o) => s + Number(o.amount), 0),
      avgRating:
        c.reviews.length
          ? Number((c.reviews.reduce((s, r) => s + r.rating, 0) / c.reviews.length).toFixed(1))
          : 0,
    })),
  };
}

// ─── Course completion rate ───────────────────────────────────────────────────

export async function getCourseCompletionRate(courseId: string) {
  const [total, completed] = await Promise.all([
    prisma.enrollment.count({ where: { courseId } }),
    prisma.enrollment.count({ where: { courseId, completedAt: { not: null } } }),
  ]);
  return total === 0 ? 0 : Math.round((completed / total) * 100);
}
