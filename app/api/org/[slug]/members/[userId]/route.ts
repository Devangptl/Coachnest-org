/**
 * PATCH  /api/org/[slug]/members/[userId] — change a member's org role (ORG_ADMIN)
 * DELETE /api/org/[slug]/members/[userId] — remove a member (ORG_ADMIN)
 */
import { NextRequest, NextResponse } from "next/server";
import { requireOrgRole, orgAuthErrorResponse } from "@/lib/org-auth";
import { updateOrgMemberSchema } from "@/lib/validation/org";
import { updateOrgMemberRole, removeOrgMember } from "@/services/organization.service";

type Params = { params: Promise<{ slug: string; userId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { slug, userId } = await params;
    const ctx = await requireOrgRole(slug, ["ORG_ADMIN"]);

    const parsed = updateOrgMemberSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    if (userId === ctx.session.userId && parsed.data.role !== "ORG_ADMIN") {
      return NextResponse.json({ error: "You cannot demote yourself" }, { status: 400 });
    }

    const member = await updateOrgMemberRole(ctx.org.id, userId, parsed.data.role);
    return NextResponse.json({ member });
  } catch (error) {
    const res = orgAuthErrorResponse(error);
    if (res) return res;
    console.error("[PATCH /api/org/[slug]/members/[userId]]", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: message.includes("limit") ? 409 : message.includes("not found") ? 404 : 500 },
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { slug, userId } = await params;
    const ctx = await requireOrgRole(slug, ["ORG_ADMIN"]);

    if (userId === ctx.session.userId) {
      return NextResponse.json({ error: "You cannot remove yourself" }, { status: 400 });
    }

    await removeOrgMember(ctx.org.id, userId);
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
