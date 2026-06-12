/**
 * GET /api/org/[slug]/me — the caller's membership in this org.
 * Used by the org login page to route to the right portal after auth.
 */
import { NextRequest, NextResponse } from "next/server";
import { getOrgContext, getOrgBySlug } from "@/lib/org-auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const org = await getOrgBySlug(slug);
    if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    const ctx = await getOrgContext(slug);
    if (!ctx) return NextResponse.json({ error: "Not a member" }, { status: 403 });

    return NextResponse.json({
      org: { name: ctx.org.name, slug: ctx.org.slug, logo: ctx.org.logo, status: ctx.org.status },
      role: ctx.role,
      isPlatformAdmin: ctx.isPlatformAdmin,
    });
  } catch (error) {
    console.error("[GET /api/org/[slug]/me]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
