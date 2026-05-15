import { HeadingSkeleton, StatCardSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function ProgressLoading() {
  return (
    <div className="space-y-8">
      <HeadingSkeleton />

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Chart placeholder */}
      <div className="bg-card border border-border rounded-md p-5 animate-pulse">
        <Skeleton h="h-5" w="w-40" className="mb-4" />
        <Skeleton className="h-64 w-full rounded-md" />
      </div>

      {/* Per-course breakdown */}
      <div className="space-y-3">
        <Skeleton h="h-5" w="w-48" className="animate-pulse" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-md p-4 animate-pulse space-y-3">
            <div className="flex items-center justify-between gap-4">
              <Skeleton h="h-4" w="w-1/3" />
              <Skeleton h="h-3" w="w-12" />
            </div>
            <Skeleton h="h-2" w="w-full" className="rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
