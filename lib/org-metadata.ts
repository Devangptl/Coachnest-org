/**
 * Org membership claims sync — mirrors a user's OrganizationMember rows into
 * Supabase app_metadata so the Edge middleware (which cannot query the DB)
 * can route /org/[slug]/* requests by claim.
 *
 * Claims are a NAVIGATION HINT only: the live JWT refreshes them on the next
 * token refresh, so they can lag the DB. Authoritative access checks are
 * always DB-backed (lib/org-auth.ts).
 *
 * Call after every membership mutation (add / remove / role change).
 */
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";
import type { OrgRoleClaim } from "@/lib/auth";

export async function syncOrgMetadata(userId: string): Promise<void> {
  try {
    const memberships = await prisma.organizationMember.findMany({
      where: { userId },
      select: { role: true, organization: { select: { slug: true } } },
    });

    const orgs: Record<string, OrgRoleClaim> = {};
    for (const m of memberships) orgs[m.organization.slug] = m.role;

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      app_metadata: { orgs },
    });
    if (error) throw error;
  } catch (err) {
    // The DB row is authoritative; a failed claims sync only delays
    // middleware-level navigation until the next successful sync.
    console.error(`[syncOrgMetadata] failed for user ${userId}:`, err);
  }
}
