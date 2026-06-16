/**
 * GET  /api/org/[slug]/members — list members (members:view)
 * POST /api/org/[slug]/members — add/invite a member (members:manage)
 */
import { NextRequest, NextResponse } from "next/server";
import { requireOrgPermission, orgAuthErrorResponse } from "@/lib/org-auth";
import { addOrgMemberSchema, orgRoleEnum } from "@/lib/validation/org";
import { canAssignRole } from "@/lib/org-permissions";
import { listOrgMembers, addOrgMember } from "@/services/organization.service";

type Params = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;
    const ctx = await requireOrgPermission(slug, "members:view", { allowExpired: true });

    const roleParam = req.nextUrl.searchParams.get("role");
    const role = orgRoleEnum.safeParse(roleParam);
    const search = req.nextUrl.searchParams.get("search") ?? undefined;

    const members = await listOrgMembers(ctx.org.id, {
      role: role.success ? role.data : undefined,
      search,
    });
    return NextResponse.json({ members });
  } catch (error) {
    const res = orgAuthErrorResponse(error);
    if (res) return res;
    console.error("[GET /api/org/[slug]/members]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;
    const ctx = await requireOrgPermission(slug, "members:manage");

    const parsed = addOrgMemberSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    if (!ctx.isPlatformAdmin && !canAssignRole(ctx.role, parsed.data.role)) {
      return NextResponse.json(
        { error: "You cannot assign that role" },
        { status: 403 },
      );
    }

    const member = await addOrgMember(ctx.org.id, parsed.data);
    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    const res = orgAuthErrorResponse(error);
    if (res) return res;
    console.error("[POST /api/org/[slug]/members]", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: message.includes("already") || message.includes("limit") ? 409 : 500 },
    );
  }
}
