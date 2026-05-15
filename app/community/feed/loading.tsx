import { HeadingSkeleton, FeedItemSkeleton } from "@/components/ui/Skeleton";

export default function FeedLoading() {
  return (
    <div className="py-5 space-y-8">
      <HeadingSkeleton />
      <FeedItemSkeleton rows={10} />
    </div>
  );
}
