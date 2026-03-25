/**
 * GET /api/admin/coupons/[id]/usage — Get coupon usage statistics
 */
import { getSession } from "@/lib/auth";
import { getCouponUsageStats } from "@/services/coupon.service";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await params;
    const stats = await getCouponUsageStats(id);
    return NextResponse.json({ data: stats }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/admin/coupons/[id]/usage]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
