import {
  HeadingSkeleton,
  SectionHeadingSkeleton,
  CardGridSkeleton,
  FeedItemSkeleton,
  Skeleton,
} from "@/components/ui/Skeleton";
import { ThreadListSkeleton } from "@/components/community/CommunitySkeletons";

export default function CommunityLoading() {
  return (
    <div className="py-4 sm:py-5 space-y-6 sm:space-y-10">
      <HeadingSkeleton />

      {/* Quick Links Grid */}
      <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-md border border-border p-4 sm:p-5 bg-card animate-pulse">
            <div className="flex items-start gap-3 sm:gap-4">
              <Skeleton className="w-10 h-10 rounded-md flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton h="h-4" w="w-1/2" />
                <Skeleton h="h-3" w="w-full" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Popular Threads */}
      <section>
        <SectionHeadingSkeleton />
        <ThreadListSkeleton rows={4} />
      </section>

      {/* Active Study Groups */}
      <section>
        <SectionHeadingSkeleton />
        <CardGridSkeleton count={4} />
      </section>

      {/* Recent Activity */}
      <section>
        <SectionHeadingSkeleton />
        <FeedItemSkeleton rows={5} />
      </section>
    </div>
  );
}
