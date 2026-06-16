/**
 * Central org RBAC catalog — the single source of truth for org roles, their
 * relative rank, and the capabilities (permissions) each role grants.
 *
 * Pure module: no DB access and no server-only imports, so it is safe to
 * import from Edge middleware as well as from server components / routes.
 */
import type { OrgRole } from "@/lib/generated/prisma/client";

export const ORG_ROLES = [
  "ORG_OWNER",
  "ORG_ADMIN",
  "ORG_MANAGER",
  "ORG_INSTRUCTOR",
  "ORG_TA",
  "ORG_STUDENT",
  "ORG_OBSERVER",
] as const satisfies readonly OrgRole[];

/** Higher rank = more authority. Used for the member-management hierarchy. */
export const ORG_ROLE_RANK: Record<OrgRole, number> = {
  ORG_OWNER: 100,
  ORG_ADMIN: 80,
  ORG_MANAGER: 60,
  ORG_INSTRUCTOR: 40,
  ORG_TA: 30,
  ORG_STUDENT: 20,
  ORG_OBSERVER: 10,
};

export const ORG_ROLE_LABEL: Record<OrgRole, string> = {
  ORG_OWNER: "Owner",
  ORG_ADMIN: "Admin",
  ORG_MANAGER: "Manager",
  ORG_INSTRUCTOR: "Instructor",
  ORG_TA: "Teaching Assistant",
  ORG_STUDENT: "Student",
  ORG_OBSERVER: "Observer",
};

export const ORG_ROLE_DESCRIPTION: Record<OrgRole, string> = {
  ORG_OWNER: "Full control, including billing and ownership transfer.",
  ORG_ADMIN: "Manage members, courses, and settings (not billing or deletion).",
  ORG_MANAGER: "Manage members and course content; view reports. No billing.",
  ORG_INSTRUCTOR: "Create and manage their own courses and students.",
  ORG_TA: "Assist on assigned courses; cannot create courses.",
  ORG_STUDENT: "Enroll in and learn from organization courses.",
  ORG_OBSERVER: "Read-only access to reports, members, and the catalog.",
};

export type OrgPermission =
  | "org:view_admin" // access the admin portal shell
  | "org:manage_settings" // edit org profile / settings
  | "org:delete" // delete the organization
  | "billing:view" // view invoices / subscription
  | "billing:manage" // change plan, renew, refund
  | "members:view" // see the member list
  | "members:manage" // invite / remove / change member roles
  | "members:assign_owner" // transfer ownership
  | "course:view" // view org catalog + course content
  | "course:create" // create new org courses
  | "course:manage_any" // edit / delete any org course
  | "course:manage_own" // edit / delete own (or assigned) courses
  | "course:author_area" // access the instructor authoring portal
  | "students:view" // view students
  | "students:manage" // manage student enrollments
  | "reports:view" // view org reports / analytics
  | "learn"; // enroll and consume courses as a learner

export const ALL_ORG_PERMISSIONS: OrgPermission[] = [
  "org:view_admin",
  "org:manage_settings",
  "org:delete",
  "billing:view",
  "billing:manage",
  "members:view",
  "members:manage",
  "members:assign_owner",
  "course:view",
  "course:create",
  "course:manage_any",
  "course:manage_own",
  "course:author_area",
  "students:view",
  "students:manage",
  "reports:view",
  "learn",
];

export const ROLE_PERMISSIONS: Record<OrgRole, OrgPermission[]> = {
  ORG_OWNER: [...ALL_ORG_PERMISSIONS],
  ORG_ADMIN: [
    "org:view_admin",
    "org:manage_settings",
    "billing:view",
    "members:view",
    "members:manage",
    "course:view",
    "course:create",
    "course:manage_any",
    "course:author_area",
    "students:view",
    "students:manage",
    "reports:view",
    "learn",
  ],
  ORG_MANAGER: [
    "org:view_admin",
    "members:view",
    "members:manage",
    "course:view",
    "course:create",
    "course:manage_any",
    "course:author_area",
    "students:view",
    "students:manage",
    "reports:view",
    "learn",
  ],
  ORG_INSTRUCTOR: [
    "course:view",
    "course:create",
    "course:manage_own",
    "course:author_area",
    "students:view",
    "learn",
  ],
  ORG_TA: ["course:view", "course:manage_own", "course:author_area", "students:view", "learn"],
  ORG_STUDENT: ["course:view", "learn"],
  ORG_OBSERVER: ["org:view_admin", "members:view", "course:view", "students:view", "reports:view"],
};

/** Does a role grant a capability? */
export function can(role: OrgRole, permission: OrgPermission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/** All roles that grant a given capability — handy for building guards. */
export function rolesWith(permission: OrgPermission): OrgRole[] {
  return ORG_ROLES.filter((r) => can(r, permission));
}

// ── Role groups (derived, so they can never drift from the catalog) ──────────

/** Roles that can enter the admin portal. */
export const ORG_ADMIN_AREA_ROLES = rolesWith("org:view_admin");
/** Roles that can enter the instructor authoring portal. */
export const ORG_AUTHOR_ROLES = rolesWith("course:author_area");
/** Every org role — for member-scoped portals open to all members. */
export const ORG_ALL_ROLES = [...ORG_ROLES];

// ── Seat / plan-limit classification ─────────────────────────────────────────

/** Which plan seat bucket a role consumes, or null if it is unmetered staff. */
export function seatKindForRole(role: OrgRole): "students" | "instructors" | null {
  if (role === "ORG_STUDENT") return "students";
  if (role === "ORG_INSTRUCTOR" || role === "ORG_TA") return "instructors";
  return null;
}

// ── Member-management hierarchy ──────────────────────────────────────────────

/**
 * Can `actor` manage (re-role / remove) a member who currently holds
 * `target`? Only an owner may touch another owner; otherwise the actor must
 * hold members:manage and outrank-or-equal the target.
 */
export function canManageMember(actor: OrgRole, target: OrgRole): boolean {
  if (!can(actor, "members:manage")) return false;
  if (target === "ORG_OWNER") return actor === "ORG_OWNER";
  if (actor === "ORG_OWNER") return true;
  return ORG_ROLE_RANK[actor] >= ORG_ROLE_RANK[target];
}

/** Can `actor` assign `role` to a member? Owner role requires assign_owner. */
export function canAssignRole(actor: OrgRole, role: OrgRole): boolean {
  if (!can(actor, "members:manage")) return false;
  if (role === "ORG_OWNER") return can(actor, "members:assign_owner");
  if (actor === "ORG_OWNER") return true;
  return ORG_ROLE_RANK[actor] >= ORG_ROLE_RANK[role];
}

/** The set of roles `actor` is allowed to grant. */
export function assignableRoles(actor: OrgRole): OrgRole[] {
  return ORG_ROLES.filter((r) => canAssignRole(actor, r));
}

// ── Portal routing ───────────────────────────────────────────────────────────

/** Landing path for a role inside an org. */
export function orgRoleHome(slug: string, role: OrgRole): string {
  if (can(role, "org:view_admin")) return `/org/${slug}/admin`;
  if (can(role, "course:author_area")) return `/org/${slug}/instructor`;
  return `/org/${slug}/student`;
}
