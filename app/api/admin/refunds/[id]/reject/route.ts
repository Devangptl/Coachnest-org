/**
 * POST /api/admin/refunds/[id]/reject
 * Rejects a PENDING refund request. No financial changes are made.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { rejectRefundRequest } from "@/services/refund.service";

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

    await rejectRefundRequest(id, session.userId, adminNotes);

    return NextResponse.json({ message: "Refund request rejected." });
  } catch (err: unknown) {
    const msg    = err instanceof Error ? err.message : "Internal server error.";
    const status = msg.includes("not found")       ? 404
                 : msg.includes("Cannot reject")   ? 409
                 : 500;
    console.error("[POST /api/admin/refunds/[id]/reject]", err);
    return NextResponse.json({ error: msg }, { status });
  }
}
