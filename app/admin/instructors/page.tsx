/**
 * Admin → Instructors list with stats, search, sort, and links to detail view.
 */
import Link from "next/link";
import { Suspense } from "react";
import { GraduationCap, Users, Wallet, Clock, Plus, UserCheck } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/Button";
import { TableSkeleton } from "@/components/ui/Skeleton";
import Pagination from "@/components/ui/Pagination";
import {
  getInstructorsList,
  getInstructorStats,
  type InstructorListFilter,
} from "@/services/instructor.service";
import InstructorTable from "./InstructorTable";
import InstructorSearch from "./InstructorSearch";

export const dynamic = "force-dynamic";

type SearchParams = { search?: string; sort?: string; page?: string; pageSize?: string };

function formatMoney(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

async function InstructorsSection({ sp }: { sp: SearchParams }) {
  const filter: InstructorListFilter = {
    search: sp.search?.trim() || "",
    sort: (sp.sort as InstructorListFilter["sort"]) || "newest",
    page: sp.page ? Number(sp.page) : undefined,
    pageSize: sp.pageSize ? Number(sp.pageSize) : undefined,
  };

  const { data, total, page, pageSize } = await getInstructorsList(filter);

  if (total === 0) {
    return (
      <GlassCard className="text-center py-16">
        <GraduationCap className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground">
          {filter.search
            ? "No instructors match your search."
            : "No instructors yet. Click “Add Instructor” to create one."}
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard padding="sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-foreground font-semibold">All Instructors</h2>
        <span className="text-muted-foreground/70 text-sm">{total.toLocaleString()} total</span>
      </div>
      <InstructorTable instructors={data} />
      <Pagination page={page} pageSize={pageSize} total={total} />
    </GlassCard>
  );
}

export default async function AdminInstructorsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const stats = await getInstructorStats();
  const filter = {
    search: sp.search?.trim() || "",
    sort: (sp.sort as InstructorListFilter["sort"]) || "newest",
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Instructors</h1>
          <p className="text-muted-foreground mt-1">
            Manage instructor accounts, courses, earnings, and payouts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {stats.pendingApprovals > 0 && (
            <Link href="/admin/instructors/approvals">
              <Button variant="outline" className="relative border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
                <UserCheck className="w-4 h-4" />
                Review Applications
                <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {stats.pendingApprovals}
                </span>
              </Button>
            </Link>
          )}
          <Link href="/admin/instructors/new">
            <Button variant="primary">
              <Plus className="w-4 h-4" /> Add Instructor
            </Button>
          </Link>
        </div>
      </div>

      {/* Pending approvals alert */}
      {stats.pendingApprovals > 0 && (
        <Link href="/admin/instructors/approvals" className="block mb-6">
          <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/25 rounded-xl px-5 py-3.5 hover:bg-amber-500/15 transition-colors">
            <Clock className="w-5 h-5 text-amber-400 flex-shrink-0 animate-pulse" />
            <p className="text-amber-400 text-sm font-medium flex-1">
              <span className="font-bold">{stats.pendingApprovals} instructor application{stats.pendingApprovals > 1 ? "s" : ""}</span> awaiting your review.
            </p>
            <span className="text-amber-400/60 text-xs">Review →</span>
          </div>
        </Link>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Active Instructors",
            value: stats.total.toString(),
            icon: GraduationCap,
            color: "text-blue-400",
          },
          {
            label: "With Wallet",
            value: stats.withWallet.toString(),
            icon: Users,
            color: "text-emerald-400",
          },
          {
            label: "Total Earned",
            value: formatMoney(stats.totalEarned),
            icon: Wallet,
            color: "text-[#d97757]",
          },
          {
            label: "Pending Payouts",
            value: stats.pendingPayouts.toString(),
            icon: Clock,
            color: "text-yellow-400",
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <GlassCard key={stat.label} className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-md bg-secondary flex items-center justify-center">
                <Icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div>
                <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                <div className="text-muted-foreground text-sm">{stat.label}</div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Search + Sort */}
      <div className="mb-6">
        <InstructorSearch initialSearch={filter.search} initialSort={filter.sort} />
      </div>

      {/* Table */}
      <Suspense
        key={`${sp.search ?? ""}|${sp.sort ?? ""}|${sp.page ?? "1"}|${sp.pageSize ?? ""}`}
        fallback={<TableSkeleton rows={10} />}
      >
        <InstructorsSection sp={sp} />
      </Suspense>
    </div>
  );
}
