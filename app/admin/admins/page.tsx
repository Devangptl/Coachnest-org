/**
 * Admin Roles management — SUPER_ADMIN only.
 * Lists every user with role=ADMIN and lets the super admin change
 * their sub-role. The /admin/admins segment is restricted to
 * SUPER_ADMIN in lib/admin-permissions.ts, so middleware already
 * blocks other sub-roles, but we re-check here as defense-in-depth.
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import GlassCard from "@/components/GlassCard";
import { ShieldCheck } from "lucide-react";
import AdminSubRoleSelect from "./AdminSubRoleSelect";
import AddAdminForm from "./AddAdminForm";
import { ADMIN_SUB_ROLE_LABELS } from "@/lib/admin-permissions";

export const dynamic = "force-dynamic";

export default async function AdminsPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || session.adminSubRole !== "SUPER_ADMIN") {
    redirect("/admin");
  }

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      adminSubRole: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-[#d97757]" />
          Admin Roles
        </h1>
        <p className="text-muted-foreground mt-1">
          Assign a sub-role to control which admin sections each admin can access.
        </p>
      </div>

      <AddAdminForm />

      <GlassCard padding="sm">
        <div className="divide-y divide-border/50">
          {admins.map((admin) => (
            <div
              key={admin.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-foreground text-sm font-medium truncate">
                  {admin.name}
                  {admin.id === session.userId && (
                    <span className="text-muted-foreground ml-2 text-xs">(you)</span>
                  )}
                </p>
                <p className="text-muted-foreground text-xs mt-0.5 truncate">{admin.email}</p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  Current: {ADMIN_SUB_ROLE_LABELS[admin.adminSubRole ?? "SUPER_ADMIN"]}
                </span>
                <AdminSubRoleSelect
                  userId={admin.id}
                  initial={admin.adminSubRole ?? "SUPER_ADMIN"}
                />
              </div>
            </div>
          ))}

          {admins.length === 0 && (
            <div className="text-center py-8 text-muted-foreground/70 text-sm">
              No admins yet.
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
