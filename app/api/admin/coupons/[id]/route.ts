/**
 * GET    /api/admin/coupons/[id] — Get coupon details
 * PATCH  /api/admin/coupons/[id] — Update coupon
 * DELETE /api/admin/coupons/[id] — Delete coupon
 */
import { getSession } from "@/lib/auth";
import { getCouponDetails, updateCoupon, deleteCoupon } from "@/services/coupon.service";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    const { id } = await params;
    const coupon = await getCouponDetails(id);
    if (!coupon) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ data: coupon }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/admin/coupons/[id]]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { description, discount, maxUses, expiresAt } = body;

    const update: any = {};
    if (description !== undefined) update.description = description;
    if (discount !== undefined) update.discount = discount;
    if (maxUses !== undefined) update.maxUses = maxUses;
    if (expiresAt !== undefined) update.expiresAt = expiresAt ? new Date(expiresAt) : null;

    const coupon = await updateCoupon(id, update);
    return NextResponse.json({ data: coupon }, { status: 200 });
  } catch (error) {
    console.error("[PATCH /api/admin/coupons/[id]]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await params;
    await deleteCoupon(id);
    return NextResponse.json({ message: "Coupon deleted." }, { status: 200 });
  } catch (error) {
    console.error("[DELETE /api/admin/coupons/[id]]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
