import { HeadingSkeleton, FeedItemSkeleton } from "@/components/ui/Skeleton";

export default function FeedLoading() {
  return (
    <div className="py-6 sm:py-8 space-y-5 sm:space-y-6">
      <HeadingSkeleton />
      <FeedItemSkeleton rows={10} />
    </div>
  );
}
