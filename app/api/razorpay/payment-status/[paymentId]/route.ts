/**
 * GET /api/razorpay/payment-status/[paymentId]
 * Polls Razorpay for payment status and, on capture, finalises the order.
 *
 * Query params:
 *   type     — "course" | "books" | "feature"
 *   dbOrderId — our internal order ID
 *
 * Response:
 *   { status: "pending" }                  — still waiting
 *   { status: "captured" }                 — paid + order finalised
 *   { status: "failed", error: string }    — payment failed
 */
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { fetchPaymentDetails } from "@/lib/razorpay";
import { finalizeCoursePayment } from "@/services/payment.service";
import { finalizeBookPayment } from "@/services/book-payment.service";
import { handleFeaturePaymentSuccess } from "@/services/feature.service";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { paymentId } = await params;
  const type      = req.nextUrl.searchParams.get("type") as "course" | "books" | "feature" | null;
  const dbOrderId = req.nextUrl.searchParams.get("dbOrderId");

  if (!paymentId || !type || !dbOrderId) {
    return NextResponse.json({ error: "Missing required params." }, { status: 400 });
  }

  try {
    const payment = await fetchPaymentDetails(paymentId);

    if (payment.status === "captured" || payment.status === "authorized") {
      // Finalise order — same logic as verify-payment but authenticated via
      // direct Razorpay API fetch (no HMAC signature needed server-to-server).
      if (type === "course") {
        const result = await finalizeCoursePayment(dbOrderId, paymentId);
        if (result.courseId) revalidatePath(`/courses/${result.courseId}`);
      } else if (type === "books") {
        await finalizeBookPayment(dbOrderId, paymentId);
      } else if (type === "feature") {
        await handleFeaturePaymentSuccess(dbOrderId, paymentId);
      }

      return NextResponse.json({ status: "captured" });
    }

    if (payment.status === "failed") {
      return NextResponse.json({
        status: "failed",
        error:  payment.error_description ?? "Payment failed. Please try again.",
      });
    }

    // created | pending — still waiting for user to approve on UPI app
    return NextResponse.json({ status: "pending" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Status check failed.";
    console.error("[GET /api/razorpay/payment-status]", err);

    // If finalisation already ran (idempotency), return captured anyway
    if (msg.toLowerCase().includes("already")) {
      return NextResponse.json({ status: "captured" });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
