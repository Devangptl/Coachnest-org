/**
 * Analytics loading skeleton — header + 4 stats + chart tabs + top courses + recent orders.
 */
import { Skeleton } from "@/components/ui/Skeleton";

export default function AnalyticsLoading() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-pulse">
        <Skeleton className="h-9 w-32 rounded-xl mb-2" />
        <Skeleton className="h-4 w-48 rounded-lg" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="backdrop-blur-lg bg-white/10 border border-white/20 rounded-2xl p-6 flex items-center gap-4 animate-pulse"
          >
            <Skeleton className="w-11 h-11 rounded-xl" />
            <div className="space-y-2">
              <Skeleton h="h-7" w="w-20" />
              <Skeleton h="h-3" w="w-24" />
            </div>
          </div>
        ))}
      </div>

      {/* Charts area (tabs) */}
      <div className="backdrop-blur-lg bg-white/10 border border-white/20 rounded-2xl p-6 animate-pulse">
        <div className="flex gap-3 mb-6">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>

      {/* Bottom row: Top Courses + Recent Orders */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Courses */}
        <div className="backdrop-blur-lg bg-white/10 border border-white/20 rounded-2xl p-6 animate-pulse">
          <Skeleton h="h-5" w="w-28" className="mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton h="h-4" w="w-3/4" />
                  <Skeleton h="h-3" w="w-1/2" />
                </div>
                <Skeleton h="h-5" w="w-14" />
              </div>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="backdrop-blur-lg bg-white/10 border border-white/20 rounded-2xl p-6 animate-pulse">
          <Skeleton h="h-5" w="w-32" className="mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton h="h-4" w="w-2/3" />
                  <Skeleton h="h-3" w="w-1/3" />
                </div>
                <Skeleton h="h-5" w="w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
