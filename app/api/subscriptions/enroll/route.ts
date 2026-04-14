/**
 * POST /api/subscriptions/enroll
 *
 * This endpoint previously enrolled subscribers in courses without payment.
 * The platform has moved to a direct-purchase model for students.
 *
 * Students: use POST /api/payments/create-order to purchase a course,
 *           or POST /api/enrollments for free courses.
 *
 * Instructors / Admins with an active plan subscription can still use
 * POST /api/enrollments directly (no payment required for their own courses).
 *
 * Returns 410 Gone for students; passes through for instructor/admin.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Students must purchase courses — no subscription-based enrollment
  if (session.role === "STUDENT") {
    return NextResponse.json(
      {
        error:
          "Subscription enrollment is no longer available. " +
          "Purchase the course directly at /api/payments/create-order, " +
          "or enroll in a free course at /api/enrollments.",
        code: "SUBSCRIPTION_MODEL_REMOVED",
        purchaseUrl: "/api/payments/create-order",
        freeEnrollUrl: "/api/enrollments",
      },
      { status: 410 }
    );
  }

  // Instructors and Admins — allow direct enrollment (no payment required)
  const body     = await req.json().catch(() => ({}));
  const { courseId } = body as { courseId?: string };
  if (!courseId) {
    return NextResponse.json({ error: "courseId is required" }, { status: 400 });
  }

  const course = await prisma.course.findUnique({
    where:  { id: courseId },
    select: { id: true, status: true },
  });
  if (!course || course.status === "ARCHIVED") {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const enrollment = await prisma.enrollment.upsert({
    where:  { userId_courseId: { userId: session.userId, courseId } },
    create: { userId: session.userId, courseId },
    update: {},
  });

  return NextResponse.json({ success: true, enrollment });
}
