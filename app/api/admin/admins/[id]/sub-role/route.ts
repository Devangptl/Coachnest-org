/**
 * PATCH /api/admin/admins/[id]/sub-role
 *
 * SUPER_ADMIN-only endpoint to change another admin's sub-role.
 * Mirrors the new sub-role to Supabase app_metadata so the middleware
 * (which reads from the JWT) sees the change on the next request.
 *
 * Body: { subRole: AdminSubRole }
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";
import { ADMIN_SUB_ROLES, type AdminSubRole } from "@/lib/admin-permissions";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN" || session.adminSubRole !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await params;
    const { subRole } = (await req.json().catch(() => ({}))) as {
      subRole?: AdminSubRole;
    };

    if (!subRole || !ADMIN_SUB_ROLES.includes(subRole)) {
      return NextResponse.json(
        { error: `subRole must be one of: ${ADMIN_SUB_ROLES.join(", ")}` },
        { status: 400 }
      );
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, adminSubRole: true, email: true },
    });
    if (!target) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    if (target.role !== "ADMIN") {
      return NextResponse.json(
        { error: "User is not an admin. Promote them to ADMIN first." },
        { status: 409 }
      );
    }

    // Prevent a SUPER_ADMIN from demoting themself and leaving no super admins.
    if (target.id === session.userId && subRole !== "SUPER_ADMIN") {
      const otherSupers = await prisma.user.count({
        where: { role: "ADMIN", adminSubRole: "SUPER_ADMIN", NOT: { id: session.userId } },
      });
      if (otherSupers === 0) {
        return NextResponse.json(
          { error: "Cannot demote the last SUPER_ADMIN." },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { adminSubRole: subRole },
      select: { id: true, role: true, adminSubRole: true, email: true, name: true },
    });

    // Mirror to Supabase app_metadata so middleware sees the change.
    await supabaseAdmin.auth.admin.updateUserById(id, {
      app_metadata: { role: "ADMIN", adminSubRole: subRole },
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error("[PATCH /api/admin/admins/[id]/sub-role]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
