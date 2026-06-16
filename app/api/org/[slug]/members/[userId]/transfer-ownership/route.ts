/**
 * POST /api/org/[slug]/members/[userId]/transfer-ownership
 * Promotes the target member to ORG_OWNER and demotes the current owner
 * (the caller) to ORG_ADMIN. Requires members:assign_owner (ORG_OWNER, or a
 * platform admin acting in oversight).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireOrgPermission, orgAuthErrorResponse } from "@/lib/org-auth";
import { transferOrgOwnership } from "@/services/organization.service";

type Params = { params: Promise<{ slug: string; userId: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const { slug, userId } = await params;
    const ctx = await requireOrgPermission(slug, "members:assign_owner");

    await transferOrgOwnership(ctx.org.id, ctx.session.userId, userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const res = orgAuthErrorResponse(error);
    if (res) return res;
    console.error("[POST /api/org/[slug]/members/[userId]/transfer-ownership]", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: message.includes("not found") ? 404 : message.includes("already") ? 400 : 500 },
    );
  }
}
