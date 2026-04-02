/**
 * Admin layout — wraps all /admin pages with a persistent sidebar.
 * Server Component: guards the route so only admins can access it.
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

  return (
    <div className=" pb-16">
      <div className="flex flex-col lg:flex-row lg:gap-8">
        {/* Sidebar owns its own nav items — no icon props cross the boundary */}
        <AdminSidebar />

        {/* Page content */}
        <div className="flex-1 min-w-0 animate-fade-in">{children}</div>
      </div>
    </div>
  );
}
