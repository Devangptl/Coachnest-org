/**
 * Quiz History loading skeleton — header + stats row + quiz cards with attempt rows.
 */
import { Skeleton } from "@/components/ui/Skeleton";

function StatSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg p-6 flex items-center gap-4 animate-pulse">
      <Skeleton className="w-12 h-12 rounded-md" />
      <div className="space-y-2">
        <Skeleton h="h-7" w="w-12" />
        <Skeleton h="h-4" w="w-24" />
      </div>
    </div>
  );
}

function QuizCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-4 animate-pulse">
      {/* Quiz header */}
      <div className="flex items-start gap-4">
        <Skeleton className="w-14 h-14 rounded-md flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton h="h-4" w="w-2/5" />
          <Skeleton h="h-3" w="w-1/4" />
          <Skeleton h="h-3" w="w-1/3" />
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <Skeleton className="h-10 w-14 rounded-lg" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>

      {/* Attempt rows */}
      <div className="border-t border-white/[0.06] pt-3 space-y-2">
        <Skeleton h="h-3" w="w-24" className="mb-2" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2 bg-white/[0.02] rounded-lg">
            <Skeleton className="w-5 h-3 rounded" />
            <Skeleton className="w-3.5 h-3.5 rounded-full flex-shrink-0" />
            <Skeleton className="w-12 h-4 rounded" />
            <Skeleton className="flex-1 h-1.5 rounded-full" />
            <Skeleton className="w-12 h-3 rounded flex-shrink-0" />
            <Skeleton className="w-16 h-3 rounded flex-shrink-0" />
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
      <div className="mb-8 animate-pulse">
        <Skeleton className="h-9 w-40 rounded-md mb-2" />
        <Skeleton className="h-4 w-72 rounded-lg" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatSkeleton key={i} />
        ))}
      </div>

      {/* Quiz cards */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <QuizCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
