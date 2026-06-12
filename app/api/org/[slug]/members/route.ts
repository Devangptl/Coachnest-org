/**
 * GET  /api/org/[slug]/members — list members (ORG_ADMIN)
 * POST /api/org/[slug]/members — add/invite a member (ORG_ADMIN)
 */
import { NextRequest, NextResponse } from "next/server";
import { requireOrgRole, orgAuthErrorResponse } from "@/lib/org-auth";
import { addOrgMemberSchema, orgRoleEnum } from "@/lib/validation/org";
import { listOrgMembers, addOrgMember } from "@/services/organization.service";

type Params = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;
    const ctx = await requireOrgRole(slug, ["ORG_ADMIN"], { allowExpired: true });

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
    const ctx = await requireOrgRole(slug, ["ORG_ADMIN"]);

    const parsed = addOrgMemberSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
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
