/**
 * Organization detail loading skeleton — back link + title/action row,
 * two-column subscriptions/members cards, transactions list, courses list.
 */
import { Skeleton } from "@/components/ui/Skeleton";

function ListCard({ rows = 4 }: { rows?: number }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden animate-pulse">
      <div className="px-5 py-4 border-b border-border">
        <Skeleton h="h-4" w="w-32" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-5 py-3 flex items-center gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton h="h-4" w="w-2/5" />
              <Skeleton h="h-3" w="w-1/4" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton h="h-4" w="w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminOrgDetailLoading() {
  return (
    <div>
      {/* Back link */}
      <Skeleton h="h-4" w="w-40" className="mb-6 animate-pulse" />

      {/* Title + status badge + action button */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 animate-pulse">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-56 rounded-md" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton h="h-3" w="w-64" />
        </div>
        <Skeleton h="h-10" w="w-28" className="rounded-lg" />
      </div>

      {/* Subscriptions + Members */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <ListCard rows={2} />
        <ListCard rows={5} />
      </div>

      {/* Transactions */}
      <div className="mb-6">
        <ListCard rows={4} />
      </div>

      {/* Courses */}
      <ListCard rows={3} />
    </div>
  );
}
