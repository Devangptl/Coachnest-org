/** Org student portal skeleton — heading + enrolled course grid. */
import { HeadingSkeleton, CourseGridSkeleton } from "@/components/ui/Skeleton";

export default function OrgStudentLoading() {
  return (
    <div>
      <HeadingSkeleton className="mb-6" />
      <CourseGridSkeleton count={6} compact />
    </div>
  );
}
