/**
 * Admin Orders Page — Track orders, payments, and revenue (paginated)
 */
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import GlassCard from "@/components/GlassCard";
import { TableSkeleton } from "@/components/ui/Skeleton";
import Pagination from "@/components/ui/Pagination";
import { getOrdersList, getRevenueStats } from "@/services/order.service";
import { ShoppingCart, TrendingUp, AlertCircle, DollarSign } from "lucide-react";
import { OrderStatus } from "@prisma/client";
import OrderTable from "./OrderTable";
import OrderFiltersBar from "./OrderFiltersBar";

type SearchParams = {
  search?: string;
  status?: OrderStatus;
  courseId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: string;
  pageSize?: string;
};

async function OrdersSection({ sp }: { sp: SearchParams }) {
  const { data, total, page, pageSize } = await getOrdersList({
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
        <h2 className="text-foreground font-semibold">All Orders</h2>
        <span className="text-muted-foreground/70 text-sm">{total.toLocaleString()} total</span>
      </div>

      {total === 0 ? (
        <div className="text-center py-12 text-muted-foreground/70">
          <p className="mb-4">No orders found.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              {/* Header Row */}
              <div className="grid grid-cols-12 gap-3 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 border-b border-border">
                <div className="col-span-2">Order ID</div>
                <div className="col-span-3">Student</div>
                <div className="col-span-3">Course</div>
                <div className="col-span-1">Amount</div>
                <div className="col-span-1">Status</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>

              <OrderTable orders={data} />
            </div>
          </div>
          <Pagination page={page} pageSize={pageSize} total={total} />
        </>
      )}
    </GlassCard>
  );
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const sp = await searchParams;
  const stats = await getRevenueStats();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Orders & Revenue</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Monitor payments, track revenue, and manage refunds.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-10">
        {[
          {
            label: "Total Revenue",
            value: `₹${stats.totalRevenue.toLocaleString("en-IN")}`,
            icon: DollarSign,
            color: "text-emerald-400",
          },
          {
            label: "Avg Order Value",
            value: `₹${Math.round(stats.avgOrderValue).toLocaleString("en-IN")}`,
            icon: TrendingUp,
            color: "text-blue-400",
          },
          {
            label: "Paid Orders",
            value: stats.paidOrders,
            icon: ShoppingCart,
            color: "text-[#d97757]",
          },
          {
            label: "Refund Rate",
            value: `${stats.refundRate.toFixed(1)}%`,
            icon: AlertCircle,
            color: "text-amber-400",
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <GlassCard key={stat.label} className="flex flex-col items-center text-center gap-2 sm:flex-row sm:text-left sm:gap-3 md:gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
                <Icon className={`w-5 h-5 md:w-6 md:h-6 ${stat.color}`} />
              </div>
              <div className="min-w-0">
                <div className="text-lg md:text-2xl font-bold text-foreground">{stat.value}</div>
                <div className="text-muted-foreground text-[10px] sm:text-xs md:text-sm leading-tight">{stat.label}</div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Filters */}
      <div className="mb-8">
        <OrderFiltersBar />
      </div>

      {/* Table */}
      <Suspense
        key={`${sp.search ?? ""}|${sp.status ?? ""}|${sp.courseId ?? ""}|${sp.dateFrom ?? ""}|${sp.dateTo ?? ""}|${sp.page ?? "1"}|${sp.pageSize ?? ""}`}
        fallback={<TableSkeleton rows={10} />}
      >
        <OrdersSection sp={sp} />
      </Suspense>
    </div>
  );
}
