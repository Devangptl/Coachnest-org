/**
 * Community layout — wraps all /community pages with sidebar.
 * Auth-gated for logged-in users.
 *
 * The tour gate runs inside a Suspense boundary so its DB call doesn't
 * block child pages from streaming.
 */
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import CommunitySidebar from "./CommunitySidebar";
import CommunityTourGate from "./CommunityTourGate";

export default async function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <>
      <Suspense fallback={null}>
        <CommunityTourGate />
      </Suspense>
      <div className="pt-4 pb-16">
        <div className="flex flex-col md:flex-row md:gap-4 md:min-h-[calc(100vh-4rem)]">
          <CommunitySidebar />
          <div className="flex-1 min-w-0 animate-fade-in">{children}</div>
        </div>
      </div>
    </>
  );
}
