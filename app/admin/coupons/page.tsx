/**
 * Admin Coupons Page — Manage promotional coupons
 */
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import GlassCard from "@/components/GlassCard";
import { getCouponsList } from "@/services/coupon.service";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { PlusCircle, TrendingUp, Ticket } from "lucide-react";
import CouponTable from "./CouponTable";

async function getCouponsData() {
  const coupons = await getCouponsList();
  const totalDiscount = coupons.reduce((sum, c) => sum + c.totalDiscountGiven, 0);
  const activeCoupons = coupons.filter((c) => c.status === "ACTIVE").length;

  return { coupons, totalDiscount, activeCoupons };
}

export default async function AdminCouponsPage() {
  const session = await getSession();

  if (!session || session.role !== "ADMIN") {
    redirect("/login");
  }

  const { coupons, totalDiscount, activeCoupons } = await getCouponsData();

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
          { label: "Total Coupons", value: coupons.length, icon: Ticket, color: "text-blue-400" },
          { label: "Active", value: activeCoupons, icon: TrendingUp, color: "text-emerald-400" },
          { label: "Total Discount", value: `₹${totalDiscount.toLocaleString("en-IN")}`, icon: Ticket, color: "text-orange-400" },
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
      <GlassCard padding="sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-foreground font-semibold">All Coupons</h2>
          <span className="text-muted-foreground/70 text-sm">{coupons.length} total</span>
        </div>

        <CouponTable coupons={coupons} />

        {coupons.length === 0 && (
          <div className="text-center py-12 text-muted-foreground/70">
            <p className="mb-4">No coupons created yet.</p>
            <Link href="/admin/coupons/new" className="text-orange-400 hover:text-orange-300">
              Create your first coupon
            </Link>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
