/**
 * Dashboard — Order History page
 */
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import GlassCard from "@/components/GlassCard";
import { ShoppingCart, Receipt } from "lucide-react";
import Link from "next/link";
import OrdersClient from "./OrdersClient";

async function getUserOrders(userId: string) {
  const [orders, refundRequests] = await Promise.all([
    prisma.order.findMany({
      where:   { userId },
      include: {
        course:  { select: { id: true, title: true, thumbnail: true } },
        feature: { select: { id: true, name: true, slug: true } },
        coupon:  { select: { code: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.refundRequest.findMany({
      where:  { userId },
      select: { orderId: true, status: true },
    }),
  ]);

  const refundByOrderId = new Map(refundRequests.map((r) => [r.orderId, r.status]));

  return orders.map((order) => ({
    id:               order.id,
    title:            order.course?.title ?? order.feature?.name ?? "Purchase",
    type:             (order.feature ? "feature" : "course") as "course" | "feature",
    courseId:         order.course?.id ?? null,
    featureSlug:      order.feature?.slug ?? null,
    thumbnail:        order.course?.thumbnail ?? null,
    amount:           Number(order.amount),
    currency:         order.currency,
    status:           order.status,
    couponCode:       order.coupon?.code ?? null,
    discountAmount:   Number(order.discountAmount || 0),
    stripePaymentId:  order.stripePaymentId,
    hasRefundRequest: refundByOrderId.has(order.id),
    refundStatus:     refundByOrderId.get(order.id) ?? null,
    createdAt:        order.createdAt,
  }));
}

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
          View your past purchases and request refunds for eligible courses.
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
        <OrdersClient initialOrders={orders} />
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
