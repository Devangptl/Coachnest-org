/**
 * Instructor → Analytics
 */
import dynamic from "next/dynamic";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getInstructorMonthlyEnrollments,
  getInstructorCourseProgressStats,
  getInstructorQuizStats,
} from "@/services/analytics.service";

const InstructorAnalyticsDashboard = dynamic(
  () => import("./InstructorAnalyticsDashboard"),
  {
    loading: () => (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-lg bg-secondary" />
          ))}
        </div>
        <div className="h-80 rounded-lg bg-secondary" />
        <div className="h-64 rounded-lg bg-secondary" />
      </div>
    ),
  }
);

async function getAnalytics(userId: string) {
  const [courses, totalStudents, reviews] = await Promise.all([
    prisma.course.findMany({
      where: { createdById: userId },
      include: {
        _count: { select: { enrollments: true, reviews: true } },
        reviews: { select: { rating: true } },
        orders: { where: { status: "PAID" }, select: { amount: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.enrollment.count({ where: { course: { createdById: userId } } }),
    prisma.review.findMany({
      where: { course: { createdById: userId } },
      select: { rating: true },
    }),
  ]);

  const totalRevenue = courses.reduce(
    (sum, c) => sum + c.orders.reduce((s, o) => s + Number(o.amount), 0),
    0
  );
  const avgRating =
    reviews.length
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0;

  return {
    courses: courses.map((c) => ({
      id: c.id,
      title: c.title,
      enrollments: c._count.enrollments,
      revenue: c.orders.reduce((s, o) => s + Number(o.amount), 0),
      avgRating: c.reviews.length
        ? Number((c.reviews.reduce((s, r) => s + r.rating, 0) / c.reviews.length).toFixed(1))
        : 0,
    })),
    totalCourses: courses.length,
    totalStudents,
    totalRevenue,
    avgRating,
  };
}

export default async function InstructorAnalyticsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [analytics, monthlyEnrollments, courseProgressStats, quizStats] =
    await Promise.all([
      getAnalytics(session.userId),
      getInstructorMonthlyEnrollments(session.userId, 6),
      getInstructorCourseProgressStats(session.userId),
      getInstructorQuizStats(session.userId),
    ]);

  return (
    <InstructorAnalyticsDashboard
      totalCourses={analytics.totalCourses}
      totalStudents={analytics.totalStudents}
      totalRevenue={analytics.totalRevenue}
      avgRating={analytics.avgRating}
      courses={analytics.courses}
      monthlyEnrollments={monthlyEnrollments}
      courseProgressStats={courseProgressStats}
      quizStats={quizStats}
    />
  );
}
