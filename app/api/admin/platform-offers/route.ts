/**
 * GET  /api/admin/platform-offers  → list offers (paginated)
 * POST /api/admin/platform-offers  → create offer
 *
 * Guarded by ADMIN role + the `platform-offers` admin section permission.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { DiscountType, OfferScope } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { canAccessAdminPath } from "@/lib/admin-permissions";
import {
  createPlatformOffer,
  listPlatformOffers,
} from "@/services/platform-offer.service";

export const runtime = "nodejs";

const createSchema = z.object({
  title:           z.string().min(1).max(120),
  description:     z.string().max(500).optional(),
  discountType:    z.nativeEnum(DiscountType),
  discountValue:   z.number().positive(),
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

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (unauthorized(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const result = await listPlatformOffers({
    page:     sp.get("page")     ? Number(sp.get("page"))     : undefined,
    pageSize: sp.get("pageSize") ? Number(sp.get("pageSize")) : undefined,
  });
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (unauthorized(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  try {
    const { startsAt, endsAt, ...rest } = parsed.data;
    const offer = await createPlatformOffer({
      ...rest,
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt:   endsAt   ? new Date(endsAt)   : null,
    });
    return NextResponse.json({ data: offer }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create offer";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
