/** Org instructor → Students skeleton — heading + enrollment table. */
import { HeadingSkeleton, TableSkeleton } from "@/components/ui/Skeleton";

export default function OrgInstructorStudentsLoading() {
  return (
    <div>
      <HeadingSkeleton className="mb-6" />
      <TableSkeleton rows={8} title={false} />
    </div>
  );
}
