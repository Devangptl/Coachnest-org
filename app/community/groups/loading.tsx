import { HeadingSkeleton, CardGridSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function GroupsLoading() {
  return (
    <div className="py-6 sm:py-8 space-y-5 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <HeadingSkeleton />
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1 sm:w-36 sm:flex-initial rounded-md" />
          <Skeleton className="h-10 flex-1 sm:w-36 sm:flex-initial rounded-md" />
        </div>
      </div>
      <Skeleton className="h-10 w-full rounded-lg" />
      <CardGridSkeleton count={6} />
    </div>
  );
}
