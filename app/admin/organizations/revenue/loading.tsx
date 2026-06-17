/**
 * Organization revenue loading skeleton — header + 4 stat cards + monthly bar chart
 * + two-column revenue-by-org / plan breakdown lists + course usage list.
 */
import { Skeleton, HeadingSkeleton } from "@/components/ui/Skeleton";

function ListCard({ rows = 4 }: { rows?: number }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden animate-pulse">
      <div className="px-5 py-4 border-b border-border">
        <Skeleton h="h-4" w="w-44" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-5 py-3 flex items-center gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton h="h-4" w="w-1/2" />
              <Skeleton h="h-3" w="w-1/4" />
            </div>
            <Skeleton h="h-4" w="w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminOrgRevenueLoading() {
  return (
    <div>
      <HeadingSkeleton className="mb-6" />

      <div className="space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
              <Skeleton h="h-3" w="w-28" className="mb-3" />
              <Skeleton h="h-6" w="w-20" />
            </div>
          ))}
        </div>

        {/* Monthly revenue chart */}
        <div className="bg-card border border-border rounded-xl p-5 animate-pulse">
          <Skeleton h="h-4" w="w-56" className="mb-4" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>

        {/* Revenue by org + plan breakdown */}
        <div className="grid lg:grid-cols-2 gap-6">
          <ListCard rows={4} />
          <ListCard rows={4} />
        </div>

        {/* Course usage */}
        <ListCard rows={5} />
      </div>
    </div>
  );
}
