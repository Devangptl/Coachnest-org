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

export async function POST() {
  return NextResponse.json(
    {
      error: "Subscription enrollment is no longer available. Please use /api/enrollments directly.",
      code: "SUBSCRIPTION_MODEL_REMOVED",
    },
    { status: 410 }
  );
}
