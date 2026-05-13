/**
 * POST /api/admin/email-templates/[id]/send-test
 * Send a test email using this template to the admin's own email.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Resend } from "resend";

const resend   = new Resend(process.env.RESEND_API_KEY || "re_placeholder");
const FROM     = process.env.EMAIL_FROM ?? "CoachNest <noreply@coachnest.dev>";
const APP      = process.env.NEXT_PUBLIC_APP_URL ?? "https://coachnest.dev";
const LOGO_URL = process.env.EMAIL_LOGO_URL ?? "https://www.coachnest.in/logo.png";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const body = await req.json();
    const { to, variables } = body as { to?: string; variables?: Record<string, string> };

    const template = await prisma.emailTemplate.findUnique({ where: { id } });
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const recipientEmail = to || session.email;
    if (!recipientEmail) {
      return NextResponse.json({ error: "No recipient email provided" }, { status: 400 });
    }

    // Merge built-in vars (logo, appUrl) with caller-supplied vars, then substitute
    const allVars: Record<string, string> = { logo: LOGO_URL, appUrl: APP, ...variables };
    let htmlBody = template.htmlBody;
    let subject  = template.subject;
    for (const [key, val] of Object.entries(allVars)) {
      const re = new RegExp(`{{\\s*${key}\\s*}}`, "g");
      htmlBody = htmlBody.replace(re, val);
      subject  = subject.replace(re, val);
    }

    let resendId: string | null = null;
    let sendError: string | null = null;

    try {
      const result = await resend.emails.send({
        from: FROM,
        to: recipientEmail,
        subject: `[TEST] ${subject}`,
        html: htmlBody,
      });
      resendId = result.data?.id ?? null;
    } catch (e: unknown) {
      sendError = e instanceof Error ? e.message : String(e);
    }

    // Log the test send
    await prisma.emailLog.create({
      data: {
        to: recipientEmail,
        subject: `[TEST] ${subject}`,
        templateId: template.id,
        templateName: template.name,
        status: sendError ? "FAILED" : "SENT",
        resendId,
        error: sendError,
        meta: { test: true, variables: variables || {} },
      },
    });

    if (sendError) {
      return NextResponse.json({ error: sendError }, { status: 500 });
    }

    return NextResponse.json({ success: true, resendId });
  } catch (err) {
    console.error("[POST /api/admin/email-templates/[id]/send-test]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
