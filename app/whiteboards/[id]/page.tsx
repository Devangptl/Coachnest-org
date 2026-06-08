import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { resolveWhiteboardRole } from "@/lib/whiteboard/permissions";
import { getWhiteboardForUser } from "@/services/whiteboard.service";
import WhiteboardClient from "./WhiteboardClient";
import type { WhiteboardDTO } from "@/types/whiteboard";

export const dynamic = "force-dynamic";

export default async function WhiteboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect(`/login?next=/whiteboards/${id}`);

  const board = await getWhiteboardForUser(id);
  if (!board) notFound();

  const role = await resolveWhiteboardRole(session, {
    ownerId: board.ownerId,
    defaultRole: board.defaultRole,
    classId: board.classId,
    courseId: board.courseId,
    lessonId: board.lessonId,
    assignmentId: board.assignmentId,
    studyGroupId: board.studyGroupId,
    collaborators: board.collaborators.map((c) => ({ userId: c.userId, role: c.role })),
  });
  if (!role) notFound();

  const dto: WhiteboardDTO = {
    id: board.id,
    title: board.title,
    scope: board.scope,
    defaultRole: board.defaultRole,
    ownerId: board.ownerId,
    classId: board.classId,
    courseId: board.courseId,
    lessonId: board.lessonId,
    assignmentId: board.assignmentId,
    studyGroupId: board.studyGroupId,
    pages: board.pages.map((p) => ({
      id: p.id,
      title: p.title,
      order: p.order,
      appState: (p.appState as Record<string, unknown> | null) ?? null,
    })),
    collaborators: board.collaborators.map((c) => ({
      id: c.id,
      userId: c.userId,
      role: c.role,
      user: { id: c.user.id, name: c.user.name, avatar: c.user.avatar },
    })),
  };

  return (
    <WhiteboardClient
      board={dto}
      role={role}
      currentUser={{ userId: session.userId, name: session.name, avatar: session.avatar ?? null }}
    />
  );
}
