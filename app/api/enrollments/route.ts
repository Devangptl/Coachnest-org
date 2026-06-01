/**
 * POST /api/enrollments        — enroll the current student in a course
 * GET  /api/enrollments        — list enrolled courses for current student
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sendFreeEnrollmentEmail } from "@/lib/email";
import { notifyCourseInstructors } from "@/lib/notifications";

// ─── GET — list my enrollments ────────────────────────────────────────────────
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { userId: session.userId },
      include: {
        course: {
          include: {
            lessons: { select: { id: true } },
          },
        },
      },
      orderBy: { enrolledAt: "desc" },
    });

    // For each enrollment, attach the student's completed lesson count
    const data = await Promise.all(
      enrollments.map(async (e) => {
        const completedCount = await prisma.lessonProgress.count({
          where: {
            userId: session.userId,
            lessonId: { in: e.course.lessons.map((l) => l.id) },
            completed: true,
          },
        });
        const totalLessons = e.course.lessons.length;

        return {
          ...e,
          progress:
            totalLessons > 0
              ? Math.round((completedCount / totalLessons) * 100)
              : 0,
        };
      })
    );

    return NextResponse.json({ enrollments: data });
  } catch (error) {
    console.error("[GET /api/enrollments]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// ─── POST — enroll ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (session.role !== "STUDENT") {
      return NextResponse.json(
        { error: "Only students can enroll in courses." },
        { status: 403 }
      );
    }

    const { courseId } = await req.json();
    if (!courseId) {
      return NextResponse.json({ error: "courseId is required." }, { status: 400 });
    }

    // Verify user exists (session may reference a deleted user after DB reset)
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, name: true, email: true },
    });
    if (!user) {
      return NextResponse.json(
        { error: "User not found. Please log out and log back in." },
        { status: 401 }
      );
    }

    // Verify the course exists and is published
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.status !== "PUBLISHED") {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    // Paid courses require a completed purchase before enrollment is allowed
    const isPaid = !course.isFree && course.price && Number(course.price) > 0;
    if (isPaid) {
      const paidOrder = await prisma.order.findFirst({
        where: { userId: session.userId, courseId, status: "PAID" },
        select: { id: true },
      });
      if (!paidOrder) {
        return NextResponse.json(
          {
            error: "Please purchase this course before enrolling.",
            code: "PAYMENT_REQUIRED",
          },
          { status: 402 }
        );
      }
    }

    // Detect existing enrollment before upsert so we only email on first enroll
    const alreadyEnrolled = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: session.userId, courseId } },
      select: { id: true },
    });

    const enrollment = await prisma.enrollment.upsert({
      where: { userId_courseId: { userId: session.userId, courseId } },
      update: {},
      create: { userId: session.userId, courseId },
    });

    // Fire-and-forget enrollment confirmation email for new free-course sign-ups
    if (!alreadyEnrolled && !isPaid) {
      sendFreeEnrollmentEmail(user.email, user.name ?? "there", course.title, courseId)
        .catch((e) => console.error("[email] free-enrollment:", e));
    }

    // Notify the teaching team on every new enrollment (free or paid path
    // through enrollments; paid path also goes through finalizeCoursePayment).
    if (!alreadyEnrolled) {
      notifyCourseInstructors({
        courseId,
        title: `New enrollment in "${course.title}"`,
        body: `${user.name ?? "A student"} just enrolled${isPaid ? "" : " in your free course"}.`,
        type: "PURCHASE",
        link: `/instructor/students`,
      }).catch(console.error);
    }

    return NextResponse.json({ enrollment }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/enrollments]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
