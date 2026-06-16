import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase";
import { prisma } from "@/lib/prisma";
import { sendWelcomeEmail } from "@/lib/email";

/**
 * GET /auth/callback
 * Handles email confirmation links and Google OAuth callbacks.
 * Always redirects — never throws — so the session cookie is always committed.
 */

/**
 * Returns an HTML page that immediately redirects via JavaScript.
 * This breaks the Google OAuth redirect chain so mobile browsers (Chrome Android
 * in particular) re-evaluate the viewport meta tag before landing on the app,
 * preventing the "desktop site" layout from being shown on mobile.
 */
function mobileRedirect(path: string): NextResponse {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=5">
  <script>window.location.replace(${JSON.stringify(path)});</script>
</head>
<body></body>
</html>`;
  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

/** Only honor app-internal absolute paths — never external/protocol-relative. */
function safeNext(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", req.url));
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    console.error("[auth/callback] exchangeCodeForSession failed:", error?.message);
    return NextResponse.redirect(new URL("/login?error=confirmation_failed", req.url));
  }

  const user = data.user;

  // Determine role from query param (set by signup page Google button)
  const rawRole = (searchParams.get("role") ?? "STUDENT").toUpperCase();
  const role    = rawRole === "INSTRUCTOR" ? "INSTRUCTOR" : "STUDENT";

  // ── Check if this user already exists in the database ────────────────────────
  let existingProfile: {
    id: string;
    hasCompletedOnboarding: boolean;
    hasCompletedInstructorOnboarding: boolean;
    instructorStatus: string | null;
  } | null = null;

  try {
    existingProfile = await prisma.user.findUnique({
      where:  { id: user.id },
      select: {
        id: true,
        hasCompletedOnboarding: true,
        hasCompletedInstructorOnboarding: true,
        instructorStatus: true,
      },
    });
  } catch (err) {
    console.error("[auth/callback] profile lookup failed:", err);
    // Cannot determine user state — fall back to the org-only home.
    return mobileRedirect(next ?? "/org/register");
  }

  // ── New user — provision and send to onboarding ───────────────────────────────
  if (!existingProfile) {
    // Set role in Supabase app_metadata (non-critical — user is already logged in)
    try {
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        app_metadata: {
          role,
          ...(role === "INSTRUCTOR" ? { instructorStatus: "PENDING" } : {}),
        },
      });
    } catch (adminErr) {
      console.error("[auth/callback] app_metadata update failed:", adminErr);
    }

    // Create profile in database
    try {
      const name   = (
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        user.email!.split("@")[0]
      ) as string;
      const avatar = (user.user_metadata?.avatar_url ?? null) as string | null;

      await prisma.user.upsert({
        where:  { id: user.id },
        create: {
          id:     user.id,
          email:  user.email!,
          name,
          avatar,
          role:   role as "STUDENT" | "INSTRUCTOR",
          ...(role === "INSTRUCTOR" ? {
            instructorStatus:    "PENDING",
            instructorAppliedAt: new Date(),
          } : {}),
        },
        update: {},
      });

      sendWelcomeEmail(user.email!, name).catch(console.error);
    } catch (provisionErr) {
      console.error("[auth/callback] user provisioning failed:", provisionErr);
    }

    // New platform users land on the org-only home.
    return mobileRedirect(next ?? "/org/register");
  }

  // ── Returning user — route by their existing role ─────────────────────────────
  // Org-only build: the only platform home is /admin (ADMIN); every other role
  // falls back to /org/register. Honor a validated return path when present.
  const existingRole = (user.app_metadata?.role ?? "STUDENT") as string;

  if (existingRole === "ADMIN") {
    return mobileRedirect(next ?? "/admin");
  }

  return mobileRedirect(next ?? "/org/register");
}
