/**
 * GET /api/instructor/refunds
 * Returns refund impact on the authenticated instructor's earnings:
 *   - summary: total refund count + total instructor loss
 *   - per-course breakdown
 *   - recent processed refunds (last 20)
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getInstructorRefundImpact } from "@/services/refund.service";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.role !== "INSTRUCTOR" && session.role !== "ADMIN")) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const impact = await getInstructorRefundImpact(session.userId);
    return NextResponse.json(impact);
  } catch (err) {
    console.error("[GET /api/instructor/refunds]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
