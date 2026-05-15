import { HeadingSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function ClassesLoading() {
  return (
    <div className="space-y-6">
      <HeadingSkeleton />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-md overflow-hidden animate-pulse">
            <Skeleton className="h-32 w-full rounded-none" />
            <div className="p-4 space-y-3">
              <Skeleton h="h-4" w="w-4/5" />
              <Skeleton h="h-3" w="w-1/2" />
              <div className="flex items-center gap-2 pt-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton h="h-3" w="w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
