/** Settings skeleton — header + organization profile form card (label + input rows). */
import { HeadingSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function OrgSettingsLoading() {
  return (
    <div>
      <HeadingSkeleton className="mb-6" />
      <div className="bg-card border border-border rounded-xl p-6 max-w-xl space-y-4 animate-pulse">
        <div className="space-y-2">
          <Skeleton h="h-3.5" w="w-36" />
          <Skeleton h="h-10" w="w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton h="h-3.5" w="w-28" />
          <Skeleton h="h-10" w="w-full" />
          <Skeleton h="h-3" w="w-3/4" />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton h="h-3.5" w="w-24" />
            <Skeleton h="h-10" w="w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton h="h-3.5" w="w-16" />
            <Skeleton h="h-10" w="w-full" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton h="h-3.5" w="w-20" />
          <Skeleton h="h-10" w="w-full" />
        </div>
        <Skeleton h="h-9" w="w-36" />
      </div>
    </div>
  );
}
