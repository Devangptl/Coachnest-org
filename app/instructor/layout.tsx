import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSession } from "@/lib/auth";
import InstructorSidebar from "./InstructorSidebar";

export default async function InstructorLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  // STUDENTs can land on /instructor/invitations to accept a collaboration
  // invite; accepting will auto-promote them to INSTRUCTOR. Everything
  // else in /instructor remains INSTRUCTOR/ADMIN only.
  const h = await headers();
  const pathname = h.get("x-pathname") ?? "";
  const isInvitationsRoute = pathname.startsWith("/instructor/invitations");

  if (session.role === "STUDENT" && !isInvitationsRoute) {
    redirect("/dashboard");
  }

  // Don't render the instructor sidebar for non-instructors — they only
  // see a stripped-down view of the invitations page.
  const showSidebar = session.role !== "STUDENT";

  return (
    <div className="py-4">
      <div className="flex flex-col md:flex-row md:gap-4 md:min-h-[calc(100vh-4rem)]">
        {showSidebar && <InstructorSidebar userId={session.userId} />}
        <div className="flex-1 min-w-0 animate-fade-in pt-3 md:pt-0">{children}</div>
      </div>
    </div>
  );
}
