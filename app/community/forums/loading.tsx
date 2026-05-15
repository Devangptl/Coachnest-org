import { HeadingSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { ThreadListSkeleton } from "@/components/community/CommunitySkeletons";

export default function ForumsLoading() {
  return (
    <div className="py-6 sm:py-8 space-y-5 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <HeadingSkeleton />
        <Skeleton className="h-10 w-full sm:w-32 rounded-lg" />
      </div>
      {/* Toolbar: search + sort + saved */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 w-full sm:w-40 rounded-lg" />
        <Skeleton className="h-10 w-full sm:w-24 rounded-lg" />
      </div>
      <ThreadListSkeleton rows={6} />
    </div>
  );
}
