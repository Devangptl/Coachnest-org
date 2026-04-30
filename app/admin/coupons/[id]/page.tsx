/**
 * /admin/coupons/[id] — Coupon usage detail page
 */
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getCouponDetails, getCouponUsageStats } from "@/services/coupon.service";
import GlassCard from "@/components/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, Pencil, Users, TrendingDown, BarChart3, Calendar } from "lucide-react";

function getCouponStatusVariant(status: string) {
  switch (status) {
    case "ACTIVE":    return "green" as const;
    case "EXPIRED":   return "red" as const;
    case "DISABLED":  return "amber" as const;
    case "UNLIMITED": return "blue" as const;
    default:          return "gray" as const;
  }
}

export default async function CouponDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const { id } = await params;
  const [coupon, stats] = await Promise.all([
    getCouponDetails(id),
    getCouponUsageStats(id),
  ]);

  if (!coupon) notFound();
  const c = coupon!;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/coupons"
          className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Coupons
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold text-foreground font-mono">{c.code}</h1>
              <Badge variant={getCouponStatusVariant(c.status)}>{c.status}</Badge>
            </div>
            {c.description && (
              <p className="text-muted-foreground">{c.description}</p>
            )}
          </div>
          <Link href={`/admin/coupons/${id}/edit`}>
            <Button variant="secondary" size="sm" className="flex items-center gap-2">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Coupon Details */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Discount",
            value: c.discountType === "PERCENTAGE"
              ? `${c.discount}%`
              : `₹${c.discount.toLocaleString("en-IN")}`,
            icon: TrendingDown,
            color: "text-orange-400",
          },
          {
            label: "Uses",
            value: c.maxUses ? `${c.uses} / ${c.maxUses}` : `${c.uses} (unlimited)`,
            icon: Users,
            color: "text-blue-400",
          },
          {
            label: "Total Saved",
            value: `₹${stats.totalDiscountGiven.toLocaleString("en-IN")}`,
            icon: BarChart3,
            color: "text-emerald-400",
          },
          {
            label: "Expires",
            value: c.expiresAt ? formatDate(c.expiresAt) : "Never",
            icon: Calendar,
            color: "text-purple-400",
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <GlassCard key={stat.label} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div className="min-w-0">
                <div className="text-foreground font-semibold truncate">{stat.value}</div>
                <div className="text-muted-foreground text-xs">{stat.label}</div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Usage Table */}
      <GlassCard padding="sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-foreground font-semibold">Usage History</h2>
          <span className="text-muted-foreground/70 text-sm">{stats.totalOrders} orders</span>
        </div>

        {stats.orders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground/70">
            No one has used this coupon yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[520px]">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 px-4 py-2 border-b border-border/50 text-xs text-muted-foreground uppercase tracking-wide">
                <div className="col-span-3">Student</div>
                <div className="col-span-4">Course</div>
                <div className="col-span-2 text-right">Order</div>
                <div className="col-span-2 text-right">Saved</div>
                <div className="col-span-1 text-right">Date</div>
              </div>
              <div className="divide-y divide-border/50">
                {stats.orders.map((order) => (
                  <div
                    key={order.id}
                    className="grid grid-cols-12 gap-4 items-center px-4 py-3 hover:bg-secondary transition-colors"
                  >
                    <div className="col-span-3 min-w-0">
                      <div className="text-foreground text-sm font-medium truncate">{order.studentName}</div>
                      <div className="text-muted-foreground text-xs truncate">{order.studentEmail}</div>
                    </div>
                    <div className="col-span-4 text-sm text-muted-foreground truncate">
                      {order.courseTitle}
                    </div>
                    <div className="col-span-2 text-sm text-foreground text-right">
                      ₹{order.orderAmount.toLocaleString("en-IN")}
                    </div>
                    <div className="col-span-2 text-sm text-emerald-400 text-right">
                      −₹{order.discountAmount.toLocaleString("en-IN")}
                    </div>
                    <div className="col-span-1 text-xs text-muted-foreground text-right whitespace-nowrap">
                      {formatDate(order.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
