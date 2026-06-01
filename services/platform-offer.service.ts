/**
 * Platform Offer Service — site-wide promotional discount + landing banner.
 *
 * One `PlatformOffer` row represents a campaign with:
 *   - A discount auto-applied at checkout (course or book purchase)
 *   - A promotional banner shown on the landing page
 *
 * Resolution rule when multiple offers are ACTIVE: the row with the
 * highest `priority` wins; ties broken by most recent `updatedAt`.
 *
 * Discount math (`calculatePlatformDiscount`) is also used server-side
 * inside the payment services so the amount can never be tampered with
 * by the client.
 */
import { prisma } from "@/lib/prisma";
import { DiscountType, OfferScope, Prisma } from "@prisma/client";
import {
  buildPaginated,
  parsePagination,
  type Paginated,
  type PaginationParams,
} from "@/lib/pagination";

export type PublicPlatformOffer = {
  id: string;
  title: string;
  description: string | null;
  discountType: DiscountType;
  discountValue: number;
  maxDiscount: number | null;
  minCartValue: number | null;
  scope: OfferScope;
  startsAt: string | null;
  endsAt: string | null;
  bannerEnabled: boolean;
  bannerCtaText: string;
  bannerCtaUrl: string;
  bannerBgColor: string;
  bannerTextColor: string;
};

export type AdminPlatformOffer = PublicPlatformOffer & {
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
};

// ─── Internal: serialize a row for client safety ─────────────────────────────

type OfferRow = Prisma.PlatformOfferGetPayload<Record<string, never>>;

function toPublic(row: OfferRow): PublicPlatformOffer {
  return {
    id:             row.id,
    title:          row.title,
    description:    row.description,
    discountType:   row.discountType,
    discountValue:  Number(row.discountValue),
    maxDiscount:    row.maxDiscount   != null ? Number(row.maxDiscount)   : null,
    minCartValue:   row.minCartValue  != null ? Number(row.minCartValue)  : null,
    scope:          row.scope,
    startsAt:       row.startsAt?.toISOString() ?? null,
    endsAt:         row.endsAt?.toISOString()   ?? null,
    bannerEnabled:  row.bannerEnabled,
    bannerCtaText:  row.bannerCtaText,
    bannerCtaUrl:   row.bannerCtaUrl,
    bannerBgColor:  row.bannerBgColor,
    bannerTextColor: row.bannerTextColor,
  };
}

function toAdmin(row: OfferRow): AdminPlatformOffer {
  return {
    ...toPublic(row),
    isActive:  row.isActive,
    priority:  row.priority,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ─── Active offer lookup (used by checkout + banner) ─────────────────────────

/**
 * Return the currently-effective offer for a given scope, or `null` when no
 * eligible offer is active right now. An offer is "live" when `isActive` is
 * true AND `now` falls inside the optional [startsAt, endsAt] window.
 *
 * `scope` may be:
 *   - "COURSES"  → eligible if offer.scope ∈ { ALL, COURSES }
 *   - "BOOKS"    → eligible if offer.scope ∈ { ALL, BOOKS }
 *   - "ANY"      → no scope filter (used by the landing banner)
 */
export async function getActivePlatformOffer(
  scope: "COURSES" | "BOOKS" | "ANY" = "ANY",
  now: Date = new Date(),
): Promise<OfferRow | null> {
  const scopeFilter =
    scope === "ANY"
      ? undefined
      : scope === "COURSES"
        ? { in: [OfferScope.ALL, OfferScope.COURSES] }
        : { in: [OfferScope.ALL, OfferScope.BOOKS] };

  const offer = await prisma.platformOffer.findFirst({
    where: {
      isActive: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt:   null }, { endsAt:   { gte: now } }] },
      ],
      ...(scopeFilter ? { scope: scopeFilter } : {}),
    },
    orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
  });

  return offer;
}

export async function getActivePlatformOfferPublic(
  scope: "COURSES" | "BOOKS" | "ANY" = "ANY",
): Promise<PublicPlatformOffer | null> {
  const row = await getActivePlatformOffer(scope);
  return row ? toPublic(row) : null;
}

// ─── Pure discount math (also re-used by checkout) ───────────────────────────

/**
 * Compute the rupee discount to subtract from `subtotal` for a given offer.
 * Honors `minCartValue` (returns 0 if subtotal is below) and `maxDiscount`
 * (caps a percentage offer). Always non-negative and never exceeds subtotal.
 */
export function calculatePlatformDiscount(
  offer: Pick<OfferRow, "discountType" | "discountValue" | "maxDiscount" | "minCartValue">,
  subtotal: number,
): number {
  if (subtotal <= 0) return 0;
  if (offer.minCartValue != null && subtotal < Number(offer.minCartValue)) return 0;

  let discount =
    offer.discountType === DiscountType.PERCENTAGE
      ? (subtotal * Number(offer.discountValue)) / 100
      : Number(offer.discountValue);

  if (
    offer.discountType === DiscountType.PERCENTAGE &&
    offer.maxDiscount != null &&
    discount > Number(offer.maxDiscount)
  ) {
    discount = Number(offer.maxDiscount);
  }

  discount = Math.min(discount, subtotal);
  return parseFloat(Math.max(0, discount).toFixed(2));
}

// ─── Admin CRUD ──────────────────────────────────────────────────────────────

export type CreatePlatformOfferInput = {
  title: string;
  description?: string | null;
  discountType: DiscountType;
  discountValue: number;
  maxDiscount?: number | null;
  minCartValue?: number | null;
  scope?: OfferScope;
  startsAt?: Date | null;
  endsAt?: Date | null;
  isActive?: boolean;
  priority?: number;
  bannerEnabled?: boolean;
  bannerCtaText?: string;
  bannerCtaUrl?: string;
  bannerBgColor?: string;
  bannerTextColor?: string;
};

export type UpdatePlatformOfferInput = Partial<CreatePlatformOfferInput>;

function validate(input: CreatePlatformOfferInput | UpdatePlatformOfferInput) {
  if ("title" in input && input.title != null && !input.title.trim()) {
    throw new Error("Title is required");
  }
  if ("discountValue" in input && input.discountValue != null) {
    if (input.discountValue <= 0) throw new Error("Discount must be greater than 0");
    if (
      input.discountType === DiscountType.PERCENTAGE &&
      input.discountValue > 100
    ) {
      throw new Error("Percentage discount cannot exceed 100");
    }
  }
  if (
    input.startsAt && input.endsAt &&
    input.startsAt.getTime() >= input.endsAt.getTime()
  ) {
    throw new Error("End date must be after start date");
  }
}

export async function createPlatformOffer(
  data: CreatePlatformOfferInput,
): Promise<AdminPlatformOffer> {
  validate(data);

  const row = await prisma.platformOffer.create({
    data: {
      title:           data.title.trim(),
      description:     data.description ? data.description.trim() || null : null,
      discountType:    data.discountType,
      discountValue:   data.discountValue,
      maxDiscount:     data.maxDiscount   ?? null,
      minCartValue:    data.minCartValue  ?? null,
      scope:           data.scope         ?? OfferScope.ALL,
      startsAt:        data.startsAt      ?? null,
      endsAt:          data.endsAt        ?? null,
      isActive:        data.isActive      ?? true,
      priority:        data.priority      ?? 0,
      bannerEnabled:   data.bannerEnabled ?? true,
      bannerCtaText:   data.bannerCtaText?.trim()   || "Explore Courses",
      bannerCtaUrl:    data.bannerCtaUrl?.trim()    || "/courses",
      bannerBgColor:   data.bannerBgColor?.trim()   || "#d97757",
      bannerTextColor: data.bannerTextColor?.trim() || "#ffffff",
    },
  });

  return toAdmin(row);
}

export async function updatePlatformOffer(
  id: string,
  data: UpdatePlatformOfferInput,
): Promise<AdminPlatformOffer> {
  validate(data);

  const row = await prisma.platformOffer.update({
    where: { id },
    data: {
      ...(data.title           !== undefined && { title:           data.title.trim() }),
      ...(data.description     !== undefined && { description:     data.description ? data.description.trim() || null : null }),
      ...(data.discountType    !== undefined && { discountType:    data.discountType }),
      ...(data.discountValue   !== undefined && { discountValue:   data.discountValue }),
      ...(data.maxDiscount     !== undefined && { maxDiscount:     data.maxDiscount }),
      ...(data.minCartValue    !== undefined && { minCartValue:    data.minCartValue }),
      ...(data.scope           !== undefined && { scope:           data.scope }),
      ...(data.startsAt        !== undefined && { startsAt:        data.startsAt }),
      ...(data.endsAt          !== undefined && { endsAt:          data.endsAt }),
      ...(data.isActive        !== undefined && { isActive:        data.isActive }),
      ...(data.priority        !== undefined && { priority:        data.priority }),
      ...(data.bannerEnabled   !== undefined && { bannerEnabled:   data.bannerEnabled }),
      ...(data.bannerCtaText   !== undefined && { bannerCtaText:   data.bannerCtaText?.trim() || "Explore Courses" }),
      ...(data.bannerCtaUrl    !== undefined && { bannerCtaUrl:    data.bannerCtaUrl?.trim()  || "/courses" }),
      ...(data.bannerBgColor   !== undefined && { bannerBgColor:   data.bannerBgColor?.trim() || "#d97757" }),
      ...(data.bannerTextColor !== undefined && { bannerTextColor: data.bannerTextColor?.trim() || "#ffffff" }),
    },
  });

  return toAdmin(row);
}

export async function deletePlatformOffer(id: string): Promise<void> {
  // Orders/BookOrders that referenced this offer keep their snapshot
  // discount amount; the FK is set to null via SetNull is not configured
  // here, so we disconnect manually and then delete.
  await prisma.$transaction([
    prisma.order.updateMany({
      where: { platformOfferId: id },
      data:  { platformOfferId: null },
    }),
    prisma.bookOrder.updateMany({
      where: { platformOfferId: id },
      data:  { platformOfferId: null },
    }),
    prisma.platformOffer.delete({ where: { id } }),
  ]);
}

export async function getPlatformOfferById(
  id: string,
): Promise<AdminPlatformOffer | null> {
  const row = await prisma.platformOffer.findUnique({ where: { id } });
  return row ? toAdmin(row) : null;
}

export async function listPlatformOffers(
  opts?: PaginationParams,
): Promise<Paginated<AdminPlatformOffer>> {
  const { page, pageSize, skip, take } = parsePagination(opts);

  const [rows, total] = await Promise.all([
    prisma.platformOffer.findMany({
      orderBy: [{ isActive: "desc" }, { priority: "desc" }, { updatedAt: "desc" }],
      skip,
      take,
    }),
    prisma.platformOffer.count(),
  ]);

  return buildPaginated(rows.map(toAdmin), total, page, pageSize);
}

/**
 * Aggregated stats for the admin overview card row.
 */
export async function getPlatformOfferStats() {
  const now = new Date();
  const [total, active, discountAgg] = await Promise.all([
    prisma.platformOffer.count(),
    prisma.platformOffer.count({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt:   null }, { endsAt:   { gte: now } }] },
        ],
      },
    }),
    prisma.order.aggregate({
      where: { platformOfferId: { not: null } },
      _sum:  { platformOfferDiscount: true },
    }),
  ]);

  return {
    total,
    active,
    totalDiscountGiven: Number(discountAgg._sum.platformOfferDiscount ?? 0),
  };
}
