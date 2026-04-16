/**
 * Community layout — wraps all /community pages with sidebar.
 * Auth-gated for logged-in users.
 * CommunityTour is lazy-loaded via a client wrapper to avoid bundling react-joyride eagerly.
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import CommunitySidebar from "./CommunitySidebar";
import CommunityTourLazy from "./CommunityTourLazy";
import { prisma } from "@/lib/prisma";

export default async function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const user: any = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { hasSeenCommunityTour: true } as any,
  });
  const hasSeenCommunityTour = user?.hasSeenCommunityTour ?? false;

  return (
    <>
      {!hasSeenCommunityTour && <CommunityTourLazy initialRun={!hasSeenCommunityTour} />}
      <div className=" pb-16">
        <div className="flex flex-col lg:flex-row lg:gap-8 lg:min-h-[calc(100vh-4rem)]">
          <CommunitySidebar />
          <div className="flex-1 min-w-0 animate-fade-in">{children}</div>
        </div>
      </div>
    </>
  );
}
