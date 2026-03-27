/**
 * Order History loading skeleton — header + 2 summary stats + order rows.
 */
import { Skeleton } from "@/components/ui/Skeleton";

function OrderRowSkeleton() {
  return (
    <div className="backdrop-blur-lg bg-white/10 border border-white/20 rounded-2xl p-6 flex items-center gap-4 animate-pulse">
      {/* Thumbnail */}
      <Skeleton className="w-16 h-16 rounded-xl flex-shrink-0" />

      {/* Info */}
      <div className="flex-1 space-y-2">
        <Skeleton h="h-4" w="w-2/5" />
        <div className="flex gap-3">
          <Skeleton h="h-3" w="w-20" />
          <Skeleton h="h-3" w="w-24" />
        </div>
      </div>

      {/* Amount & Status */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <Skeleton className="h-6 w-16 rounded-lg" />
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="w-4 h-4 rounded" />
      </div>
    </div>
  );
}

export default function OrdersLoading() {
  return (
    <div>
      {/* Header */}
      <div className="mb-8 animate-pulse">
        <Skeleton className="h-9 w-40 rounded-xl mb-2" />
        <Skeleton className="h-4 w-64 rounded-lg" />
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="backdrop-blur-lg bg-white/10 border border-white/20 rounded-2xl p-6 flex items-center gap-4 animate-pulse"
          >
            <Skeleton className="w-12 h-12 rounded-xl" />
            <div className="space-y-2">
              <Skeleton h="h-7" w="w-20" />
              <Skeleton h="h-4" w="w-24" />
            </div>
          </div>
        ))}
      </div>

      {/* Order rows */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <OrderRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
