/**
 * Dashboard layout — wraps all /dashboard pages with a sidebar.
 * Server Component: reads session for guard + nav personalization.
 *
 * The tour gate runs inside a Suspense boundary so its DB call doesn't
 * block child pages from streaming.
 */
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import DashboardSidebar from "./DashboardSidebar";
import OnboardingTourGate from "./OnboardingTourGate";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "ADMIN" || session.role === "INSTRUCTOR") redirect("/admin");

  return (
    <>
      <Suspense fallback={null}>
        <OnboardingTourGate />
      </Suspense>
      <div className="py-4">
        <div className="flex flex-col md:flex-row md:gap-4 md:min-h-[calc(100vh-4rem)]">
          <DashboardSidebar />
          <div className="flex-1 min-w-0 animate-fade-in pt-3 md:pt-0">{children}</div>
        </div>
      </div>
    </>
  );
}
