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

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SessionPayload {
  userId: string;
  email: string;
  role: "STUDENT" | "INSTRUCTOR" | "ADMIN";
  name: string;
  avatar?: string | null;
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

  return {
    userId: user.id,
    email: user.email!,
    role: (user.app_metadata?.role ?? "STUDENT") as SessionPayload["role"],
    name: user.user_metadata?.name ?? user.email!.split("@")[0],
    avatar: user.user_metadata?.avatar ?? null,
  };
});
