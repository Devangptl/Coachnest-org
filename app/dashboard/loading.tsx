/**
 * Dashboard loading skeleton — matches the main dashboard layout
 * with greeting, stats row, and course card sections.
 */
import { Skeleton } from "@/components/ui/Skeleton";

function StatSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg p-6 flex items-center gap-4 animate-pulse">
      <Skeleton className="w-11 h-11 rounded-xl" />
      <div className="space-y-2">
        <Skeleton h="h-7" w="w-12" />
        <Skeleton h="h-3" w="w-20" />
      </div>
    </div>
  );
}

function CourseCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden animate-pulse">
      <Skeleton className="h-44 w-full rounded-none" />
      <div className="p-5 space-y-3">
        <Skeleton h="h-5" w="w-4/5" />
        <Skeleton h="h-3" w="w-full" />
        <Skeleton h="h-2" className="rounded-full w-full mt-4" />
      </div>
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div>
      {/* Greeting */}
      <div className="mb-10 animate-pulse">
        <Skeleton className="h-10 w-72 rounded-xl mb-2" />
        <Skeleton className="h-4 w-48 rounded-lg" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatSkeleton key={i} />
        ))}
      </div>

      {/* Continue Learning section */}
      <Skeleton className="h-6 w-44 rounded-lg mb-5" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
        {Array.from({ length: 3 }).map((_, i) => (
          <CourseCardSkeleton key={i} />
        ))}
      </div>

      {/* Not Started section */}
      <Skeleton className="h-6 w-36 rounded-lg mb-5" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 2 }).map((_, i) => (
          <CourseCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
