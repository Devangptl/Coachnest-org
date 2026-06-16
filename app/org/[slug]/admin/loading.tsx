/**
 * Default org admin skeleton — shown while any admin page without its own
 * loading.tsx fetches data. Header + stat tiles + table covers the dashboard
 * and most list pages.
 */
import { HeadingSkeleton, StatCardSkeleton, TableSkeleton } from "@/components/ui/Skeleton";

export default function OrgAdminLoading() {
  return (
    <div>
      <HeadingSkeleton className="mb-8" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <TableSkeleton rows={6} />
    </div>
  );
}
