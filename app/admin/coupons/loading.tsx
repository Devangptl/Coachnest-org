/**
 * Admin Coupons loading skeleton — header with button + 3 stats + coupon table.
 */
import { Skeleton } from "@/components/ui/Skeleton";

export default function CouponsLoading() {
  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between animate-pulse">
        <div>
          <Skeleton className="h-9 w-56 rounded-md mb-2" />
          <Skeleton className="h-4 w-72 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-lg p-6 flex items-center gap-4 animate-pulse"
          >
            <Skeleton className="w-12 h-12 rounded-md" />
            <div className="space-y-2">
              <Skeleton h="h-8" w="w-16" />
              <Skeleton h="h-4" w="w-24" />
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg animate-pulse">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <Skeleton h="h-5" w="w-24" />
          <Skeleton h="h-4" w="w-16" />
        </div>
        <div className="divide-y divide-white/5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="h-8 w-24 rounded-lg font-mono" />
              <div className="flex-1 space-y-1.5">
                <Skeleton h="h-4" w="w-1/4" />
                <Skeleton h="h-3" w="w-1/3" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton h="h-4" w="w-16" />
              <Skeleton className="h-7 w-14 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
