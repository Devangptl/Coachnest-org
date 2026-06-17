/**
 * Subscription plans loading skeleton — header + "New Plan" action + 3-col plan card grid.
 */
import { Skeleton, HeadingSkeleton } from "@/components/ui/Skeleton";

export default function AdminSubscriptionPlansLoading() {
  return (
    <div>
      <HeadingSkeleton className="mb-6" />

      {/* New Plan button */}
      <div className="flex justify-end mb-5 animate-pulse">
        <Skeleton h="h-10" w="w-32" className="rounded-lg" />
      </div>

      {/* Plan cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-xl p-5 flex flex-col animate-pulse"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-2">
                <Skeleton h="h-5" w="w-28" />
                <Skeleton h="h-3" w="w-20" />
              </div>
              <div className="flex gap-1">
                <Skeleton className="h-7 w-7 rounded-lg" />
                <Skeleton className="h-7 w-7 rounded-lg" />
              </div>
            </div>
            <Skeleton h="h-6" w="w-40" className="mt-3" />
            <Skeleton h="h-3" w="w-3/4" className="mt-3" />
            <Skeleton h="h-3" w="w-2/3" className="mt-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
