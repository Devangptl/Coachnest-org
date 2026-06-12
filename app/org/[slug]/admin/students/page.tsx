import OrgMembersClient from "@/components/org/OrgMembersClient";

export const dynamic = "force-dynamic";

export default async function OrgStudentsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Students</h1>
        <p className="text-muted-foreground mt-1">
          Invite and manage your organization&apos;s students.
        </p>
      </div>
      <OrgMembersClient slug={slug} role="ORG_STUDENT" roleLabel="Student" />
    </div>
  );
}
