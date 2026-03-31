import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import InstructorSidebar from "./InstructorSidebar";

export default async function InstructorLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "STUDENT") redirect("/dashboard");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
      <div className="flex flex-col lg:flex-row lg:gap-8">
        <InstructorSidebar />
        <div className="flex-1 min-w-0 animate-fade-in">{children}</div>
      </div>
    </div>
  );
}
