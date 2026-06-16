import OrgMemberManager from "@/components/org/OrgMemberManager";
import { requireOrgPermission } from "@/lib/org-auth";

export const dynamic = "force-dynamic";

export default async function OrgMembersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await requireOrgPermission(slug, "members:view", { allowExpired: true });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Members</h1>
        <p className="text-muted-foreground mt-1">
          Manage everyone in your organization and the role each person holds.
        </p>
      </div>
      <OrgMemberManager
        slug={slug}
        actorRole={ctx.role}
        isPlatformAdmin={ctx.isPlatformAdmin}
        currentUserId={ctx.session.userId}
      />
    </div>
  );
}
