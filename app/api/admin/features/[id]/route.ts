/**
 * GET    /api/admin/features/[id] — get feature with purchase stats
 * PATCH  /api/admin/features/[id] — update feature (name, description, price, isActive)
 * DELETE /api/admin/features/[id] — deactivate feature (soft-delete; preserves purchase records)
 *
 * Access: ADMIN only
 *
 * PATCH body (all fields optional):
 *   { name?, description?, price?, isActive?, instructorRevenuePercent? }
 *
 * Note: Deleting a feature does not revoke access for users who already purchased it;
 * it only prevents new purchases and hides it from the feature catalog.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await params;
    const feature = await prisma.platformFeature.findUnique({
      where: { id },
      include: { _count: { select: { purchases: true } } },
    });
    if (!feature) return NextResponse.json({ error: "Feature not found." }, { status: 404 });

    // Revenue from this feature
    const revenueAgg = await prisma.order.aggregate({
      where: { featureId: id, status: "PAID" },
      _sum: { platformRevenue: true },
      _count: { id: true },
    });

    return NextResponse.json({
      feature,
      stats: {
        totalPurchases: revenueAgg._count.id,
        totalRevenue: Number(revenueAgg._sum.platformRevenue ?? 0),
      },
    });
  } catch (err) {
    console.error("[GET /api/admin/features/[id]]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { name, description, price, isActive } = body;

    const data: Record<string, unknown> = {};
    if (name !== undefined)        data.name        = name.trim();
    if (description !== undefined) data.description = description?.trim() || null;
    if (price !== undefined) {
      if (isNaN(Number(price)) || Number(price) < 0) {
        return NextResponse.json({ error: "price must be a non-negative number." }, { status: 400 });
      }
      data.price = Number(price);
    }
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    const feature = await prisma.platformFeature.update({ where: { id }, data });
    return NextResponse.json({ feature });
  } catch (err) {
    console.error("[PATCH /api/admin/features/[id]]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await params;
    // Soft-delete: deactivate so existing purchasers retain access
    await prisma.platformFeature.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/admin/features/[id]]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
