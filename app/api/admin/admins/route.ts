/**
 * POST /api/admin/admins
 *
 * SUPER_ADMIN-only. Promotes an existing user (looked up by email) to
 * role=ADMIN with the given sub-role. Mirrors the change to Supabase
 * app_metadata so the middleware/session pick it up immediately.
 *
 * Body: { email: string, subRole: AdminSubRole }
 *
 * Errors:
 *  - 400  invalid body or sub-role
 *  - 403  caller is not a SUPER_ADMIN
 *  - 404  no user with that email exists (must sign up first)
 *  - 409  user already an admin (use PATCH /api/admin/admins/[id]/sub-role)
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";
import { ADMIN_SUB_ROLES, type AdminSubRole } from "@/lib/admin-permissions";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN" || session.adminSubRole !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      email?: string;
      subRole?: AdminSubRole;
    };
    const email = body.email?.trim().toLowerCase();
    const subRole = body.subRole;

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }
    if (!subRole || !ADMIN_SUB_ROLES.includes(subRole)) {
      return NextResponse.json(
        { error: `subRole must be one of: ${ADMIN_SUB_ROLES.join(", ")}` },
        { status: 400 }
      );
    }

    const target = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true, email: true, name: true },
    });
    if (!target) {
      return NextResponse.json(
        { error: "No user with that email. They must sign up first." },
        { status: 404 }
      );
    }
    if (target.role === "ADMIN") {
      return NextResponse.json(
        { error: "User is already an admin. Use the sub-role picker to change their role." },
        { status: 409 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: target.id },
      data: { role: "ADMIN", adminSubRole: subRole },
      select: { id: true, role: true, adminSubRole: true, email: true, name: true },
    });

    // Mirror to Supabase so middleware/session see the new role + sub-role.
    await supabaseAdmin.auth.admin.updateUserById(target.id, {
      app_metadata: { role: "ADMIN", adminSubRole: subRole },
    });

    return NextResponse.json({ user: updated }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/admins]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
