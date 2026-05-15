import { HeadingSkeleton, CardGridSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function PeerReviewLoading() {
  return (
    <div className="py-6 sm:py-8 space-y-5 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <HeadingSkeleton />
        <Skeleton className="h-10 w-full sm:w-32 rounded-md" />
      </div>
      <Skeleton className="h-10 w-full sm:w-72 rounded-lg" />
      <CardGridSkeleton count={6} />
    </div>
  );
}
