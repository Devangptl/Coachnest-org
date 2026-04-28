import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import InstructorSidebar from "./InstructorSidebar";

export default async function InstructorLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "STUDENT") redirect("/dashboard");

  return (
    <div className="pb-8">
      <div className="flex flex-col lg:flex-row lg:gap-6 lg:min-h-[calc(100vh-4rem)]">
        <InstructorSidebar />
        <div className="flex-1 min-w-0 animate-fade-in pt-6">{children}</div>
      </div>
    </div>
  );
}
