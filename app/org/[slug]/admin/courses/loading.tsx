/** Courses skeleton — header + New Course action + course list (no stat tiles). */
import { Skeleton } from "@/components/ui/Skeleton";

export default function OrgCoursesLoading() {
  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6 animate-pulse">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48 rounded-md" />
          <Skeleton h="h-3" w="w-72" />
        </div>
        <Skeleton h="h-9" w="w-32" />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden animate-pulse">
        <div className="divide-y divide-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="px-5 py-3.5 flex items-center gap-4">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton h="h-4" w="w-1/3" />
                <Skeleton h="h-3" w="w-1/2" />
              </div>
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton h="h-4" w="w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
