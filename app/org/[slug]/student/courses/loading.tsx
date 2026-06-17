/** Org student → Course Catalog skeleton — heading + enrollable course grid. */
import { HeadingSkeleton, CourseGridSkeleton } from "@/components/ui/Skeleton";

export default function OrgStudentCatalogLoading() {
  return (
    <div>
      <HeadingSkeleton className="mb-6" />
      <CourseGridSkeleton count={6} />
    </div>
  );
}
