/**
 * POST /api/payments/verify
 * @deprecated Use /api/razorpay/verify-payment instead.
 *
 * Redirects to the new Razorpay verify endpoint for backward compatibility.
 * Body: { type, razorpayOrderId, razorpayPaymentId, razorpaySignature, dbOrderId }
 */
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // Forward to the canonical Razorpay verify endpoint
  const body = await req.text();
  const url  = new URL("/api/razorpay/verify-payment", req.nextUrl.origin);

  const response = await fetch(url.toString(), {
    method:  "POST",
    headers: {
      "Content-Type": "application/json",
      cookie:         req.headers.get("cookie") ?? "",
    },
    body,
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
