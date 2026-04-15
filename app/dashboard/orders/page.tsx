/**
 * Dashboard — Order History page
 */
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import GlassCard from "@/components/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { ShoppingCart, Receipt, ArrowRight, Package, BookOpen, RotateCcw } from "lucide-react";


async function getUserOrders(userId: string) {
  const orders = await prisma.order.findMany({
    where: { userId },
    include: {
      course:  { select: { id: true, title: true, thumbnail: true } },
      feature: { select: { id: true, name: true, slug: true } },
      coupon:  { select: { code: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return orders.map((order) => ({
    id:              order.id,
    title:           order.course?.title ?? order.feature?.name ?? "Purchase",
    type:            order.feature ? "feature" : "course",
    courseId:        order.course?.id ?? null,
    featureSlug:     order.feature?.slug ?? null,
    thumbnail:       order.course?.thumbnail ?? null,
    amount:          Number(order.amount), // stored in rupees
    currency:        order.currency,
    status:          order.status,
    couponCode:      order.coupon?.code ?? null,
    discountAmount:  Number(order.discountAmount || 0),
    stripePaymentId: order.stripePaymentId,
    createdAt:       order.createdAt,
  }));
}

const statusVariant: Record<string, "green" | "amber" | "red" | "gray"> = {
  PAID: "green",
  PENDING: "amber",
  FAILED: "red",
  REFUNDED: "gray",
};

const statusLabel: Record<string, string> = {
  PAID: "Paid",
  PENDING: "Pending",
  FAILED: "Failed",
  REFUNDED: "Refunded",
};

export default async function OrderHistoryPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const orders = await getUserOrders(session.userId);

  const totalSpent = orders
    .filter((o) => o.status === "PAID")
    .reduce((sum, o) => sum + o.amount, 0);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Order History</h1>
        <p className="text-muted-foreground mt-1">
          View your past purchases and payment receipts.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <GlassCard className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-md bg-secondary flex items-center justify-center">
            <ShoppingCart className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">{orders.length}</div>
            <div className="text-muted-foreground text-sm">Total Orders</div>
          </div>
        </GlassCard>
        <GlassCard className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-md bg-secondary flex items-center justify-center">
            <Receipt className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">
              ₹{totalSpent.toLocaleString("en-IN")}
            </div>
            <div className="text-muted-foreground text-sm">Total Spent</div>
          </div>
        </GlassCard>
      </div>

      {/* Orders List */}
      {orders.length > 0 ? (
        <div className="space-y-3">
          {orders.map((order) => (
            <GlassCard key={order.id} className="flex items-center gap-4">
              {/* Thumbnail / icon */}
              {order.thumbnail ? (
                <img
                  src={order.thumbnail}
                  alt=""
                  className="w-16 h-16 rounded-md object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
                  {order.type === "feature"
                    ? <Package className="w-6 h-6 text-orange-400/50" />
                    : <BookOpen className="w-6 h-6 text-muted-foreground/30" />
                  }
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-foreground font-semibold text-sm truncate">
                  {order.title}
                </p>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-muted-foreground/70 text-xs">
                    {formatDate(order.createdAt)}
                  </span>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                    order.type === "feature"
                      ? "bg-orange-500/10 text-orange-400"
                      : "bg-blue-500/10 text-blue-400"
                  }`}>
                    {order.type === "feature" ? "Add-on" : "Course"}
                  </span>
                  {order.couponCode && (
                    <span className="text-orange-400 text-xs">
                      Coupon: {order.couponCode}
                    </span>
                  )}
                  {order.stripePaymentId && (
                    <span className="text-muted-foreground/50 text-xs font-mono">
                      #{order.stripePaymentId.slice(-8)}
                    </span>
                  )}
                </div>
              </div>

              {/* Amount & Status */}
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="text-right">
                  <p className="text-foreground font-bold">
                    ₹{order.amount.toLocaleString("en-IN")}
                  </p>
                  {order.discountAmount > 0 && (
                    <p className="text-emerald-400 text-xs">
                      −₹{order.discountAmount.toLocaleString("en-IN")}
                    </p>
                  )}
                </div>
                <Badge variant={statusVariant[order.status] || "gray"}>
                  {statusLabel[order.status] || order.status}
                </Badge>
                {order.courseId && order.status === "PAID" && (
                  <Link href={`/courses/${order.courseId}`} className="text-orange-400 hover:text-orange-300 transition-colors" title="View course">
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
                {order.courseId && order.status === "REFUNDED" && (
                  <Link
                    href={`/courses/${order.courseId}`}
                    className="flex items-center gap-1.5 text-xs font-medium text-orange-400 hover:text-orange-300 border border-orange-400/30 hover:border-orange-400/60 bg-orange-500/5 hover:bg-orange-500/10 px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap"
                    title="Re-enroll in this course"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Re-enroll
                  </Link>
                )}
                {order.featureSlug && order.status === "PAID" && (
                  <Link href={`/${order.featureSlug}`} className="text-orange-400 hover:text-orange-300 transition-colors" title="View feature">
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      ) : (
        <GlassCard padding="lg">
          <div className="text-center py-8 text-muted-foreground/70">
            <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="mb-2">No orders yet.</p>
            <Link href="/courses" className="text-orange-400 hover:text-orange-300">
              Browse Courses
            </Link>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
