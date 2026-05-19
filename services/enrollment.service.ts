/**
 * Enrollment Service — enrollment queries and aggregations for admin dashboard.
 * All methods return plain serializable objects (safe to pass to Client Components).
 */
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, parseISO } from "date-fns";
import { buildPaginated, parsePagination, type Paginated, type PaginationParams } from "@/lib/pagination";

// ─── Enrollment List with Filters ──────────────────────────────────────────

export async function getEnrollmentsList(filters?: {
  courseId?: string;
  status?: "ACTIVE" | "COMPLETED" | "DROPPED";
  dateFrom?: string;
  dateTo?: string;
  search?: string;
} & PaginationParams): Promise<Paginated<any>> {
  const { page, pageSize, skip, take } = parsePagination(filters);
  const where: any = {};

  if (filters?.courseId) {
    where.courseId = filters.courseId;
  }

  if (filters?.dateFrom) {
    where.enrolledAt = { gte: startOfDay(parseISO(filters.dateFrom)) };
  }

  if (filters?.dateTo) {
    const dateTo = where.enrolledAt?.gte
      ? { gte: where.enrolledAt.gte, lte: endOfDay(parseISO(filters.dateTo)) }
      : { lte: endOfDay(parseISO(filters.dateTo)) };
    where.enrolledAt = dateTo;
  }

  // Status filter
  if (filters?.status) {
    if (filters.status === "COMPLETED") {
      where.completedAt = { not: null };
    } else if (filters.status === "DROPPED") {
      where.completedAt = null;
    } else if (filters.status === "ACTIVE") {
      where.completedAt = null;
      where.enrolledAt = { lte: new Date() };
    }
  }

  // Search by student name/email — pushed into the query so pagination and
  // the total count stay correct.
  if (filters?.search) {
    where.user = {
      OR: [
        { name: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
      ],
    };
  }

  const [enrollments, total] = await Promise.all([
    prisma.enrollment.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
        course: { select: { id: true, title: true } },
      },
      orderBy: { enrolledAt: "desc" },
      skip,
      take,
    }),
    prisma.enrollment.count({ where }),
  ]);

  return buildPaginated(enrollments, total, page, pageSize);
}

// ─── Student Profile with Enrollments ──────────────────────────────────────

export async function getStudentEnrollments(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, avatar: true, createdAt: true },
  });

  if (!user) return null;

  const enrollments = await prisma.enrollment.findMany({
    where: { userId },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          thumbnail: true,
          _count: { select: { lessons: true } },
        },
      },
    },
  });

  return { user, enrollments };
}

// ─── Enrollment Details with Lesson Progress ───────────────────────────────

export async function getEnrollmentDetails(enrollmentId: string) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      user: { select: { id: true, name: true, email: true, avatar: true } },
      course: {
        select: {
          id: true,
          title: true,
          totalLessons: true,
          sections: {
            include: {
              lessons: {
                select: {
                  id: true,
                  title: true,
                  order: true,
                  duration: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!enrollment) return null;

  // Get lesson progress
  const lessonProgress = await prisma.lessonProgress.findMany({
    where: { userId: enrollment.userId },
  });

  // Get quiz attempts for this course
  const quizAttempts = await prisma.quizAttempt.findMany({
    where: {
      userId: enrollment.userId,
      quiz: {
        lesson: { courseId: enrollment.courseId },
      },
    },
    include: {
      quiz: { select: { id: true, title: true, passMark: true } },
    },
  });

  return { enrollment, lessonProgress, quizAttempts };
}

// ─── Enrollment Statistics ────────────────────────────────────────────────

export async function getEnrollmentStats() {
  const [totalEnrollments, activeEnrollments, completedEnrollments, droppedEnrollments] =
    await Promise.all([
      prisma.enrollment.count(),
      prisma.enrollment.count({ where: { completedAt: null } }),
      prisma.enrollment.count({ where: { completedAt: { not: null } } }),
      prisma.enrollment.count({
        where: {
          completedAt: null,
          enrolledAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // No activity in 30 days
        },
      }),
    ]);

  return {
    totalEnrollments,
    activeEnrollments,
    completedEnrollments,
    droppedEnrollments,
  };
}

// ─── Course Progress for Enrollment ────────────────────────────────────────

export async function getEnrollmentProgress(enrollmentId: string) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: { userId: true, courseId: true },
  });

  if (!enrollment) return null;

  const lessons = await prisma.lesson.findMany({
    where: { courseId: enrollment.courseId },
    select: { id: true },
  });

  const completedLessons = await prisma.lessonProgress.count({
    where: {
      userId: enrollment.userId,
      completed: true,
      lesson: { courseId: enrollment.courseId },
    },
  });

  const totalLessons = lessons.length;
  const progressPercentage = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  return {
    completedLessons,
    totalLessons,
    progressPercentage: Math.round(progressPercentage),
  };
}
