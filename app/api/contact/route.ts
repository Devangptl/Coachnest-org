/**
 * POST /api/contact — submit a contact form message (public)
 * GET  /api/contact — list all contact messages (admin only)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";
import {
  sendContactConfirmationEmail,
  sendContactNotificationToAdmin,
} from "@/lib/email";

const contactSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name is too long"),
  email: z
    .string()
    .email("Please enter a valid email address"),
  subject: z
    .string()
    .max(200, "Subject is too long")
    .optional()
    .or(z.literal("")),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(5000, "Message is too long"),
});

// ─── POST: submit contact form (public) ──────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = contactSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      return NextResponse.json({ error: "Validation failed", errors }, { status: 400 });
    }

    const { name, email, subject, message } = parsed.data;

    const contactMessage = await prisma.contactMessage.create({
      data: {
        name,
        email,
        subject: subject || null,
        message,
      },
    });

    // Fire-and-forget email notifications (don't block the response)
    Promise.allSettled([
      sendContactConfirmationEmail(email, name),
      sendContactNotificationToAdmin(name, email, subject || null, message),
    ]).then((results) => {
      results.forEach((r, i) => {
        if (r.status === "rejected") {
          console.error(`[POST /api/contact] Email ${i} failed:`, r.reason);
        }
      });
    });

    return NextResponse.json(
      { success: true, id: contactMessage.id },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/contact]", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again later." },
      { status: 500 }
    );
  }
}

// ─── GET: list messages (admin only) ─────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "INSTRUCTOR")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status"); // UNREAD | READ | REPLIED
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};
    if (status && ["UNREAD", "READ", "REPLIED"].includes(status)) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { subject: { contains: search } },
        { message: { contains: search } },
      ];
    }

    const messages = await prisma.contactMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const counts = await prisma.contactMessage.groupBy({
      by: ["status"],
      _count: { status: true },
    });

    const statusCounts = {
      ALL: messages.length,
      UNREAD: 0,
      READ: 0,
      REPLIED: 0,
    };
    counts.forEach((c) => {
      statusCounts[c.status as keyof typeof statusCounts] = c._count.status;
    });
    statusCounts.ALL = statusCounts.UNREAD + statusCounts.READ + statusCounts.REPLIED;

    return NextResponse.json({ messages, statusCounts });
  } catch (err) {
    console.error("[GET /api/contact]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
