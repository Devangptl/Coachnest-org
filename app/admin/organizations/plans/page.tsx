import PlansClient from "./PlansClient";

export const dynamic = "force-dynamic";

export default function AdminSubscriptionPlansPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Subscription Plans</h1>
        <p className="text-muted-foreground mt-1">
          Plans available to organizations at registration and upgrade.
        </p>
      </div>
      <PlansClient />
    </div>
  );
}
