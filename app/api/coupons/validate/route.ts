/**
 * POST /api/coupons/validate
 * Validates a coupon code and returns the discount details.
 * Body: { code, courseId }
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { code, courseId } = await req.json();
    if (!code) return NextResponse.json({ error: "Coupon code required" }, { status: 400 });

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon)                                         return NextResponse.json({ error: "Invalid coupon" },                  { status: 404 });
    if (coupon.expiresAt && coupon.expiresAt < new Date()) return NextResponse.json({ error: "Coupon has expired" },             { status: 400 });
    if (coupon.maxUses && coupon.uses >= coupon.maxUses)   return NextResponse.json({ error: "Coupon usage limit reached" },     { status: 400 });
    if (coupon.courseId && coupon.courseId !== courseId)   return NextResponse.json({ error: "Coupon not valid for this course" }, { status: 400 });

    // Already used by this user?
    const used = await prisma.couponUse.findUnique({
      where: { userId_couponId: { userId: session.userId, couponId: coupon.id } },
    });
    if (used) return NextResponse.json({ error: "Coupon already used" }, { status: 400 });

    return NextResponse.json({
      id:           coupon.id,
      code:         coupon.code,
      discountType: coupon.discountType,
      discount:     Number(coupon.discount),
      description:  coupon.description,
    });
  } catch (err) {
    console.error("[POST /api/coupons/validate]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
