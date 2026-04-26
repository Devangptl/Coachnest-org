/**
 * Certificates loading skeleton — header + full-preview placeholders that
 * match the redesigned dashboard layout.
 */
import { Skeleton } from "@/components/ui/Skeleton";

function CertificatePreviewSkeleton() {
  return (
    <div className="space-y-3">
      <div className="relative w-full aspect-[1.414/1] bg-card border border-border rounded-lg overflow-hidden animate-pulse">
        {/* Brand mark */}
        <div className="absolute top-[5%] left-[5%] flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-md flex-shrink-0" />
          <div className="space-y-1.5">
            <Skeleton h="h-3" w="w-14" />
            <Skeleton h="h-3" w="w-12" />
          </div>
        </div>
        {/* Title */}
        <div className="absolute top-[26%] left-[5%] right-[24%] space-y-2">
          <Skeleton className="h-7 w-2/3 rounded-md" />
        </div>
        {/* Body */}
        <div className="absolute top-[42%] left-[5%] right-[26%] space-y-3">
          <Skeleton h="h-3" w="w-24" />
          <Skeleton className="h-7 w-1/2 rounded-md" />
          <div className="pt-2 space-y-2">
            <Skeleton h="h-3" w="w-48" />
            <Skeleton className="h-5 w-2/3 rounded-md" />
            <Skeleton h="h-3" w="w-40" />
          </div>
        </div>
        {/* Signature */}
        <div className="absolute bottom-[7%] left-[5%] space-y-1.5">
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton h="h-3" w="w-28" />
        </div>
        {/* Ribbon */}
        <div className="absolute top-0 right-[18%] w-[7%] min-w-[36px] max-w-[72px] h-[58%]">
          <Skeleton className="w-full h-full rounded-none" />
        </div>
        {/* QR */}
        <div className="absolute bottom-[7%] right-[5%]">
          <Skeleton className="w-[clamp(48px,7vw,84px)] aspect-square" />
        </div>
      </div>

      {/* Footer row: meta + button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 animate-pulse">
        <Skeleton h="h-3" w="w-56" />
        <Skeleton className="h-9 w-32 rounded-md" />
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

      {/* Certificate previews */}
      <div className="space-y-8">
        {Array.from({ length: 2 }).map((_, i) => (
          <CertificatePreviewSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
