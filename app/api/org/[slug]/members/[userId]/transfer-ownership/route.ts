/**
 * POST /api/org/[slug]/members/[userId]/transfer-ownership
 * Promotes the target member to ORG_OWNER and demotes the current owner
 * (the caller) to ORG_ADMIN. Requires members:assign_owner (ORG_OWNER, or a
 * platform admin acting in oversight).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireOrgPermission, orgAuthErrorResponse } from "@/lib/org-auth";
import { transferOrgOwnership, getOrgMemberInfo } from "@/services/organization.service";
import { logOrgAudit } from "@/services/org-audit.service";

type Params = { params: Promise<{ slug: string; userId: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const { slug, userId } = await params;
    const ctx = await requireOrgPermission(slug, "members:assign_owner");

    const target = await getOrgMemberInfo(ctx.org.id, userId);
    await transferOrgOwnership(ctx.org.id, ctx.session.userId, userId);
    await logOrgAudit({
      organizationId: ctx.org.id,
      actorUserId: ctx.session.userId,
      actorName: ctx.session.name,
      action: "member.transfer_ownership",
      targetType: "member",
      targetId: userId,
      targetLabel: target?.user?.name ?? userId,
    });
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
