/**
 * Subscription Service — stubs retained for interface compatibility.
 *
 * The platform uses a direct-purchase model. All access checks return true.
 */
import { prisma } from "@/lib/prisma";

// ─── Constants ────────────────────────────────────────────────────────────────

export const BASIC_COURSE_LIMIT = 5;

/** Numeric rank for plan comparison (higher = more access) */
const PLAN_RANK: Record<string, number> = {
  FREE: 0, BASIC: 1, PRO: 2, ENTERPRISE: 3,
};

// ─── PlanAccess type ──────────────────────────────────────────────────────────

export interface PlanAccess {
  /** Subscription is currently valid — paid content is accessible */
  isActive: boolean;
  /** Has any paid plan (false for FREE or no subscription) */
  isPaid: boolean;
  plan: "FREE" | "BASIC" | "PRO" | "ENTERPRISE";
  status: string | null;
  endDate: string | null;
  cancelledAt: string | null;
  trialEndsAt: string | null;

  // BASIC-specific limits
  /** null for PRO/ENTERPRISE (unlimited) */
  enrollmentLimit: number | null;
  /** Current total enrollments for this user */
  enrolledCount: number;
  /** true when BASIC user has used all 5 slots */
  limitReached: boolean;

  // Feature flags (derived from plan)
  canAccessPaidCourses: boolean;
  canAccessProCourses: boolean;
  hasCertificates: boolean;
  hasOfflineDownloads: boolean;
  hasAiRecommendations: boolean;
  hasInstructorQA: boolean;
  hasTeamManagement: boolean;
}

// ─── getPlanAccess ────────────────────────────────────────────────────────────

export async function getPlanAccess(userId: string): Promise<PlanAccess> {
  const enrolledCount = await prisma.enrollment.count({
    where: { userId },
  });

  // Plan functionality removed: everyone is treated as having full access to features.
  return {
    isActive: true,
    isPaid: true,
    plan: "FREE",
    status: "ACTIVE",
    endDate: null,
    cancelledAt: null,
    trialEndsAt: null,

    enrollmentLimit: null,
    enrolledCount,
    limitReached: false,

    canAccessPaidCourses: true,
    canAccessProCourses:  true,
    hasCertificates:      true,
    hasOfflineDownloads:  true,
    hasAiRecommendations: true,
    hasInstructorQA:      true,
    hasTeamManagement:    true,
  };
}

/** Retained for interface compatibility — always returns true. */
export function planMeetsRequirement(): boolean {
  return true;
}

// ─── Create Subscription Checkout Session ─────────────────────────────────────

export async function createSubscriptionCheckout(
  _userId: string,
  _plan: string,
  _billing: "monthly" | "yearly"
) {
  throw new Error("Subscription plans are no longer available. Please purchase courses directly.");
}

// ─── Get current subscription ─────────────────────────────────────────────────

export async function getUserSubscription(_userId: string) {
  return null;
}

// ─── Access check (backward-compat shim — use getPlanAccess for new code) ─────

export async function hasAllAccess(userId: string): Promise<boolean> {
  const access = await getPlanAccess(userId);
  return access.isActive && access.canAccessPaidCourses;
}

// ─── Cancel subscription ──────────────────────────────────────────────────────

export async function cancelSubscription(_userId: string) {
  return { success: true };
}

// ─── Resume subscription ──────────────────────────────────────────────────────

export async function resumeSubscription(_userId: string) {
  return { success: true };
}

// ─── Billing Portal session ───────────────────────────────────────────────────

export async function createBillingPortalSession(_userId: string) {
  throw new Error("Billing portal is no longer available. Manage your purchases at /dashboard/orders.");
}
