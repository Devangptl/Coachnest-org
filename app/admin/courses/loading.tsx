/**
 * Admin Courses loading skeleton — header with button + table rows.
 */
import { Skeleton } from "@/components/ui/Skeleton";

export default function CoursesLoading() {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8 animate-pulse">
        <div>
          <Skeleton className="h-9 w-28 rounded-xl mb-2" />
          <Skeleton className="h-4 w-32 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg animate-pulse">
        {/* Table header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-2 border-b border-border">
          <Skeleton className="col-span-5 h-3 w-16 rounded" />
          <Skeleton className="col-span-2 h-3 w-14 rounded mx-auto" />
          <Skeleton className="col-span-2 h-3 w-16 rounded mx-auto" />
          <Skeleton className="col-span-1 h-3 w-12 rounded mx-auto" />
          <Skeleton className="col-span-2 h-3 w-14 rounded ml-auto" />
        </div>

        {/* Table rows */}
        <div className="divide-y divide-white/5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="grid grid-cols-12 gap-4 px-4 py-4 items-center">
              <div className="col-span-5 space-y-1.5">
                <Skeleton h="h-4" w="w-4/5" />
                <Skeleton h="h-3" w="w-1/3" />
              </div>
              <Skeleton className="col-span-2 h-4 w-8 rounded mx-auto" />
              <Skeleton className="col-span-2 h-4 w-8 rounded mx-auto" />
              <Skeleton className="col-span-1 h-6 w-12 rounded-full mx-auto" />
              <div className="col-span-2 flex justify-end gap-2">
                <Skeleton className="h-6 w-10 rounded-lg" />
                <Skeleton className="h-6 w-10 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
