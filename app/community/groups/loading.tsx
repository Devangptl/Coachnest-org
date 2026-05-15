import { HeadingSkeleton, CardGridSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function GroupsLoading() {
  return (
    <div className="py-5 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <HeadingSkeleton />
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>
      <CardGridSkeleton count={6} />
    </div>
  );
}
