/** Roles & permissions skeleton — header + role cards + permission matrix. */
import { HeadingSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function OrgRolesLoading() {
  return (
    <div>
      <HeadingSkeleton className="mb-6" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse space-y-2">
            <Skeleton h="h-4" w="w-1/3" />
            <Skeleton h="h-3" w="w-full" />
            <Skeleton h="h-3" w="w-2/3" />
          </div>
        ))}
      </div>
      <div className="bg-card border border-border rounded-xl p-4 animate-pulse">
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton h="h-3.5" w="w-40" />
              <div className="flex-1 flex justify-end gap-6">
                {Array.from({ length: 6 }).map((_, j) => (
                  <Skeleton key={j} className="h-4 w-4 rounded" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
