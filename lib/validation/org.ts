/**
 * Zod validation schemas for the multi-tenant Organization module.
 */
import { z } from "zod";
import { ORG_ROLES } from "@/lib/org-permissions";

// Static /org/* segments and portal names that can never be org slugs.
export const RESERVED_ORG_SLUGS = [
  "register",
  "login",
  "admin",
  "instructor",
  "student",
  "api",
  "expired",
  "new",
  "settings",
  "billing",
] as const;

export const orgSlugSchema = z
  .string()
  .min(3)
  .max(40)
  .regex(
    /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/,
    "Slug must be lowercase letters, numbers, and hyphens (no leading/trailing hyphen)",
  )
  .refine((s) => !RESERVED_ORG_SLUGS.includes(s as (typeof RESERVED_ORG_SLUGS)[number]), {
    message: "This slug is reserved",
  });

export const orgRoleEnum = z.enum(ORG_ROLES);
export const billingCycleEnum = z.enum(["MONTHLY", "YEARLY"]);

export const registerOrganizationSchema = z.object({
  name: z.string().min(2).max(120),
  slug: orgSlugSchema,
  email: z.string().email(),
  phone: z.string().min(7).max(20).optional().nullable(),
  logo: z.string().url().optional().nullable(),
  planId: z.string().min(1),
  billingCycle: billingCycleEnum,
  admin: z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    // Omitted when the currently logged-in user becomes the org admin.
    password: z.string().min(6).optional(),
    useCurrentUser: z.boolean().default(false),
  }),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().min(7).max(20).optional().nullable(),
  logo: z.string().url().optional().nullable(),
});

export const subscriptionPlanSchema = z.object({
  name: z.string().min(2).max(60),
  slug: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().max(2000).optional().nullable(),
  priceMonthly: z.number().nonnegative(),
  priceYearly: z.number().nonnegative(),
  maxStudents: z.number().int().positive().optional().nullable(),
  maxInstructors: z.number().int().positive().optional().nullable(),
  maxCourses: z.number().int().positive().optional().nullable(),
  features: z.array(z.string().max(120)).max(20).optional().nullable(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const updateSubscriptionPlanSchema = subscriptionPlanSchema.partial();

export const addOrgMemberSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  role: orgRoleEnum,
});

export const updateOrgMemberSchema = z.object({
  role: orgRoleEnum,
});

export const changePlanSchema = z.object({
  planId: z.string().min(1),
  billingCycle: billingCycleEnum,
});

export const refundOrgTransactionSchema = z.object({
  amount: z.number().positive().optional(), // omitted = full refund
  reason: z.string().min(3).max(2000),
});
