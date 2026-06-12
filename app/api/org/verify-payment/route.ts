/**
 * POST /api/org/verify-payment — verify the Razorpay signature returned by
 * the checkout modal and finalize the org subscription payment (idempotent;
 * the webhook is the safety net if this call never happens).
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { finalizeOrgSubscriptionPayment } from "@/services/org-subscription.service";

const schema = z.object({
  transactionId: z.string().min(1),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const { transactionId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = parsed.data;

    if (!verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    const txn = await prisma.organizationTransaction.findUnique({
      where: { id: transactionId },
      select: { id: true, razorpayOrderId: true, organization: { select: { slug: true } } },
    });
    if (!txn || txn.razorpayOrderId !== razorpayOrderId) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    await finalizeOrgSubscriptionPayment(txn.id, razorpayPaymentId);

    return NextResponse.json({ success: true, orgSlug: txn.organization.slug });
  } catch (error) {
    console.error("[POST /api/org/verify-payment]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
