/**
 * Admin layout — wraps all /admin pages with a persistent sidebar.
 * Server Component: guards the route so only admins can access it,
 * and only sub-roles with permission can see each section.
 *
 * Icons are NOT passed as props — AdminSidebar owns them internally
 * to avoid the Server→Client serialization error.
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AdminSidebar from "./AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "STUDENT")    redirect("/dashboard");
  if (session.role === "INSTRUCTOR") redirect("/instructor");

  // session.adminSubRole defaults to SUPER_ADMIN for any ADMIN whose
  // app_metadata predates this rollout (see lib/auth.ts).
  const subRole = session.adminSubRole ?? "SUPER_ADMIN";

  return (
    <div className="pb-4">
      <div className="flex flex-col lg:flex-row lg:gap-4 lg:min-h-[calc(100vh-4rem)]">
        <AdminSidebar subRole={subRole} />
        <div className="flex-1 min-w-0 animate-fade-in mt-3">{children}</div>
      </div>
    </div>
  );
}
