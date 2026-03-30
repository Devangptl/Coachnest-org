/**
 * POST /api/auth/signup
 * Creates account in Supabase Auth + profile row in public.users.
 * Session cookies are set automatically.
 */
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required." },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    // ── 1. Check for existing profile ────────────────────────────────────────
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // ── 2. Create user in Supabase Auth ──────────────────────────────────────
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, avatar: null }, // stored in user_metadata
      },
    });

    if (error || !data.user) {
      return NextResponse.json(
        { error: error?.message ?? "Failed to create account." },
        { status: 400 }
      );
    }

    // ── 3. Set role in app_metadata (service role only) ───────────────────────
    await supabaseAdmin.auth.admin.updateUserById(data.user.id, {
      app_metadata: { role: "STUDENT" },
    });

    // ── 4. Create profile row in public.users + BASIC subscription ───────────
    const [user] = await prisma.$transaction([
      prisma.user.create({
        data: {
          id:    data.user.id, // UUID from auth.users — keeps both tables in sync
          name,
          email,
        },
      }),
      prisma.subscription.create({
        data: {
          userId:    data.user.id,
          plan:      "BASIC",
          status:    "ACTIVE",
          startDate: new Date(),
          // No endDate — BASIC plan persists until the user upgrades or cancels
        },
      }),
    ]);

    return NextResponse.json(
      { message: "Account created.", userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("[signup]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
