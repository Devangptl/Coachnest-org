/**
 * /dashboard/progress — Student learning analytics.
 */
import dynamic from "next/dynamic";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getStudentAnalytics } from "@/services/analytics.service";

const StudentProgressDashboard = dynamic(
  () => import("./StudentProgressDashboard"),
  {
    loading: () => (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-secondary" />
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="h-64 rounded-lg bg-secondary" />
          <div className="h-64 rounded-lg bg-secondary" />
        </div>
        <div className="h-72 rounded-lg bg-secondary" />
      </div>
    ),
  }
);

export default async function StudentProgressPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const data = await getStudentAnalytics(session.userId);

  return <StudentProgressDashboard {...data} />;
}
