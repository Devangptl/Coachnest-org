/**
 * GET /api/platform-offer/active
 *
 * Public endpoint — returns the currently-effective platform-wide offer
 * (auto-applied discount + landing-page banner data), or `null` when no
 * offer is active. Read-only; safe to expose without auth.
 *
 * Query:
 *   ?scope=courses | books | any (default: any)
 *
 * Cache: short edge cache (60 s) so the banner doesn't hit the DB on every
 * landing-page render. Admin mutations bust the cache by tag.
 */
import { NextRequest, NextResponse } from "next/server";
import { getActivePlatformOfferPublic } from "@/services/platform-offer.service";

export const runtime = "nodejs";
export const revalidate = 60;

export async function GET(req: NextRequest) {
  const scopeParam = req.nextUrl.searchParams.get("scope")?.toUpperCase();
  const scope: "COURSES" | "BOOKS" | "ANY" =
    scopeParam === "COURSES" || scopeParam === "BOOKS" ? scopeParam : "ANY";

  try {
    const offer = await getActivePlatformOfferPublic(scope);
    return NextResponse.json(
      { offer },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (err) {
    console.error("[platform-offer/active]", err);
    return NextResponse.json({ offer: null }, { status: 200 });
  }
}
