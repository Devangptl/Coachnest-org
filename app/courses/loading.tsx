/**
 * /courses catalog loading skeleton with shimmer effect.
 */
import { Skeleton } from "@/components/ui/Skeleton";

export default function CoursesLoading() {
  return (
    <div className="pb-16">
      {/* Header */}
      <div className="mb-10 animate-pulse">
        <Skeleton className="h-10 w-52 rounded-md mb-3" />
        <Skeleton className="h-4 w-72 rounded-lg" />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-8 animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-24 rounded-md" />
        ))}
      </div>

      {/* Course grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-lg overflow-hidden animate-pulse"
          >
            <Skeleton className="h-44 w-full rounded-none" />
            <div className="p-5 space-y-3">
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton h="h-5" w="w-4/5" />
              <Skeleton h="h-3" w="w-full" />
              <Skeleton h="h-3" w="w-2/3" />
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-1">
                  <Skeleton h="h-3" w="w-8" />
                  <Skeleton h="h-3" w="w-3" />
                </div>
                <Skeleton h="h-5" w="w-14" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
