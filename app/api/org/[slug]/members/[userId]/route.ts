/**
 * PATCH  /api/org/[slug]/members/[userId] — change a member's org role (members:manage)
 * DELETE /api/org/[slug]/members/[userId] — remove a member (members:manage)
 *
 * Both enforce the role hierarchy: you may only manage members you outrank and
 * assign roles you are allowed to grant (lib/org-permissions).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireOrgPermission, orgAuthErrorResponse } from "@/lib/org-auth";
import { updateOrgMemberSchema } from "@/lib/validation/org";
import { canManageMember, canAssignRole } from "@/lib/org-permissions";
import {
  updateOrgMemberRole,
  removeOrgMember,
  getOrgMemberRole,
  getOrgMemberInfo,
} from "@/services/organization.service";
import { logOrgAudit } from "@/services/org-audit.service";

type Params = { params: Promise<{ slug: string; userId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { slug, userId } = await params;
    const ctx = await requireOrgPermission(slug, "members:manage");

    const parsed = updateOrgMemberSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const newRole = parsed.data.role;

    const currentRole = await getOrgMemberRole(ctx.org.id, userId);
    if (!currentRole) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (!ctx.isPlatformAdmin) {
      if (!canManageMember(ctx.role, currentRole)) {
        return NextResponse.json({ error: "You cannot manage this member" }, { status: 403 });
      }
      if (!canAssignRole(ctx.role, newRole)) {
        return NextResponse.json({ error: "You cannot assign that role" }, { status: 403 });
      }
    }

    const member = await updateOrgMemberRole(ctx.org.id, userId, newRole);
    await logOrgAudit({
      organizationId: ctx.org.id,
      actorUserId: ctx.session.userId,
      actorName: ctx.session.name,
      action: "member.role_change",
      targetType: "member",
      targetId: userId,
      targetLabel: member.user?.name ?? userId,
      metadata: { from: currentRole, to: newRole },
    });
    return NextResponse.json({ member });
  } catch (error) {
    const res = orgAuthErrorResponse(error);
    if (res) return res;
    console.error("[PATCH /api/org/[slug]/members/[userId]]", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      {
        status: message.includes("limit") || message.includes("last")
          ? 409
          : message.includes("not found")
            ? 404
            : 500,
      },
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { slug, userId } = await params;
    const ctx = await requireOrgPermission(slug, "members:manage");

    if (userId === ctx.session.userId) {
      return NextResponse.json({ error: "You cannot remove yourself" }, { status: 400 });
    }

    const info = await getOrgMemberInfo(ctx.org.id, userId);
    if (!info) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    if (!ctx.isPlatformAdmin && !canManageMember(ctx.role, info.role)) {
      return NextResponse.json({ error: "You cannot manage this member" }, { status: 403 });
    }

    await removeOrgMember(ctx.org.id, userId);
    await logOrgAudit({
      organizationId: ctx.org.id,
      actorUserId: ctx.session.userId,
      actorName: ctx.session.name,
      action: "member.remove",
      targetType: "member",
      targetId: userId,
      targetLabel: info.user?.name ?? userId,
      metadata: { role: info.role },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    const res = orgAuthErrorResponse(error);
    if (res) return res;
    console.error("[DELETE /api/org/[slug]/members/[userId]]", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: message.includes("last") ? 409 : message.includes("not found") ? 404 : 500 },
    );
  }
}
