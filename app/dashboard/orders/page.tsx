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
import { ShoppingCart, Receipt, ArrowRight } from "lucide-react";

async function getUserOrders(userId: string) {
  const orders = await prisma.order.findMany({
    where: { userId },
    include: {
      course: { select: { id: true, title: true, thumbnail: true } },
      coupon: { select: { code: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return orders.map((order) => ({
    id: order.id,
    courseTitle: order.course?.title || "N/A",
    courseId: order.course?.id,
    courseThumbnail: order.course?.thumbnail,
    amount: Number(order.amount),
    currency: order.currency,
    status: order.status,
    couponCode: order.coupon?.code,
    discountAmount: Number(order.discountAmount || 0),
    stripePaymentId: order.stripePaymentId,
    createdAt: order.createdAt,
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
        <h1 className="text-3xl font-bold text-white">Order History</h1>
        <p className="text-white/50 mt-1">
          View your past purchases and payment receipts.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <GlassCard className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
            <ShoppingCart className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{orders.length}</div>
            <div className="text-white/50 text-sm">Total Orders</div>
          </div>
        </GlassCard>
        <GlassCard className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
            <Receipt className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              ₹{totalSpent.toLocaleString("en-IN")}
            </div>
            <div className="text-white/50 text-sm">Total Spent</div>
          </div>
        </GlassCard>
      </div>

      {/* Orders List */}
      {orders.length > 0 ? (
        <div className="space-y-3">
          {orders.map((order) => (
            <GlassCard key={order.id} className="flex items-center gap-4">
              {/* Thumbnail */}
              {order.courseThumbnail ? (
                <img
                  src={order.courseThumbnail}
                  alt=""
                  className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                  <ShoppingCart className="w-6 h-6 text-white/20" />
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">
                  {order.courseTitle}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-white/40 text-xs">
                    {formatDate(order.createdAt)}
                  </span>
                  {order.couponCode && (
                    <span className="text-purple-400 text-xs">
                      Coupon: {order.couponCode}
                    </span>
                  )}
                  {order.stripePaymentId && (
                    <span className="text-white/30 text-xs font-mono">
                      #{order.stripePaymentId.slice(-8)}
                    </span>
                  )}
                </div>
              </div>

              {/* Amount & Status */}
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="text-right">
                  <p className="text-white font-bold">
                    ₹{order.amount.toLocaleString("en-IN")}
                  </p>
                  {order.discountAmount > 0 && (
                    <p className="text-emerald-400 text-xs">
                      -₹{order.discountAmount.toLocaleString("en-IN")}
                    </p>
                  )}
                </div>
                <Badge variant={statusVariant[order.status] || "gray"}>
                  {statusLabel[order.status] || order.status}
                </Badge>
                {order.courseId && order.status === "PAID" && (
                  <Link
                    href={`/courses/${order.courseId}`}
                    className="text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      ) : (
        <GlassCard padding="lg">
          <div className="text-center py-8 text-white/40">
            <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-white/20" />
            <p className="mb-2">No orders yet.</p>
            <Link href="/courses" className="text-purple-400 hover:text-purple-300">
              Browse Courses
            </Link>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
