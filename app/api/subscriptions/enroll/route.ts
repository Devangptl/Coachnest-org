/**
 * POST /api/subscriptions/enroll
 * Enroll a subscriber in a course without payment.
 * Enforces: active subscription, plan meets course minPlan, BASIC slot limit.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getPlanAccess,
  planMeetsRequirement,
  BASIC_COURSE_LIMIT,
} from "@/services/subscription.service";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { courseId } = body as { courseId?: string };
  if (!courseId) {
    return NextResponse.json({ error: "courseId is required" }, { status: 400 });
  }

  // Fetch course, plan access, and existing enrollment in parallel
  const [course, planAccess, existingEnrollment] = await Promise.all([
    prisma.course.findUnique({
      where:  { id: courseId },
      select: { id: true, status: true, minPlan: true, isFree: true },
    }),
    getPlanAccess(session.userId),
    prisma.enrollment.findUnique({
      where:  { userId_courseId: { userId: session.userId, courseId } },
      select: { courseId: true },
    }),
  ]);

  if (!course || course.status === "ARCHIVED") {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  // ── Already enrolled — bypass all plan/limit checks ──────────────────────
  // Users keep access to courses they enrolled in regardless of current plan state.
  if (existingEnrollment) {
    const enrolledCount = await prisma.enrollment.count({
      where: { userId: session.userId, course: { isFree: false } },
    });
    return NextResponse.json({
      success:          true,
      alreadyEnrolled:  true,
      enrolledCount,
      enrollmentLimit:  planAccess.plan === "BASIC" ? BASIC_COURSE_LIMIT : null,
      slotsRemaining:   planAccess.plan === "BASIC"
        ? Math.max(0, BASIC_COURSE_LIMIT - enrolledCount)
        : null,
    });
  }

  // ── New enrollment — run subscription and plan checks ────────────────────

  // Must have an active paid subscription
  if (!planAccess.isActive || !planAccess.canAccessPaidCourses) {
    return NextResponse.json(
      { error: "An active subscription is required to access this course." },
      { status: 403 }
    );
  }

  // Course tier check — BASIC users cannot access PRO-only courses
  if (!planMeetsRequirement(planAccess.plan, course.minPlan)) {
    return NextResponse.json(
      {
        error: `This course requires a ${course.minPlan} plan or higher. ` +
               `Your current plan is ${planAccess.plan}.`,
      },
      { status: 403 }
    );
  }

  // BASIC slot limit — only applies to paid courses (free courses don't consume slots)
  if (planAccess.plan === "BASIC" && !course.isFree && planAccess.enrolledCount >= BASIC_COURSE_LIMIT) {
    return NextResponse.json(
      {
        error: `You've used all ${BASIC_COURSE_LIMIT} course slots on your BASIC plan. ` +
               "Upgrade to PRO for unlimited access.",
      },
      { status: 403 }
    );
  }

  await prisma.enrollment.create({
    data: { userId: session.userId, courseId },
  });

  // Re-count paid enrollments so the client can update the slot display immediately
  const newEnrolledCount = await prisma.enrollment.count({
    where: { userId: session.userId, course: { isFree: false } },
  });

  return NextResponse.json({
    success:        true,
    alreadyEnrolled: false,
    enrolledCount:  newEnrolledCount,
    enrollmentLimit: planAccess.plan === "BASIC" ? BASIC_COURSE_LIMIT : null,
    slotsRemaining: planAccess.plan === "BASIC"
      ? Math.max(0, BASIC_COURSE_LIMIT - newEnrolledCount)
      : null,
  });
}
