/**
 * GET    /api/admin/platform-offers/[id] → fetch single offer
 * PATCH  /api/admin/platform-offers/[id] → update offer
 * DELETE /api/admin/platform-offers/[id] → remove offer
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { DiscountType, OfferScope } from "@/lib/generated/prisma/client";
import { getSession } from "@/lib/auth";
import { canAccessAdminPath } from "@/lib/admin-permissions";
import {
  deletePlatformOffer,
  getPlatformOfferById,
  updatePlatformOffer,
} from "@/services/platform-offer.service";

export const runtime = "nodejs";

const patchSchema = z.object({
  title:           z.string().min(1).max(120).optional(),
  description:     z.string().max(500).nullable().optional(),
  discountType:    z.nativeEnum(DiscountType).optional(),
  discountValue:   z.number().positive().optional(),
  maxDiscount:     z.number().positive().nullable().optional(),
  minCartValue:    z.number().nonnegative().nullable().optional(),
  scope:           z.nativeEnum(OfferScope).optional(),
  startsAt:        z.string().datetime().nullable().optional(),
  endsAt:          z.string().datetime().nullable().optional(),
  isActive:        z.boolean().optional(),
  priority:        z.number().int().optional(),
  bannerEnabled:   z.boolean().optional(),
  bannerCtaText:   z.string().max(60).optional(),
  bannerCtaUrl:    z.string().max(200).optional(),
  bannerBgColor:   z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  bannerTextColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

function unauthorized(session: Awaited<ReturnType<typeof getSession>>) {
  if (!session || session.role !== "ADMIN") return true;
  return !canAccessAdminPath(session.adminSubRole, "/admin/platform-offers");
}

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Params) {
  const session = await getSession();
  if (unauthorized(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const offer = await getPlatformOfferById(id);
  if (!offer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: offer });
}

export async function PATCH(req: NextRequest, ctx: Params) {
  const session = await getSession();
  if (unauthorized(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  try {
    const { startsAt, endsAt, ...rest } = parsed.data;
    const offer = await updatePlatformOffer(id, {
      ...rest,
      ...(startsAt !== undefined && {
        startsAt: startsAt ? new Date(startsAt) : null,
      }),
      ...(endsAt !== undefined && {
        endsAt: endsAt ? new Date(endsAt) : null,
      }),
    });
    return NextResponse.json({ data: offer });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update offer";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Params) {
  const session = await getSession();
  if (unauthorized(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  try {
    await deletePlatformOffer(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete offer";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
