/** Org instructor → My Courses skeleton — heading + New Course button + course list. */
import { HeadingSkeleton, Skeleton, ListItemSkeleton } from "@/components/ui/Skeleton";

export default function OrgInstructorCoursesLoading() {
  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <HeadingSkeleton />
        <Skeleton h="h-9" w="w-32" className="rounded-md" />
      </div>
      <ListItemSkeleton rows={6} />
    </div>
  );
}
