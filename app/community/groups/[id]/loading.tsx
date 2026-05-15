import { Skeleton } from "@/components/ui/Skeleton";

export default function GroupDetailLoading() {
  return (
    <div className="py-6 sm:py-8 space-y-5 sm:space-y-6">
      <Skeleton className="h-5 w-32 rounded-md" />

      {/* Header */}
      <div className="rounded-md border border-border bg-card p-4 sm:p-6 animate-pulse space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
          <div className="flex-1 space-y-3 min-w-0">
            <Skeleton h="h-7" w="w-1/2" />
            <Skeleton h="h-3" w="w-2/3" />
            <div className="flex gap-3 pt-2">
              <Skeleton h="h-4" w="w-20" />
              <Skeleton h="h-4" w="w-24" />
            </div>
          </div>
          <Skeleton className="h-9 w-full sm:w-28 rounded-md flex-shrink-0" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 flex-shrink-0 rounded-md" />
        ))}
      </div>

      {/* Content */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-md border border-border bg-card p-3 sm:p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton h="h-3" w="w-1/3" />
                <Skeleton h="h-3" w="w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
