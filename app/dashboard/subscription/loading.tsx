import { HeadingSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function SubscriptionLoading() {
  return (
    <div className="space-y-8">
      <HeadingSkeleton />

      {/* Active features panel */}
      <div className="bg-card border border-border rounded-md p-5 animate-pulse space-y-4">
        <Skeleton h="h-5" w="w-40" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-md bg-secondary/30">
              <Skeleton className="w-9 h-9 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton h="h-3" w="w-1/3" />
                <Skeleton h="h-2" w="w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Enrollment list */}
      <div className="bg-card border border-border rounded-md overflow-hidden">
        <div className="px-5 py-4 border-b border-border animate-pulse">
          <Skeleton h="h-5" w="w-44" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-5 py-4 flex items-center gap-4 animate-pulse">
              <Skeleton className="h-12 w-16 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton h="h-3" w="w-1/2" />
                <Skeleton h="h-2" w="w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
