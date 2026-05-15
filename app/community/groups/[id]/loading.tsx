import { Skeleton } from "@/components/ui/Skeleton";

export default function GroupDetailLoading() {
  return (
    <div className="py-8 space-y-6">
      <Skeleton className="h-5 w-32 rounded-md" />

      {/* Header */}
      <div className="rounded-md border border-border bg-card p-6 animate-pulse space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <Skeleton h="h-7" w="w-1/2" />
            <Skeleton h="h-3" w="w-2/3" />
            <div className="flex gap-3 pt-2">
              <Skeleton h="h-4" w="w-20" />
              <Skeleton h="h-4" w="w-24" />
            </div>
          </div>
          <Skeleton className="h-9 w-28 rounded-md flex-shrink-0" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-t-md" />
        ))}
      </div>

      {/* Content */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-md border border-border bg-card p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
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
