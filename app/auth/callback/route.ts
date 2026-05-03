import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /auth/callback
 * Supabase redirects here after the user clicks the email confirmation link.
 * Exchanges the one-time code for a session then sends the user to their portal.
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

  const role = (data.user.app_metadata?.role ?? "STUDENT") as string;

  // Students go to onboarding first unless they've already completed it.
  if (role === "STUDENT") {
    if (next) {
      return NextResponse.redirect(new URL(next, req.url));
    }
    const profile = await prisma.user.findUnique({
      where: { id: data.user.id },
      select: { hasCompletedOnboarding: true },
    });
    const destination = profile?.hasCompletedOnboarding ? "/dashboard" : "/onboarding";
    return NextResponse.redirect(new URL(destination, req.url));
  }

  if (role === "INSTRUCTOR") {
    return NextResponse.redirect(new URL(next ?? "/instructor", req.url));
  }

  if (role === "ADMIN") {
    return NextResponse.redirect(new URL(next ?? "/admin", req.url));
  }

  return NextResponse.redirect(new URL(next ?? "/dashboard", req.url));
}
