import { HeadingSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function BillingLoading() {
  return (
    <div className="space-y-8">
      <HeadingSkeleton />

      {/* Summary tiles */}
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="glass rounded-md border border-border p-4 animate-pulse space-y-2">
            <Skeleton h="h-3" w="w-24" />
            <Skeleton h="h-7" w="w-16" />
          </div>
        ))}
      </div>

      {/* Payment methods */}
      <div className="glass rounded-md border border-border p-5 animate-pulse space-y-4">
        <Skeleton h="h-5" w="w-40" />
        <Skeleton className="h-16 w-full rounded-md" />
      </div>

      {/* Order history */}
      <div className="glass rounded-md border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border animate-pulse">
          <Skeleton h="h-5" w="w-32" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-5 py-3.5 flex items-center gap-4 animate-pulse">
              <Skeleton className="w-4 h-4 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton h="h-3" w="w-1/2" />
                <Skeleton h="h-2" w="w-1/4" />
              </div>
              <div className="text-right space-y-2">
                <Skeleton h="h-3" w="w-16" />
                <Skeleton h="h-2" w="w-10" className="ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
