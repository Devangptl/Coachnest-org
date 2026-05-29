/**
 * POST /api/admin/refunds/[id]/retry
 * Re-attempts a Razorpay refund that previously failed (status === FAILED).
 * Safe to call multiple times — uses optimistic lock to prevent double-processing.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { retryFailedRefund } from "@/services/refund.service";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await params;
    const result = await retryFailedRefund(id, session.userId);

    return NextResponse.json({
      message: `Refund of ₹${result.refundAmount.toLocaleString("en-IN")} processed successfully.`,
      data:    result,
    });
  } catch (err: unknown) {
    const msg    = err instanceof Error ? err.message : "Internal server error.";
    const status = msg.includes("not found")         ? 404
                 : msg.includes("Cannot retry")      ? 409
                 : msg.includes("already")           ? 409
                 : msg.includes("Razorpay")           ? 502
                 : 500;
    console.error("[POST /api/admin/refunds/[id]/retry]", err);
    return NextResponse.json({ error: msg }, { status });
  }
}
