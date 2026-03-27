/**
 * Admin → Student Detail Page
 * Shows full student profile with enrollments, orders, quiz history, etc.
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcProgress } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import StudentDetail from "./StudentDetail";
import { getLevelForXp, xpToNextLevel, BADGES } from "@/lib/badges";

async function getStudentData(id: string) {
  const student = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      bio: true,
      headline: true,
      website: true,
      role: true,
      createdAt: true,
      enrollments: {
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
        orderBy: { enrolledAt: "desc" },
      },
      orders: {
        include: {
          course: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      certificates: {
        include: {
          course: { select: { id: true, title: true } },
        },
        orderBy: { issuedAt: "desc" },
      },
      quizAttempts: {
        include: {
          quiz: {
            select: {
              id: true,
              title: true,
              passMark: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      reviews: {
        include: {
          course: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      _count: {
        select: {
          enrollments: true,
          certificates: true,
          orders: true,
          reviews: true,
          quizAttempts: true,
        },
      },
    },
  });

  if (!student) return null;

  // Enrich enrollments with progress
  const enrichedEnrollments = await Promise.all(
    student.enrollments.map(async (e) => {
      const lessonIds = await prisma.lesson.findMany({
        where: { courseId: e.courseId },
        select: { id: true },
      });
      const completedCount = await prisma.lessonProgress.count({
        where: {
          userId: id,
          lessonId: { in: lessonIds.map((l) => l.id) },
          completed: true,
        },
      });
      return {
        id: e.id,
        courseId: e.courseId,
        enrolledAt: e.enrolledAt.toISOString(),
        completedAt: e.completedAt?.toISOString() ?? null,
        course: {
          id: e.course.id,
          title: e.course.title,
          thumbnail: e.course.thumbnail,
          totalLessons: e.course._count.lessons,
        },
        completedLessons: completedCount,
        totalLessons: e.course._count.lessons,
        progress: calcProgress(completedCount, e.course._count.lessons),
      };
    })
  );

  const totalSpent = student.orders
    .filter((o) => o.status === "PAID")
    .reduce((sum, o) => sum + Number(o.amount), 0);

  // Gamification data
  const [gameProfile, earnedBadges, recentXpEvents] = await Promise.all([
    prisma.userGameProfile.findUnique({ where: { userId: id } }),
    prisma.userBadge.findMany({
      where: { userId: id },
      select: { badgeKey: true, earnedAt: true },
      orderBy: { earnedAt: "desc" },
    }),
    prisma.xpEvent.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
  ]);

  const xp = gameProfile?.xp ?? 0;
  const levelMeta = getLevelForXp(xp);
  const earnedKeys = new Set(earnedBadges.map((b) => b.badgeKey));
  const gamification = {
    xp,
    level: levelMeta.level,
    levelLabel: levelMeta.label,
    levelColor: levelMeta.color,
    streak: gameProfile?.streak ?? 0,
    longestStreak: gameProfile?.longestStreak ?? 0,
    nextLevelProgress: xpToNextLevel(xp),
    badges: BADGES.map((b) => ({
      ...b,
      earned: earnedKeys.has(b.key),
      earnedAt: earnedBadges.find((e) => e.badgeKey === b.key)?.earnedAt?.toISOString() ?? null,
    })),
    earnedCount: earnedKeys.size,
    recentXpEvents: recentXpEvents.map((e) => ({
      id: e.id,
      action: e.action,
      xp: e.xp,
      createdAt: e.createdAt.toISOString(),
    })),
  };

  return {
    id: student.id,
    name: student.name,
    email: student.email,
    avatar: student.avatar,
    bio: student.bio,
    headline: student.headline,
    website: student.website,
    role: student.role,
    createdAt: student.createdAt.toISOString(),
    enrollments: enrichedEnrollments,
    orders: student.orders.map((o) => ({
      id: o.id,
      amount: Number(o.amount),
      currency: o.currency,
      status: o.status,
      createdAt: o.createdAt.toISOString(),
      course: o.course ? { id: o.course.id, title: o.course.title } : null,
    })),
    certificates: student.certificates.map((c) => ({
      id: c.id,
      issuedAt: c.issuedAt.toISOString(),
      course: { id: c.course.id, title: c.course.title },
    })),
    quizAttempts: student.quizAttempts.map((a) => ({
      id: a.id,
      score: a.score,
      passed: a.passed,
      timeTaken: a.timeTaken,
      createdAt: a.createdAt.toISOString(),
      quiz: { id: a.quiz.id, title: a.quiz.title, passMark: a.quiz.passMark },
    })),
    reviews: student.reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
      course: { id: r.course.id, title: r.course.title },
    })),
    counts: student._count,
    totalSpent,
    gamification,
  };
}

export default async function AdminStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const { id } = await params;
  const student = await getStudentData(id);
  if (!student) redirect("/admin/students");

  return (
    <div>
      <Link
        href="/admin/students"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Students
      </Link>

      <StudentDetail student={student} />
    </div>
  );
}
