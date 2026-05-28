/**
 * Order Service — order and revenue queries for admin dashboard.
 * All methods return plain serializable objects (safe to pass to Client Components).
 */
import { prisma } from "@/lib/prisma";
import { startOfMonth, subMonths, format, parseISO, startOfDay, endOfDay } from "date-fns";
import { OrderStatus } from "@prisma/client";
import { buildPaginated, parsePagination, type Paginated, type PaginationParams } from "@/lib/pagination";

// ─── Orders List with Filters ────────────────────────────────────────────

export async function getOrdersList(filters?: {
  status?: OrderStatus;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  courseId?: string;
  search?: string;
} & PaginationParams): Promise<Paginated<{
  id: string;
  studentName: string;
  studentEmail: string;
  courseTitle: string;
  amount: number;
  currency: string;
  status: OrderStatus;
  couponCode?: string;
  discountAmount: number;
  createdAt: Date;
  updatedAt: Date;
}>> {
  const { page, pageSize, skip, take } = parsePagination(filters);
  const where: any = {};

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.dateFrom) {
    where.createdAt = { gte: startOfDay(parseISO(filters.dateFrom)) };
  }

  if (filters?.dateTo) {
    const dateTo = where.createdAt?.gte
      ? { gte: where.createdAt.gte, lte: endOfDay(parseISO(filters.dateTo)) }
      : { lte: endOfDay(parseISO(filters.dateTo)) };
    where.createdAt = dateTo;
  }

  if (filters?.minAmount || filters?.maxAmount) {
    where.amount = {};
    if (filters.minAmount) where.amount.gte = filters.minAmount;
    if (filters.maxAmount) where.amount.lte = filters.maxAmount;
  }

  if (filters?.courseId) {
    where.courseId = filters.courseId;
  }

  // Search by order ID / student name / email — pushed into the query so
  // pagination and the total count stay correct.
  if (filters?.search) {
    where.OR = [
      { id: { contains: filters.search, mode: "insensitive" } },
      { user: { name: { contains: filters.search, mode: "insensitive" } } },
      { user: { email: { contains: filters.search, mode: "insensitive" } } },
    ];
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true } },
        coupon: { select: { code: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.order.count({ where }),
  ]);

  const data = orders.map((order) => ({
    id: order.id,
    studentName: order.user.name,
    studentEmail: order.user.email,
    courseTitle: order.course?.title || "N/A",
    amount: Number(order.amount),
    currency: order.currency,
    status: order.status,
    couponCode: order.coupon?.code,
    discountAmount: Number(order.discountAmount || 0),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  }));

  return buildPaginated(data, total, page, pageSize);
}

// ─── Single Order Details ────────────────────────────────────────────────

export async function getOrderDetails(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      course: { select: { id: true, title: true, category: { select: { name: true } } } },
      coupon: { select: { code: true, discount: true, discountType: true } },
    },
  });

  if (!order) return null;

  return {
    id: order.id,
    studentName: order.user.name,
    studentEmail: order.user.email,
    studentPhone: null,
    courseTitle: order.course?.title,
    courseCategory: order.course?.category?.name,
    amount: Number(order.amount),
    currency: order.currency,
    status: order.status,
    couponCode: order.coupon?.code,
    couponDiscount: order.coupon?.discount ? Number(order.coupon.discount) : null,
    couponDiscountType: order.coupon?.discountType,
    discountAmount: Number(order.discountAmount || 0),
    razorpayPaymentId: order.razorpayPaymentId,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

// ─── Revenue Metrics (Monthly) ────────────────────────────────────────────

export async function getRevenueMetrics(months = 12) {
  const since = subMonths(startOfMonth(new Date()), months - 1);

  const orders = await prisma.order.findMany({
    where: { status: "PAID", createdAt: { gte: since } },
    select: { amount: true, createdAt: true },
  });

  // Build a map month → total
  const map: Record<string, number> = {};
  for (let i = 0; i < months; i++) {
    const key = format(subMonths(new Date(), months - 1 - i), "MMM yyyy");
    map[key] = 0;
  }
  for (const o of orders) {
    const key = format(o.createdAt, "MMM yyyy");
    if (key in map) map[key] += Number(o.amount);
  }

  return Object.entries(map).map(([month, revenue]) => ({ month, revenue }));
}

// ─── Revenue Statistics ───────────────────────────────────────────────────

export async function getRevenueStats() {
  const [totalRevenue, avgOrderValue, paidOrders, pendingOrders, failedOrders] = await Promise.all([
    prisma.order.aggregate({
      where: { status: "PAID" },
      _sum: { amount: true },
    }),
    prisma.order.aggregate({
      where: { status: "PAID" },
      _avg: { amount: true },
    }),
    prisma.order.count({ where: { status: "PAID" } }),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.order.count({ where: { status: "FAILED" } }),
  ]);

  const refundedOrders = await prisma.order.count({ where: { status: "REFUNDED" } });
  const totalOrders = await prisma.order.count();

  return {
    totalRevenue: Number(totalRevenue._sum.amount || 0),
    avgOrderValue: Number(avgOrderValue._avg.amount || 0),
    paidOrders,
    pendingOrders,
    failedOrders,
    refundedOrders,
    totalOrders,
    refundRate: totalOrders > 0 ? (refundedOrders / totalOrders) * 100 : 0,
  };
}

// ─── Top Courses by Revenue ────────────────────────────────────────────────

export async function getTopCoursesByRevenue(limit = 5) {
  const courses = await prisma.course.findMany({
    select: {
      id: true,
      title: true,
      orders: {
        where: { status: "PAID" },
        select: { amount: true },
      },
      _count: { select: { enrollments: true, orders: true } },
    },
  });

  const coursesWithRevenue = courses
    .map((course) => ({
      id: course.id,
      title: course.title,
      totalRevenue: course.orders.reduce((sum, order) => sum + Number(order.amount), 0),
      enrollments: course._count.enrollments,
      paidOrders: course.orders.length,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, limit);

  return coursesWithRevenue;
}

// ─── Refund Statistics ─────────────────────────────────────────────────────

export async function getRefundStatistics() {
  const refundedOrders = await prisma.order.findMany({
    where: { status: "REFUNDED" },
    select: { amount: true, discountAmount: true, createdAt: true, updatedAt: true },
  });

  const totalRefundAmount = refundedOrders.reduce((sum, order) => sum + Number(order.amount), 0);
  const totalOrders = await prisma.order.count();
  const refundRate = totalOrders > 0 ? (refundedOrders.length / totalOrders) * 100 : 0;

  return {
    totalRefunds: refundedOrders.length,
    totalRefundAmount,
    avgRefundAmount: refundedOrders.length > 0 ? totalRefundAmount / refundedOrders.length : 0,
    refundRate,
  };
}

// ─── Update Order Status (for refunds) ─────────────────────────────────────

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  return prisma.order.update({
    where: { id: orderId },
    data: { status },
  });
}
