import { Skeleton, CourseCardSkeleton } from "@/components/ui/Skeleton";

export default function InstructorLoading() {
  return (
    <div className="pt-5 pb-16">
      <Skeleton h="h-4" w="w-32" className="mb-4" />

      {/* Header */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="h-28 sm:h-40 bg-secondary/40 border-b border-border" />
        <div className="px-5 sm:px-8 pb-7">
          <div className="flex flex-col sm:flex-row sm:items-end gap-5 -mt-12 sm:-mt-14">
            <Skeleton className="w-24 h-24 sm:w-28 sm:h-28 rounded-full ring-4 ring-card flex-shrink-0" />
            <div className="flex-1 space-y-2.5 sm:pb-1">
              <Skeleton h="h-7" w="w-52" />
              <Skeleton h="h-4" w="w-72" />
            </div>
            <div className="flex gap-2.5 sm:pb-1">
              <Skeleton h="h-8" w="w-28" />
              <Skeleton h="h-8" w="w-24" />
            </div>
          </div>
          <div className="mt-7 pt-6 border-t border-border space-y-2">
            <Skeleton h="h-3" w="w-full" />
            <Skeleton h="h-3" w="w-4/5" />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card px-4 py-4 flex items-center gap-3.5"
          >
            <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
            <div className="space-y-2">
              <Skeleton h="h-5" w="w-12" />
              <Skeleton h="h-3" w="w-16" />
            </div>
          </div>
        ))}
      </div>

      {/* Courses */}
      <div className="mt-10">
        <Skeleton h="h-6" w="w-40" className="mb-5" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CourseCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
