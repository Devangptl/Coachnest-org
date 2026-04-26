/**
 * Certificates loading skeleton — header + table-style row placeholders.
 */
import { Skeleton } from "@/components/ui/Skeleton";

function CertificateRowSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-center px-5 py-4 animate-pulse">
      {/* Course */}
      <div className="col-span-6 flex items-center gap-3 min-w-0">
        <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
        <Skeleton h="h-4" w="w-2/3" />
      </div>
      {/* Date */}
      <div className="col-span-2">
        <Skeleton h="h-3.5" w="w-24" />
      </div>
      {/* ID */}
      <div className="col-span-2">
        <Skeleton h="h-3" w="w-20" />
      </div>
      {/* Action */}
      <div className="col-span-2 flex justify-end">
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>
    </div>
  );
}

export default function CertificatesLoading() {
  return (
    <div>
      {/* Header */}
      <div className="mb-8 animate-pulse">
        <Skeleton className="h-9 w-48 rounded-md mb-2" />
        <Skeleton className="h-4 w-36 rounded-lg" />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-md overflow-hidden">
        {/* Header row */}
        <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 border-b border-border animate-pulse">
          <Skeleton h="h-3" w="w-20" className="col-span-6" />
          <Skeleton h="h-3" w="w-16" className="col-span-2" />
          <Skeleton h="h-3" w="w-24" className="col-span-2" />
          <Skeleton h="h-3" w="w-16" className="col-span-2 ml-auto" />
        </div>
        {/* Rows */}
        <div className="divide-y divide-border/50">
          {Array.from({ length: 4 }).map((_, i) => (
            <CertificateRowSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
