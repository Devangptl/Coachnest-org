/** Billing skeleton — header + current-plan summary card + billing-history table. */
import { HeadingSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function OrgBillingLoading() {
  return (
    <div>
      <HeadingSkeleton className="mb-6" />
      <div className="space-y-6">
        <div className="bg-card border border-border rounded-xl p-5 animate-pulse">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-2">
              <Skeleton h="h-3" w="w-24" />
              <Skeleton h="h-8" w="w-48" />
              <Skeleton h="h-4" w="w-40" />
            </div>
            <div className="flex gap-2">
              <Skeleton h="h-9" w="w-24" />
              <Skeleton h="h-9" w="w-28" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden animate-pulse">
          <div className="px-5 py-4 border-b border-border">
            <Skeleton h="h-4" w="w-32" />
          </div>
          <div className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-5 py-3 flex items-center gap-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton h="h-4" w="w-28" />
                  <Skeleton h="h-3" w="w-24" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton h="h-4" w="w-16" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
