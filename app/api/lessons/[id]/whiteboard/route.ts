/**
 * GET /api/lessons/[id]/whiteboard?mode=personal|shared
 *
 * Resolves (creating if needed) a whiteboard for the lesson learning view:
 *   - personal → the caller's private per-lesson scratchpad (owned by them)
 *   - shared   → one collaborative board per lesson, owned by the instructor
 *
 * Access requires course enrollment, course ownership/collaboration, ADMIN, or
 * a free lesson.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateContextWhiteboard } from "@/services/whiteboard.service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { id: lessonId } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const mode =
    new URL(req.url).searchParams.get("mode") === "shared" ? "shared" : "personal";

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      title: true,
      isFree: true,
      courseId: true,
      course: {
        select: {
          title: true,
          createdById: true,
          collaborators: { where: { userId: session.userId }, select: { userId: true } },
        },
      },
    },
  });
  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

  const isInstructor = lesson.course.createdById === session.userId;
  const isCollaborator = lesson.course.collaborators.length > 0;
  const isAdmin = session.role === "ADMIN";
  let allowed = isInstructor || isCollaborator || isAdmin || lesson.isFree;
  if (!allowed) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: session.userId, courseId: lesson.courseId } },
      select: { id: true },
    });
    allowed = !!enrollment;
  }
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const board =
    mode === "shared"
      ? await getOrCreateContextWhiteboard({
          scope: "LESSON",
          ownerId: lesson.course.createdById,
          lessonId,
          courseId: lesson.courseId,
          defaultRole: "EDITOR",
          title: `${lesson.title} — Class board`,
        })
      : await getOrCreateContextWhiteboard({
          scope: "STUDENT_NOTE",
          ownerId: session.userId,
          lessonId,
          matchOwner: true,
          title: `${lesson.title} — My notes`,
        });

  return NextResponse.json({ whiteboardId: board.id });
}
