/**
 * POST /api/admin/refunds/[id]/approve
 * Approves a PENDING refund request, issues a Razorpay refund, and processes all
 * side-effects atomically (enrollment revoke, wallet debit, ledger entries).
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { approveAndProcessRefund } from "@/services/refund.service";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const adminNotes: string | undefined = body.adminNotes;

    const result = await approveAndProcessRefund(id, session.userId, adminNotes);

    return NextResponse.json({
      message: `Refund of ₹${result.refundAmount.toLocaleString("en-IN")} processed successfully.`,
      data:    result,
    });
  } catch (err: unknown) {
    const msg    = err instanceof Error ? err.message : "Internal server error.";
    const status = msg.includes("not found")         ? 404
                 : msg.includes("Cannot approve")    ? 409
                 : msg.includes("already picked up") ? 409
                 : msg.includes("Razorpay")           ? 502
                 : 500;
    console.error("[POST /api/admin/refunds/[id]/approve]", err);
    return NextResponse.json({ error: msg }, { status });
  }
}
