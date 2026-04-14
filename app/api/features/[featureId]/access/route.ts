/**
 * GET /api/features/[featureId]/access
 * Quick boolean access check for a platform feature.
 * Useful for client-side gating without fetching full feature details.
 *
 * Response:
 *   { hasAccess: boolean }
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
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ hasAccess: false });
    }

    const { featureId: rawId } = await params;

    // Accept DB id or slug
    const feature = await prisma.platformFeature.findFirst({
      where: { OR: [{ id: rawId }, { slug: rawId }] },
      select: { slug: true },
    });
    if (!feature) {
      return NextResponse.json({ hasAccess: false });
    }

    const access = await hasFeatureAccess(session.userId, session.role, feature.slug);
    return NextResponse.json({ hasAccess: access });
  } catch (err) {
    console.error("[GET /api/features/[featureId]/access]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
