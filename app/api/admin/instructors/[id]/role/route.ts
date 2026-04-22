/**
 * PATCH /api/admin/instructors/[id]/role — Change role (promote/demote).
 * Accepts { role: "STUDENT" | "INSTRUCTOR" }. ADMIN role is not assignable here.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";

const ASSIGNABLE = new Set(["STUDENT", "INSTRUCTOR"]);

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
    const { role } = await req.json().catch(() => ({}));

    if (!role || !ASSIGNABLE.has(role)) {
      return NextResponse.json(
        { error: "role must be STUDENT or INSTRUCTOR." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, _count: { select: { courses: true } } },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (role === "STUDENT" && user._count.courses > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot demote an instructor who still owns courses. Reassign their courses first.",
        },
        { status: 409 }
      );
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, role: true, name: true, email: true },
    });

    // Ensure a wallet exists when promoting.
    if (role === "INSTRUCTOR") {
      await prisma.instructorWallet.upsert({
        where: { userId: id },
        create: { userId: id },
        update: {},
      });
    }

    // Mirror role to Supabase app_metadata so middleware/session reflect it.
    await supabaseAdmin.auth.admin.updateUserById(id, {
      app_metadata: { role },
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error("[PATCH /api/admin/instructors/[id]/role]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
