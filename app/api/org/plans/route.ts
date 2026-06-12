/**
 * GET /api/org/plans — public list of active subscription plans
 * for the organization registration pricing step.
 */
import { NextResponse } from "next/server";
import { listPlans } from "@/services/subscription-plan.service";

export async function GET() {
  try {
    const plans = await listPlans();
    return NextResponse.json({
      plans: plans.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        priceMonthly: Number(p.priceMonthly),
        priceYearly: Number(p.priceYearly),
        currency: p.currency,
        maxStudents: p.maxStudents,
        maxInstructors: p.maxInstructors,
        maxCourses: p.maxCourses,
        features: p.features,
      })),
    });
  } catch (error) {
    console.error("[GET /api/org/plans]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
