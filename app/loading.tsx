/**
 * Global loading fallback — shown while any route segment without its own
 * loading.tsx fetches data. The persistent Navbar/Footer shell stays mounted;
 * this fills the content area with a neutral skeleton.
 */
import { HeadingSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function RootLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <HeadingSkeleton className="mb-8" />
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse space-y-3">
            <Skeleton h="h-4" w="w-1/3" />
            <Skeleton h="h-3" w="w-full" />
            <Skeleton h="h-3" w="w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
