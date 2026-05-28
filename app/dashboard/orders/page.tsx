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
  const [orders, bookOrders, refundRequests] = await Promise.all([
    prisma.order.findMany({
      where:   { userId },
      include: {
        course:  { select: { id: true, title: true, thumbnail: true } },
        feature: { select: { id: true, name: true, slug: true } },
        coupon:  { select: { code: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.bookOrder.findMany({
      where:   { userId },
      include: {
        coupon: { select: { code: true } },
        items: {
          include: {
            book: { select: { id: true, title: true, slug: true, coverImage: true, fileFormat: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.refundRequest.findMany({
      where:  { userId },
      select: { orderId: true, status: true },
    }),
  ]);

  const refundByOrderId = new Map(refundRequests.map((r) => [r.orderId, r.status]));

  const courseAndFeatureOrders = orders.map((order) => ({
    id:               order.id,
    title:            order.course?.title ?? order.feature?.name ?? "Purchase",
    type:             (order.feature ? "feature" : "course") as "course" | "feature" | "books",
    courseId:         order.course?.id ?? null,
    featureSlug:      order.feature?.slug ?? null,
    bookCount:        null as number | null,
    bookFormats:      null as string[] | null,
    thumbnail:        order.course?.thumbnail ?? null,
    amount:           Number(order.amount),
    currency:         order.currency,
    status:           order.status,
    couponCode:       order.coupon?.code ?? null,
    discountAmount:   Number(order.discountAmount || 0),
    razorpayPaymentId: order.razorpayPaymentId,
    hasRefundRequest:  refundByOrderId.has(order.id),
    refundStatus:     refundByOrderId.get(order.id) ?? null,
    createdAt:        order.createdAt,
  }));

  const bookOrderRows = bookOrders.map((bo) => {
    const titles  = bo.items.map((i) => i.book.title);
    const summary = titles.length === 1
      ? titles[0]
      : `${titles.length} books: ${titles.slice(0, 2).join(", ")}${titles.length > 2 ? "…" : ""}`;
    const formats = Array.from(new Set(bo.items.map((i) => i.book.fileFormat)));
    return {
      id:               bo.id,
      title:            summary,
      type:             "books" as const,
      courseId:         null,
      featureSlug:      null,
      bookCount:        bo.items.length,
      bookFormats:      formats,
      thumbnail:        bo.items[0]?.book.coverImage ?? null,
      amount:           Number(bo.amount),
      currency:         bo.currency,
      status:           bo.status,
      couponCode:       bo.coupon?.code ?? null,
      discountAmount:   Number(bo.discountAmount || 0),
      razorpayPaymentId: bo.razorpayPaymentId,
      hasRefundRequest:  false,
      refundStatus:     null,
      createdAt:        bo.createdAt,
    };
  });

  // Merge and sort by createdAt desc
  return [...courseAndFeatureOrders, ...bookOrderRows]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
          All your purchases — courses, books, and add-ons — in one place.
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
            <p className="mb-3">No orders yet.</p>
            <div className="flex items-center justify-center gap-4 text-sm">
              <Link href="/courses" className="text-[#d97757] hover:text-orange-300">
                Browse Courses
              </Link>
              <span className="text-muted-foreground/30">·</span>
              <Link href="/books" className="text-[#d97757] hover:text-orange-300">
                Browse Books
              </Link>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
