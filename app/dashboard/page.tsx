/**
 * Student dashboard — shows enrolled courses with progress.
 *
 * Server Component that renders the page shell instantly, then streams
 * each data-driven section through its own Suspense boundary. The
 * sections fetch in parallel; users see the shell + skeletons immediately
 * and each section pops in as its DB query resolves.
 */
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import RecommendedCourses from "@/components/RecommendedCourses";
import {
  StatCardSkeleton,
  CourseCardSkeleton,
  Skeleton,
} from "@/components/ui/Skeleton";
import {
  EnrollmentSection,
  AccessPanel,
  GamificationPanel,
  FollowedInstructorCourses,
  OnboardingBannerGate,
} from "./_sections";

function StatsRowSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

function AccessPanelSkeleton() {
  return (
    <div className="grid sm:grid-cols-2 gap-3 mb-3">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="glass border border-border rounded-md p-4 flex items-center gap-3 animate-pulse">
          <Skeleton className="w-11 h-11 rounded-md flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton h="h-3" w="w-32" />
            <Skeleton h="h-2" w="w-40" />
          </div>
        </div>
      ))}
    </div>
  );
}

function GamificationSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-md p-5 animate-pulse space-y-3">
          <Skeleton h="h-4" w="w-32" />
          <Skeleton h="h-7" w="w-20" />
          <Skeleton h="h-2" w="w-full" className="rounded-full" />
        </div>
      ))}
    </div>
  );
}

function FollowedSectionSkeleton() {
  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3 animate-pulse">
        <Skeleton h="h-5" w="w-56" />
        <Skeleton h="h-3" w="w-16" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <CourseCardSkeleton key={i} compact />
        ))}
      </div>
    </section>
  );
}

function EnrollmentSectionSkeleton() {
  return (
    <>
      <StatsRowSkeleton />
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3 animate-pulse">
          <Skeleton h="h-5" w="w-44" />
          <Skeleton h="h-3" w="w-16" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <CourseCardSkeleton key={i} compact />
          ))}
        </div>
      </section>
    </>
  );
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div>
      {/* Onboarding banner — streams in independently, hidden once shown */}
      <Suspense fallback={null}>
        <OnboardingBannerGate userId={session.userId} />
      </Suspense>

      {/* Header — renders instantly from session data */}
      <div className="mb-6 animate-fade-in">
        <h1 className="text-xl sm:text-3xl font-bold text-foreground">
          Welcome back,{" "}
          <span className="text-[#d97757]">{session.name.split(" ")[0]}</span>
        </h1>
        <p className="text-muted-foreground mt-2">
          Keep up the great work. You&apos;re doing amazing!
        </p>
      </div>

      {/* Stats row + course sections (enrollment-dependent) */}
      <Suspense fallback={<EnrollmentSectionSkeleton />}>
        <EnrollmentSection userId={session.userId} />
      </Suspense>

      {/* Access panel — courses owned + community add-on */}
      <Suspense fallback={<AccessPanelSkeleton />}>
        <AccessPanel userId={session.userId} />
      </Suspense>

      {/* Gamification — XP + streak */}
      <Suspense fallback={<GamificationSkeleton />}>
        <GamificationPanel userId={session.userId} />
      </Suspense>

      {/* Recommended courses — already client-side with its own loading */}
      <RecommendedCourses />

      {/* Courses from followed instructors */}
      <Suspense fallback={<FollowedSectionSkeleton />}>
        <FollowedInstructorCourses userId={session.userId} />
      </Suspense>
    </div>
  );
}
