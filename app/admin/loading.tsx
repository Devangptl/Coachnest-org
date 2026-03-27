/**
 * Admin overview loading skeleton — header + 4 stats + quick actions + recent courses table.
 */
import { Skeleton } from "@/components/ui/Skeleton";

export default function AdminLoading() {
  return (
    <div>
      {/* Header */}
      <div className="mb-8 animate-pulse">
        <Skeleton className="h-9 w-44 rounded-xl mb-2" />
        <Skeleton className="h-4 w-64 rounded-lg" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-lg p-6 flex items-center gap-4 animate-pulse"
          >
            <Skeleton className="w-12 h-12 rounded-xl" />
            <div className="space-y-2">
              <Skeleton h="h-8" w="w-16" />
              <Skeleton h="h-4" w="w-24" />
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex gap-3 mb-10 animate-pulse">
        <Skeleton className="h-10 w-32 rounded-lg" />
        <Skeleton className="h-10 w-40 rounded-lg" />
      </div>

      {/* Recent courses table */}
      <div className="bg-card border border-border rounded-lg animate-pulse">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <Skeleton h="h-5" w="w-36" />
          <Skeleton h="h-4" w="w-16" />
        </div>
        <div className="divide-y divide-white/5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <div className="flex-1 space-y-1.5">
                <Skeleton h="h-4" w="w-3/5" />
                <Skeleton h="h-3" w="w-2/5" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-12 rounded-full" />
                <Skeleton h="h-4" w="w-8" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
