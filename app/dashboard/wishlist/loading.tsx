/**
 * Wishlist loading skeleton — header + course card grid.
 */
import { Skeleton, CourseCardSkeleton } from "@/components/ui/Skeleton";

export default function WishlistLoading() {
  return (
    <div>
      {/* Header */}
      <div className="mb-8 animate-pulse">
        <Skeleton className="h-9 w-40 rounded-md mb-2" />
        <Skeleton className="h-4 w-32 rounded-lg" />
      </div>

      {/* Course grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <CourseCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
