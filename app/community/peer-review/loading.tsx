import { HeadingSkeleton, CardGridSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function PeerReviewLoading() {
  return (
    <div className="py-5 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <HeadingSkeleton />
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
      <CardGridSkeleton count={6} />
    </div>
  );
}
