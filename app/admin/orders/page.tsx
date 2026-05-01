/**
 * Admin Orders Page — Track orders, payments, and revenue
 */
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import GlassCard from "@/components/GlassCard";
import { getOrdersList, getRevenueStats } from "@/services/order.service";
import Link from "next/link";
import { ShoppingCart, TrendingUp, AlertCircle, DollarSign } from "lucide-react";
import OrderTable from "./OrderTable";
import OrderFiltersBar from "./OrderFiltersBar";

async function getOrdersData() {
  const [orders, stats] = await Promise.all([
    getOrdersList({}),
    getRevenueStats(),
  ]);
  return { orders, stats };
}

export default async function AdminOrdersPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const { orders, stats } = await getOrdersData();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Orders & Revenue</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Monitor payments, track revenue, and manage refunds.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
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
            <GlassCard key={stat.label} className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-md bg-secondary flex items-center justify-center">
                <Icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <div className="text-muted-foreground text-sm">{stat.label}</div>
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
      <GlassCard padding="sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-foreground font-semibold">All Orders</h2>
          <span className="text-muted-foreground/70 text-sm">{orders.length} total</span>
        </div>

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

        <OrderTable orders={orders} />
        </div>
        </div>

        {orders.length === 0 && (
          <div className="text-center py-12 text-muted-foreground/70">
            <p className="mb-4">No orders found.</p>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
