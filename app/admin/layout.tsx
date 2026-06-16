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
  if (session.role !== "ADMIN") redirect("/org/register");

  // session.adminSubRole defaults to SUPER_ADMIN for any ADMIN whose
  // app_metadata predates this rollout (see lib/auth.ts).
  const subRole = session.adminSubRole ?? "SUPER_ADMIN";

  return (
    <div className="py-4">
      <div className="flex flex-col md:flex-row md:gap-4 md:min-h-[calc(100vh-4rem)]">
        <AdminSidebar
          subRole={subRole}
          user={{
            userId: session.userId,
            name: session.name,
            email: session.email,
            avatar: session.avatar,
          }}
        />
        <div className="flex-1 min-w-0 animate-fade-in mt-3 md:mt-0">{children}</div>
      </div>
    </div>
  );
}
