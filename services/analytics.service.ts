/**
 * Analytics Service — aggregated data queries for admin, instructor, and student dashboards.
 * All methods return plain serialisable objects (safe to pass to Client Components).
 */
import { prisma } from "@/lib/prisma";
import { startOfMonth, startOfWeek, subMonths, subWeeks, format } from "date-fns";
import { instructorScopedCourseWhere } from "@/services/collaboration.service";

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
    where: instructorScopedCourseWhere(instructorId),
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

/** Monthly enrollment counts for an instructor's courses (last N months). */
export async function getInstructorMonthlyEnrollments(instructorId: string, months = 6) {
  const since = subMonths(startOfMonth(new Date()), months - 1);
  const courseIds = (
    await prisma.course.findMany({
      where: instructorScopedCourseWhere(instructorId),
      select: { id: true },
    })
  ).map((c) => c.id);

  const enrollments = await prisma.enrollment.findMany({
    where: { courseId: { in: courseIds }, enrolledAt: { gte: since } },
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

/**
 * Per-course student progress distribution for an instructor.
 * Returns for each course: title, enrolled count, and buckets (0%, 1-49%, 50-99%, 100%).
 */
export async function getInstructorCourseProgressStats(instructorId: string) {
  const courses = await prisma.course.findMany({
    where: { AND: [instructorScopedCourseWhere(instructorId), { status: "PUBLISHED" }] },
    select: {
      id: true,
      title: true,
      lessons: { select: { id: true } },
      enrollments: { select: { userId: true, completedAt: true } },
    },
  });

  if (courses.length === 0) return [];

  // Fetch all lesson-completion counts grouped by (userId, courseId) efficiently
  const allCourseIds = courses.map((c) => c.id);
  const progressRows = await prisma.lessonProgress.groupBy({
    by: ["userId"],
    where: {
      lesson: { courseId: { in: allCourseIds } },
      completed: true,
    },
    _count: { id: true },
  });

  // Build a map userId → completedCount per course
  const perCourseUserProgress: Record<string, Record<string, number>> = {};
  for (const cid of allCourseIds) perCourseUserProgress[cid] = {};

  // We need per-course per-user counts, so do it per-course
  const perCourseRows = await Promise.all(
    courses.map((c) =>
      prisma.lessonProgress.groupBy({
        by: ["userId"],
        where: { lesson: { courseId: c.id }, completed: true },
        _count: { id: true },
      }).then((rows) => ({ courseId: c.id, rows }))
    )
  );

  for (const { courseId, rows } of perCourseRows) {
    for (const r of rows) {
      perCourseUserProgress[courseId][r.userId] = r._count.id;
    }
  }

  return courses.map((c) => {
    const total = c.lessons.length;
    let notStarted = 0, inProgress = 0, nearDone = 0, completed = 0;
    for (const e of c.enrollments) {
      const done = perCourseUserProgress[c.id][e.userId] ?? 0;
      const pct = total === 0 ? 0 : (done / total) * 100;
      if (pct === 0) notStarted++;
      else if (pct < 50) inProgress++;
      else if (pct < 100) nearDone++;
      else completed++;
    }
    const enrolled = c.enrollments.length;
    const completionRate = enrolled === 0 ? 0 : Math.round((completed / enrolled) * 100);
    return {
      title: c.title.length > 20 ? c.title.slice(0, 20) + "…" : c.title,
      enrolled,
      notStarted,
      inProgress,
      nearDone,
      completed,
      completionRate,
    };
  });
}

/**
 * Quiz pass-rate per course for an instructor.
 */
export async function getInstructorQuizStats(instructorId: string) {
  const courses = await prisma.course.findMany({
    where: { AND: [instructorScopedCourseWhere(instructorId), { status: "PUBLISHED" }] },
    select: {
      id: true,
      title: true,
      lessons: {
        where: { type: "QUIZ" },
        select: {
          quiz: {
            select: {
              attempts: { select: { passed: true, score: true } },
            },
          },
        },
      },
    },
  });

  return courses
    .map((c) => {
      const attempts = c.lessons.flatMap((l) => l.quiz?.attempts ?? []);
      if (attempts.length === 0) return null;
      const passed = attempts.filter((a) => a.passed).length;
      const avgScore = Math.round(
        attempts.reduce((s, a) => s + a.score, 0) / attempts.length
      );
      return {
        title: c.title.length > 20 ? c.title.slice(0, 20) + "…" : c.title,
        attempts: attempts.length,
        passRate: Math.round((passed / attempts.length) * 100),
        avgScore,
      };
    })
    .filter(Boolean) as { title: string; attempts: number; passRate: number; avgScore: number }[];
}

/**
 * Students enrolled in the instructor's courses with per-course progress.
 */
export async function getInstructorStudentsWithProgress(instructorId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { course: instructorScopedCourseWhere(instructorId) },
    include: {
      user: { select: { id: true, name: true, email: true, avatar: true } },
      course: {
        select: {
          id: true,
          title: true,
          lessons: { select: { id: true } },
          _count: { select: { lessons: true } },
        },
      },
    },
    orderBy: { enrolledAt: "desc" },
  });

  if (enrollments.length === 0) return [];

  // Batch-fetch completed lesson counts per (userId, courseId)
  const allLessonIds = enrollments.flatMap((e) => e.course.lessons.map((l) => l.id));
  const completedRows = allLessonIds.length > 0
    ? await prisma.lessonProgress.findMany({
        where: { userId: { in: [...new Set(enrollments.map((e) => e.userId))] }, lessonId: { in: allLessonIds }, completed: true },
        select: { userId: true, lessonId: true },
      })
    : [];

  // Map userId+lessonId → completed
  const completedSet = new Set(completedRows.map((r) => `${r.userId}:${r.lessonId}`));

  return enrollments.map((e) => {
    const totalLessons = e.course._count.lessons;
    const doneLessons = e.course.lessons.filter(
      (l) => completedSet.has(`${e.userId}:${l.id}`)
    ).length;
    const progress = totalLessons === 0 ? 0 : Math.round((doneLessons / totalLessons) * 100);
    return {
      userId: e.userId,
      userName: e.user.name,
      userEmail: e.user.email,
      userAvatar: e.user.avatar,
      courseId: e.courseId,
      courseTitle: e.course.title,
      totalLessons,
      doneLessons,
      progress,
      enrolledAt: e.enrolledAt.toISOString(),
      completedAt: e.completedAt?.toISOString() ?? null,
    };
  });
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
