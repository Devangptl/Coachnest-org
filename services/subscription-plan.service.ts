/**
 * Subscription plan service — DB-driven plans for organization subscriptions.
 * Plans are soft-archived (isActive=false), never deleted: subscriptions FK them.
 */
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";

export async function listPlans(opts?: { includeInactive?: boolean }) {
  return prisma.subscriptionPlan.findMany({
    where: opts?.includeInactive ? {} : { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { priceMonthly: "asc" }],
  });
}

export async function getPlanById(id: string) {
  return prisma.subscriptionPlan.findUnique({ where: { id } });
}

export interface PlanInput {
  name: string;
  slug: string;
  description?: string | null;
  priceMonthly: number;
  priceYearly: number;
  maxStudents?: number | null;
  maxInstructors?: number | null;
  maxCourses?: number | null;
  features?: string[] | null;
  isActive?: boolean;
  sortOrder?: number;
}

export async function createPlan(data: PlanInput) {
  const existing = await prisma.subscriptionPlan.findUnique({ where: { slug: data.slug } });
  if (existing) throw new Error("A plan with this slug already exists");

  return prisma.subscriptionPlan.create({
    data: {
      ...data,
      features: (data.features ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function updatePlan(id: string, data: Partial<PlanInput>) {
  if (data.slug) {
    const existing = await prisma.subscriptionPlan.findUnique({ where: { slug: data.slug } });
    if (existing && existing.id !== id) throw new Error("A plan with this slug already exists");
  }
  return prisma.subscriptionPlan.update({
    where: { id },
    data: {
      ...data,
      features:
        data.features === undefined
          ? undefined
          : ((data.features ?? Prisma.JsonNull) as Prisma.InputJsonValue),
    },
  });
}

export async function archivePlan(id: string) {
  return prisma.subscriptionPlan.update({ where: { id }, data: { isActive: false } });
}
