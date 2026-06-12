import OrganizationsClient from "./OrganizationsClient";

export const dynamic = "force-dynamic";

export default function AdminOrganizationsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Organizations</h1>
        <p className="text-muted-foreground mt-1">
          Registered organizations, their plans, and subscription revenue.
        </p>
      </div>
      <OrganizationsClient />
    </div>
  );
}
