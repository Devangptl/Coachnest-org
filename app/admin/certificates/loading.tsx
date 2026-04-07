/**
 * Admin Certificates loading skeleton — header + search + table with column headers.
 */
import { Skeleton } from "@/components/ui/Skeleton";

export default function CertificatesLoading() {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8 animate-pulse">
        <div>
          <Skeleton className="h-9 w-36 rounded-md mb-2" />
          <Skeleton className="h-4 w-40 rounded-lg" />
        </div>
      </div>

      {/* Search */}
      <div className="mb-6 animate-pulse">
        <Skeleton className="h-10 w-72 rounded-md" />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg animate-pulse">
        {/* Column headers */}
        <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 border-b border-border">
          <Skeleton className="col-span-4 h-3 w-14 rounded" />
          <Skeleton className="col-span-4 h-3 w-12 rounded" />
          <Skeleton className="col-span-2 h-3 w-12 rounded" />
          <Skeleton className="col-span-2 h-3 w-12 rounded ml-auto" />
        </div>

        {/* Rows */}
        <div className="divide-y divide-white/[0.04]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="grid grid-cols-12 gap-4 items-center px-5 py-4">
              {/* Student */}
              <div className="col-span-4 flex items-center gap-3">
                <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
                <div className="space-y-1.5">
                  <Skeleton h="h-4" w="w-28" />
                  <Skeleton h="h-3" w="w-36" />
                </div>
              </div>
              {/* Course */}
              <div className="col-span-4 flex items-center gap-3">
                <Skeleton className="w-9 h-9 rounded-lg flex-shrink-0" />
                <Skeleton h="h-4" w="w-32" />
              </div>
              {/* Date */}
              <Skeleton className="col-span-2 h-4 w-20 rounded" />
              {/* Action */}
              <div className="col-span-2 flex justify-end">
                <Skeleton className="h-8 w-24 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
