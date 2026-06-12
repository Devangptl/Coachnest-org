/**
 * Admin → Students list with search, stats, pagination, and links to detail view.
 */
import { Suspense } from "react";
import GlassCard from "@/components/GlassCard";
import { TableSkeleton } from "@/components/ui/Skeleton";
import Pagination from "@/components/ui/Pagination";
import { Users, GraduationCap, Award, Star } from "lucide-react";
import StudentTable from "./StudentTable";
import StudentSearch from "./StudentSearch";
import { getStudentsList, getStudentStats, type StudentListFilter } from "@/services/student.service";

type SearchParams = { search?: string; sort?: string; page?: string; pageSize?: string };

async function StudentsSection({ sp }: { sp: SearchParams }) {
  const { data, total, page, pageSize } = await getStudentsList({
    search: sp.search?.trim() || "",
    sort: (sp.sort as StudentListFilter["sort"]) || "newest",
    page: sp.page ? Number(sp.page) : undefined,
    pageSize: sp.pageSize ? Number(sp.pageSize) : undefined,
  });

  if (total === 0) {
    return (
      <GlassCard className="text-center py-16">
        <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground">
          {sp.search ? "No students match your search." : "No students have signed up yet."}
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard padding="sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-foreground font-semibold">All Students</h2>
        <span className="text-muted-foreground/70 text-sm">{total.toLocaleString()} total</span>
      </div>
      <StudentTable students={data} />
      <Pagination page={page} pageSize={pageSize} total={total} />
    </GlassCard>
  );
}

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const stats = await getStudentStats();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl sm:text-3xl font-bold text-foreground">Students</h1>
        <p className="text-muted-foreground mt-1">
          Manage student accounts, view profiles, and track activity.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
        {[
          { label: "Total Students", value: stats.total, icon: Users, color: "text-blue-400" },
          { label: "Active (30d)", value: stats.active, icon: Star, color: "text-emerald-400" },
          { label: "Total Enrollments", value: stats.totalEnrollments, icon: GraduationCap, color: "text-[#d97757]" },
          { label: "Certificates Issued", value: stats.totalCertificates, icon: Award, color: "text-yellow-400" },
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

      {/* Search */}
      <div className="mb-6">
        <StudentSearch />
      </div>

      {/* Table */}
      <Suspense
        key={`${sp.search ?? ""}|${sp.sort ?? ""}|${sp.page ?? "1"}|${sp.pageSize ?? ""}`}
        fallback={<TableSkeleton rows={10} />}
      >
        <StudentsSection sp={sp} />
      </Suspense>
    </div>
  );
}
