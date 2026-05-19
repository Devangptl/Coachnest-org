/**
 * GET /api/admin/coupons — List all coupons
 * POST /api/admin/coupons — Create new coupon
 */
import { getSession } from "@/lib/auth";
import { getCouponsList, createCoupon, generateCouponCode } from "@/services/coupon.service";
import { NextResponse } from "next/server";
import { DiscountType } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const url = new URL(req.url);
    const page = Number(url.searchParams.get("page")) || undefined;
    const pageSize = Number(url.searchParams.get("pageSize")) || undefined;
    const search = url.searchParams.get("search") || undefined;

    const result = await getCouponsList({ page, pageSize, search });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[GET /api/admin/coupons]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const body = await req.json();
    const { code, description, discountType, discount, maxUses, expiresAt, autoGenerate } = body;

    if (!discountType || discount === undefined || discount === null) {
      return NextResponse.json(
        { error: "discountType and discount are required." },
        { status: 400 }
      );
    }

    if (!["PERCENTAGE", "FIXED"].includes(discountType)) {
      return NextResponse.json({ error: "Invalid discountType." }, { status: 400 });
    }

    const finalCode = autoGenerate ? generateCouponCode() : code;
    if (!finalCode) {
      return NextResponse.json({ error: "Code is required." }, { status: 400 });
    }

    const coupon = await createCoupon({
      code: finalCode,
      description,
      discountType: discountType as DiscountType,
      discount,
      maxUses,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    return NextResponse.json({ data: coupon }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/coupons]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
