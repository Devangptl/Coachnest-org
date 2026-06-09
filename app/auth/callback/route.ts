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
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next");

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

  // ── Provision new OAuth users (Google) ──────────────────────────────────────
  try {
    const existingProfile = await prisma.user.findUnique({
      where:  { id: user.id },
      select: {
        id: true,
        hasCompletedOnboarding: true,
        hasCompletedInstructorOnboarding: true,
        instructorStatus: true,
      },
    });

    if (!existingProfile) {
      // New Google OAuth user — read role from callback query param
      const rawRole = (searchParams.get("role") ?? "STUDENT").toUpperCase();
      const role    = rawRole === "INSTRUCTOR" ? "INSTRUCTOR" : "STUDENT";

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
        // Continue — user is logged in, role can be fixed later
      }

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

      const destination = role === "INSTRUCTOR" ? "/onboarding/instructor" : "/onboarding";
      return NextResponse.redirect(new URL(destination, req.url));
    }

    // ── Returning user — route by role ────────────────────────────────────────
    const role = (user.app_metadata?.role ?? "STUDENT") as string;

    if (role === "STUDENT") {
      if (next) return NextResponse.redirect(new URL(next, req.url));
      const destination = existingProfile.hasCompletedOnboarding ? "/dashboard" : "/onboarding";
      return NextResponse.redirect(new URL(destination, req.url));
    }

    if (role === "INSTRUCTOR") {
      if (next) return NextResponse.redirect(new URL(next, req.url));
      if (!existingProfile.hasCompletedInstructorOnboarding) {
        return NextResponse.redirect(new URL("/onboarding/instructor", req.url));
      }
      const destination = existingProfile.instructorStatus === "APPROVED"
        ? "/instructor"
        : "/instructor/pending";
      return NextResponse.redirect(new URL(destination, req.url));
    }

    if (role === "ADMIN") {
      return NextResponse.redirect(new URL(next ?? "/admin", req.url));
    }

    return NextResponse.redirect(new URL(next ?? "/dashboard", req.url));

  } catch (err) {
    console.error("[auth/callback] provisioning error:", err);
    // Session is set — send user to dashboard even if provisioning failed
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
}
