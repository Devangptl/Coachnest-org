/**
 * Whiteboard access resolution.
 *
 * A user's effective role is the strongest of:
 *   1. platform ADMIN / board owner            → OWNER (full access)
 *   2. an explicit WhiteboardCollaborator row   → its role
 *   3. their relationship to the attached LMS context (class host, course
 *      instructor, group creator → OWNER/EDITOR; enrolled member → defaultRole)
 *
 * Returns null when the user has no path to the board (→ 404 / redirect).
 */
import "server-only";
import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/auth";
import type { WhiteboardRole, WhiteboardScope } from "@/types/whiteboard";

export interface WhiteboardAccessContext {
  ownerId: string;
  scope: WhiteboardScope;
  defaultRole: WhiteboardRole;
  classId: string | null;
  courseId: string | null;
  lessonId: string | null;
  assignmentId: string | null;
  studyGroupId: string | null;
  collaborators: { userId: string; role: WhiteboardRole }[];
}

const RANK: Record<WhiteboardRole, number> = { VIEWER: 0, EDITOR: 1, OWNER: 2 };

export function canView(role: WhiteboardRole | null): boolean {
  return role !== null;
}
export function canEdit(role: WhiteboardRole | null): boolean {
  return role === "EDITOR" || role === "OWNER";
}
export function canManage(role: WhiteboardRole | null): boolean {
  return role === "OWNER";
}

function stronger(a: WhiteboardRole | null, b: WhiteboardRole | null): WhiteboardRole | null {
  if (a === null) return b;
  if (b === null) return a;
  return RANK[a] >= RANK[b] ? a : b;
}

export async function resolveWhiteboardRole(
  session: SessionPayload | null,
  wb: WhiteboardAccessContext,
): Promise<WhiteboardRole | null> {
  if (!session) return null;
  if (session.role === "ADMIN") return "OWNER";
  if (session.userId === wb.ownerId) return "OWNER";

  const explicit = wb.collaborators.find((c) => c.userId === session.userId);
  let role: WhiteboardRole | null = explicit?.role ?? null;

  // Personal note boards are private: access only via ownership / explicit
  // collaborators, never inherited from the surrounding course/class.
  if (wb.scope === "STUDENT_NOTE") return role;

  const contextRole = await resolveContextRole(session.userId, wb);
  role = stronger(role, contextRole);

  return role;
}

async function resolveContextRole(
  userId: string,
  wb: WhiteboardAccessContext,
): Promise<WhiteboardRole | null> {
  // Resolve a classId either directly or via an attached assignment.
  let classId = wb.classId;
  if (!classId && wb.assignmentId) {
    const a = await prisma.assignment.findUnique({
      where: { id: wb.assignmentId },
      select: { classId: true },
    });
    classId = a?.classId ?? null;
  }
  if (classId) {
    const cls = await prisma.class.findUnique({
      where: { id: classId },
      select: { instructorId: true },
    });
    if (cls?.instructorId === userId) return "OWNER";
    const assistant = await prisma.classAssistant.findUnique({
      where: { classId_userId: { classId, userId } },
      select: { id: true },
    });
    if (assistant) return "EDITOR";
    const enr = await prisma.classEnrollment.findUnique({
      where: { classId_userId: { classId, userId } },
      select: { status: true },
    });
    if (enr && enr.status === "APPROVED") return wb.defaultRole;
  }

  // Resolve a courseId directly or via an attached lesson.
  let courseId = wb.courseId;
  if (!courseId && wb.lessonId) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: wb.lessonId },
      select: { courseId: true },
    });
    courseId = lesson?.courseId ?? null;
  }
  if (courseId) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        createdById: true,
        collaborators: { where: { userId }, select: { role: true } },
      },
    });
    if (course?.createdById === userId) return "OWNER";
    if (course?.collaborators.length) return "EDITOR";
    const enrolled = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { id: true },
    });
    if (enrolled) return wb.defaultRole;
  }

  if (wb.studyGroupId) {
    const group = await prisma.studyGroup.findUnique({
      where: { id: wb.studyGroupId },
      select: {
        createdById: true,
        members: { where: { userId }, select: { userId: true } },
      },
    });
    if (group?.createdById === userId) return "OWNER";
    if (group?.members.length) return wb.defaultRole;
  }

  return null;
}
