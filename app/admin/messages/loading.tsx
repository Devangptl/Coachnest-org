/**
 * /admin/messages/loading — Skeleton loader for messages list
 */
import { Skeleton } from "@/components/ui/Skeleton";

export default function AdminMessagesLoading() {
  return (
    <div>
      {/* Header */}
      <div className="mb-8 animate-pulse">
        <div className="flex items-center gap-3 mb-2">
          <Skeleton className="w-10 h-10 rounded-md" />
          <Skeleton className="h-8 w-40 rounded-lg" />
        </div>
        <Skeleton className="h-4 w-32 rounded-lg mt-1.5" />
      </div>

      {/* Tabs + Search */}
      <div className="flex gap-4 mb-6 animate-pulse">
        <div className="flex gap-1 bg-card border border-border rounded-lg p-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-16 rounded-md" />
          ))}
        </div>
        <Skeleton className="h-10 flex-1 max-w-md rounded-lg" />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg animate-pulse">
        <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 border-b border-border">
          <Skeleton className="col-span-3 h-3 w-16 rounded" />
          <Skeleton className="col-span-3 h-3 w-16 rounded" />
          <Skeleton className="col-span-2 h-3 w-12 rounded" />
          <Skeleton className="col-span-2 h-3 w-16 rounded" />
          <Skeleton className="col-span-2 h-3 w-12 rounded ml-auto" />
        </div>
        <div className="divide-y divide-border/40">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="grid grid-cols-12 gap-4 items-center px-5 py-4">
              <div className="col-span-3 space-y-1.5">
                <Skeleton h="h-4" w="w-28" />
                <Skeleton h="h-3" w="w-36" />
              </div>
              <div className="col-span-3 space-y-1.5">
                <Skeleton h="h-4" w="w-32" />
                <Skeleton h="h-3" w="w-40" />
              </div>
              <div className="col-span-2">
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="col-span-2">
                <Skeleton h="h-4" w="w-14" />
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                <Skeleton className="h-7 w-14 rounded-lg" />
                <Skeleton className="h-7 w-8 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
