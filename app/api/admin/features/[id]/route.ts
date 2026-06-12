/**
 * GET    /api/admin/features/[id] — get feature with purchase stats
 * PATCH  /api/admin/features/[id] — update feature (name, description, price, isActive)
 * DELETE /api/admin/features/[id] — delete if unpurchased, otherwise soft-delete (deactivate)
 *
 * Access: ADMIN with the add-ons section permission (SUPER_ADMIN, FINANCE_ADMIN).
 * [id] may be either the DB id or the unique slug.
 *
 * Note: Deactivating a feature does not revoke access for users who already
 * purchased it; it only prevents new purchases and hides it from the catalog.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessAdminPath } from "@/lib/admin-permissions";

const patchSchema = z.object({
  name:        z.string().min(1).max(120).optional(),
  description: z.string().max(1000).nullable().optional(),
  price:       z.number().nonnegative().max(1_000_000).optional(),
  isActive:    z.boolean().optional(),
});

function unauthorized(session: Awaited<ReturnType<typeof getSession>>) {
  if (!session || session.role !== "ADMIN") return true;
  return !canAccessAdminPath(session.adminSubRole, "/admin/add-ons");
}

async function findFeature(idOrSlug: string) {
  return prisma.platformFeature.findFirst({
    where:   { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    include: { _count: { select: { purchases: true, orders: true } } },
  });
}

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Params) {
  try {
    const session = await getSession();
    if (unauthorized(session)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await ctx.params;
    const feature = await findFeature(id);
    if (!feature) return NextResponse.json({ error: "Feature not found." }, { status: 404 });

    const revenueAgg = await prisma.order.aggregate({
      where:  { featureId: feature.id, status: "PAID" },
      _sum:   { platformRevenue: true },
      _count: { id: true },
    });

    return NextResponse.json({
      feature,
      stats: {
        totalPurchases: revenueAgg._count.id,
        totalRevenue:   Number(revenueAgg._sum.platformRevenue ?? 0),
      },
    });
  } catch (err) {
    console.error("[GET /api/admin/features/[id]]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: Params) {
  try {
    const session = await getSession();
    if (unauthorized(session)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    const { id } = await ctx.params;

    let body: unknown;
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }

    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 }
      );
    }
    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }

    const existing = await findFeature(id);
    if (!existing) {
      return NextResponse.json({ error: "Feature not found." }, { status: 404 });
    }

    const { name, description, ...rest } = parsed.data;
    const feature = await prisma.platformFeature.update({
      where: { id: existing.id },
      data: {
        ...rest,
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
      },
      include: { _count: { select: { purchases: true } } },
    });

    return NextResponse.json({ feature });
  } catch (err) {
    console.error("[PATCH /api/admin/features/[id]]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Params) {
  try {
    const session = await getSession();
    if (unauthorized(session)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    const { id } = await ctx.params;

    const existing = await findFeature(id);
    if (!existing) {
      return NextResponse.json({ error: "Feature not found." }, { status: 404 });
    }

    // Purchased add-ons are never hard-deleted — deactivate instead so
    // existing purchasers keep their access records intact.
    if (existing._count.purchases > 0 || existing._count.orders > 0) {
      await prisma.platformFeature.update({
        where: { id: existing.id },
        data:  { isActive: false },
      });
      return NextResponse.json({ success: true, deactivated: true });
    }

    await prisma.platformFeature.delete({ where: { id: existing.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/admin/features/[id]]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
