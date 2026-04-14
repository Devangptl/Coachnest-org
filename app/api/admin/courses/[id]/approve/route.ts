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
      select: { id: true, title: true, status: true, isFree: true, createdById: true },
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

    // Notify the instructor
    await prisma.notification.create({
      data: {
        userId: course.createdById,
        title:  `Your course "${course.title}" has been approved!`,
        body:   "Your free course has passed admin review and is now live on the platform.",
        type:   "SYSTEM",
        link:   `/instructor/courses/${course.id}`,
      },
    });

    return NextResponse.json({ course: updated });
  } catch (err) {
    console.error("[POST /api/admin/courses/[id]/approve]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
