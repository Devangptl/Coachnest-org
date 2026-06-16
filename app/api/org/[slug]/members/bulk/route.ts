/**
 * POST /api/org/[slug]/members/bulk — invite many members at once (members:manage).
 * Each row is invited independently; the response reports per-row success so a
 * few bad rows (duplicate, seat limit, unassignable role) don't fail the batch.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireOrgPermission, orgAuthErrorResponse } from "@/lib/org-auth";
import { bulkAddOrgMembersSchema } from "@/lib/validation/org";
import { canAssignRole } from "@/lib/org-permissions";
import { addOrgMember } from "@/services/organization.service";
import { logOrgAudit } from "@/services/org-audit.service";

type Params = { params: Promise<{ slug: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;
    const ctx = await requireOrgPermission(slug, "members:manage");

    const parsed = bulkAddOrgMembersSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const results: { email: string; ok: boolean; error?: string }[] = [];
    for (const row of parsed.data.members) {
      if (!ctx.isPlatformAdmin && !canAssignRole(ctx.role, row.role)) {
        results.push({ email: row.email, ok: false, error: "You cannot assign that role" });
        continue;
      }
      try {
        await addOrgMember(ctx.org.id, row);
        results.push({ email: row.email, ok: true });
      } catch (err) {
        results.push({
          email: row.email,
          ok: false,
          error: err instanceof Error ? err.message : "Failed",
        });
      }
    }

    const added = results.filter((r) => r.ok).length;
    if (added > 0) {
      await logOrgAudit({
        organizationId: ctx.org.id,
        actorUserId: ctx.session.userId,
        actorName: ctx.session.name,
        action: "member.bulk_invite",
        targetType: "member",
        metadata: { added, total: results.length },
      });
    }
    return NextResponse.json({ added, total: results.length, results });
  } catch (error) {
    const res = orgAuthErrorResponse(error);
    if (res) return res;
    console.error("[POST /api/org/[slug]/members/bulk]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
