/**
 * POST /api/admin/organizations/transactions/[id]/retry — retry a FAILED
 * org refund (the Razorpay call failed; DB effects never ran).
 * SUPER_ADMIN / FINANCE_ADMIN.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { retryOrgRefund } from "@/services/org-subscription.service";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (
      !session ||
      session.role !== "ADMIN" ||
      !["SUPER_ADMIN", "FINANCE_ADMIN"].includes(session.adminSubRole ?? "SUPER_ADMIN")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const result = await retryOrgRefund(id, session.userId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[POST /api/admin/organizations/transactions/[id]/retry]", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
