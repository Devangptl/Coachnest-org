/**
 * POST /api/demo-requests — submit a demo request (public)
 * GET  /api/demo-requests — list demo requests (admin only)
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { z } from "zod";
import {
  createDemoRequest,
  listDemoRequests,
  DemoRequestError,
} from "@/services/demo-request.service";
import type { DemoRequestStatus } from "@/lib/generated/prisma/client";
import { TEAM_SIZES, TIME_SLOTS, DEMO_INTERESTS } from "@/lib/demo-request-options";

const demoRequestSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name is too long"),
  email: z
    .string()
    .email("Please enter a valid email address"),
  phone: z
    .string()
    .max(20, "Phone number is too long")
    .regex(/^[+\d][\d\s()-]*$/, "Please enter a valid phone number")
    .optional()
    .or(z.literal("")),
  organization: z
    .string()
    .min(2, "Organization must be at least 2 characters")
    .max(150, "Organization name is too long"),
  jobTitle: z
    .string()
    .max(100, "Job title is too long")
    .optional()
    .or(z.literal("")),
  teamSize: z.enum(TEAM_SIZES).optional(),
  interests: z
    .array(z.enum(DEMO_INTERESTS))
    .min(1, "Pick at least one area of interest")
    .max(DEMO_INTERESTS.length),
  preferredDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
    .optional()
    .or(z.literal("")),
  preferredTimeSlot: z.enum(TIME_SLOTS).optional(),
  timezone: z.string().max(64).optional().or(z.literal("")),
  message: z
    .string()
    .max(2000, "Message is too long")
    .optional()
    .or(z.literal("")),
  source: z.string().max(100).optional().or(z.literal("")),
});

// ─── POST: submit demo request (public) ──────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = demoRequestSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      return NextResponse.json({ error: "Validation failed", errors }, { status: 400 });
    }

    const d = parsed.data;

    if (d.preferredDate) {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      if (new Date(`${d.preferredDate}T00:00:00.000Z`) < today) {
        return NextResponse.json(
          { error: "Validation failed", errors: { preferredDate: ["Preferred date must be in the future"] } },
          { status: 400 }
        );
      }
    }

    const request = await createDemoRequest({
      name: d.name,
      email: d.email,
      phone: d.phone || undefined,
      organization: d.organization,
      jobTitle: d.jobTitle || undefined,
      teamSize: d.teamSize,
      interests: d.interests,
      preferredDate: d.preferredDate || undefined,
      preferredTimeSlot: d.preferredTimeSlot,
      timezone: d.timezone || undefined,
      message: d.message || undefined,
      source: d.source || undefined,
    });

    return NextResponse.json({ success: true, id: request.id }, { status: 201 });
  } catch (err) {
    if (err instanceof DemoRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[POST /api/demo-requests]", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again later." },
      { status: 500 }
    );
  }
}

// ─── GET: list demo requests (admin only) ────────────────────────────────────

const STATUSES: DemoRequestStatus[] = ["PENDING", "CONTACTED", "SCHEDULED", "COMPLETED", "CANCELLED"];

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const statusParam = searchParams.get("status");
    const status = STATUSES.includes(statusParam as DemoRequestStatus)
      ? (statusParam as DemoRequestStatus)
      : undefined;

    const result = await listDemoRequests({
      status,
      search: searchParams.get("search") ?? undefined,
      page: Number(searchParams.get("page")) || 1,
      pageSize: Number(searchParams.get("pageSize")) || 25,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/demo-requests]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
