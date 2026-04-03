/**
 * POST /api/waitlist — save an email to the launch waitlist (public)
 * GET  /api/waitlist — list all waitlist entries (admin only)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

// ─── POST: join waitlist (public) ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors.email?.[0] ?? "Invalid email" },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    // upsert so re-submitting the same email is a no-op (not an error)
    await prisma.waitlistEntry.upsert({
      where:  { email },
      update: {},
      create: { email },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/waitlist]", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

// ─── GET: list entries (admin only) ──────────────────────────────────────────

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const entries = await prisma.waitlistEntry.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, createdAt: true },
    });

    return NextResponse.json({ entries, total: entries.length });
  } catch (err) {
    console.error("[GET /api/waitlist]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
