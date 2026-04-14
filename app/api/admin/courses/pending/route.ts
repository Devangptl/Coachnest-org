/**
 * GET /api/admin/courses/pending
 * Returns all free courses submitted by instructors that are awaiting admin approval.
 * Sorted oldest-first so admins process them in FIFO order.
 *
 * Access: ADMIN only
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const courses = await prisma.course.findMany({
      where: {
        status: "PENDING_REVIEW",
        isFree: true,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true, avatar: true } },
        category:  { select: { name: true, slug: true } },
        _count:    { select: { lessons: true } },
      },
      orderBy: { createdAt: "asc" }, // FIFO review queue
    });

    return NextResponse.json({ courses, total: courses.length });
  } catch (err) {
    console.error("[GET /api/admin/courses/pending]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
