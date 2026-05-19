/**
 * Admin Coupons Page — Manage promotional coupons (paginated)
 */
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import GlassCard from "@/components/GlassCard";
import { TableSkeleton } from "@/components/ui/Skeleton";
import Pagination from "@/components/ui/Pagination";
import { getCouponsList, getCouponStats } from "@/services/coupon.service";
import Link from "next/link";
import { PlusCircle, TrendingUp, Ticket } from "lucide-react";
import CouponTable from "./CouponTable";

type SearchParams = { page?: string; pageSize?: string };

async function CouponsSection({ sp }: { sp: SearchParams }) {
  const { data, total, page, pageSize } = await getCouponsList({
    page: sp.page ? Number(sp.page) : undefined,
    pageSize: sp.pageSize ? Number(sp.pageSize) : undefined,
  });

  return (
    <GlassCard padding="sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-foreground font-semibold">All Coupons</h2>
        <span className="text-muted-foreground/70 text-sm">{total.toLocaleString()} total</span>
      </div>

      {total === 0 ? (
        <div className="text-center py-12 text-muted-foreground/70">
          <p className="mb-4">No coupons created yet.</p>
          <Link href="/admin/coupons/new" className="text-[#d97757] hover:text-orange-300">
            Create your first coupon
          </Link>
        </div>
      ) : (
        <>
          <CouponTable coupons={data} />
          <Pagination page={page} pageSize={pageSize} total={total} />
        </>
      )}
    </GlassCard>
  );
}

export default async function AdminCouponsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getSession();

  if (!session || session.role !== "ADMIN") {
    redirect("/login");
  }

  const sp = await searchParams;
  const { totalCoupons, activeCoupons, totalDiscount } = await getCouponStats();

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Promotions & Coupons</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage promotional codes for your courses.
          </p>
        </div>
        <Link href="/admin/coupons/new" className="btn-primary flex items-center gap-2 text-sm">
          <PlusCircle className="w-4 h-4" /> New Coupon
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {[
          { label: "Total Coupons", value: totalCoupons, icon: Ticket, color: "text-blue-400" },
          { label: "Active", value: activeCoupons, icon: TrendingUp, color: "text-emerald-400" },
          { label: "Total Discount", value: `₹${totalDiscount.toLocaleString("en-IN")}`, icon: Ticket, color: "text-[#d97757]" },
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

      {/* Table */}
      <Suspense
        key={`${sp.page ?? "1"}|${sp.pageSize ?? ""}`}
        fallback={<TableSkeleton rows={10} />}
      >
        <CouponsSection sp={sp} />
      </Suspense>
    </div>
  );
}
