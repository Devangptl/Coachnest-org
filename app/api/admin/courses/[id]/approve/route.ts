/**
 * POST /api/admin/courses/[id]/approve
 * Approves a free course that is pending review and publishes it.
 * The instructor receives an in-app notification.
 *
 * Access: ADMIN only
 *
 * Response:
 *   200 { course }
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyCourseInstructors } from "@/lib/notifications";
import { sendCourseApprovedEmail } from "@/lib/email";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await params;

    const course = await prisma.course.findUnique({
      where: { id },
      select: {
        id: true, title: true, status: true, isFree: true, createdById: true,
        createdBy: { select: { name: true, email: true } },
      },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    if (course.status !== "PENDING_REVIEW") {
      return NextResponse.json(
        { error: `Course is not pending review (current status: ${course.status}).` },
        { status: 400 }
      );
    }

    const updated = await prisma.course.update({
      where: { id },
      data: { status: "PUBLISHED" },
    });

    // In-app notification — owner + all collaborators on the teaching team.
    await notifyCourseInstructors({
      courseId: course.id,
      title:  `Your course "${course.title}" has been approved!`,
      body:   "Your course has passed admin review and is now live on the platform.",
      type:   "COURSE_UPDATE",
      link:   `/instructor/courses/${course.id}/edit`,
    });

    // Email the instructor (fire-and-forget)
    if (course.createdBy?.email) {
      sendCourseApprovedEmail(
        course.createdBy.email,
        course.createdBy.name ?? "Instructor",
        course.title,
        course.id,
      ).catch(() => null);
    }

    return NextResponse.json({ course: updated });
  } catch (err) {
    console.error("[POST /api/admin/courses/[id]/approve]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
