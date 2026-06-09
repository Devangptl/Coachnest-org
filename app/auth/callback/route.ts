import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase";
import { prisma } from "@/lib/prisma";
import { sendWelcomeEmail } from "@/lib/email";

/**
 * GET /auth/callback
 * Handles two cases:
 *  1. Email confirmation link — exchanges code for session, then routes by role.
 *  2. Google OAuth callback — same flow but also provisions new users into Prisma.
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
    return NextResponse.redirect(
      new URL("/login?error=confirmation_failed", req.url)
    );
  }

  const user = data.user;

  // ── Provision new OAuth users (Google) ──────────────────────────────────────
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
    // New user arriving via Google OAuth — determine role from callback query param.
    const rawRole = (searchParams.get("role") ?? "STUDENT").toUpperCase();
    const role    = rawRole === "INSTRUCTOR" ? "INSTRUCTOR" : "STUDENT";

    // Set role (and instructor status) in Supabase app_metadata.
    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      app_metadata: {
        role,
        ...(role === "INSTRUCTOR" ? { instructorStatus: "PENDING" } : {}),
      },
    });

    const name   = (user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email!.split("@")[0]) as string;
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

    if (role === "INSTRUCTOR") {
      return NextResponse.redirect(new URL("/onboarding/instructor", req.url));
    }
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  // ── Returning user — route by role ──────────────────────────────────────────
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
    const destination = existingProfile.instructorStatus === "APPROVED" ? "/instructor" : "/instructor/pending";
    return NextResponse.redirect(new URL(destination, req.url));
  }

  if (role === "ADMIN") {
    return NextResponse.redirect(new URL(next ?? "/admin", req.url));
  }

  return NextResponse.redirect(new URL(next ?? "/dashboard", req.url));
}
