/**
 * POST /api/razorpay/upi-return
 *
 * Razorpay redirects / POSTs here after a UPI intent payment completes.
 * This fires when the user returns from their UPI app and the browser-side
 * payment.success callback couldn't run (page was unloaded during redirect).
 *
 * Body (application/x-www-form-urlencoded):
 *   razorpay_payment_id, razorpay_order_id, razorpay_signature
 *
 * On success: finalises order + redirects to the purchase success page.
 * On failure: redirects to homepage with an error banner (query param).
 *
 * Security: HMAC-SHA256 signature verified before any DB mutation.
 * No session check needed — the signature is the proof of authenticity.
 */
import { NextRequest, NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { prisma } from "@/lib/prisma";
import { finalizeCoursePayment } from "@/services/payment.service";
import { finalizeBookPayment } from "@/services/book-payment.service";
import { handleFeaturePaymentSuccess } from "@/services/feature.service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const text = await req.text();

  // Razorpay sends form-encoded body; fall back to JSON just in case
  let paymentId:  string | null = null;
  let rzpOrderId: string | null = null;
  let signature:  string | null = null;
  let errorCode:  string | null = null;

  if (text.startsWith("{")) {
    try {
      const json = JSON.parse(text);
      paymentId  = json.razorpay_payment_id  ?? null;
      rzpOrderId = json.razorpay_order_id    ?? null;
      signature  = json.razorpay_signature   ?? null;
      errorCode  = json.error?.code          ?? null;
    } catch { /* fall through */ }
  } else {
    const params = new URLSearchParams(text);
    paymentId  = params.get("razorpay_payment_id");
    rzpOrderId = params.get("razorpay_order_id");
    signature  = params.get("razorpay_signature");
    errorCode  = params.get("error[code]");
  }

  // Payment failed (Razorpay posts error fields)
  if (errorCode || !paymentId || !rzpOrderId || !signature) {
    return NextResponse.redirect(new URL("/?payment_failed=1", req.url));
  }

  // Verify signature
  const isValid = verifyPaymentSignature(rzpOrderId, paymentId, signature);
  if (!isValid) {
    console.warn("[upi-return] Signature mismatch for order", rzpOrderId);
    return NextResponse.redirect(new URL("/?payment_failed=1", req.url));
  }

  try {
    const successUrl = await finalizeAndGetRedirect(rzpOrderId, paymentId);
    return NextResponse.redirect(new URL(successUrl, req.url));
  } catch (err) {
    console.error("[upi-return] Finalization error", rzpOrderId, err);
    return NextResponse.redirect(new URL("/?payment_failed=1", req.url));
  }
}

async function finalizeAndGetRedirect(
  rzpOrderId:   string,
  rzpPaymentId: string,
): Promise<string> {
  // Check Order table (courses + features)
  const order = await prisma.order.findUnique({
    where:  { razorpayOrderId: rzpOrderId },
    select: {
      id:        true,
      featureId: true,
      courseId:  true,
      status:    true,
      feature:   { select: { slug: true } },
    },
  });

  if (order) {
    if (order.status !== "PAID") {
      if (order.featureId) {
        await handleFeaturePaymentSuccess(order.id, rzpPaymentId);
        return `/features/${order.feature?.slug ?? ""}?success=true`;
      }
      const result = await finalizeCoursePayment(order.id, rzpPaymentId);
      if (result.courseId) revalidatePath(`/courses/${result.courseId}`);
      return `/courses/${result.courseId ?? ""}?enrolled=true`;
    }
    // Already paid — still redirect correctly
    if (order.featureId) return `/features/${order.feature?.slug ?? ""}?success=true`;
    return `/courses/${order.courseId ?? ""}?enrolled=true`;
  }

  // Check BookOrder table
  const bookOrder = await prisma.bookOrder.findUnique({
    where:  { razorpayOrderId: rzpOrderId },
    select: { id: true, status: true },
  });

  if (bookOrder) {
    if (bookOrder.status !== "PAID") {
      await finalizeBookPayment(bookOrder.id, rzpPaymentId);
    }
    return `/checkout/success?type=books&orderId=${bookOrder.id}`;
  }

  console.warn("[upi-return] No order found for", rzpOrderId);
  return "/";
}
