/**
 * GET    /api/admin/instructors/[id] — Get instructor detail.
 * PATCH  /api/admin/instructors/[id] — Update profile fields.
 * DELETE /api/admin/instructors/[id] — Remove instructor account (Supabase + Prisma).
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";
import {
  getInstructorDetails,
  updateInstructorProfile,
} from "@/services/instructor.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await params;
    const instructor = await getInstructorDetails(id);
    if (!instructor) {
      return NextResponse.json({ error: "Instructor not found." }, { status: 404 });
    }

    return NextResponse.json({ instructor });
  } catch (error) {
    console.error("[GET /api/admin/instructors/[id]]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.user.findFirst({
      where: { id, role: "INSTRUCTOR" },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Instructor not found." }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const { name, headline, bio, website, avatar } = body ?? {};

    if (name !== undefined && !String(name).trim()) {
      return NextResponse.json({ error: "name cannot be empty." }, { status: 400 });
    }

    const updated = await updateInstructorProfile(id, {
      name: name !== undefined ? String(name).trim() : undefined,
      headline: headline !== undefined ? (String(headline).trim() || null) : undefined,
      bio:      bio      !== undefined ? (String(bio).trim()      || null) : undefined,
      website:  website  !== undefined ? (String(website).trim()  || null) : undefined,
      avatar:   avatar   !== undefined ? (avatar || null) : undefined,
    });

    // Keep Supabase user_metadata in sync so the session reflects changes.
    if (name !== undefined || avatar !== undefined) {
      const metaUpdate: Record<string, unknown> = {};
      if (name   !== undefined) metaUpdate.name   = String(name).trim();
      if (avatar !== undefined) metaUpdate.avatar = avatar || null;
      await supabaseAdmin.auth.admin.updateUserById(id, {
        user_metadata: metaUpdate,
      });
    }

    return NextResponse.json({ instructor: updated });
  } catch (error) {
    console.error("[PATCH /api/admin/instructors/[id]]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await params;
    if (id === session.userId) {
      return NextResponse.json(
        { error: "You cannot delete your own account." },
        { status: 400 }
      );
    }

    const instructor = await prisma.user.findFirst({
      where: { id, role: "INSTRUCTOR" },
      select: {
        id: true,
        _count: { select: { courses: true } },
      },
    });
    if (!instructor) {
      return NextResponse.json({ error: "Instructor not found." }, { status: 404 });
    }
    if (instructor._count.courses > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete an instructor who still owns courses. Reassign or archive their courses first.",
        },
        { status: 409 }
      );
    }

    // Delete Supabase auth user first; on cascade Prisma row is normally removed
    // by the auth trigger, but we also delete defensively.
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (authErr && !/not.*found/i.test(authErr.message)) {
      return NextResponse.json({ error: authErr.message }, { status: 400 });
    }

    await prisma.user.deleteMany({ where: { id, role: "INSTRUCTOR" } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/admin/instructors/[id]]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
