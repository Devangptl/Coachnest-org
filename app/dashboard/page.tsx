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
import { BookOpen, Trophy, Clock, ArrowRight, Crown, Zap, TrendingUp } from "lucide-react";
import { calcProgress } from "@/lib/utils";
import { getPlanAccess, BASIC_COURSE_LIMIT } from "@/services/subscription.service";
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

  const [{ enrollments, totalCompleted }, gameData, planAccess] = await Promise.all([
    getDashboardData(session.userId),
    getGameData(session.userId),
    getPlanAccess(session.userId),
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
        <h1 className="text-2xl sm:text-4xl font-bold text-foreground">
          Welcome back,{" "}
          <span className="text-orange-400">{session.name.split(" ")[0]}</span>
        </h1>
        <p className="text-muted-foreground mt-2">
          Keep up the great work. You&apos;re doing amazing!
        </p>
      </div>

      {/* Stats row */}
      <div id="tour-stats" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
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
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <div className="text-muted-foreground text-xs">{stat.label}</div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* ─── Subscription Widget ─────────────────────────────────────────── */}
      {planAccess.isActive ? (
        <GlassCard className="mb-8 border-orange-400/20">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-orange-500/15 flex items-center justify-center flex-shrink-0">
                <Crown className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-foreground font-semibold text-sm">
                  {planAccess.plan} Plan
                  <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-medium ${planAccess.status === "TRIAL" ? "bg-blue-500/20 text-blue-400" :
                    planAccess.status === "CANCELLED" ? "bg-amber-500/20 text-amber-400" :
                      "bg-emerald-500/20 text-emerald-400"
                    }`}>
                    {planAccess.status === "TRIAL" ? "Trial" : planAccess.status === "CANCELLED" ? "Cancels" : "Active"}
                  </span>
                </p>
                <p className="text-muted-foreground text-xs">
                  {planAccess.enrollmentLimit !== null
                    ? `${planAccess.enrolledCount} of ${BASIC_COURSE_LIMIT} course slots used`
                    : "Unlimited course access"}
                  {planAccess.endDate && (
                    <> · {planAccess.status === "CANCELLED" ? "Access until" : "Renews"}{" "}
                      {new Date(planAccess.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</>
                  )}
                </p>
              </div>
            </div>
            <Link href="/dashboard/subscription" className="text-orange-400 hover:text-orange-300 text-xs font-medium flex items-center gap-1 flex-shrink-0">
              Manage <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {/* BASIC usage bar */}
          {planAccess.enrollmentLimit !== null && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted-foreground">Course slots</span>
                <span className={`text-xs font-medium ${planAccess.limitReached ? "text-amber-400" : "text-muted-foreground"}`}>
                  {planAccess.enrolledCount}/{BASIC_COURSE_LIMIT}
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${planAccess.limitReached ? "bg-amber-400" : "bg-orange-400"}`}
                  style={{ width: `${Math.min(100, (planAccess.enrolledCount / BASIC_COURSE_LIMIT) * 100)}%` }}
                />
              </div>
              {planAccess.limitReached && (
                <p className="text-xs text-amber-400 mt-1.5 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Slot limit reached.{" "}
                  <Link href="/pricing" className="underline hover:text-amber-300">Upgrade to PRO</Link>
                  {" "}for unlimited access.
                </p>
              )}
            </div>
          )}
        </GlassCard>
      ) : (
        <GlassCard className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-foreground font-semibold text-sm">Unlock All Courses</p>
              <p className="text-muted-foreground text-xs">Subscribe to get access to every course on CoachNest.</p>
            </div>
          </div>
          <Link href="/pricing" className="btn-primary text-xs py-2 px-4 flex-shrink-0">
            View Plans
          </Link>
        </GlassCard>
      )}

      {/* ─── Gamification Panel ──────────────────────────────────────────── */}
      <div id="tour-gamification" className="grid sm:grid-cols-2 gap-4 mb-10">
        <div className="">
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
          <h2 className="text-xl font-semibold text-foreground mb-5 flex items-center gap-2">
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
          <h2 className="text-xl font-semibold text-foreground mb-5">
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
          <h2 className="text-xl font-semibold text-foreground mb-5 flex items-center gap-2">
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
          <BookOpen className="w-16 h-16 text-muted-foreground/25 mx-auto mb-4" />
          <h3 className="text-foreground text-xl font-semibold mb-2">
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
