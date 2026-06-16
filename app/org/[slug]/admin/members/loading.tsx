/** Members skeleton — header + member table. */
import { HeadingSkeleton, TableSkeleton } from "@/components/ui/Skeleton";

export default function OrgMembersLoading() {
  return (
    <div>
      <HeadingSkeleton className="mb-6" />
      <TableSkeleton rows={8} />
    </div>
  );
}
