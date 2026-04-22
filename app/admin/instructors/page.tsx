/**
 * Admin → Instructors list with stats, search, sort, and links to detail view.
 */
import Link from "next/link";
import { GraduationCap, Users, Wallet, Clock, Plus } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/Button";
import {
  getInstructorsList,
  getInstructorStats,
  type InstructorListFilter,
} from "@/services/instructor.service";
import InstructorTable from "./InstructorTable";
import InstructorSearch from "./InstructorSearch";

export const dynamic = "force-dynamic";

function formatMoney(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export default async function AdminInstructorsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; sort?: string }>;
}) {
  const sp = await searchParams;
  const filter: InstructorListFilter = {
    search: sp.search?.trim() || "",
    sort: (sp.sort as InstructorListFilter["sort"]) || "newest",
  };

  const [instructors, stats] = await Promise.all([
    getInstructorsList(filter),
    getInstructorStats(),
  ]);

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Instructors</h1>
          <p className="text-muted-foreground mt-1">
            Manage instructor accounts, courses, earnings, and payouts.
          </p>
        </div>
        <Link href="/admin/instructors/new">
          <Button variant="primary">
            <Plus className="w-4 h-4" /> Add Instructor
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Total Instructors",
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
            color: "text-orange-400",
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
      {instructors.length === 0 ? (
        <GlassCard className="text-center py-16">
          <GraduationCap className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">
            {filter.search
              ? "No instructors match your search."
              : "No instructors yet. Click “Add Instructor” to create one."}
          </p>
        </GlassCard>
      ) : (
        <GlassCard padding="sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-foreground font-semibold">All Instructors</h2>
            <span className="text-muted-foreground/70 text-sm">
              {instructors.length} total
            </span>
          </div>
          <InstructorTable instructors={instructors} />
        </GlassCard>
      )}
    </div>
  );
}
