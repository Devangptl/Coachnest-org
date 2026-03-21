/**
 * POST /api/payments/create-order
 * Creates a Razorpay order for a course purchase.
 * Body: { courseId, couponCode? }
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createCourseOrder } from "@/services/payment.service";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { courseId, couponCode } = await req.json();
    if (!courseId) return NextResponse.json({ error: "courseId is required" }, { status: 400 });

    const order = await createCourseOrder(session.userId, courseId, couponCode);
    return NextResponse.json(order);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
