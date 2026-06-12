/**
 * Auth helpers — session retrieval via Supabase Auth.
 *
 * The SessionPayload interface is unchanged so all existing route handlers,
 * server components, and middleware that call getSession() work without modification.
 *
 * Role is stored in auth.users app_metadata (set by service role on signup/role change).
 * Name and avatar are stored in auth.users user_metadata.
 */
import { cache } from "react";
import { createSupabaseServerClient } from "./supabase/server";
import type { AdminSubRole } from "./admin-permissions";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OrgRoleClaim = "ORG_ADMIN" | "ORG_INSTRUCTOR" | "ORG_STUDENT";

export interface SessionPayload {
  userId: string;
  email: string;
  role: "STUDENT" | "INSTRUCTOR" | "ADMIN";
  // Only meaningful when role === "ADMIN". Mirrored from Supabase
  // app_metadata so middleware/session can read it without a DB hit.
  adminSubRole: AdminSubRole | null;
  name: string;
  avatar?: string | null;
  // Org memberships keyed by org slug, mirrored from app_metadata.orgs.
  // Navigation hint only — may lag the DB until the next token refresh;
  // authoritative checks live in lib/org-auth.ts (requireOrgRole).
  orgs: Record<string, OrgRoleClaim>;
}

// ─── Session retrieval ────────────────────────────────────────────────────────

/**
 * Reads and validates the current Supabase session.
 * Memoized with React cache() so multiple calls in the same request
 * only hit Supabase Auth once.
 */
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const role = (user.app_metadata?.role ?? "STUDENT") as SessionPayload["role"];
  const rawSub = user.app_metadata?.adminSubRole as AdminSubRole | undefined;

  return {
    userId: user.id,
    email: user.email!,
    role,
    adminSubRole: role === "ADMIN" ? rawSub ?? "SUPER_ADMIN" : null,
    name: user.user_metadata?.name ?? user.email!.split("@")[0],
    avatar: user.user_metadata?.avatar ?? null,
    orgs: (user.app_metadata?.orgs ?? {}) as Record<string, OrgRoleClaim>,
  };
});
