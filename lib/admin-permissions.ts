/**
 * Admin sub-role permissions.
 *
 * Source of truth for which AdminSubRole can access which slice of /admin.
 * Used by:
 *  - middleware.ts          → server-side path guard
 *  - app/admin/layout.tsx   → second-line server guard
 *  - app/admin/AdminSidebar → nav filtering
 *  - API routes             → per-section authorization helpers
 *
 * To add a new admin page, add its segment to ADMIN_SECTIONS and assign
 * the sub-roles allowed to see it.
 */

export type AdminSubRole =
  | "SUPER_ADMIN"
  | "CONTENT_ADMIN"
  | "USER_ADMIN"
  | "FINANCE_ADMIN"
  | "SUPPORT";

export const ADMIN_SUB_ROLES: AdminSubRole[] = [
  "SUPER_ADMIN",
  "CONTENT_ADMIN",
  "USER_ADMIN",
  "FINANCE_ADMIN",
  "SUPPORT",
];

export const ADMIN_SUB_ROLE_LABELS: Record<AdminSubRole, string> = {
  SUPER_ADMIN:   "Super Admin",
  CONTENT_ADMIN: "Content Admin",
  USER_ADMIN:    "User Admin",
  FINANCE_ADMIN: "Finance Admin",
  SUPPORT:       "Support",
};

/**
 * Admin section = first path segment under /admin (e.g. "courses" for
 * "/admin/courses/123/edit"). Empty string represents the /admin root.
 *
 * `allow` lists the sub-roles that may access the section. SUPER_ADMIN
 * is included everywhere by definition.
 */
export interface AdminSection {
  segment: string;
  allow: AdminSubRole[];
}

export const ADMIN_SECTIONS: AdminSection[] = [
  // Always-visible
  { segment: "",                  allow: [...ADMIN_SUB_ROLES] }, // /admin overview
  { segment: "profile",           allow: [...ADMIN_SUB_ROLES] },

  // Content
  { segment: "courses",           allow: ["SUPER_ADMIN", "CONTENT_ADMIN"] },
  { segment: "collaborations",    allow: ["SUPER_ADMIN", "CONTENT_ADMIN", "FINANCE_ADMIN"] },
  { segment: "books",             allow: ["SUPER_ADMIN", "CONTENT_ADMIN"] },
  { segment: "playlists",         allow: ["SUPER_ADMIN", "CONTENT_ADMIN"] },
  { segment: "quizzes",           allow: ["SUPER_ADMIN", "CONTENT_ADMIN"] },
  { segment: "blogs",             allow: ["SUPER_ADMIN", "CONTENT_ADMIN"] },
  { segment: "certificates",      allow: ["SUPER_ADMIN", "CONTENT_ADMIN"] },
  { segment: "professions",       allow: ["SUPER_ADMIN", "CONTENT_ADMIN"] },

  // Users
  { segment: "students",          allow: ["SUPER_ADMIN", "USER_ADMIN"] },
  { segment: "instructors",       allow: ["SUPER_ADMIN", "USER_ADMIN"] },
  { segment: "enrollments",       allow: ["SUPER_ADMIN", "USER_ADMIN"] },

  // Finance
  { segment: "orders",            allow: ["SUPER_ADMIN", "FINANCE_ADMIN"] },
  { segment: "refunds",           allow: ["SUPER_ADMIN", "FINANCE_ADMIN"] },
  { segment: "payouts",           allow: ["SUPER_ADMIN", "FINANCE_ADMIN"] },
  { segment: "coupons",           allow: ["SUPER_ADMIN", "FINANCE_ADMIN"] },
  { segment: "platform-offers",   allow: ["SUPER_ADMIN", "FINANCE_ADMIN"] },
  { segment: "add-ons",           allow: ["SUPER_ADMIN", "FINANCE_ADMIN"] },

  // Support / communications
  { segment: "messages",          allow: ["SUPER_ADMIN", "SUPPORT"] },
  { segment: "demo-requests",     allow: ["SUPER_ADMIN", "SUPPORT"] },
  { segment: "email-templates",   allow: ["SUPER_ADMIN", "SUPPORT"] },
  { segment: "email-logs",        allow: ["SUPER_ADMIN", "SUPPORT"] },

  // Super-admin only
  { segment: "analytics",         allow: ["SUPER_ADMIN"] },
  { segment: "migrations",        allow: ["SUPER_ADMIN"] },
  { segment: "admins",            allow: ["SUPER_ADMIN"] },
];

/** Return the section segment for a path like "/admin", "/admin/courses/123". */
export function adminSectionFromPath(pathname: string): string | null {
  if (pathname === "/admin")              return "";
  if (!pathname.startsWith("/admin/"))    return null;
  const rest = pathname.slice("/admin/".length);
  return rest.split("/")[0] ?? "";
}

/** True if a given sub-role can access the given /admin path. */
export function canAccessAdminPath(
  subRole: AdminSubRole | null | undefined,
  pathname: string
): boolean {
  if (!subRole) return false;
  if (subRole === "SUPER_ADMIN") return true;

  const segment = adminSectionFromPath(pathname);
  if (segment === null) return false;

  const section = ADMIN_SECTIONS.find((s) => s.segment === segment);
  // Unknown segments default to deny for non-super admins (safe default;
  // add the segment to ADMIN_SECTIONS to open it up).
  if (!section) return false;

  return section.allow.includes(subRole);
}

/** First allowed admin section for a sub-role — used as a fallback redirect. */
export function firstAllowedAdminPath(subRole: AdminSubRole | null | undefined): string {
  if (!subRole) return "/dashboard";
  return "/admin";
}
