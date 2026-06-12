/**
 * PATCH  /api/admin/organizations/plans/[id] — update a plan
 * DELETE /api/admin/organizations/plans/[id] — archive (soft-delete) a plan
 * Platform ADMIN with SUPER_ADMIN or FINANCE_ADMIN sub-role.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { updateSubscriptionPlanSchema } from "@/lib/validation/org";
import { updatePlan, archivePlan } from "@/services/subscription-plan.service";

async function requireFinanceAdmin() {
  const session = await getSession();
  if (
    !session ||
    session.role !== "ADMIN" ||
    !["SUPER_ADMIN", "FINANCE_ADMIN"].includes(session.adminSubRole ?? "SUPER_ADMIN")
  ) {
    return null;
  }
  return session;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireFinanceAdmin();
    if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const parsed = updateSubscriptionPlanSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const plan = await updatePlan(id, parsed.data);
    return NextResponse.json({ plan });
  } catch (error) {
    console.error("[PATCH /api/admin/organizations/plans/[id]]", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: message.includes("exists") ? 409 : 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireFinanceAdmin();
    if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const plan = await archivePlan(id);
    return NextResponse.json({ plan });
  } catch (error) {
    console.error("[DELETE /api/admin/organizations/plans/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
