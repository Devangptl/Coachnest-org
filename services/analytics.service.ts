/**
 * Analytics Service — aggregated data queries for admin, instructor, and student dashboards.
 * All methods return plain serialisable objects (safe to pass to Client Components).
 */
import { prisma } from "@/lib/prisma";
import { startOfMonth, startOfWeek, subMonths, subWeeks, format } from "date-fns";

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

/** Platform engagement metrics: active students, lessons completed, avg completion rate. */
export async function getEngagementMetrics() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [activeStudents, totalLessonsCompleted, enrollmentStats] = await Promise.all([
    prisma.lessonProgress.groupBy({
      by: ["userId"],
      where: { completed: true, completedAt: { gte: thirtyDaysAgo } },
    }).then((r) => r.length),
    prisma.lessonProgress.count({ where: { completed: true } }),
    prisma.enrollment.aggregate({
      _count: { id: true },
      where: { completedAt: { not: null } },
    }),
  ]);

  const totalEnrollments = await prisma.enrollment.count();
  const avgCompletionRate =
    totalEnrollments === 0
      ? 0
      : Math.round((enrollmentStats._count.id / totalEnrollments) * 100);

  return { activeStudents, totalLessonsCompleted, avgCompletionRate };
}

/** Per-course completion rates for the top N courses (by enrollment). */
export async function getCourseCompletionStats(limit = 8) {
  const courses = await prisma.course.findMany({
    where: { status: "PUBLISHED" },
    select: {
      id: true,
      title: true,
      _count: { select: { enrollments: true } },
      enrollments: { where: { completedAt: { not: null } }, select: { id: true } },
    },
    orderBy: { enrollments: { _count: "desc" } },
    take: limit,
  });

  return courses.map((c) => ({
    title: c.title.length > 22 ? c.title.slice(0, 22) + "…" : c.title,
    enrolled: c._count.enrollments,
    completed: c.enrollments.length,
    rate:
      c._count.enrollments === 0
        ? 0
        : Math.round((c.enrollments.length / c._count.enrollments) * 100),
  }));
}

/** Monthly enrollment count for the last N months. */
export async function getMonthlyEnrollments(months = 6) {
  const since = subMonths(startOfMonth(new Date()), months - 1);
  const enrollments = await prisma.enrollment.findMany({
    where: { enrolledAt: { gte: since } },
    select: { enrolledAt: true },
  });

  const map: Record<string, number> = {};
  for (let i = 0; i < months; i++) {
    const key = format(subMonths(new Date(), months - 1 - i), "MMM yyyy");
    map[key] = 0;
  }
  for (const e of enrollments) {
    const key = format(e.enrolledAt, "MMM yyyy");
    if (key in map) map[key]++;
  }
  return Object.entries(map).map(([month, enrollments]) => ({ month, enrollments }));
}

// ─── Student-level analytics ──────────────────────────────────────────────────

/** Full analytics for a single student. */
export async function getStudentAnalytics(userId: string) {
  const weeksBack = 8;
  const since = subWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), weeksBack - 1);

  const [
    lessonProgressRows,
    enrollments,
    quizAttempts,
    xpEvents,
    gameProfile,
  ] = await Promise.all([
    // All lesson completions for weekly activity chart
    prisma.lessonProgress.findMany({
      where: { userId, completed: true, completedAt: { gte: since } },
      select: { completedAt: true },
    }),
    // Course progress
    prisma.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            _count: { select: { lessons: true } },
            lessons: { select: { id: true } },
          },
        },
      },
      orderBy: { enrolledAt: "desc" },
    }),
    // Quiz history (last 20)
    prisma.quizAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        score: true,
        passed: true,
        createdAt: true,
        quiz: {
          select: {
            title: true,
            lesson: { select: { course: { select: { title: true } } } },
          },
        },
      },
    }),
    // XP events since
    prisma.xpEvent.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { xp: true, createdAt: true },
    }),
    prisma.userGameProfile.findUnique({ where: { userId } }),
  ]);

  // Build weekly activity map
  const weeklyMap: Record<string, number> = {};
  const xpWeeklyMap: Record<string, number> = {};
  for (let i = 0; i < weeksBack; i++) {
    const key = format(
      subWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), weeksBack - 1 - i),
      "MMM d"
    );
    weeklyMap[key] = 0;
    xpWeeklyMap[key] = 0;
  }
  for (const lp of lessonProgressRows) {
    if (!lp.completedAt) continue;
    const key = format(startOfWeek(lp.completedAt, { weekStartsOn: 1 }), "MMM d");
    if (key in weeklyMap) weeklyMap[key]++;
  }
  for (const xp of xpEvents) {
    const key = format(startOfWeek(xp.createdAt, { weekStartsOn: 1 }), "MMM d");
    if (key in xpWeeklyMap) xpWeeklyMap[key] += xp.xp;
  }

  const weeklyActivity = Object.entries(weeklyMap).map(([week, lessons]) => ({
    week,
    lessons,
    xp: xpWeeklyMap[week] ?? 0,
  }));

  // Compute completed lessons per course for progress bars
  const allLessonIds = enrollments.flatMap((e) => e.course.lessons.map((l) => l.id));
  const completedSet = new Set(
    allLessonIds.length > 0
      ? (
          await prisma.lessonProgress.findMany({
            where: { userId, lessonId: { in: allLessonIds }, completed: true },
            select: { lessonId: true },
          })
        ).map((r) => r.lessonId)
      : []
  );

  const courseProgress = enrollments.map((e) => {
    const total = e.course._count.lessons;
    const done = e.course.lessons.filter((l) => completedSet.has(l.id)).length;
    return {
      courseId: e.courseId,
      title: e.course.title,
      total,
      done,
      progress: total === 0 ? 0 : Math.round((done / total) * 100),
      enrolledAt: e.enrolledAt.toISOString(),
    };
  });

  const quizHistory = quizAttempts.map((a) => ({
    id: a.id,
    score: a.score,
    passed: a.passed,
    createdAt: a.createdAt.toISOString(),
    quizTitle: a.quiz.title,
    courseTitle: a.quiz.lesson.course?.title ?? "—",
  }));

  const totalWatchedSeconds = await prisma.lessonProgress.aggregate({
    where: { userId },
    _sum: { watchedSecs: true },
  });

  return {
    weeklyActivity,
    courseProgress,
    quizHistory,
    totalXp: gameProfile?.xp ?? 0,
    totalLessonsCompleted: completedSet.size + lessonProgressRows.length,
    totalWatchedSeconds: totalWatchedSeconds._sum.watchedSecs ?? 0,
  };
}
