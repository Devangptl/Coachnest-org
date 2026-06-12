import OrgRevenueClient from "./OrgRevenueClient";

export const dynamic = "force-dynamic";

export default function AdminOrgRevenuePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Organization Revenue</h1>
        <p className="text-muted-foreground mt-1">
          Subscription revenue, refunds, and usage across organizations.
        </p>
      </div>
      <OrgRevenueClient />
    </div>
  );
}
