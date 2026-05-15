import { HeadingSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function AchievementsLoading() {
  return (
    <div className="space-y-8">
      <HeadingSkeleton />

      {/* XP + Streak panels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-md p-5 animate-pulse space-y-3">
            <Skeleton h="h-4" w="w-32" />
            <Skeleton h="h-8" w="w-24" />
            <Skeleton h="h-2" w="w-full" />
          </div>
        ))}
      </div>

      {/* Badge grid */}
      <section>
        <div className="flex items-center justify-between mb-4 animate-pulse">
          <Skeleton h="h-5" w="w-32" />
          <Skeleton h="h-4" w="w-20" />
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-md p-3 flex flex-col items-center gap-2 animate-pulse">
              <Skeleton className="w-12 h-12 rounded-full" />
              <Skeleton h="h-3" w="w-16" />
            </div>
          ))}
        </div>
      </section>

      {/* Leaderboard */}
      <section>
        <Skeleton h="h-5" w="w-32" className="mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-3 bg-card border border-border rounded-md animate-pulse">
              <Skeleton h="h-4" w="w-6" />
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton h="h-3" w="w-1/3" />
                <Skeleton h="h-2" w="w-1/4" />
              </div>
              <Skeleton h="h-4" w="w-16" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
