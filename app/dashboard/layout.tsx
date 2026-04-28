/**
 * Dashboard layout — wraps all /dashboard pages with a sidebar.
 * Server Component: reads session for guard + nav personalization.
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import DashboardSidebar from "./DashboardSidebar";
import OnboardingTour from "@/components/OnboardingTour";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "ADMIN" || session.role === "INSTRUCTOR") redirect("/admin");

  const user: any = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { hasSeenTour: true } as any,
  });
  const hasSeenTour = user?.hasSeenTour ?? false;

  return (
    <>
      <OnboardingTour initialRun={!hasSeenTour} />
      <div className="pb-8">
        <div className="flex flex-col lg:flex-row lg:gap-6 lg:min-h-[calc(100vh-4rem)]">
          <DashboardSidebar />
          <div className="flex-1 min-w-0 animate-fade-in pt-6">{children}</div>
        </div>
      </div>
    </>
  );
}
