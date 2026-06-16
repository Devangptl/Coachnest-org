/**
 * Org auth — authoritative, DB-backed tenant access checks.
 *
 * Every /api/org/[slug]/** route and every app/org/[slug]/** layout resolves
 * the organization from the URL slug and the caller's OrganizationMember row.
 * The organizationId used in queries ALWAYS comes from this context — never
 * from a client-supplied id.
 *
 * Platform SUPER_ADMINs pass without a membership row (oversight access,
 * treated as ORG_ADMIN inside the org).
 */
import { cache } from "react";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, type SessionPayload } from "@/lib/auth";
import type { OrgRole, OrgStatus } from "@/lib/generated/prisma/client";
import {
  ROLE_PERMISSIONS,
  can as roleCan,
  orgRoleHome,
  type OrgPermission,
} from "@/lib/org-permissions";

export interface OrgContext {
  org: {
    id: string;
    slug: string;
    name: string;
    logo: string | null;
    status: OrgStatus;
  };
  role: OrgRole;
  isPlatformAdmin: boolean;
  /** Capabilities granted by `role`. Use `can()` rather than reading directly. */
  capabilities: OrgPermission[];
  session: SessionPayload;
}

/** True when the context's role (platform admins included) grants `permission`. */
export function ctxCan(ctx: OrgContext, permission: OrgPermission): boolean {
  return ctx.isPlatformAdmin || ctx.capabilities.includes(permission);
}

export class OrgAuthError extends Error {
  constructor(
    public status: 401 | 403 | 404,
    message: string,
  ) {
    super(message);
    this.name = "OrgAuthError";
  }
}

export const getOrgBySlug = cache(async (slug: string) =>
  prisma.organization.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true, logo: true, status: true },
  }),
);

/** Returns null when there is no session or no membership (and not SUPER_ADMIN). */
export const getOrgContext = cache(async (slug: string): Promise<OrgContext | null> => {
  const org = await getOrgBySlug(slug);
  if (!org) return null;

  const session = await getSession();
  if (!session) return null;

  const isPlatformAdmin =
    session.role === "ADMIN" && (session.adminSubRole ?? "SUPER_ADMIN") === "SUPER_ADMIN";

  const membership = await prisma.organizationMember.findUnique({
    where: { userId_organizationId: { userId: session.userId, organizationId: org.id } },
    select: { role: true },
  });

  if (!membership && !isPlatformAdmin) return null;

  // Platform SUPER_ADMINs without a membership act as ORG_OWNER (full oversight).
  const role: OrgRole = membership?.role ?? "ORG_OWNER";

  return {
    org,
    role,
    isPlatformAdmin,
    capabilities: ROLE_PERMISSIONS[role],
    session,
  };
});

/**
 * Guard for org routes. Throws OrgAuthError:
 *   404 — unknown slug
 *   401 — no session
 *   403 — not a member / insufficient role / org not active
 *
 * `allowExpired` lets ORG_ADMIN billing/settings routes work while the org
 * is PENDING or EXPIRED so the admin can complete or renew the payment.
 */
export async function requireOrgRole(
  slug: string,
  roles: OrgRole[],
  opts?: { allowExpired?: boolean },
): Promise<OrgContext> {
  const ctx = await resolveOrgAccess(slug, opts);
  if (!ctx.isPlatformAdmin && !roles.includes(ctx.role)) {
    throw new OrgAuthError(403, "Insufficient role for this organization area");
  }
  return ctx;
}

/**
 * Capability-based guard — the preferred way to gate org routes/pages.
 * Pass one permission or several (the caller must hold ALL of them).
 * Platform SUPER_ADMINs always pass.
 */
export async function requireOrgPermission(
  slug: string,
  permission: OrgPermission | OrgPermission[],
  opts?: { allowExpired?: boolean },
): Promise<OrgContext> {
  const ctx = await resolveOrgAccess(slug, opts);
  if (ctx.isPlatformAdmin) return ctx;
  const required = Array.isArray(permission) ? permission : [permission];
  if (!required.every((p) => roleCan(ctx.role, p))) {
    throw new OrgAuthError(403, "Insufficient permissions for this action");
  }
  return ctx;
}

/**
 * Shared resolution + subscription-status gate for both guards. Throws:
 *   404 — unknown slug · 401 — no session · 403 — not a member / inactive org
 */
async function resolveOrgAccess(
  slug: string,
  opts?: { allowExpired?: boolean },
): Promise<OrgContext> {
  const org = await getOrgBySlug(slug);
  if (!org) throw new OrgAuthError(404, "Organization not found");

  const session = await getSession();
  if (!session) throw new OrgAuthError(401, "Not authenticated");

  const ctx = await getOrgContext(slug);
  if (!ctx) throw new OrgAuthError(403, "Not a member of this organization");

  if (!opts?.allowExpired && !ctx.isPlatformAdmin) {
    if (org.status !== "ACTIVE") {
      throw new OrgAuthError(403, "Organization subscription is not active");
    }
    // Read-time expiry check so access locks even before the cron sweep
    // flips the org status.
    const active = await prisma.organizationSubscription.findFirst({
      where: { organizationId: org.id, status: "ACTIVE" },
      select: { endDate: true },
      orderBy: { endDate: "desc" },
    });
    if (active?.endDate && active.endDate < new Date()) {
      throw new OrgAuthError(403, "Organization subscription has expired");
    }
  }

  return ctx;
}

/** Maps OrgAuthError to a JSON response; returns null for other errors. */
export function orgAuthErrorResponse(err: unknown): NextResponse | null {
  if (err instanceof OrgAuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  return null;
}

/**
 * Content-access check for org courses on the shared course/lesson pages.
 * Returns true for platform courses (organizationId null). For org courses
 * the viewer must be an org member or a platform ADMIN.
 *
 * Only call the session lookup for org courses — platform course pages stay
 * statically renderable (no cookies() touch).
 */
export async function canViewOrgCourse(organizationId: string | null): Promise<boolean> {
  if (!organizationId) return true;
  const session = await getSession();
  if (!session) return false;
  if (session.role === "ADMIN") return true;
  const membership = await prisma.organizationMember.findUnique({
    where: { userId_organizationId: { userId: session.userId, organizationId } },
    select: { userId: true },
  });
  return !!membership;
}

/** Portal home for a given org role — shared by middleware-style redirects. */
export function orgHomePath(slug: string, role: OrgRole): string {
  return orgRoleHome(slug, role);
}
