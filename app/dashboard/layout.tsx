/**
 * Dashboard layout — wraps all /dashboard pages with a sidebar.
 * Server Component: reads session for guard + nav personalization.
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import DashboardSidebar from "./DashboardSidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "ADMIN" || session.role === "INSTRUCTOR") redirect("/admin");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
      <div className="flex gap-8">
        <DashboardSidebar />
        <div className="flex-1 min-w-0 animate-fade-in">{children}</div>
      </div>
    </div>
  );
}
