"use client";

import ClassDiscussions from "@/components/class/ClassDiscussions";

export default function DiscussionTab({
  classId,
  currentUserId,
}: {
  classId: string;
  currentUserId?: string;
}) {
  // Instructor view uses the same component as students — server enforces
  // staff-only fields (pin / mark-as-answer on others' questions).
  return <ClassDiscussions classId={classId} isStaff currentUserId={currentUserId} />;
}
