/**
 * Admin Quizzes loading skeleton — header with button + 3 stats + grouped quiz tables.
 */
import { Skeleton } from "@/components/ui/Skeleton";

function QuizGroupSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg animate-pulse">
      <div className="px-4 py-3 border-b border-border">
        <Skeleton h="h-5" w="w-48" className="mb-1" />
        <Skeleton h="h-3" w="w-20" />
      </div>
      {/* Column headers */}
      <div className="grid grid-cols-12 gap-4 px-4 py-2 border-b border-white/5">
        <Skeleton className="col-span-3 h-3 w-20 rounded" />
        <Skeleton className="col-span-1 h-3 w-16 rounded" />
        <Skeleton className="col-span-1 h-3 w-16 rounded" />
        <Skeleton className="col-span-1 h-3 w-14 rounded" />
        <Skeleton className="col-span-1 h-3 w-16 rounded" />
        <Skeleton className="col-span-1 h-3 w-16 rounded" />
        <Skeleton className="col-span-4 h-3 w-14 rounded ml-auto" />
      </div>
      {/* Rows */}
      <div className="divide-y divide-white/5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="grid grid-cols-12 gap-4 px-4 py-3 items-center">
            <div className="col-span-3 space-y-1">
              <Skeleton h="h-4" w="w-3/4" />
              <Skeleton h="h-3" w="w-1/2" />
            </div>
            <Skeleton className="col-span-1 h-4 w-8 rounded" />
            <Skeleton className="col-span-1 h-4 w-10 rounded" />
            <Skeleton className="col-span-1 h-4 w-8 rounded" />
            <Skeleton className="col-span-1 h-4 w-10 rounded" />
            <Skeleton className="col-span-1 h-4 w-10 rounded" />
            <div className="col-span-4 flex justify-end gap-2">
              <Skeleton className="h-7 w-12 rounded-lg" />
              <Skeleton className="h-7 w-14 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function QuizzesLoading() {
  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between animate-pulse">
        <div>
          <Skeleton className="h-9 w-56 rounded-md mb-2" />
          <Skeleton className="h-4 w-80 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-lg p-6 flex items-center gap-4 animate-pulse"
          >
            <Skeleton className="w-12 h-12 rounded-md" />
            <div className="space-y-2">
              <Skeleton h="h-8" w="w-14" />
              <Skeleton h="h-4" w="w-24" />
            </div>
          </div>
        ))}
      </div>

      {/* Grouped quiz tables */}
      <div className="space-y-6">
        <QuizGroupSkeleton />
        <QuizGroupSkeleton />
      </div>
    </div>
  );
}
