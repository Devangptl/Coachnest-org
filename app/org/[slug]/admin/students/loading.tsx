/** Students skeleton — header + search/add bar + member table (no stat tiles). */
import { HeadingSkeleton, Skeleton, TableSkeleton } from "@/components/ui/Skeleton";

export default function OrgStudentsLoading() {
  return (
    <div>
      <HeadingSkeleton className="mb-6" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 animate-pulse">
        <Skeleton h="h-9" className="w-full max-w-xs" />
        <Skeleton h="h-9" w="w-36" />
      </div>
      <TableSkeleton rows={8} title={false} />
    </div>
  );
}
