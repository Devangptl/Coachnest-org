/**
 * Coupon Service — coupon management queries for admin dashboard.
 * All methods return plain serializable objects (safe to pass to Client Components).
 */
import { prisma } from "@/lib/prisma";
import { DiscountType } from "@prisma/client";

// ─── Coupon List with Usage Stats ─────────────────────────────────────────

export async function getCouponsList(organizationId?: string) {
  const coupons = await prisma.coupon.findMany({
    where: organizationId ? { organizationId } : undefined,
    include: {
      _count: { select: { orders: true } },
      orders: {
        select: { discountAmount: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return coupons.map((coupon) => ({
    id: coupon.id,
    code: coupon.code,
    description: coupon.description,
    discountType: coupon.discountType,
    discount: Number(coupon.discount),
    maxUses: coupon.maxUses,
    uses: coupon.uses,
    expiresAt: coupon.expiresAt,
    createdAt: coupon.createdAt,
    totalDiscountGiven: coupon.orders.reduce((sum, order) => sum + Number(order.discountAmount || 0), 0),
    status: getCouponStatus(coupon),
  }));
}

// ─── Single Coupon Details ────────────────────────────────────────────────

export async function getCouponDetails(couponId: string) {
  const coupon = await prisma.coupon.findUnique({
    where: { id: couponId },
  });

  if (!coupon) return null;

  return {
    id: coupon.id,
    code: coupon.code,
    description: coupon.description,
    discountType: coupon.discountType,
    discount: Number(coupon.discount),
    maxUses: coupon.maxUses,
    uses: coupon.uses,
    expiresAt: coupon.expiresAt,
    createdAt: coupon.createdAt,
    status: getCouponStatus(coupon),
  };
}

// ─── Coupon Usage Statistics ──────────────────────────────────────────────

export async function getCouponUsageStats(couponId: string) {
  const orders = await prisma.order.findMany({
    where: { couponId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      course: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalDiscountGiven = orders.reduce((sum, order) => sum + Number(order.discountAmount || 0), 0);

  return {
    totalOrders: orders.length,
    totalDiscountGiven,
    avgDiscountPerOrder: orders.length > 0 ? totalDiscountGiven / orders.length : 0,
    orders: orders.map((order) => ({
      id: order.id,
      studentName: order.user.name,
      studentEmail: order.user.email,
      courseTitle: order.course?.title || "N/A",
      discountAmount: Number(order.discountAmount || 0),
      orderAmount: Number(order.amount),
      createdAt: order.createdAt,
    })),
  };
}

// ─── Generate Coupon Code ─────────────────────────────────────────────────

export function generateCouponCode(prefix = "LEARN", length = 8): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = prefix;
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ─── Check Coupon Status ──────────────────────────────────────────────────

function getCouponStatus(coupon: any): "ACTIVE" | "EXPIRED" | "DISABLED" | "UNLIMITED" {
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    return "EXPIRED";
  }
  if (coupon.maxUses && coupon.uses >= coupon.maxUses) {
    return "DISABLED";
  }
  if (!coupon.maxUses) {
    return "UNLIMITED";
  }
  return "ACTIVE";
}

// ─── Create Coupon ────────────────────────────────────────────────────────

export async function createCoupon(data: {
  code: string;
  description?: string;
  discountType: DiscountType;
  discount: number;
  maxUses?: number;
  expiresAt?: Date;
  organizationId?: string;
}) {
  return prisma.coupon.create({
    data: {
      code: data.code,
      description: data.description,
      discountType: data.discountType,
      discount: data.discount,
      maxUses: data.maxUses,
      expiresAt: data.expiresAt,
      organizationId: data.organizationId,
    },
  });
}

// ─── Update Coupon ────────────────────────────────────────────────────────

export async function updateCoupon(
  couponId: string,
  data: {
    description?: string;
    discount?: number;
    maxUses?: number;
    expiresAt?: Date | null;
  }
) {
  const update: any = {};
  if (data.description !== undefined) update.description = data.description;
  if (data.discount !== undefined) update.discount = data.discount;
  if (data.maxUses !== undefined) update.maxUses = data.maxUses;
  if (data.expiresAt !== undefined) update.expiresAt = data.expiresAt;

  return prisma.coupon.update({
    where: { id: couponId },
    data: update,
  });
}

// ─── Delete Coupon ────────────────────────────────────────────────────────

export async function deleteCoupon(couponId: string) {
  return prisma.coupon.delete({
    where: { id: couponId },
  });
}
