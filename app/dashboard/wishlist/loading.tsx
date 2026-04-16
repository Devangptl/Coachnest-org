/**
 * Wishlist loading skeleton — header + list of course rows.
 */
import { Skeleton } from "@/components/ui/Skeleton";

export default function WishlistLoading() {
  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Skeleton className="h-9 w-40 rounded-md mb-2" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Course list rows */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex gap-4 p-4 bg-card border border-border rounded-lg"
          >
            {/* Thumbnail */}
            <Skeleton className="w-36 h-24 flex-shrink-0 rounded-md" />

            {/* Content */}
            <div className="flex-1 py-0.5 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-5 w-16 shrink-0" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-4 w-16 rounded" />
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
