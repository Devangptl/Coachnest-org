/**
 * GET /api/me/course-access/[courseId]
 * Returns the current user's enrollment status and completed lesson IDs for a course.
 * Called client-side from the prerendered lesson page.
 *
 * Response:
 *   { isEnrolled: boolean, completedLessonIds: string[] }
 *   { isEnrolled: false, completedLessonIds: [] }  — when not authenticated
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ isEnrolled: false, completedLessonIds: [] });
  }

  const isAdminOrInstructor = session.role === "ADMIN" || session.role === "INSTRUCTOR";

  const [enrollment, completedRows] = await Promise.all([
    prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: session.userId, courseId } },
      select: { userId: true },
    }),
    prisma.lessonProgress.findMany({
      where: { userId: session.userId, completed: true, lesson: { courseId } },
      select: { lessonId: true },
    }),
  ]);

  return NextResponse.json({
    isEnrolled: Boolean(enrollment) || isAdminOrInstructor,
    completedLessonIds: completedRows.map((r) => r.lessonId),
  });
}
