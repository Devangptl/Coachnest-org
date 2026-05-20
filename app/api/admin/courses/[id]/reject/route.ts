/**
 * POST /api/admin/courses/[id]/reject
 * Rejects a free course pending review and reverts it to DRAFT.
 * The instructor receives an in-app notification with the rejection reason.
 *
 * Access: ADMIN only
 *
 * Request body:
 *   { reason?: string }   — optional human-readable rejection reason shown to instructor
 *
 * Response:
 *   200 { course }
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { sendCourseRejectedEmail } from "@/lib/email";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const reason: string = body.reason?.trim() || "The course did not meet our content guidelines.";

    const course = await prisma.course.findUnique({
      where: { id },
      select: {
        id: true, title: true, status: true, createdById: true,
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

    // Revert to DRAFT so the instructor can edit and resubmit
    const updated = await prisma.course.update({
      where: { id },
      data: { status: "DRAFT" },
    });

    // In-app notification
    await createNotification({
      data: {
        userId: course.createdById,
        title:  `Your course "${course.title}" was not approved`,
        body:   `Reason: ${reason}. You can edit the course and resubmit for review.`,
        type:   "SYSTEM",
        link:   `/instructor/courses/${course.id}`,
      },
    });

    // Email the instructor (fire-and-forget)
    if (course.createdBy?.email) {
      sendCourseRejectedEmail(
        course.createdBy.email,
        course.createdBy.name ?? "Instructor",
        course.title,
        course.id,
        reason,
      ).catch(() => null);
    }

    return NextResponse.json({ course: updated });
  } catch (err) {
    console.error("[POST /api/admin/courses/[id]/reject]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
