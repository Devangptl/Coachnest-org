/**
 * PUT /api/profile/password — Change current user's password via Supabase Auth.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabase, supabaseAdmin } from "@/lib/supabase";

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current password and new password are required." },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters." },
        { status: 400 }
      );
    }

    // ── 1. Verify current password via Supabase Auth ──────────────────────────
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email:    session.email,
      password: currentPassword,
    });

    if (signInError) {
      return NextResponse.json(
        { error: "Current password is incorrect." },
        { status: 403 }
      );
    }

    // ── 2. Look up Supabase Auth user by email ────────────────────────────────
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;

    const authUser = users.find((u) => u.email === session.email);
    if (!authUser) {
      return NextResponse.json({ error: "Auth user not found." }, { status: 404 });
    }

    // ── 3. Update password in Supabase Auth ───────────────────────────────────
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      authUser.id,
      { password: newPassword }
    );

    if (updateError) throw updateError;

    return NextResponse.json({ message: "Password changed successfully." });
  } catch (error) {
    console.error("[profile:password]", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
