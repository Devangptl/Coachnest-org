/**
 * GET /api/features/[featureId]
 * Returns details of a single platform feature and whether the current user has access.
 *
 * [featureId] may be either the DB id or the unique slug.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasFeatureAccess } from "@/lib/feature-access";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ featureId: string }> }
) {
  try {
    const { featureId } = await params;
    const session = await getSession();

    // Accept either DB id or slug
    const feature = await prisma.platformFeature.findFirst({
      where: { OR: [{ id: featureId }, { slug: featureId }] },
      select: { id: true, name: true, slug: true, description: true, price: true, isActive: true },
    });

    if (!feature) {
      return NextResponse.json({ error: "Feature not found." }, { status: 404 });
    }

    let hasAccess = false;
    if (session) {
      hasAccess = await hasFeatureAccess(session.userId, session.role, feature.slug);
    }

    return NextResponse.json({ feature: { ...feature, hasAccess } });
  } catch (err) {
    console.error("[GET /api/features/[featureId]]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
