/** Activity log skeleton — header + divided list of recent actions. */
import { HeadingSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function OrgAuditLoading() {
  return (
    <div>
      <HeadingSkeleton className="mb-6" />
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="divide-y divide-border">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="px-5 py-3 flex items-start gap-3 animate-pulse">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton h="h-3.5" w="w-2/5" />
                <Skeleton h="h-3" w="w-1/4" />
              </div>
              <Skeleton h="h-3" w="w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
