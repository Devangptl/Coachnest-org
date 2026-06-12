/**
 * GET  /api/admin/organizations/plans — list plans (incl. archived)
 * POST /api/admin/organizations/plans — create a plan
 * Platform ADMIN with SUPER_ADMIN or FINANCE_ADMIN sub-role.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { subscriptionPlanSchema } from "@/lib/validation/org";
import { listPlans, createPlan } from "@/services/subscription-plan.service";

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

export async function GET() {
  try {
    const session = await requireFinanceAdmin();
    if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const plans = await listPlans({ includeInactive: true });
    return NextResponse.json({
      plans: plans.map((p) => ({
        ...p,
        priceMonthly: Number(p.priceMonthly),
        priceYearly: Number(p.priceYearly),
      })),
    });
  } catch (error) {
    console.error("[GET /api/admin/organizations/plans]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireFinanceAdmin();
    if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const parsed = subscriptionPlanSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const plan = await createPlan(parsed.data);
    return NextResponse.json({ plan }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/organizations/plans]", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: message.includes("exists") ? 409 : 500 });
  }
}
