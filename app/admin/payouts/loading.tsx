/**
 * Admin Payouts loading skeleton — header + 4 stats + filter tabs + table.
 */
import { Skeleton } from "@/components/ui/Skeleton";

export default function PayoutsAdminLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 animate-pulse">
        <Skeleton className="w-10 h-10 rounded-md flex-shrink-0" />
        <div className="space-y-1.5">
          <Skeleton className="h-9 w-48 rounded-md" />
          <Skeleton className="h-4 w-64 rounded-lg" />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-lg p-6 flex items-center gap-3 animate-pulse"
          >
            <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton h="h-5" w="w-20" />
              <Skeleton h="h-3" w="w-24" />
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg animate-pulse">
        <div className="divide-y divide-border/40">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton h="h-4" w="w-32" />
                <Skeleton h="h-3" w="w-48" />
              </div>
              <Skeleton h="h-4" w="w-20" />
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
