/**
 * Organizations list loading skeleton — header + search/filter toolbar + orgs table.
 */
import { Skeleton, HeadingSkeleton, TableSkeleton } from "@/components/ui/Skeleton";

export default function AdminOrganizationsLoading() {
  return (
    <div>
      <HeadingSkeleton className="mb-6" />

      {/* Search / status filter / quick links toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5 animate-pulse">
        <Skeleton h="h-10" className="flex-1 max-w-xs rounded-lg" />
        <Skeleton h="h-10" w="w-40" className="rounded-lg" />
        <div className="flex gap-2 sm:ml-auto">
          <Skeleton h="h-10" w="w-28" className="rounded-lg" />
          <Skeleton h="h-10" w="w-24" className="rounded-lg" />
        </div>
      </div>

      <TableSkeleton rows={8} title={false} />
    </div>
  );
}
