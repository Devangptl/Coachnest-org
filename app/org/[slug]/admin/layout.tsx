/**
 * Org admin portal layout — DB-backed guard (ORG_ADMIN or platform
 * SUPER_ADMIN). Works while the org is PENDING/EXPIRED so the admin can
 * reach billing; non-billing pages redirect there in that state via the
 * x-pathname header set by middleware.
 */
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireOrgPermission, OrgAuthError } from "@/lib/org-auth";
import OrgSidebar from "@/components/org/OrgSidebar";

export default async function OrgAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let ctx;
  try {
    ctx = await requireOrgPermission(slug, "org:view_admin", { allowExpired: true });
  } catch (err) {
    if (err instanceof OrgAuthError && err.status === 401) redirect(`/org/${slug}/login`);
    redirect(`/org/${slug}/login?error=not_member`);
  }

  if (ctx.org.status !== "ACTIVE") {
    const pathname = (await headers()).get("x-pathname") ?? "";
    const allowedWhileInactive = [`/org/${slug}/admin/billing`, `/org/${slug}/admin/settings`];
    if (!allowedWhileInactive.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
      redirect(`/org/${slug}/admin/billing`);
    }
  }

  return (
    <div className="py-4">
      <div className="flex flex-col md:flex-row md:gap-4 md:min-h-[calc(100vh-4rem)]">
        <OrgSidebar
          portal="admin"
          org={{ name: ctx.org.name, slug: ctx.org.slug, logo: ctx.org.logo }}
          user={{
            userId: ctx.session.userId,
            name: ctx.session.name,
            email: ctx.session.email,
            avatar: ctx.session.avatar,
          }}
          role={ctx.role}
          roleLabel={ctx.isPlatformAdmin && ctx.role !== "ORG_ADMIN" ? "Platform Admin" : "Org Admin"}
        />
        <div className="flex-1 min-w-0 animate-fade-in mt-3 md:mt-0">{children}</div>
      </div>
    </div>
  );
}
