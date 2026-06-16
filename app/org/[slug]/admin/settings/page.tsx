import { requireOrgPermission } from "@/lib/org-auth";
import { prisma } from "@/lib/prisma";
import OrgSettingsClient from "./OrgSettingsClient";

export const dynamic = "force-dynamic";

export default async function OrgSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await requireOrgPermission(slug, "org:manage_settings", { allowExpired: true });

  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: ctx.org.id },
    select: { name: true, slug: true, email: true, phone: true, logo: true },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Organization profile and contact details.</p>
      </div>
      <OrgSettingsClient slug={slug} initial={org} />
    </div>
  );
}
