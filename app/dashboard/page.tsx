/**
 * Student dashboard — shows enrolled courses with progress.
 * Server Component: reads session and DB directly.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import GlassCard from "@/components/GlassCard";
import CourseCard from "@/components/CourseCard";
import ProgressBar from "@/components/ProgressBar";
import { BookOpen, Trophy, Clock, ArrowRight } from "lucide-react";
import { calcProgress } from "@/lib/utils";
import { getLevelForXp, xpToNextLevel } from "@/lib/badges";
import XpProgressBar from "@/components/XpProgressBar";
import StreakCounter from "@/components/StreakCounter";

async function getDashboardData(userId: string) {
  // Fetch all enrollments with lesson data
  const enrollments = await prisma.enrollment.findMany({
    where: { userId },
    include: {
      course: {
        include: {
          lessons: { select: { id: true } },
          _count: { select: { lessons: true } },
        },
      },
    },
    orderBy: { enrolledAt: "desc" },
  });

  // Batch-fetch completed lesson counts per course (avoids N+1 queries)
  const allLessonIds = enrollments.flatMap((e) => e.course.lessons.map((l) => l.id));
  const completedRows = allLessonIds.length > 0
    ? await prisma.lessonProgress.findMany({
        where: { userId, lessonId: { in: allLessonIds }, completed: true },
        select: { lessonId: true },
      })
    : [];
  const completedSet = new Set(completedRows.map((r) => r.lessonId));

  const enriched = enrollments.map((e) => {
    const completedCount = e.course.lessons.filter((l) => completedSet.has(l.id)).length;
    return {
      ...e,
      completedLessons: completedCount,
      progress: calcProgress(completedCount, e.course._count.lessons),
    };
  });

  const totalCompleted = enriched.filter((e) => e.progress === 100).length;

  return { enrollments: enriched, totalCompleted };
}

async function getGameData(userId: string) {
  const [profile, badgeCount] = await Promise.all([
    prisma.userGameProfile.findUnique({ where: { userId } }),
    prisma.userBadge.count({ where: { userId } }),
  ]);
  const xp = profile?.xp ?? 0;
  const level = getLevelForXp(xp);
  return {
    xp,
    level: level.level,
    levelLabel: level.label,
    levelColor: level.color,
    streak: profile?.streak ?? 0,
    longestStreak: profile?.longestStreak ?? 0,
    nextLevelProgress: xpToNextLevel(xp),
    badgeCount,
  };
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [{ enrollments, totalCompleted }, gameData] = await Promise.all([
    getDashboardData(session.userId),
    getGameData(session.userId),
  ]);

  const inProgress = enrollments.filter(
    (e) => e.progress > 0 && e.progress < 100
  );
  const notStarted = enrollments.filter((e) => e.progress === 0);
  const completed = enrollments.filter((e) => e.progress === 100);

  return (
    <div>
      {/* Header */}
      <div className="mb-10 animate-fade-in">
        <h1 className="text-4xl font-bold text-white">
          Welcome back,{" "}
          <span className="text-orange-400">{session.name.split(" ")[0]}</span>
        </h1>
        <p className="text-muted-foreground mt-2">
          Keep up the great work. You&apos;re doing amazing!
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {[
          {
            label: "Enrolled",
            value: enrollments.length,
            icon: BookOpen,
            color: "text-orange-400",
          },
          {
            label: "In Progress",
            value: inProgress.length,
            icon: Clock,
            color: "text-blue-400",
          },
          {
            label: "Completed",
            value: totalCompleted,
            icon: Trophy,
            color: "text-emerald-400",
          },
          {
            label: "Not Started",
            value: notStarted.length,
            icon: ArrowRight,
            color: "text-yellow-400",
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <GlassCard key={stat.label} className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-muted-foreground text-xs">{stat.label}</div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* ─── Gamification Panel ──────────────────────────────────────────── */}
      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        <div className="sm:col-span-2">
          <XpProgressBar
            xp={gameData.xp}
            level={gameData.level}
            levelLabel={gameData.levelLabel}
            levelColor={gameData.levelColor}
            nextLevelProgress={gameData.nextLevelProgress}
          />
        </div>
        <StreakCounter streak={gameData.streak} longestStreak={gameData.longestStreak} />
      </div>

      {/* ─── In Progress ─────────────────────────────────────────────────── */}
      {inProgress.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-5 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" /> Continue Learning
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {inProgress.map((e) => (
              <CourseCard
                key={e.courseId}
                id={e.courseId}
                title={e.course.title}
                description={e.course.description}
                thumbnail={e.course.thumbnail}
                totalLessons={e.course._count.lessons}
                progress={e.progress}
              />
            ))}
          </div>
        </section>
      )}

      {/* ─── Not Started ─────────────────────────────────────────────────── */}
      {notStarted.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-5">
            Not Started Yet
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {notStarted.map((e) => (
              <CourseCard
                key={e.courseId}
                id={e.courseId}
                title={e.course.title}
                description={e.course.description}
                thumbnail={e.course.thumbnail}
                totalLessons={e.course._count.lessons}
                progress={0}
              />
            ))}
          </div>
        </section>
      )}

      {/* ─── Completed ───────────────────────────────────────────────────── */}
      {completed.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-5 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-emerald-400" /> Completed Courses
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {completed.map((e) => (
              <CourseCard
                key={e.courseId}
                id={e.courseId}
                title={e.course.title}
                description={e.course.description}
                thumbnail={e.course.thumbnail}
                totalLessons={e.course._count.lessons}
                progress={100}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {enrollments.length === 0 && (
        <GlassCard className="text-center py-16">
          <BookOpen className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h3 className="text-white text-xl font-semibold mb-2">
            No courses yet
          </h3>
          <p className="text-muted-foreground mb-6">
            Browse our catalog and enroll in your first course.
          </p>
          <Link href="/courses" className="btn-primary inline-flex items-center gap-2">
            Browse Courses <ArrowRight className="w-4 h-4" />
          </Link>
        </GlassCard>
      )}
    </div>
  );
}
