/**
 * POST /api/razorpay/verify-payment
 * Verifies the Razorpay payment signature and finalises the purchase.
 *
 * Called by the frontend immediately after the Razorpay modal's `handler`
 * callback fires with a successful payment response.
 *
 * Body: {
 *   type:                "course" | "books" | "feature",
 *   razorpayOrderId:     string,   // from Razorpay modal response
 *   razorpayPaymentId:   string,   // from Razorpay modal response
 *   razorpaySignature:   string,   // from Razorpay modal response
 *   dbOrderId:           string,   // our DB order / book-order ID
 * }
 *
 * Response:
 *   { success: true, courseId?: string, featureSlug?: string, orderId?: string }
 *
 * Security:
 *   - HMAC-SHA256 signature is verified server-side before any DB mutation.
 *   - Signature mismatch returns 400 and nothing is marked as paid.
 *   - Missing fields return 400.
 */
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { finalizeCoursePayment } from "@/services/payment.service";
import { finalizeBookPayment } from "@/services/book-payment.service";
import { handleFeaturePaymentSuccess } from "@/services/feature.service";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json() as {
      type:                "course" | "books" | "feature";
      razorpayOrderId:     string;
      razorpayPaymentId:   string;
      razorpaySignature:   string;
      dbOrderId:           string;
    };

    const { type, razorpayOrderId, razorpayPaymentId, razorpaySignature, dbOrderId } = body;

    // ── Validate required fields ──────────────────────────────────────────────
    if (!type || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !dbOrderId) {
      return NextResponse.json(
        { error: "Missing required fields: type, razorpayOrderId, razorpayPaymentId, razorpaySignature, dbOrderId" },
        { status: 400 }
      );
    }

    // ── Verify Razorpay signature ─────────────────────────────────────────────
    const isValid = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!isValid) {
      console.warn("[razorpay/verify-payment] Signature mismatch for order", razorpayOrderId);
      return NextResponse.json(
        { error: "Payment signature verification failed. Please contact support." },
        { status: 400 }
      );
    }

    // ── Finalise based on purchase type ──────────────────────────────────────
    if (type === "course") {
      const result = await finalizeCoursePayment(dbOrderId, razorpayPaymentId);
      if (result.courseId) revalidatePath(`/courses/${result.courseId}`);
      return NextResponse.json(result);
    }

    if (type === "books") {
      const result = await finalizeBookPayment(dbOrderId, razorpayPaymentId);
      return NextResponse.json(result);
    }

    if (type === "feature") {
      await handleFeaturePaymentSuccess(dbOrderId, razorpayPaymentId);
      // Fetch featureSlug for redirect
      const order = await prisma.order.findUnique({
        where:   { id: dbOrderId },
        select:  { feature: { select: { slug: true } } },
      });
      return NextResponse.json({ success: true, featureSlug: order?.feature?.slug ?? null });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Payment verification failed";
    console.error("[razorpay/verify-payment]", err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
