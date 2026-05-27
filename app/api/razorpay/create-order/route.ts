/**
 * POST /api/razorpay/create-order
 * Creates a Razorpay order for one-time purchases (course, books, or feature add-on).
 *
 * Body:
 *   Course  — { type: "course",  courseId: string, couponCode?: string, referralCode?: string }
 *   Books   — { type: "books",   couponCode?: string }
 *   Feature — { type: "feature", featureId: string }
 *
 * Response: {
 *   razorpayOrderId: string,   // Razorpay order ID to pass into the modal
 *   dbOrderId:       string,   // our DB order ID (sent back to verify endpoint)
 *   amount:          number,   // final amount in INR (not paise)
 *   currency:        string,   // "INR"
 *   key:             string,   // RAZORPAY_KEY_ID (safe to expose — public key)
 *   type:            string,
 *   // optional extras for redirect after success:
 *   courseId?:       string,
 *   featureSlug?:    string,
 * }
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createCourseRazorpayOrder } from "@/services/payment.service";
import { createBooksRazorpayOrder } from "@/services/book-payment.service";
import { createFeatureRazorpayOrder } from "@/services/feature.service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json() as {
      type:          "course" | "books" | "feature";
      courseId?:     string;
      featureId?:    string;
      couponCode?:   string;
      referralCode?: string;
    };

    if (!body.type) {
      return NextResponse.json({ error: "type is required (course | books | feature)" }, { status: 400 });
    }

    const key = process.env.RAZORPAY_KEY_ID;
    if (!key) return NextResponse.json({ error: "Payment not configured" }, { status: 500 });

    // ── Course purchase ────────────────────────────────────────────────────────
    if (body.type === "course") {
      if (!body.courseId) {
        return NextResponse.json({ error: "courseId is required for course orders" }, { status: 400 });
      }
      const result = await createCourseRazorpayOrder(
        session.userId,
        body.courseId,
        body.couponCode,
        body.referralCode
      );
      return NextResponse.json({ ...result, key, type: "course", courseId: body.courseId });
    }

    // ── Books cart purchase ───────────────────────────────────────────────────
    if (body.type === "books") {
      const result = await createBooksRazorpayOrder(session.userId, body.couponCode);
      return NextResponse.json({ ...result, key, type: "books" });
    }

    // ── Feature add-on purchase ───────────────────────────────────────────────
    if (body.type === "feature") {
      if (!body.featureId) {
        return NextResponse.json({ error: "featureId is required for feature orders" }, { status: 400 });
      }
      const result = await createFeatureRazorpayOrder(session.userId, body.featureId);
      return NextResponse.json({ ...result, key, type: "feature" });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create order";
    console.error("[razorpay/create-order]", err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
