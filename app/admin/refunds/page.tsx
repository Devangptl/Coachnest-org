import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import RefundsAdminClient from "./RefundsAdminClient";

export const metadata = { title: "Refund Requests — Admin" };

export default async function AdminRefundsPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Refund Requests</h1>
        <p className="text-muted-foreground mt-1">
          Review and process student refund requests. Refunds are proportional to unused course content.
        </p>
      </div>
      <RefundsAdminClient />
    </div>
  );
}
