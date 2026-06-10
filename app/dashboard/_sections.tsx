/**
 * Dashboard data sections — each fetches its own slice of data and is
 * rendered inside a Suspense boundary by the parent page. This lets the
 * shell stream first and each section pop in independently.
 */
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { calcProgress } from "@/lib/utils";
import { getLevelForXp, xpToNextLevel } from "@/lib/badges";
import GlassCard from "@/components/GlassCard";
import CourseCard from "@/components/CourseCard";
import XpProgressBar from "@/components/XpProgressBar";
import StreakCounter from "@/components/StreakCounter";
import OnboardingBanner from "@/components/OnboardingBanner";
import {
  BookOpen,
  Trophy,
  Clock,
  ArrowRight,
  ShoppingBag,
  Users,
  CheckCircle2,
  GraduationCap,
} from "lucide-react";

// ── Onboarding banner ────────────────────────────────────────────────────────

export async function OnboardingBannerGate({ userId }: { userId: string }) {
  const state = await prisma.user.findUnique({
    where: { id: userId },
    select: { hasCompletedOnboarding: true },
  });
  if (state?.hasCompletedOnboarding) return null;
  return <OnboardingBanner />;
}

// ── Enrollment-dependent section: stats row + course lists ───────────────────

async function getDashboardData(userId: string) {
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

export async function EnrollmentSection({ userId }: { userId: string }) {
  const { enrollments, totalCompleted } = await getDashboardData(userId);
  const inProgress = enrollments.filter((e) => e.progress > 0 && e.progress < 100);
  const notStarted = enrollments.filter((e) => e.progress === 0);
  const completed = enrollments.filter((e) => e.progress === 100);

  return (
    <>
      {/* Stats row */}
      <div id="tour-stats" className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Enrolled", value: enrollments.length, icon: BookOpen, color: "text-[#d97757]" },
          { label: "In Progress", value: inProgress.length, icon: Clock, color: "text-blue-400" },
          { label: "Completed", value: totalCompleted, icon: Trophy, color: "text-emerald-400" },
          { label: "Not Started", value: notStarted.length, icon: ArrowRight, color: "text-yellow-400" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <GlassCard key={stat.label} className="flex flex-col items-center text-center gap-1.5 sm:flex-row sm:text-left sm:gap-3">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.color}`} />
              </div>
              <div className="min-w-0">
                <div className="text-lg sm:text-xl font-bold text-foreground">{stat.value}</div>
                <div className="text-muted-foreground text-[10px] sm:text-xs leading-tight">{stat.label}</div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* In Progress */}
      {inProgress.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" /> Continue Learning
            </h2>
            <Link href="/courses" className="text-[#d97757] hover:text-orange-300 text-sm font-medium flex items-center gap-1 transition-colors">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {inProgress.map((e) => (
              <CourseCard
                key={e.courseId}
                id={e.courseId}
                title={e.course.title}
                description={e.course.description}
                thumbnail={e.course.thumbnail}
                totalLessons={e.course._count.lessons}
                progress={e.progress}
                compact
              />
            ))}
          </div>
        </section>
      )}

      {/* Not Started */}
      {notStarted.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-foreground">Not Started Yet</h2>
            <Link href="/courses" className="text-[#d97757] hover:text-orange-300 text-sm font-medium flex items-center gap-1 transition-colors">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {notStarted.map((e) => (
              <CourseCard
                key={e.courseId}
                id={e.courseId}
                title={e.course.title}
                description={e.course.description}
                thumbnail={e.course.thumbnail}
                totalLessons={e.course._count.lessons}
                progress={0}
                compact
              />
            ))}
          </div>
        </section>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Trophy className="w-5 h-5 text-emerald-400" /> Completed Courses
            </h2>
            <Link href="/courses" className="text-[#d97757] hover:text-orange-300 text-sm font-medium flex items-center gap-1 transition-colors">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {completed.map((e) => (
              <CourseCard
                key={e.courseId}
                id={e.courseId}
                title={e.course.title}
                description={e.course.description}
                thumbnail={e.course.thumbnail}
                totalLessons={e.course._count.lessons}
                progress={100}
                compact
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {enrollments.length === 0 && (
        <GlassCard className="text-center py-16">
          <BookOpen className="w-16 h-16 text-muted-foreground/25 mx-auto mb-4" />
          <h3 className="text-foreground text-base font-semibold mb-2">No courses yet</h3>
          <p className="text-muted-foreground mb-6">Browse our catalog and enroll in your first course.</p>
          <Link href="/courses" className="btn-primary inline-flex items-center gap-2">
            Browse Courses <ArrowRight className="w-4 h-4" />
          </Link>
        </GlassCard>
      )}
    </>
  );
}

// ── Access panel: course count + community add-on ────────────────────────────

export async function AccessPanel({ userId }: { userId: string }) {
  const [enrollmentCount, featurePurchases, communityFeature] = await Promise.all([
    prisma.enrollment.count({ where: { userId } }),
    prisma.featurePurchase.findMany({
      where: { userId },
      include: { feature: { select: { slug: true } } },
    }),
    prisma.platformFeature.findUnique({
      where:  { slug: "community" },
      select: { price: true },
    }),
  ]);
  const hasCommunityAccess = featurePurchases.some(
    (fp) => fp.feature.slug === "community"
  );

  return (
    <div className="grid sm:grid-cols-2 gap-3 mb-3">
      {/* Courses owned */}
      <GlassCard className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-md bg-orange-500/15 flex items-center justify-center flex-shrink-0">
            <ShoppingBag className="w-5 h-5 text-[#d97757]" />
          </div>
          <div>
            <p className="text-foreground font-semibold text-sm">
              {enrollmentCount} Course{enrollmentCount !== 1 ? "s" : ""} Purchased
            </p>
            <p className="text-muted-foreground text-xs">Lifetime access, no expiry</p>
          </div>
        </div>
        <Link href="/courses" className="text-[#d97757] hover:text-orange-300 text-xs font-medium flex items-center gap-1 flex-shrink-0">
          Browse <ArrowRight className="w-3 h-3" />
        </Link>
      </GlassCard>

      {/* Community add-on */}
      {hasCommunityAccess ? (
        <GlassCard className="flex items-center justify-between gap-4 border-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-md bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-foreground font-semibold text-sm flex items-center gap-1.5">
                Community Access
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </p>
              <p className="text-muted-foreground text-xs">Forums · Study Groups · Peer Review</p>
            </div>
          </div>
          <Link href="/community" className="text-emerald-400 hover:text-emerald-300 text-xs font-medium flex items-center gap-1 flex-shrink-0">
            Open <ArrowRight className="w-3 h-3" />
          </Link>
        </GlassCard>
      ) : (
        <GlassCard className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-foreground font-semibold text-sm">Community Access</p>
              <p className="text-muted-foreground text-xs">
                One-time add-on
                {communityFeature && ` · ₹${Number(communityFeature.price).toLocaleString("en-IN")}`}
              </p>
            </div>
          </div>
          <Link href="/features/community" className="btn-primary text-xs py-2 px-3 flex-shrink-0 whitespace-nowrap">
            Buy Access
          </Link>
        </GlassCard>
      )}
    </div>
  );
}

// ── Gamification panel: XP + streak ──────────────────────────────────────────

export async function GamificationPanel({ userId }: { userId: string }) {
  const profile = await prisma.userGameProfile.findUnique({ where: { userId } });
  const xp = profile?.xp ?? 0;
  const level = getLevelForXp(xp);

  return (
    <div id="tour-gamification" className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
      <XpProgressBar
        xp={xp}
        level={level.level}
        levelLabel={level.label}
        levelColor={level.color}
        nextLevelProgress={xpToNextLevel(xp)}
      />
      <StreakCounter
        streak={profile?.streak ?? 0}
        longestStreak={profile?.longestStreak ?? 0}
      />
    </div>
  );
}

// ── Courses from followed instructors ────────────────────────────────────────

export async function FollowedInstructorCourses({ userId }: { userId: string }) {
  const [enrolled, follows] = await Promise.all([
    prisma.enrollment.findMany({ where: { userId }, select: { courseId: true } }),
    prisma.userInstructorFollow.findMany({
      where: { userId },
      select: {
        instructor: {
          select: {
            id: true,
            name: true,
            courses: {
              where: { status: "PUBLISHED" },
              orderBy: { createdAt: "desc" },
              take: 3,
              select: {
                id: true,
                title: true,
                description: true,
                thumbnail: true,
                price: true,
                discountPrice: true,
                isFree: true,
                level: true,
                _count: { select: { lessons: true, enrollments: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  const enrolledIds = new Set(enrolled.map((e) => e.courseId));
  const courses = follows
    .flatMap((f) =>
      f.instructor.courses
        .filter((c) => !enrolledIds.has(c.id))
        .map((c) => ({
          ...c,
          price: c.price ? Number(c.price) : null,
          discountPrice: c.discountPrice ? Number(c.discountPrice) : null,
          instructorName: f.instructor.name,
        }))
    )
    .slice(0, 6);

  const followCount = follows.length;

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-[#d97757]" />
          <h2 className="text-base font-semibold text-foreground">
            From Instructors You Follow
          </h2>
        </div>
        {courses.length > 0 && (
          <Link
            href="/courses"
            className="text-[#d97757] hover:text-orange-300 text-sm font-medium flex items-center gap-1 transition-colors"
          >
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {courses.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {courses.map((c) => (
            <CourseCard
              key={c.id}
              id={c.id}
              title={c.title}
              description={c.description}
              thumbnail={c.thumbnail}
              instructorName={c.instructorName}
              price={c.price}
              discountPrice={c.discountPrice}
              isFree={c.isFree}
              level={c.level}
              totalLessons={c._count.lessons}
              enrollmentCount={c._count.enrollments}
              compact
            />
          ))}
        </div>
      ) : (
        <GlassCard className="flex flex-col sm:flex-row items-center gap-5 py-8 px-6">
          <div className="w-12 h-12 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-6 h-6 text-[#d97757]" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <p className="font-semibold text-foreground text-sm">
              {followCount === 0
                ? "You haven't followed any instructors yet"
                : "No new courses from your instructors right now"}
            </p>
            <p className="text-muted-foreground text-xs mt-1">
              {followCount === 0
                ? "Follow instructors to see their latest courses here."
                : "Check back later — new courses will appear here as they're published."}
            </p>
          </div>
          {followCount === 0 && (
            <Link
              href="/courses"
              className="btn-primary text-sm px-4 py-2 flex-shrink-0 whitespace-nowrap"
            >
              Discover Instructors
            </Link>
          )}
        </GlassCard>
      )}
    </section>
  );
}
