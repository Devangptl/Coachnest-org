/**
 * POST /api/auth/forgot-password
 * Sends a Supabase password-reset email to the given address.
 * Always returns 200 to avoid leaking which emails exist.
 */
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const supabase  = await createSupabaseServerClient();
    const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const redirectTo = `${appUrl}/reset-password`;

    await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    // Always 200 — don't reveal whether the email exists
    return NextResponse.json({
      message: "If an account with that email exists, a reset link has been sent.",
    });
  } catch (err) {
    console.error("[forgot-password]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
