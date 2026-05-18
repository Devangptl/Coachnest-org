/**
 * Admin: Database Migrations — read-only status + tightly-gated deploy.
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import MigrationsClient from "./MigrationsClient";

export const dynamic = "force-dynamic";

export default async function AdminMigrationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="px-4 max-w-5xl mx-auto">
      <MigrationsClient />
    </div>
  );
}
