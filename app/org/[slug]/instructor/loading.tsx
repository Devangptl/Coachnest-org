/** Org instructor portal skeleton — heading + stats + course grid. */
import { HeadingSkeleton, StatCardSkeleton, CourseGridSkeleton } from "@/components/ui/Skeleton";

export default function OrgInstructorLoading() {
  return (
    <div>
      <HeadingSkeleton className="mb-6" />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <CourseGridSkeleton count={6} compact />
    </div>
  );
}
