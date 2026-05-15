/**
 * Community Hub — page shell that streams each section through its own
 * Suspense boundary. The header (with access status) and the three list
 * sections (threads, groups, activity) fetch in parallel and pop in
 * independently. Users see the shell + skeletons immediately.
 */
import { Suspense } from "react";
import {
  CommunityHeader,
  PopularThreadsSection,
  ActiveGroupsSection,
  RecentActivitySection,
} from "./_sections";
import {
  Skeleton,
  ListItemSkeleton,
  CardGridSkeleton,
  FeedItemSkeleton,
  SectionHeadingSkeleton,
} from "@/components/ui/Skeleton";

function HeaderSkeleton() {
  return (
    <>
      <div className="animate-pulse space-y-3">
        <Skeleton h="h-8" w="w-56" />
        <Skeleton h="h-3" w="w-96" />
      </div>
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
    </>
  );
}

function ThreadsSkeleton() {
  return (
    <section>
      <SectionHeadingSkeleton />
      <ListItemSkeleton rows={5} />
    </section>
  );
}

function GroupsSkeleton() {
  return (
    <section>
      <SectionHeadingSkeleton />
      <CardGridSkeleton count={4} />
    </section>
  );
}

function ActivitySkeleton() {
  return (
    <section>
      <SectionHeadingSkeleton />
      <FeedItemSkeleton rows={5} />
    </section>
  );
}

export default function CommunityHubPage() {
  return (
    <div className="py-4 sm:py-5 space-y-6 sm:space-y-10">
      <Suspense fallback={<HeaderSkeleton />}>
        <CommunityHeader />
      </Suspense>

      <Suspense fallback={<ThreadsSkeleton />}>
        <PopularThreadsSection />
      </Suspense>

      <Suspense fallback={<GroupsSkeleton />}>
        <ActiveGroupsSection />
      </Suspense>

      <Suspense fallback={<ActivitySkeleton />}>
        <RecentActivitySection />
      </Suspense>
    </div>
  );
}
