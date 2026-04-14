/**
 * GET /api/features
 * Returns all active platform feature add-ons with the current user's access status.
 *
 * Response:
 *   { features: [{ id, name, slug, description, price, hasAccess }] }
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserFeatureAccess } from "@/lib/feature-access";

export async function GET() {
  try {
    const session = await getSession();

    const features = await prisma.platformFeature.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true, description: true, price: true },
      orderBy: { name: "asc" },
    });

    // Attach per-user access flags
    if (session) {
      const accessSlugs = await getUserFeatureAccess(session.userId, session.role);
      const slugSet = new Set(accessSlugs);
      return NextResponse.json({
        features: features.map((f) => ({ ...f, hasAccess: slugSet.has(f.slug) })),
      });
    }

    return NextResponse.json({
      features: features.map((f) => ({ ...f, hasAccess: false })),
    });
  } catch (err) {
    console.error("[GET /api/features]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
