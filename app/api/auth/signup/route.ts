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
    const { name, email, password, role: rawRole } = await req.json();
    const role = rawRole === "INSTRUCTOR" ? "INSTRUCTOR" : "STUDENT";

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
      app_metadata: { role },
    });

    // ── 4. Upsert profile row — the on_auth_user_created trigger may have already
    //       inserted a minimal row; upsert ensures name/role are always correct.
    const user = await prisma.user.upsert({
      where: { id: data.user.id },
      create: {
        id:   data.user.id,
        name,
        email,
        role: role as "STUDENT" | "INSTRUCTOR",
      },
      update: {
        name,
        role: role as "STUDENT" | "INSTRUCTOR",
      },
    });

    // Only students need a subscription slot system
    if (role === "STUDENT") {
      await prisma.subscription.create({
        data: {
          userId:    data.user.id,
          plan:      "FREE",
          status:    "ACTIVE",
          startDate: new Date(),
        },
      });
    }

    return NextResponse.json(
      { message: "Account created.", userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("[signup]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
