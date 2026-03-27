/**
 * Certificates loading skeleton — header + certificate row list.
 */
import { Skeleton } from "@/components/ui/Skeleton";

function CertificateRowSkeleton() {
  return (
    <div className="backdrop-blur-lg bg-white/10 border border-white/20 rounded-2xl p-6 flex items-center gap-4 animate-pulse">
      <Skeleton className="w-14 h-14 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton h="h-5" w="w-1/3" />
        <Skeleton h="h-3" w="w-1/4" />
      </div>
      <Skeleton className="h-9 w-28 rounded-lg flex-shrink-0" />
    </div>
  );
}

export default function CertificatesLoading() {
  return (
    <div>
      {/* Header */}
      <div className="mb-8 animate-pulse">
        <Skeleton className="h-9 w-48 rounded-xl mb-2" />
        <Skeleton className="h-4 w-36 rounded-lg" />
      </div>

      {/* Certificate rows */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <CertificateRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
