/**
 * POST /api/admin/contact/[id]/reply — admin replies to a contact message
 * Sends email to user and updates the message status to REPLIED.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sendContactReplyEmail } from "@/lib/email";
import { z } from "zod";

const replySchema = z.object({
  reply: z
    .string()
    .min(1, "Reply cannot be empty")
    .max(10000, "Reply is too long"),
});

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "INSTRUCTOR")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const body = await req.json();
    const parsed = replySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors.reply?.[0] ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { reply } = parsed.data;

    // Fetch the original message
    const msg = await prisma.contactMessage.findUnique({ where: { id } });
    if (!msg) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Update message with reply
    const updated = await prisma.contactMessage.update({
      where: { id },
      data: {
        adminReply: reply,
        repliedAt: new Date(),
        repliedById: session.userId,
        status: "REPLIED",
      },
    });

    // Send email to user (fire-and-forget)
    sendContactReplyEmail(msg.email, msg.name, msg.subject, reply).catch((err) => {
      console.error("[POST /api/admin/contact/[id]/reply] Email failed:", err);
    });

    return NextResponse.json({ message: updated }, { status: 200 });
  } catch (err) {
    console.error("[POST /api/admin/contact/[id]/reply]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
