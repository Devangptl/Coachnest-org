/**
 * PATCH /api/org/[slug]/settings — update org name/email/phone/logo.
 * Slug is intentionally immutable here (it keys the middleware claims).
 * ORG_ADMIN; works while expired.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireOrgRole, orgAuthErrorResponse } from "@/lib/org-auth";
import { updateOrganizationSchema } from "@/lib/validation/org";
import { updateOrganization } from "@/services/organization.service";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const ctx = await requireOrgRole(slug, ["ORG_ADMIN"], { allowExpired: true });

    const parsed = updateOrganizationSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const org = await updateOrganization(ctx.org.id, parsed.data);
    return NextResponse.json({
      org: { name: org.name, email: org.email, phone: org.phone, logo: org.logo },
    });
  } catch (error) {
    const res = orgAuthErrorResponse(error);
    if (res) return res;
    console.error("[PATCH /api/org/[slug]/settings]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
