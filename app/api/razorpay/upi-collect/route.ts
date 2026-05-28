/**
 * POST /api/razorpay/upi-collect
 * Initiates a UPI collect payment server-to-server — no Razorpay.js SDK needed.
 * Razorpay sends the collect request directly to the user's UPI app.
 *
 * Body: { razorpayOrderId, amount, vpa, contact, email, description }
 * Response: { paymentId }
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createUpiCollect } from "@/lib/razorpay";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { razorpayOrderId, amount, vpa, contact, email, description } =
      await req.json() as {
        razorpayOrderId: string;
        amount:          number;
        vpa:             string;
        contact:         string;
        email:           string;
        description:     string;
      };

    if (!razorpayOrderId || !amount || !vpa || !contact || !email) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }
    if (!vpa.includes("@")) {
      return NextResponse.json({ error: "Invalid UPI ID." }, { status: 400 });
    }

    const ip        = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "127.0.0.1";
    const userAgent = req.headers.get("user-agent") ?? "Mozilla/5.0";
    const referer   = req.headers.get("referer") ?? (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");

    const result = await createUpiCollect(
      razorpayOrderId,
      amount,
      vpa,
      contact,
      email,
      description ?? "Purchase",
      ip,
      userAgent,
      referer,
    );

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to initiate UPI payment.";
    console.error("[POST /api/razorpay/upi-collect]", err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
