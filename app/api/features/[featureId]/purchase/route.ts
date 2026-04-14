/**
 * POST /api/features/[featureId]/purchase
 * Initiates a Stripe Checkout session to purchase a platform feature add-on.
 *
 * Only students need to purchase features; admins and instructors have access by default.
 * Revenue from feature purchases goes 100% to the platform.
 *
 * Request body: (none required — featureId comes from path)
 *
 * Response:
 *   201 { orderId, sessionId, url }   — redirect the user to `url`
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createFeatureCheckoutSession } from "@/services/feature.service";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ featureId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { featureId: rawId } = await params;

    // Accept DB id or slug — resolve to DB id
    const feature = await prisma.platformFeature.findFirst({
      where: { OR: [{ id: rawId }, { slug: rawId }] },
      select: { id: true },
    });
    if (!feature) {
      return NextResponse.json({ error: "Feature not found." }, { status: 404 });
    }

    const result = await createFeatureCheckoutSession(session.userId, feature.id);
    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error.";
    // Surface business-rule errors (already purchased, not available, etc.)
    const isClientError =
      message.includes("already have access") ||
      message.includes("not currently available") ||
      message.includes("not found");
    return NextResponse.json({ error: message }, { status: isClientError ? 400 : 500 });
  }
}
