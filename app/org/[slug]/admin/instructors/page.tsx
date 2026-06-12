import OrgMembersClient from "@/components/org/OrgMembersClient";

export const dynamic = "force-dynamic";

export default async function OrgInstructorsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Instructors</h1>
        <p className="text-muted-foreground mt-1">
          Invite and manage your organization&apos;s instructors.
        </p>
      </div>
      <OrgMembersClient slug={slug} role="ORG_INSTRUCTOR" roleLabel="Instructor" />
    </div>
  );
}
