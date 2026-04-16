/**
 * Admin Refunds loading skeleton — header + 5 stat cards + filter tabs + table.
 */
import { Skeleton } from "@/components/ui/Skeleton";

export default function RefundsLoading() {
  return (
    <div>
      {/* Header */}
      <div className="mb-8 animate-pulse">
        <Skeleton className="h-9 w-48 rounded-md mb-2" />
        <Skeleton className="h-4 w-96 rounded-lg" />
      </div>

      {/* Stat cards — one per status */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-lg p-4 flex items-center gap-3 animate-pulse"
          >
            <Skeleton className="w-9 h-9 rounded-md flex-shrink-0" />
            <div className="space-y-1.5">
              <Skeleton h="h-6" w="w-10" />
              <Skeleton h="h-3" w="w-16" />
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs + search */}
      <div className="flex flex-wrap items-center gap-3 mb-6 animate-pulse">
        <div className="flex gap-1.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-9 w-56 rounded-md ml-auto" />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg animate-pulse">
        {/* Column headers */}
        <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 border-b border-border">
          <Skeleton className="col-span-3 h-3 w-16 rounded" />
          <Skeleton className="col-span-2 h-3 w-12 rounded" />
          <Skeleton className="col-span-2 h-3 w-16 rounded" />
          <Skeleton className="col-span-1 h-3 w-14 rounded" />
          <Skeleton className="col-span-1 h-3 w-10 rounded" />
          <Skeleton className="col-span-3 h-3 w-14 rounded ml-auto" />
        </div>

        {/* Rows */}
        <div className="divide-y divide-border/40">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="grid grid-cols-12 gap-4 items-center px-5 py-4">
              {/* Student */}
              <div className="col-span-3 flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                <div className="space-y-1.5">
                  <Skeleton h="h-4" w="w-24" />
                  <Skeleton h="h-3" w="w-32" />
                </div>
              </div>
              {/* Course */}
              <Skeleton className="col-span-2 h-4 w-28 rounded" />
              {/* Amounts */}
              <div className="col-span-2 space-y-1.5">
                <Skeleton h="h-4" w="w-16" />
                <Skeleton h="h-3" w="w-20" />
              </div>
              {/* Progress */}
              <Skeleton className="col-span-1 h-4 w-10 rounded" />
              {/* Status */}
              <Skeleton className="col-span-1 h-6 w-20 rounded-full" />
              {/* Actions */}
              <div className="col-span-3 flex justify-end gap-2">
                <Skeleton className="h-8 w-20 rounded-lg" />
                <Skeleton className="h-8 w-20 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
