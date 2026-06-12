import { Suspense } from "react";
import BillingClient from "./BillingClient";

export const dynamic = "force-dynamic";

export default async function OrgBillingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Billing</h1>
        <p className="text-muted-foreground mt-1">
          Your plan, payment history, and invoices.
        </p>
      </div>
      <Suspense>
        <BillingClient slug={slug} />
      </Suspense>
    </div>
  );
}
