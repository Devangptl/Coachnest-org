/**
 * GET /api/instructor/analytics — course analytics for the instructor
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "INSTRUCTOR" && session.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [courses, enrollments, reviews] = await Promise.all([
    prisma.course.findMany({
      where:   { createdById: session.userId },
      include: { _count: { select: { enrollments: true, reviews: true, lessons: true } }, reviews: { select: { rating: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.enrollment.count({
      where: { course: { createdById: session.userId } },
    }),
    prisma.review.findMany({
      where:  { course: { createdById: session.userId } },
      select: { rating: true },
    }),
  ]);

  const totalCourses     = courses.length;
  const totalStudents    = enrollments;
  const avgRating        = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;
  const publishedCourses = courses.filter((c) => c.status === "PUBLISHED").length;

  const courseStats = courses.map((c) => ({
    id:          c.id,
    title:       c.title,
    thumbnail:   c.thumbnail,
    status:      c.status,
    students:    c._count.enrollments,
    lessons:     c._count.lessons,
    reviews:     c._count.reviews,
    avgRating:   c.reviews.length
      ? c.reviews.reduce((s, r) => s + r.rating, 0) / c.reviews.length
      : 0,
  }));

  return NextResponse.json({
    totalCourses,
    publishedCourses,
    totalStudents,
    avgRating: Math.round(avgRating * 10) / 10,
    courseStats,
  });
}
