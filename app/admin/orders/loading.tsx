/**
 * Admin Orders loading skeleton — header + 4 stats + filters + table with column headers.
 */
import { Skeleton } from "@/components/ui/Skeleton";

export default function OrdersLoading() {
  return (
    <div>
      {/* Header */}
      <div className="mb-8 animate-pulse">
        <Skeleton className="h-9 w-48 rounded-md mb-2" />
        <Skeleton className="h-4 w-72 rounded-lg" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-lg p-6 flex items-center gap-4 animate-pulse"
          >
            <Skeleton className="w-12 h-12 rounded-md" />
            <div className="space-y-2">
              <Skeleton h="h-7" w="w-20" />
              <Skeleton h="h-4" w="w-24" />
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-8 animate-pulse">
        <div className="flex gap-3">
          <Skeleton className="h-10 w-48 rounded-md" />
          <Skeleton className="h-10 w-32 rounded-md" />
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg animate-pulse">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <Skeleton h="h-5" w="w-24" />
          <Skeleton h="h-4" w="w-16" />
        </div>
        {/* Column headers */}
        <div className="grid grid-cols-12 gap-4 px-4 py-2 border-b border-white/5">
          <Skeleton className="col-span-2 h-3 w-16 rounded" />
          <Skeleton className="col-span-2 h-3 w-14 rounded" />
          <Skeleton className="col-span-2 h-3 w-12 rounded" />
          <Skeleton className="col-span-1 h-3 w-14 rounded" />
          <Skeleton className="col-span-1 h-3 w-12 rounded" />
          <Skeleton className="col-span-1 h-3 w-10 rounded" />
          <Skeleton className="col-span-3 h-3 w-14 rounded ml-auto" />
        </div>
        {/* Rows */}
        <div className="divide-y divide-white/5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="grid grid-cols-12 gap-4 px-4 py-3 items-center">
              <Skeleton className="col-span-2 h-4 w-20 rounded" />
              <div className="col-span-2 space-y-1">
                <Skeleton h="h-4" w="w-24" />
                <Skeleton h="h-3" w="w-32" />
              </div>
              <Skeleton className="col-span-2 h-4 w-28 rounded" />
              <Skeleton className="col-span-1 h-4 w-14 rounded" />
              <Skeleton className="col-span-1 h-6 w-14 rounded-full" />
              <Skeleton className="col-span-1 h-3 w-16 rounded" />
              <div className="col-span-3 flex justify-end gap-2">
                <Skeleton className="h-7 w-16 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
