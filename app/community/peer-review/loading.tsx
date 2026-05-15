import { HeadingSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { AssignmentListSkeleton } from "@/components/community/CommunitySkeletons";

export default function PeerReviewLoading() {
  return (
    <div className="py-6 sm:py-8 space-y-5 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <HeadingSkeleton />
        <Skeleton className="h-10 w-full sm:w-32 rounded-lg" />
      </div>
      {/* Tabs: My Submissions / Review Queue */}
      <div className="flex gap-1 p-1 bg-secondary rounded-lg w-full sm:w-fit">
        <Skeleton className="h-8 flex-1 sm:w-32 rounded-md" />
        <Skeleton className="h-8 flex-1 sm:w-32 rounded-md" />
      </div>
      <AssignmentListSkeleton rows={5} />
    </div>
  );
}
