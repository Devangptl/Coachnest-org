/**
 * Admin Professions loading skeleton — header + profession list rows.
 */
import { Skeleton } from "@/components/ui/Skeleton";

export default function ProfessionsLoading() {
  return (
    <div>
      {/* Header */}
      <div className="mb-8 animate-pulse">
        <Skeleton className="h-9 w-40 rounded-md mb-2" />
        <Skeleton className="h-4 w-96 rounded-lg" />
      </div>

      {/* Profession rows */}
      <div className="bg-card border border-border rounded-lg animate-pulse">
        {/* Table header */}
        <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-border">
          <Skeleton className="col-span-4 h-3 w-20 rounded" />
          <Skeleton className="col-span-3 h-3 w-16 rounded" />
          <Skeleton className="col-span-2 h-3 w-12 rounded" />
          <Skeleton className="col-span-1 h-3 w-12 rounded" />
          <Skeleton className="col-span-2 h-3 w-14 rounded ml-auto" />
        </div>

        {/* Rows */}
        <div className="divide-y divide-border/40">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="grid grid-cols-12 gap-4 items-center px-5 py-4">
              {/* Icon + name */}
              <div className="col-span-4 flex items-center gap-3">
                <Skeleton className="w-9 h-9 rounded-lg flex-shrink-0" />
                <div className="space-y-1.5">
                  <Skeleton h="h-4" w="w-28" />
                  <Skeleton h="h-3" w="w-40" />
                </div>
              </div>
              {/* Keywords */}
              <div className="col-span-3 flex gap-1.5">
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              {/* Users */}
              <Skeleton className="col-span-2 h-4 w-10 rounded" />
              {/* Status */}
              <Skeleton className="col-span-1 h-6 w-12 rounded-full" />
              {/* Actions */}
              <div className="col-span-2 flex justify-end gap-2">
                <Skeleton className="h-8 w-14 rounded-lg" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
