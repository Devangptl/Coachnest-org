/**
 * Organization service — registration, settings, member management,
 * plan-limit enforcement, and free org-student enrollment.
 *
 * Tenant rule: every function takes organizationId (or resolves it itself)
 * and scopes every query with it. Callers must pass the id from
 * lib/org-auth.ts OrgContext — never from client input.
 */
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";
import { getRazorpay } from "@/lib/razorpay";
import { syncOrgMetadata } from "@/lib/org-metadata";
import { sendOrgMemberInviteEmail } from "@/lib/email";
import { seatKindForRole } from "@/lib/org-permissions";
import type { OrgRole } from "@/lib/generated/prisma/client";

// ─── Registration ─────────────────────────────────────────────────────────────

export interface RegisterOrganizationInput {
  name: string;
  slug: string;
  email: string;
  phone?: string | null;
  logo?: string | null;
  planId: string;
  billingCycle: "MONTHLY" | "YEARLY";
  admin: {
    name: string;
    email: string;
    password?: string;
    useCurrentUser: boolean;
  };
  /** Set when the caller is already authenticated and admin.useCurrentUser is true. */
  currentUserId?: string | null;
}

export async function isSlugAvailable(slug: string): Promise<boolean> {
  const existing = await prisma.organization.findUnique({ where: { slug }, select: { id: true } });
  return !existing;
}

/**
 * Creates the org (PENDING), its first ORG_ADMIN membership, a PENDING
 * subscription + transaction, and a Razorpay order for the first payment.
 * The org activates in finalizeOrgSubscriptionPayment (org-subscription.service).
 */
export async function registerOrganization(input: RegisterOrganizationInput) {
  if (!(await isSlugAvailable(input.slug))) throw new Error("Slug is already taken");

  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: input.planId } });
  if (!plan || !plan.isActive) throw new Error("Plan not found");

  const amount =
    input.billingCycle === "YEARLY" ? Number(plan.priceYearly) : Number(plan.priceMonthly);
  if (Math.round(amount * 100) < 100) throw new Error("Plan amount must be at least ₹1");

  // ── Resolve / create the first ORG_ADMIN user ─────────────────────────────
  let adminUserId: string;
  const createdNewAdmin = !input.admin.useCurrentUser;
  if (input.admin.useCurrentUser) {
    if (!input.currentUserId) throw new Error("Not authenticated");
    adminUserId = input.currentUserId;
  } else {
    if (!input.admin.password) throw new Error("Password is required");
    const existing = await prisma.user.findUnique({ where: { email: input.admin.email } });
    if (existing) {
      throw new Error("An account with this email already exists. Log in and register the organization from that account.");
    }
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: input.admin.email,
      password: input.admin.password,
      email_confirm: true,
      user_metadata: { name: input.admin.name, avatar: null },
      app_metadata: { role: "STUDENT" },
    });
    if (error || !data.user) throw new Error(error?.message ?? "Failed to create admin account");
    adminUserId = data.user.id;

    await prisma.user.upsert({
      where: { id: adminUserId },
      create: { id: adminUserId, name: input.admin.name, email: input.admin.email, role: "STUDENT" },
      update: { name: input.admin.name },
    });
  }

  // ── Org + membership + pending subscription + pending transaction ─────────
  const { org, txn } = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        name: input.name,
        slug: input.slug,
        email: input.email,
        phone: input.phone ?? null,
        logo: input.logo ?? null,
        status: "PENDING",
      },
    });
    await tx.organizationMember.create({
      data: { organizationId: org.id, userId: adminUserId, role: "ORG_OWNER" },
    });
    const subscription = await tx.organizationSubscription.create({
      data: {
        organizationId: org.id,
        planId: plan.id,
        billingCycle: input.billingCycle,
        amount,
        status: "PENDING",
      },
    });
    const txn = await tx.organizationTransaction.create({
      data: {
        organizationId: org.id,
        subscriptionId: subscription.id,
        type: "SUBSCRIPTION",
        status: "PENDING",
        amount,
        paidByUserId: adminUserId,
        notes: { planName: plan.name, planSlug: plan.slug, billingCycle: input.billingCycle },
      },
    });
    return { org, txn };
  });

  // Membership exists (org still PENDING) — sync claims so the admin can
  // reach /org/[slug]/admin/billing to complete an abandoned payment.
  await syncOrgMetadata(adminUserId);

  // Create the Razorpay order LAST. If it fails (e.g. bad Razorpay keys),
  // roll back everything we just created so the slug/email are free to retry
  // — otherwise a failed attempt would leave a dangling PENDING org.
  let rzpOrder: { id: string };
  try {
    rzpOrder = await createOrgRazorpayOrder(txn.id, amount);
  } catch (err) {
    console.error("[registerOrganization] Razorpay order creation failed:", err);
    // Cascades delete the membership, subscription, and transaction.
    await prisma.organization.delete({ where: { id: org.id } }).catch(() => null);
    if (createdNewAdmin) {
      await prisma.user.delete({ where: { id: adminUserId } }).catch(() => null);
      await supabaseAdmin.auth.admin.deleteUser(adminUserId).catch(() => null);
    } else {
      // Keep the existing user but drop the now-removed org from their claims.
      await syncOrgMetadata(adminUserId).catch(() => null);
    }
    throw new Error(
      "Could not start the payment. Please verify the Razorpay configuration (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) and try again.",
    );
  }

  return {
    organizationId: org.id,
    orgSlug: org.slug,
    transactionId: txn.id,
    razorpayOrderId: rzpOrder.id,
    amount,
    currency: "INR",
    adminUserId,
  };
}

/** Creates a Razorpay order for an org transaction and stores its id. */
export async function createOrgRazorpayOrder(orgTransactionId: string, amount: number) {
  const razorpay = getRazorpay();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rzpOrder = await (razorpay.orders.create as any)({
    amount: Math.round(amount * 100), // paise
    currency: "INR",
    receipt: `orgtxn_${orgTransactionId}`,
    notes: { type: "ORG_SUBSCRIPTION", orgTransactionId },
  });
  await prisma.organizationTransaction.update({
    where: { id: orgTransactionId },
    data: { razorpayOrderId: rzpOrder.id },
  });
  return rzpOrder as { id: string };
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function updateOrganization(
  organizationId: string,
  data: { name?: string; email?: string | null; phone?: string | null; logo?: string | null },
) {
  return prisma.organization.update({ where: { id: organizationId }, data });
}

// ─── Plan limits ──────────────────────────────────────────────────────────────

type LimitKind = "students" | "instructors" | "courses";

/** Throws when the active plan's limit for `kind` is already reached. */
export async function enforcePlanLimit(organizationId: string, kind: LimitKind): Promise<void> {
  const subscription = await prisma.organizationSubscription.findFirst({
    where: { organizationId, status: "ACTIVE" },
    orderBy: { endDate: "desc" },
    include: { plan: { select: { maxStudents: true, maxInstructors: true, maxCourses: true } } },
  });
  if (!subscription) throw new Error("No active subscription");

  const limit =
    kind === "students"
      ? subscription.plan.maxStudents
      : kind === "instructors"
        ? subscription.plan.maxInstructors
        : subscription.plan.maxCourses;
  if (limit == null) return; // unlimited

  const count =
    kind === "courses"
      ? await prisma.course.count({ where: { organizationId } })
      : await prisma.organizationMember.count({
          where: {
            organizationId,
            // TAs share the instructor seat bucket; see seatKindForRole.
            role: { in: kind === "students" ? ["ORG_STUDENT"] : ["ORG_INSTRUCTOR", "ORG_TA"] },
          },
        });

  if (count >= limit) {
    throw new Error(`Plan limit reached: your plan allows up to ${limit} ${kind}. Upgrade to add more.`);
  }
}

// ─── Members ──────────────────────────────────────────────────────────────────

export async function listOrgMembers(
  organizationId: string,
  opts?: { role?: OrgRole; search?: string },
) {
  return prisma.organizationMember.findMany({
    where: {
      organizationId,
      ...(opts?.role ? { role: opts.role } : {}),
      ...(opts?.search
        ? {
            user: {
              OR: [
                { name: { contains: opts.search, mode: "insensitive" } },
                { email: { contains: opts.search, mode: "insensitive" } },
              ],
            },
          }
        : {}),
    },
    include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
    orderBy: { joinedAt: "desc" },
  });
}

/**
 * Adds a member by email. Existing platform users are attached directly;
 * unknown emails get a Supabase invite (the user sets their password via the
 * invite link).
 */
export async function addOrgMember(
  organizationId: string,
  input: { name: string; email: string; role: OrgRole },
) {
  const seatKind = seatKindForRole(input.role);
  if (seatKind) {
    await enforcePlanLimit(organizationId, seatKind);
  }

  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { id: true, name: true, slug: true },
  });

  let user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user) {
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(input.email, {
      data: { name: input.name, avatar: null },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/org/${org.slug}/login`,
    });
    if (error || !data.user) throw new Error(error?.message ?? "Failed to invite user");
    await supabaseAdmin.auth.admin.updateUserById(data.user.id, {
      app_metadata: { role: "STUDENT" },
    });
    user = await prisma.user.upsert({
      where: { id: data.user.id },
      create: { id: data.user.id, name: input.name, email: input.email, role: "STUDENT" },
      update: { name: input.name },
    });
  }

  const existing = await prisma.organizationMember.findUnique({
    where: { userId_organizationId: { userId: user.id, organizationId } },
  });
  if (existing) throw new Error("This user is already a member of the organization");

  const member = await prisma.organizationMember.create({
    data: { organizationId, userId: user.id, role: input.role },
    include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
  });

  await syncOrgMetadata(user.id);
  sendOrgMemberInviteEmail(input.email, input.name, org.name, org.slug, input.role).catch(
    console.error,
  );

  return member;
}

export async function updateOrgMemberRole(
  organizationId: string,
  userId: string,
  role: OrgRole,
) {
  const current = await prisma.organizationMember.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
    select: { role: true },
  });
  if (!current) throw new Error("Member not found");

  // Demoting the last remaining owner would orphan the org.
  if (current.role === "ORG_OWNER" && role !== "ORG_OWNER") {
    await assertNotLastOwner(organizationId, userId);
  }

  const seatKind = seatKindForRole(role);
  if (seatKind && current.role !== role) {
    await enforcePlanLimit(organizationId, seatKind);
  }

  const member = await prisma.organizationMember.update({
    where: { userId_organizationId: { userId, organizationId } },
    data: { role },
  });
  await syncOrgMetadata(userId);
  return member;
}

export async function removeOrgMember(organizationId: string, userId: string) {
  const member = await prisma.organizationMember.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
  });
  if (!member) throw new Error("Member not found");

  if (member.role === "ORG_OWNER") {
    await assertNotLastOwner(organizationId, userId);
  }

  await prisma.organizationMember.delete({
    where: { userId_organizationId: { userId, organizationId } },
  });
  await syncOrgMetadata(userId);
}

/** A member's current org role, or null if they are not a member. */
export async function getOrgMemberRole(
  organizationId: string,
  userId: string,
): Promise<OrgRole | null> {
  const member = await prisma.organizationMember.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
    select: { role: true },
  });
  return member?.role ?? null;
}

/** Throws if `userId` is the organization's only ORG_OWNER. */
async function assertNotLastOwner(organizationId: string, userId: string): Promise<void> {
  const otherOwners = await prisma.organizationMember.count({
    where: { organizationId, role: "ORG_OWNER", userId: { not: userId } },
  });
  if (otherOwners === 0) {
    throw new Error("Cannot remove or demote the last organization owner");
  }
}

/**
 * Transfer ownership: promote `toUserId` to ORG_OWNER and demote the current
 * owner (`fromUserId`) to ORG_ADMIN, atomically. Both must be members.
 */
export async function transferOrgOwnership(
  organizationId: string,
  fromUserId: string,
  toUserId: string,
) {
  if (fromUserId === toUserId) {
    throw new Error("You already own this organization");
  }
  const target = await prisma.organizationMember.findUnique({
    where: { userId_organizationId: { userId: toUserId, organizationId } },
    select: { role: true },
  });
  if (!target) throw new Error("Member not found");

  await prisma.$transaction([
    prisma.organizationMember.update({
      where: { userId_organizationId: { userId: toUserId, organizationId } },
      data: { role: "ORG_OWNER" },
    }),
    prisma.organizationMember.updateMany({
      where: { organizationId, userId: fromUserId, role: "ORG_OWNER" },
      data: { role: "ORG_ADMIN" },
    }),
  ]);

  await Promise.all([syncOrgMetadata(toUserId), syncOrgMetadata(fromUserId)]);
}

// ─── Org-student enrollment (subscription-covered, no payment) ────────────────

export async function enrollOrgStudent(
  organizationId: string,
  userId: string,
  courseId: string,
) {
  const course = await prisma.course.findFirst({
    where: { id: courseId, organizationId, status: "PUBLISHED" },
    select: { id: true, title: true },
  });
  if (!course) throw new Error("Course not found in this organization");

  const existing = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (existing) throw new Error("Already enrolled in this course");

  return prisma.enrollment.create({ data: { userId, courseId } });
}

// ─── Platform-admin oversight ─────────────────────────────────────────────────

export async function setOrganizationStatus(
  organizationId: string,
  status: "ACTIVE" | "SUSPENDED",
) {
  return prisma.organization.update({ where: { id: organizationId }, data: { status } });
}
