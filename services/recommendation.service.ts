/**
 * Recommendation Service — lightweight collaborative filtering.
 * "Students who enrolled in the same courses as you also enrolled in..."
 */
import { prisma } from "@/lib/prisma";

/**
 * Returns up to `limit` course IDs recommended for a given user,
 * excluding courses the user is already enrolled in.
 */
export async function getRecommendations(
  userId: string,
  limit = 4
): Promise<string[]> {
  // 1. Get courses the user is enrolled in
  const userEnrollments = await prisma.enrollment.findMany({
    where:  { userId },
    select: { courseId: true },
  });
  const enrolledIds = userEnrollments.map((e) => e.courseId);
  if (enrolledIds.length === 0) {
    // Cold start: return top courses by enrollment
    const popular = await prisma.course.findMany({
      where: { status: "PUBLISHED", id: { notIn: enrolledIds } },
      orderBy: { enrollments: { _count: "desc" } },
      take: limit,
      select: { id: true },
    });
    return popular.map((c) => c.id);
  }

  // 2. Find peer users enrolled in ANY of the same courses
  const peers = await prisma.enrollment.findMany({
    where: { courseId: { in: enrolledIds }, userId: { not: userId } },
    select: { userId: true },
    distinct: ["userId"],
    take: 50,
  });
  const peerIds = peers.map((p) => p.userId);
  if (peerIds.length === 0) return [];

  // 3. Courses those peers are also enrolled in (not already enrolled by user)
  const peerCourses = await prisma.enrollment.groupBy({
    by:      ["courseId"],
    where:   { userId: { in: peerIds }, courseId: { notIn: enrolledIds } },
    _count:  { courseId: true },
    orderBy: { _count: { courseId: "desc" } },
    take:    limit,
  });

  // 4. Filter: only PUBLISHED courses
  const courseIds  = peerCourses.map((pc) => pc.courseId);
  const published = await prisma.course.findMany({
    where:  { id: { in: courseIds }, status: "PUBLISHED" },
    select: { id: true },
  });

  return published.map((c) => c.id);
}

/** Trending courses (most enrollments in the last 30 days). */
export async function getTrendingCourses(limit = 6) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const trending = await prisma.enrollment.groupBy({
    by:      ["courseId"],
    where:   { enrolledAt: { gte: since } },
    _count:  { courseId: true },
    orderBy: { _count: { courseId: "desc" } },
    take:    limit,
  });
  const ids = trending.map((t) => t.courseId);
  return prisma.course.findMany({
    where: { id: { in: ids }, status: "PUBLISHED" },
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { enrollments: true, reviews: true } },
      reviews: { select: { rating: true } },
      category: { select: { name: true, slug: true } },
    },
  });
}
