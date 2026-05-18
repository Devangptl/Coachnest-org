import { Skeleton, CourseCardSkeleton } from "@/components/ui/Skeleton";

export default function InstructorLoading() {
  return (
    <div className="pt-6 pb-16">
      {/* Header skeleton */}
      <div className="bg-card border border-border/60 rounded-xl p-6 sm:p-8 mb-10">
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          <Skeleton className="w-20 h-20 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <Skeleton h="h-7" w="w-56" />
            <Skeleton h="h-4" w="w-72" />
            <div className="flex gap-6 pt-2">
              <Skeleton h="h-4" w="w-24" />
              <Skeleton h="h-4" w="w-24" />
              <Skeleton h="h-4" w="w-20" />
            </div>
            <div className="flex gap-3 pt-2">
              <Skeleton h="h-8" w="w-28" />
              <Skeleton h="h-8" w="w-24" />
            </div>
          </div>
        </div>
        <div className="border-t border-border/60 mt-6 pt-5 space-y-2">
          <Skeleton h="h-3" w="w-full" />
          <Skeleton h="h-3" w="w-4/5" />
        </div>
      </div>

      {/* Courses skeleton */}
      <div className="mb-12">
        <Skeleton h="h-6" w="w-60" className="mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CourseCardSkeleton key={i} />
          ))}
        </div>
      </div>

      {/* Playlists skeleton */}
      <div>
        <Skeleton h="h-6" w="w-40" className="mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CourseCardSkeleton key={i} compact />
          ))}
        </div>
      </div>
    </div>
  );
}
