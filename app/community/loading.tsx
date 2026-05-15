import {
  HeadingSkeleton,
  SectionHeadingSkeleton,
  CardGridSkeleton,
  ListItemSkeleton,
  FeedItemSkeleton,
  Skeleton,
} from "@/components/ui/Skeleton";

export default function CommunityLoading() {
  return (
    <div className="py-5 space-y-10">
      <HeadingSkeleton />

      {/* Quick Links Grid */}
      <div className="grid sm:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-md border border-border p-5 bg-card animate-pulse">
            <div className="flex items-start gap-4">
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
        <ListItemSkeleton rows={5} />
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
