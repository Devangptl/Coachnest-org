/**
 * GET    /api/demo-requests/[id] — get single demo request (admin)
 * PATCH  /api/demo-requests/[id] — update status / schedule / notes (admin)
 * DELETE /api/demo-requests/[id] — delete demo request (admin)
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { z } from "zod";
import {
  getDemoRequest,
  updateDemoRequest,
  deleteDemoRequest,
  DemoRequestError,
} from "@/services/demo-request.service";

type Ctx = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  status: z.enum(["PENDING", "CONTACTED", "SCHEDULED", "COMPLETED", "CANCELLED"]).optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  meetingLink: z.string().url("Meeting link must be a valid URL").max(500).nullable().optional(),
  adminNotes: z.string().max(5000).nullable().optional(),
});

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const request = await getDemoRequest(id);
    if (!request) {
      return NextResponse.json({ error: "Demo request not found" }, { status: 404 });
    }

    return NextResponse.json({ request });
  } catch (err) {
    console.error("[GET /api/demo-requests/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      return NextResponse.json({ error: "Validation failed", errors }, { status: 400 });
    }

    const request = await updateDemoRequest(id, parsed.data, session.userId);
    return NextResponse.json({ request });
  } catch (err) {
    if (err instanceof DemoRequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[PATCH /api/demo-requests/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    await deleteDemoRequest(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/demo-requests/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
