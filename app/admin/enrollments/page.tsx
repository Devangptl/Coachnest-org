/**
 * Admin Enrollments Page — List all student enrollments (paginated)
 */
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import GlassCard from "@/components/GlassCard";
import { TableSkeleton } from "@/components/ui/Skeleton";
import Pagination from "@/components/ui/Pagination";
import { getEnrollmentsList, getEnrollmentStats } from "@/services/enrollment.service";
import Link from "next/link";
import { Users, GraduationCap, TrendingUp } from "lucide-react";
import EnrollmentFiltersBar from "./EnrollmentFiltersBar";
import EnrollmentTable from "./EnrollmentTable";

type SearchParams = {
  search?: string;
  status?: "ACTIVE" | "COMPLETED" | "DROPPED";
  courseId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: string;
  pageSize?: string;
};

async function EnrollmentsSection({ sp }: { sp: SearchParams }) {
  const { data, total, page, pageSize } = await getEnrollmentsList({
    search: sp.search,
    status: sp.status,
    courseId: sp.courseId,
    dateFrom: sp.dateFrom,
    dateTo: sp.dateTo,
    page: sp.page ? Number(sp.page) : undefined,
    pageSize: sp.pageSize ? Number(sp.pageSize) : undefined,
  });

  return (
    <GlassCard padding="sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-foreground font-semibold">Enrollments</h2>
        <span className="text-muted-foreground/70 text-sm">{total.toLocaleString()} total</span>
      </div>

      {total === 0 ? (
        <div className="text-center py-12 text-muted-foreground/70">
          <p className="mb-4">No enrollments found.</p>
          <Link href="/admin/courses" className="text-[#d97757] hover:text-orange-300">
            View Courses
          </Link>
        </div>
      ) : (
        <>
          <EnrollmentTable enrollments={data} />
          <Pagination page={page} pageSize={pageSize} total={total} />
        </>
      )}
    </GlassCard>
  );
}

export default async function AdminEnrollmentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/login");
  }

  const sp = await searchParams;
  const stats = await getEnrollmentStats();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl sm:text-3xl font-bold text-foreground">
          Student Enrollments
        </h1>
        <p className="text-muted-foreground mt-1">
          Track student progress across courses and manage enrollments.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-10">
        {[
          { label: "Total Enrollments", value: stats.totalEnrollments, icon: Users, color: "text-blue-400" },
          { label: "Active", value: stats.activeEnrollments, icon: TrendingUp, color: "text-emerald-400" },
          { label: "Completed", value: stats.completedEnrollments, icon: GraduationCap, color: "text-[#d97757]" },
          { label: "Inactive (30d+)", value: stats.droppedEnrollments, icon: Users, color: "text-amber-400" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <GlassCard key={stat.label} className="flex flex-col items-center text-center gap-2 sm:flex-row sm:text-left sm:gap-3 md:gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
                <Icon className={`w-5 h-5 md:w-6 md:h-6 ${stat.color}`} />
              </div>
              <div className="min-w-0">
                <div className="text-xl md:text-3xl font-bold text-foreground">{stat.value}</div>
                <div className="text-muted-foreground text-[10px] sm:text-xs md:text-sm leading-tight">{stat.label}</div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Filters */}
      <div className="mb-8">
        <EnrollmentFiltersBar />
      </div>

      {/* Table */}
      <Suspense
        key={`${sp.search ?? ""}|${sp.status ?? ""}|${sp.courseId ?? ""}|${sp.dateFrom ?? ""}|${sp.dateTo ?? ""}|${sp.page ?? "1"}|${sp.pageSize ?? ""}`}
        fallback={<TableSkeleton rows={10} />}
      >
        <EnrollmentsSection sp={sp} />
      </Suspense>
    </div>
  );
}
