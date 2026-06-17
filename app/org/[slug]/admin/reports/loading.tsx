/** Reports skeleton — header + 5 headline stat cards + enrollment chart + completion table. */
import { HeadingSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function OrgReportsLoading() {
  return (
    <div>
      <HeadingSkeleton className="mb-6" />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse space-y-3">
            <Skeleton h="h-3" w="w-24" />
            <Skeleton h="h-7" w="w-12" />
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-5 mb-6 animate-pulse">
        <Skeleton h="h-4" w="w-48" className="mb-4" />
        <Skeleton h="h-56" w="w-full" />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden animate-pulse">
        <div className="px-5 py-4 border-b border-border">
          <Skeleton h="h-4" w="w-40" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-5 py-3 flex items-center gap-4">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton h="h-4" w="w-1/3" />
                <Skeleton h="h-3" w="w-1/4" />
              </div>
              <div className="flex items-center gap-3 w-40">
                <Skeleton h="h-1.5" className="flex-1 rounded-full" />
                <Skeleton h="h-3" w="w-9" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
