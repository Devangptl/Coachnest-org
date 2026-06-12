/**
 * Demo Request Service.
 *
 * Handles the public "Request a Demo" funnel and the admin pipeline that
 * follows it. A request moves through:
 *
 *   PENDING → CONTACTED → SCHEDULED → COMPLETED
 *                                   ↘ CANCELLED (from any open state)
 *
 * Open states (PENDING / CONTACTED / SCHEDULED) are deduplicated per email
 * so the same visitor can't pile up parallel requests, and submissions are
 * soft rate-limited per email per day.
 */
import { prisma } from "@/lib/prisma";
import {
  sendDemoRequestConfirmationEmail,
  sendDemoRequestNotificationToAdmin,
  sendDemoScheduledEmail,
} from "@/lib/email";
import type { DemoRequestStatus, Prisma } from "@/lib/generated/prisma/client";

const OPEN_STATUSES: DemoRequestStatus[] = ["PENDING", "CONTACTED", "SCHEDULED"];
const MAX_SUBMISSIONS_PER_DAY = 3;

export class DemoRequestError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export interface CreateDemoRequestInput {
  name: string;
  email: string;
  phone?: string;
  organization: string;
  jobTitle?: string;
  teamSize?: string;
  interests: string[];
  preferredDate?: string; // YYYY-MM-DD
  preferredTimeSlot?: string;
  timezone?: string;
  message?: string;
  source?: string;
}

export async function createDemoRequest(input: CreateDemoRequestInput) {
  const email = input.email.trim().toLowerCase();

  const existingOpen = await prisma.demoRequest.findFirst({
    where: { email, status: { in: OPEN_STATUSES } },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true, scheduledAt: true },
  });
  if (existingOpen) {
    throw new DemoRequestError(
      existingOpen.status === "SCHEDULED"
        ? "You already have a demo scheduled. Check your inbox for the details."
        : "You already have an open demo request. Our team will reach out shortly.",
      409
    );
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentCount = await prisma.demoRequest.count({
    where: { email, createdAt: { gte: since } },
  });
  if (recentCount >= MAX_SUBMISSIONS_PER_DAY) {
    throw new DemoRequestError(
      "Too many demo requests from this email today. Please try again tomorrow.",
      429
    );
  }

  const preferredDate = input.preferredDate ? new Date(`${input.preferredDate}T00:00:00.000Z`) : null;

  const request = await prisma.demoRequest.create({
    data: {
      name: input.name.trim(),
      email,
      phone: input.phone?.trim() || null,
      organization: input.organization.trim(),
      jobTitle: input.jobTitle?.trim() || null,
      teamSize: input.teamSize || null,
      interests: input.interests,
      preferredDate,
      preferredTimeSlot: input.preferredTimeSlot || null,
      timezone: input.timezone || null,
      message: input.message?.trim() || null,
      source: input.source || null,
    },
  });

  const prettyDate = preferredDate
    ? preferredDate.toLocaleDateString("en-US", { timeZone: "UTC", weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : null;

  Promise.allSettled([
    sendDemoRequestConfirmationEmail({
      to: email,
      name: request.name,
      organization: request.organization,
      preferredDate: prettyDate,
      preferredTimeSlot: request.preferredTimeSlot,
    }),
    sendDemoRequestNotificationToAdmin({
      name: request.name,
      email,
      phone: request.phone,
      organization: request.organization,
      jobTitle: request.jobTitle,
      teamSize: request.teamSize,
      interests: request.interests,
      preferredDate: prettyDate,
      preferredTimeSlot: request.preferredTimeSlot,
      timezone: request.timezone,
      message: request.message,
    }),
  ]).then((results) => {
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        console.error(`[demo-request] email ${i} failed:`, r.reason);
      }
    });
  });

  return request;
}

export interface ListDemoRequestsOptions {
  status?: DemoRequestStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function listDemoRequests(opts: ListDemoRequestsOptions = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 25));

  const where: Prisma.DemoRequestWhereInput = {};
  if (opts.status) where.status = opts.status;
  if (opts.search?.trim()) {
    const q = opts.search.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { organization: { contains: q, mode: "insensitive" } },
      { message: { contains: q, mode: "insensitive" } },
    ];
  }

  const [requests, total, grouped] = await Promise.all([
    prisma.demoRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.demoRequest.count({ where }),
    prisma.demoRequest.groupBy({ by: ["status"], _count: { status: true } }),
  ]);

  const statusCounts: Record<string, number> = {
    ALL: 0, PENDING: 0, CONTACTED: 0, SCHEDULED: 0, COMPLETED: 0, CANCELLED: 0,
  };
  for (const g of grouped) {
    statusCounts[g.status] = g._count.status;
    statusCounts.ALL += g._count.status;
  }

  return { requests, total, page, pageSize, statusCounts };
}

export async function getDemoRequest(id: string) {
  return prisma.demoRequest.findUnique({ where: { id } });
}

export interface UpdateDemoRequestInput {
  status?: DemoRequestStatus;
  scheduledAt?: string | null; // ISO datetime
  meetingLink?: string | null;
  adminNotes?: string | null;
}

export async function updateDemoRequest(
  id: string,
  input: UpdateDemoRequestInput,
  actorId: string
) {
  const existing = await prisma.demoRequest.findUnique({ where: { id } });
  if (!existing) throw new DemoRequestError("Demo request not found.", 404);

  const data: Prisma.DemoRequestUpdateInput = { handledById: actorId };

  if (input.adminNotes !== undefined) data.adminNotes = input.adminNotes;
  if (input.meetingLink !== undefined) data.meetingLink = input.meetingLink;
  if (input.scheduledAt !== undefined) {
    data.scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;
  }

  if (input.status && input.status !== existing.status) {
    data.status = input.status;
    const now = new Date();
    if (input.status === "CONTACTED" && !existing.contactedAt) data.contactedAt = now;
    if (input.status === "COMPLETED") data.completedAt = now;
    if (input.status === "CANCELLED") data.cancelledAt = now;
    if (input.status === "SCHEDULED") {
      const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : existing.scheduledAt;
      if (!scheduledAt) {
        throw new DemoRequestError("A date and time is required to schedule a demo.", 400);
      }
    }
  }

  const updated = await prisma.demoRequest.update({ where: { id }, data });

  const becameScheduled = input.status === "SCHEDULED" && existing.status !== "SCHEDULED";
  if (becameScheduled && updated.scheduledAt) {
    sendDemoScheduledEmail({
      to: updated.email,
      name: updated.name,
      organization: updated.organization,
      scheduledAt: updated.scheduledAt,
      timezone: updated.timezone,
      meetingLink: updated.meetingLink,
    }).catch((err) => console.error("[demo-request] scheduled email failed:", err));
  }

  return updated;
}

export async function deleteDemoRequest(id: string) {
  await prisma.demoRequest.delete({ where: { id } });
}
