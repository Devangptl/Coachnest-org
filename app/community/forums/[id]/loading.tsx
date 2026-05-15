import { Skeleton } from "@/components/ui/Skeleton";

export default function ForumThreadLoading() {
  return (
    <div className="py-6 sm:py-8 space-y-5 sm:space-y-6">
      <Skeleton className="h-5 w-32 rounded-md" />

      {/* Thread card */}
      <div className="rounded-md border border-border bg-card p-4 sm:p-6 animate-pulse space-y-3">
        <Skeleton h="h-7" w="w-2/3" />
        <div className="space-y-2">
          <Skeleton h="h-3" w="w-full" />
          <Skeleton h="h-3" w="w-full" />
          <Skeleton h="h-3" w="w-3/4" />
        </div>
        <div className="flex items-center gap-3 pt-4 border-t border-border">
          <Skeleton className="w-8 h-8 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton h="h-3" w="w-32" />
            <Skeleton h="h-2" w="w-24" />
          </div>
        </div>
      </div>

      {/* Replies */}
      <div className="space-y-3">
        <Skeleton h="h-4" w="w-32" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-md border border-border bg-card p-3 sm:p-5 animate-pulse">
            <div className="flex gap-2 sm:gap-3">
              <div className="flex flex-col items-center gap-1 pt-1">
                <Skeleton className="w-5 h-5 rounded" />
                <Skeleton h="h-3" w="w-4" />
                <Skeleton className="w-5 h-5 rounded" />
              </div>
              <div className="flex-1 space-y-2">
                <Skeleton h="h-3" w="w-full" />
                <Skeleton h="h-3" w="w-5/6" />
                <Skeleton h="h-3" w="w-1/3" className="mt-3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
