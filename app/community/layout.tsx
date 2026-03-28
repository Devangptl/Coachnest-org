/**
 * Community layout — wraps all /community pages with sidebar.
 * Auth-gated for logged-in users.
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import CommunitySidebar from "./CommunitySidebar";

export default async function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
      <div className="flex flex-col lg:flex-row lg:gap-8">
        <CommunitySidebar />
        <div className="flex-1 min-w-0 animate-fade-in">{children}</div>
      </div>
    </div>
  );
}
