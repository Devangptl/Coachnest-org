import { Skeleton } from "@/components/ui/Skeleton";

export default function PeerReviewDetailLoading() {
  return (
    <div className="py-8 space-y-6">
      <Skeleton className="h-5 w-40 rounded-md" />

      <div className="rounded-md border border-border bg-card p-6 animate-pulse space-y-3">
        <Skeleton h="h-7" w="w-2/3" />
        <Skeleton h="h-3" w="w-full" />
        <Skeleton h="h-3" w="w-5/6" />
      </div>

      <div className="space-y-3">
        <Skeleton h="h-4" w="w-40" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-md border border-border bg-card p-5 animate-pulse space-y-2">
            <Skeleton h="h-3" w="w-1/4" />
            <Skeleton h="h-3" w="w-full" />
            <Skeleton h="h-3" w="w-4/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
