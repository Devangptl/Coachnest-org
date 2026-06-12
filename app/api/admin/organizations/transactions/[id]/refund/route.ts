/**
 * POST /api/admin/organizations/transactions/[id]/refund — full or partial
 * refund of an org subscription transaction. SUPER_ADMIN / FINANCE_ADMIN.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { refundOrgTransactionSchema } from "@/lib/validation/org";
import { refundOrgTransaction } from "@/services/org-subscription.service";

export async function POST(
  req: NextRequest,
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
    const parsed = refundOrgTransactionSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const result = await refundOrgTransaction(id, {
      amount: parsed.data.amount,
      reason: parsed.data.reason,
      adminUserId: session.userId,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[POST /api/admin/organizations/transactions/[id]/refund]", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
