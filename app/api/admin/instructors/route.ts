/**
 * GET  /api/admin/instructors — List instructors (with search + sort).
 * POST /api/admin/instructors — Create a new instructor account (Supabase + Prisma).
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";
import {
  getInstructorsList,
  getInstructorStats,
  type InstructorListFilter,
} from "@/services/instructor.service";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const filter: InstructorListFilter = {
      search: searchParams.get("search")?.trim() || "",
      sort: (searchParams.get("sort") as InstructorListFilter["sort"]) || "newest",
    };

    const [instructors, stats] = await Promise.all([
      getInstructorsList(filter),
      getInstructorStats(),
    ]);

    return NextResponse.json({ instructors, stats });
  } catch (error) {
    console.error("[GET /api/admin/instructors]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { name, email, password, headline, bio, website } = body ?? {};

    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json(
        { error: "name, email, and password are required." },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email: email.trim() } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // Create account in Supabase Auth with email confirmed and INSTRUCTOR role.
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: { name: name.trim(), avatar: null },
      app_metadata: { role: "INSTRUCTOR" },
    });

    if (createErr || !created.user) {
      return NextResponse.json(
        { error: createErr?.message ?? "Failed to create auth user." },
        { status: 400 }
      );
    }

    // Upsert the public.users row (a trigger may have inserted a minimal one).
    const user = await prisma.user.upsert({
      where: { id: created.user.id },
      create: {
        id: created.user.id,
        name: name.trim(),
        email: email.trim(),
        role: "INSTRUCTOR",
        headline: headline?.trim() || null,
        bio: bio?.trim() || null,
        website: website?.trim() || null,
      },
      update: {
        name: name.trim(),
        role: "INSTRUCTOR",
        headline: headline?.trim() || null,
        bio: bio?.trim() || null,
        website: website?.trim() || null,
      },
      select: { id: true, name: true, email: true, role: true },
    });

    // Ensure a wallet exists for earnings tracking.
    await prisma.instructorWallet.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
    });

    return NextResponse.json({ instructor: user }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/instructors]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
