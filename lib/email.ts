/**
 * Email service — uses Resend (https://resend.com).
 * All emails are sent server-side from API routes / services (fire-and-forget).
 *
 * Theme: dark background (#0a0a0a), orange accent (#ea580c → #f97316),
 * matching the Coachnest UI design language.
 */
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

const resend   = new Resend(process.env.RESEND_API_KEY || "re_placeholder");
const FROM     = process.env.EMAIL_FROM ?? "Coachnest <noreply@coachnest.dev>";
const APP      = process.env.NEXT_PUBLIC_APP_URL ?? "https://coachnest.dev";
const LOGO_URL = process.env.EMAIL_LOGO_URL ?? "https://www.coachnest.in/logo.png";

/** Sends an email via Resend and writes an EmailLog row (fire-and-forget). */
async function send(
  params: Parameters<typeof resend.emails.send>[0],
  logMeta?: { templateId?: string; templateName?: string }
) {
  let resendId: string | null = null;
  let sendError: string | null = null;

  try {
    const result = await resend.emails.send(params);
    resendId = result.data?.id ?? null;
    return result;
  } catch (e: unknown) {
    sendError = e instanceof Error ? e.message : String(e);
    throw e;
  } finally {
    const recipient = Array.isArray(params.to) ? params.to[0] : (params.to as string);
    const subject   = typeof params.subject === "string" ? params.subject : "";
    prisma.emailLog
      .create({
        data: {
          to: recipient,
          subject,
          status: sendError ? "FAILED" : "SENT",
          resendId,
          error: sendError,
          templateId:   logMeta?.templateId   ?? null,
          templateName: logMeta?.templateName ?? null,
        },
      })
      .catch((err) => console.error("[email] log failed:", err));
  }
}

/**
 * Checks if an admin-created template with the given slug exists and is active.
 * If so, substitutes {{variable}} placeholders and returns overridden subject + html.
 * Returns null if no active custom template is found (fall back to hardcoded).
 */
async function resolveTemplate(
  slug: string,
  vars: Record<string, string>
): Promise<{ subject: string; html: string; templateId: string; templateName: string } | null> {
  try {
    const tpl = await prisma.emailTemplate.findUnique({ where: { slug } });
    if (!tpl || !tpl.isActive) return null;

    const allVars = { ...vars, logo: LOGO_URL, appUrl: APP };

    let html    = tpl.htmlBody;
    let subject = tpl.subject;
    for (const [key, val] of Object.entries(allVars)) {
      const re = new RegExp(`{{\\s*${key}\\s*}}`, "g");
      html    = html.replace(re, val);
      subject = subject.replace(re, val);
    }
    return { subject, html, templateId: tpl.id, templateName: tpl.name };
  } catch {
    // Never block email delivery because of a DB lookup failure
    return null;
  }
}

/**
 * In dev / Resend sandbox mode, all emails are redirected to a single
 * address (the Resend account owner). Set DEV_EMAIL_OVERRIDE in .env.
 */
const DEV_EMAIL_OVERRIDE = process.env.DEV_EMAIL_OVERRIDE;

function resolveRecipient(to: string): string {
  if (DEV_EMAIL_OVERRIDE && process.env.NODE_ENV !== "production") {
    console.log(`[email] dev-redirect: ${to} → ${DEV_EMAIL_OVERRIDE.trim()}`);
    return DEV_EMAIL_OVERRIDE.trim();
  }
  return to;
}

// ─── Base template ────────────────────────────────────────────────────────────

function btn(label: string, href: string) {
  return `<a href="${href}" style="display:inline-block;background:linear-gradient(135deg,#ea580c,#f97316);color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:13px 28px;border-radius:10px;margin-top:8px;">${label}</a>`;
}

function infoRow(label: string, value: string) {
  return `<tr>
    <td style="padding:8px 14px;color:#a3a3a3;font-size:13px;border-bottom:1px solid #1f1f1f;">${label}</td>
    <td style="padding:8px 14px;color:#e5e5e5;font-size:13px;font-weight:600;border-bottom:1px solid #1f1f1f;">${value}</td>
  </tr>`;
}

function badge(text: string, color = "#f97316") {
  return `<span style="display:inline-block;background:${color}1a;border:1px solid ${color}40;color:${color};font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;letter-spacing:0.5px;text-transform:uppercase;">${text}</span>`;
}

/** Wraps any body HTML in the standard Coachnest email shell. */
function shell(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
</head>
<body style="margin:0;padding:0;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:48px 16px;">
  <tr><td align="center">
  <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

    <!-- Orange top accent bar -->
    <tr><td style="height:3px;background:linear-gradient(90deg,#ea580c,#f97316,#fb923c);border-radius:3px 3px 0 0;"></td></tr>

    <!-- Card -->
    <tr><td style="background:#111111;border:1px solid #1f1f1f;border-top:none;border-radius:0 0 14px 14px;padding:40px 40px 36px;">

      <!-- Wordmark -->
      <div style="margin-bottom:32px;">
        <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">
          Coach<span style="color:#f97316;">nest</span>
        </span>
      </div>

      <!-- Body -->
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        ${body}
      </div>

    </td></tr>

    <!-- Footer -->
    <tr><td style="padding:24px 0 8px;text-align:center;">
      <p style="font-family:sans-serif;font-size:11px;color:#3d3d3d;margin:0 0 6px;">
        © ${new Date().getFullYear()} Coachnest — Modern Learning Platform
      </p>
      <p style="font-family:sans-serif;font-size:11px;color:#2d2d2d;margin:0;">
        <a href="${APP}/legal/privacy-policy" style="color:#3d3d3d;text-decoration:none;">Privacy Policy</a>
        &nbsp;·&nbsp;
        <a href="${APP}/contact" style="color:#3d3d3d;text-decoration:none;">Contact Us</a>
        &nbsp;·&nbsp;
        <a href="${APP}/dashboard/subscription" style="color:#3d3d3d;text-decoration:none;">Manage Subscription</a>
      </p>
    </td></tr>

  </table>
  </td></tr>
</table>
</body></html>`;
}

// ─── 1. Welcome email ─────────────────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, name: string) {
  const override = await resolveTemplate("welcome", { name });
  return send({
    from: FROM,
    to:   resolveRecipient(to),
    subject: override?.subject ?? "Welcome to Coachnest — you're in! 🎓",
    html: override?.html ?? shell(`
      <h1 style="color:#ffffff;font-size:26px;font-weight:800;margin:0 0 8px;letter-spacing:-0.5px;">
        Welcome, ${name}! 👋
      </h1>
      <p style="color:#a3a3a3;font-size:15px;line-height:1.7;margin:0 0 28px;">
        Your Coachnest account is ready. Start exploring expert-crafted courses and
        level up your skills at your own pace.
      </p>

      <table cellpadding="0" cellspacing="0" style="background:#0d0d0d;border:1px solid #1f1f1f;border-radius:10px;width:100%;margin-bottom:28px;">
        <tr><td style="padding:20px 20px 4px;">
          <p style="color:#6b6b6b;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin:0 0 12px;">Get started</p>
        </td></tr>
        <tr><td style="padding:0 20px 8px;">
          <div style="display:flex;align-items:flex-start;margin-bottom:14px;">
            <span style="color:#f97316;font-size:16px;font-weight:900;margin-right:12px;margin-top:1px;">01</span>
            <div>
              <p style="color:#e5e5e5;font-size:13px;font-weight:600;margin:0 0 2px;">Browse the course library</p>
              <p style="color:#6b6b6b;font-size:12px;margin:0;">Find courses that match your goals.</p>
            </div>
          </div>
          <div style="display:flex;align-items:flex-start;margin-bottom:14px;">
            <span style="color:#f97316;font-size:16px;font-weight:900;margin-right:12px;margin-top:1px;">02</span>
            <div>
              <p style="color:#e5e5e5;font-size:13px;font-weight:600;margin:0 0 2px;">Enroll and start learning</p>
              <p style="color:#6b6b6b;font-size:12px;margin:0;">Learn with video, reading, and quizzes.</p>
            </div>
          </div>
          <div style="display:flex;align-items:flex-start;margin-bottom:20px;">
            <span style="color:#f97316;font-size:16px;font-weight:900;margin-right:12px;margin-top:1px;">03</span>
            <div>
              <p style="color:#e5e5e5;font-size:13px;font-weight:600;margin:0 0 2px;">Earn your certificate</p>
              <p style="color:#6b6b6b;font-size:12px;margin:0;">Complete all lessons and download your proof.</p>
            </div>
          </div>
        </td></tr>
      </table>

      ${btn("Explore Courses", `${APP}/courses`)}
      <p style="color:#525252;font-size:12px;margin:20px 0 0;">
        Questions? Reply to this email or visit <a href="${APP}/contact" style="color:#f97316;">our contact page</a>.
      </p>
    `),
  }, override ? { templateId: override.templateId, templateName: override.templateName } : undefined);
}

// ─── 2. Free course enrollment ────────────────────────────────────────────────

export async function sendFreeEnrollmentEmail(
  to: string,
  name: string,
  courseTitle: string,
  courseId: string
) {
  const override = await resolveTemplate("free-enrollment", { name, courseTitle, link: `${APP}/courses/${courseId}` });
  return send({
    from: FROM,
    to:   resolveRecipient(to),
    subject: override?.subject ?? `You're enrolled in "${courseTitle}" — Coachnest 🎉`,
    html: override?.html ?? shell(`
      <p style="margin:0 0 4px;">${badge("Free Enrollment", "#22c55e")}</p>
      <h1 style="color:#ffffff;font-size:26px;font-weight:800;margin:12px 0 8px;letter-spacing:-0.5px;">
        You're enrolled, ${name}! 🎉
      </h1>
      <p style="color:#a3a3a3;font-size:15px;line-height:1.7;margin:0 0 28px;">
        You now have free access to
        <strong style="color:#f97316;">${courseTitle}</strong>.
        Start learning whenever you're ready.
      </p>

      <table cellpadding="0" cellspacing="0" style="background:#0d0d0d;border:1px solid #1f1f1f;border-radius:10px;width:100%;margin-bottom:28px;">
        <tbody>
          ${infoRow("Course", courseTitle)}
          ${infoRow("Access", "Free · Lifetime")}
        </tbody>
      </table>

      ${btn("Start Learning", `${APP}/courses/${courseId}`)}
      <p style="color:#525252;font-size:12px;margin:20px 0 0;">
        Questions? <a href="${APP}/contact" style="color:#f97316;">Contact us</a> anytime.
      </p>
    `),
  }, override ? { templateId: override.templateId, templateName: override.templateName } : undefined);
}

// ─── 3. Purchase / enrollment confirmation ────────────────────────────────────

export async function sendPurchaseEmail(
  to: string,
  name: string,
  courseTitle: string,
  amount: string,
  courseId: string
) {
  const override = await resolveTemplate("purchase-confirmation", {
    name, courseTitle, amount, link: `${APP}/courses/${courseId}`,
  });
  return send({
    from: FROM,
    to:   resolveRecipient(to),
    subject: override?.subject ?? `You're enrolled in "${courseTitle}" — Coachnest`,
    html: override?.html ?? shell(`
      <p style="margin:0 0 4px;">${badge("Enrollment Confirmed")}</p>
      <h1 style="color:#ffffff;font-size:26px;font-weight:800;margin:12px 0 8px;letter-spacing:-0.5px;">
        You're In! 🎉
      </h1>
      <p style="color:#a3a3a3;font-size:15px;line-height:1.7;margin:0 0 28px;">
        Hi ${name}, you've successfully enrolled in
        <strong style="color:#f97316;">${courseTitle}</strong>.
        Start learning whenever you're ready.
      </p>

      <table cellpadding="0" cellspacing="0" style="background:#0d0d0d;border:1px solid #1f1f1f;border-radius:10px;width:100%;margin-bottom:28px;">
        <tbody>
          ${infoRow("Course",      courseTitle)}
          ${infoRow("Amount paid", `₹${amount}`)}
          ${infoRow("Access",      "Lifetime")}
        </tbody>
      </table>

      ${btn("Start Learning", `${APP}/courses/${courseId}`)}
    `),
  }, override ? { templateId: override.templateId, templateName: override.templateName } : undefined);
}

// ─── 7b. Book purchase confirmation ──────────────────────────────────────────

export async function sendBookPurchaseEmail(
  to: string,
  name: string,
  bookTitles: string[],
  amount: string,
) {
  const titleSummary = bookTitles.length === 1
    ? `"${bookTitles[0]}"`
    : `${bookTitles.length} books`;

  const list = bookTitles
    .map((t) => `<li style="color:#e5e5e5;font-size:14px;line-height:1.7;margin:4px 0;">${t}</li>`)
    .join("");

  return send({
    from: FROM,
    to:   resolveRecipient(to),
    subject: `Your Coachnest purchase: ${titleSummary}`,
    html: shell(`
      <p style="margin:0 0 4px;">${badge("Purchase Confirmed")}</p>
      <h1 style="color:#ffffff;font-size:26px;font-weight:800;margin:12px 0 8px;letter-spacing:-0.5px;">
        Your books are ready 📚
      </h1>
      <p style="color:#a3a3a3;font-size:15px;line-height:1.7;margin:0 0 20px;">
        Hi ${name}, your payment was successful. The following ${bookTitles.length === 1 ? "title is" : "titles are"} now available in your library:
      </p>

      <ul style="background:#0d0d0d;border:1px solid #1f1f1f;border-radius:10px;padding:16px 24px;margin:0 0 24px;list-style:disc;">
        ${list}
      </ul>

      <table cellpadding="0" cellspacing="0" style="background:#0d0d0d;border:1px solid #1f1f1f;border-radius:10px;width:100%;margin-bottom:28px;">
        <tbody>
          ${infoRow("Amount paid", `₹${amount}`)}
          ${infoRow("Access",      "Perpetual download")}
        </tbody>
      </table>

      ${btn("Go to Library", `${APP}/dashboard/library`)}
    `),
  });
}

// ─── 8. Course update / new lesson ───────────────────────────────────────────

export async function sendCourseUpdateEmail(
  to: string,
  name: string,
  courseTitle: string,
  lessonTitle: string,
  courseId: string
) {
  const override = await resolveTemplate("course-update", {
    name, courseTitle, lessonTitle, link: `${APP}/courses/${courseId}`,
  });
  return send({
    from: FROM,
    to:   resolveRecipient(to),
    subject: override?.subject ?? `New lesson available in "${courseTitle}"`,
    html: override?.html ?? shell(`
      <p style="margin:0 0 4px;">${badge("New Lesson")}</p>
      <h1 style="color:#ffffff;font-size:26px;font-weight:800;margin:12px 0 8px;letter-spacing:-0.5px;">
        New Content Unlocked
      </h1>
      <p style="color:#a3a3a3;font-size:15px;line-height:1.7;margin:0 0 28px;">
        Hi ${name}, a new lesson has been added to
        <strong style="color:#f97316;">${courseTitle}</strong>:
      </p>

      <div style="background:#0d0d0d;border:1px solid #1f1f1f;border-left:3px solid #f97316;border-radius:0 10px 10px 0;padding:16px 20px;margin-bottom:28px;">
        <p style="color:#e5e5e5;font-size:16px;font-weight:700;margin:0;">${lessonTitle}</p>
      </div>

      ${btn("Continue Learning", `${APP}/courses/${courseId}`)}
    `),
  }, override ? { templateId: override.templateId, templateName: override.templateName } : undefined);
}

// ─── 9. Contact: confirmation to user ────────────────────────────────────────

export async function sendContactConfirmationEmail(to: string, name: string) {
  const override = await resolveTemplate("contact-confirmation", { name });
  return send({
    from: FROM,
    to:   resolveRecipient(to),
    subject: override?.subject ?? "We received your message — Coachnest",
    html: override?.html ?? shell(`
      <p style="margin:0 0 4px;">${badge("Message Received")}</p>
      <h1 style="color:#ffffff;font-size:26px;font-weight:800;margin:12px 0 8px;letter-spacing:-0.5px;">
        Thanks for reaching out, ${name}!
      </h1>
      <p style="color:#a3a3a3;font-size:15px;line-height:1.7;margin:0 0 24px;">
        We've received your message and our team will review it shortly.
        You can expect a response within <strong style="color:#e5e5e5;">24 hours</strong> on business days.
      </p>

      <div style="background:#0d0d0d;border:1px solid #1f1f1f;border-radius:10px;padding:16px 20px;margin-bottom:28px;">
        <p style="color:#6b6b6b;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin:0 0 8px;">What happens next</p>
        <p style="color:#a3a3a3;font-size:13px;line-height:1.6;margin:0;">
          A team member will review your inquiry and respond via email.
          For urgent matters, you can reach us at
          <a href="mailto:support@coachnest.com" style="color:#f97316;">support@coachnest.com</a>.
        </p>
      </div>

      ${btn("Visit Coachnest", APP)}
    `),
  }, override ? { templateId: override.templateId, templateName: override.templateName } : undefined);
}

// ─── 10. Contact: notification to admin ──────────────────────────────────────

export async function sendContactNotificationToAdmin(
  name: string,
  email: string,
  subject: string | null,
  message: string
) {
  const adminEmail = process.env.ADMIN_EMAIL ?? process.env.DEV_EMAIL_OVERRIDE ?? "admin@coachnest.dev";
  const override = await resolveTemplate("contact-admin-notification", {
    name, email, subject: subject ?? "", message,
  });
  return send({
    from: FROM,
    to:   resolveRecipient(adminEmail),
    subject: override?.subject ?? `[Coachnest] New inquiry from ${name}`,
    html: override?.html ?? shell(`
      <p style="margin:0 0 4px;">${badge("New Contact Inquiry", "#6b7280")}</p>
      <h1 style="color:#ffffff;font-size:24px;font-weight:800;margin:12px 0 20px;letter-spacing:-0.5px;">
        New Message Received
      </h1>

      <table cellpadding="0" cellspacing="0" style="background:#0d0d0d;border:1px solid #1f1f1f;border-radius:10px;width:100%;margin-bottom:20px;">
        <tbody>
          ${infoRow("From",    name)}
          ${infoRow("Email",   `<a href="mailto:${email}" style="color:#f97316;">${email}</a>`)}
          ${subject ? infoRow("Subject", subject) : ""}
        </tbody>
      </table>

      <div style="background:#0d0d0d;border:1px solid #1f1f1f;border-radius:10px;padding:16px 20px;margin-bottom:28px;">
        <p style="color:#6b6b6b;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin:0 0 10px;">Message</p>
        <p style="color:#d4d4d4;font-size:14px;line-height:1.7;margin:0;white-space:pre-wrap;">${message}</p>
      </div>

      ${btn("Reply in Admin Panel", `${APP}/admin/messages`)}
    `),
  }, override ? { templateId: override.templateId, templateName: override.templateName } : undefined);
}

// ─── 11. Contact: admin reply to user ────────────────────────────────────────

export async function sendContactReplyEmail(
  to: string,
  name: string,
  originalSubject: string | null,
  replyMessage: string
) {
  const subjectLine = originalSubject
    ? `Re: ${originalSubject} — Coachnest`
    : "Reply to your inquiry — Coachnest";
  const override = await resolveTemplate("contact-reply", {
    name, originalSubject: originalSubject ?? "", replyMessage,
  });

  return send({
    from: FROM,
    to:   resolveRecipient(to),
    subject: override?.subject ?? subjectLine,
    html: override?.html ?? shell(`
      <p style="margin:0 0 4px;">${badge("Support Reply")}</p>
      <h1 style="color:#ffffff;font-size:26px;font-weight:800;margin:12px 0 8px;letter-spacing:-0.5px;">
        Hi ${name}, we've replied!
      </h1>
      <p style="color:#a3a3a3;font-size:15px;line-height:1.7;margin:0 0 20px;">
        Our team has responded to your inquiry:
      </p>

      <div style="background:#0d0d0d;border:1px solid #1f1f1f;border-left:3px solid #f97316;border-radius:0 10px 10px 0;padding:20px 24px;margin-bottom:28px;">
        <p style="color:#d4d4d4;font-size:14px;line-height:1.8;margin:0;white-space:pre-wrap;">${replyMessage}</p>
      </div>

      <p style="color:#a3a3a3;font-size:14px;line-height:1.6;margin:0 0 24px;">
        Have a follow-up question? Simply reply to this email or visit our contact page.
      </p>

      ${btn("Contact Us Again", `${APP}/contact`)}
    `),
  }, override ? { templateId: override.templateId, templateName: override.templateName } : undefined);
}

// ─── 12. Certificate issued ───────────────────────────────────────────────────

export async function sendCertificateEmail(
  to: string,
  name: string,
  courseTitle: string,
  certUrl: string
) {
  const override = await resolveTemplate("certificate", { name, courseTitle, certUrl });
  return send({
    from: FROM,
    to:   resolveRecipient(to),
    subject: override?.subject ?? `Your certificate for "${courseTitle}" is ready! 🏆`,
    html: override?.html ?? shell(`
      <div style="text-align:center;margin-bottom:28px;">
        <div style="display:inline-block;width:64px;height:64px;background:linear-gradient(135deg,#f59e0b,#fbbf24);border-radius:16px;line-height:64px;font-size:32px;margin-bottom:16px;">🏆</div>
        <h1 style="color:#ffffff;font-size:28px;font-weight:900;margin:0 0 8px;letter-spacing:-0.5px;">
          Congratulations, ${name}!
        </h1>
        <p style="color:#a3a3a3;font-size:15px;line-height:1.7;margin:0;">
          You've completed <strong style="color:#fbbf24;">${courseTitle}</strong>.
          Your certificate is ready to download and share.
        </p>
      </div>

      <div style="background:linear-gradient(135deg,#1a1200,#1a0e00);border:1px solid #3a2800;border-radius:10px;padding:20px 24px;margin-bottom:28px;text-align:center;">
        <p style="color:#fbbf24;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px;">Certificate of Completion</p>
        <p style="color:#e5e5e5;font-size:16px;font-weight:600;margin:0;">${courseTitle}</p>
      </div>

      <div style="text-align:center;">
        ${btn("Download Certificate", certUrl)}
      </div>
      <p style="color:#525252;font-size:12px;margin:20px 0 0;text-align:center;">
        Share your achievement on LinkedIn to showcase your new skills!
      </p>
    `),
  }, override ? { templateId: override.templateId, templateName: override.templateName } : undefined);
}

// ─── 13. Instructor application received (to admin) ───────────────────────────

export async function sendInstructorApplicationToAdmin(
  instructorName: string,
  instructorEmail: string,
  userId: string
) {
  const adminEmail = process.env.ADMIN_EMAIL ?? process.env.DEV_EMAIL_OVERRIDE ?? "admin@coachnest.dev";
  const override = await resolveTemplate("instructor-application-admin", { instructorName, instructorEmail });
  return send({
    from: FROM,
    to:   resolveRecipient(adminEmail),
    subject: override?.subject ?? `[Coachnest] New instructor application from ${instructorName}`,
    html: override?.html ?? shell(`
      <p style="margin:0 0 4px;">${badge("Instructor Application", "#6b7280")}</p>
      <h1 style="color:#ffffff;font-size:24px;font-weight:800;margin:12px 0 20px;letter-spacing:-0.5px;">
        New Instructor Application
      </h1>
      <p style="color:#a3a3a3;font-size:15px;line-height:1.7;margin:0 0 24px;">
        A new user has applied to become an instructor on Coachnest and is awaiting your review.
      </p>

      <table cellpadding="0" cellspacing="0" style="background:#0d0d0d;border:1px solid #1f1f1f;border-radius:10px;width:100%;margin-bottom:28px;">
        <tbody>
          ${infoRow("Name",   instructorName)}
          ${infoRow("Email",  `<a href="mailto:${instructorEmail}" style="color:#f97316;">${instructorEmail}</a>`)}
          ${infoRow("Status", `<span style="color:#f59e0b;font-weight:700;">Pending Review</span>`)}
        </tbody>
      </table>

      ${btn("Review Application", `${APP}/admin/instructors/approvals`)}
      <p style="color:#525252;font-size:12px;margin:20px 0 0;">
        You can approve or reject this application from the admin panel.
      </p>
    `),
  }, override ? { templateId: override.templateId, templateName: override.templateName } : undefined);
}

// ─── 14. Instructor application approved ─────────────────────────────────────

export async function sendInstructorApprovedEmail(to: string, name: string) {
  const override = await resolveTemplate("instructor-approved", { name });
  return send({
    from: FROM,
    to:   resolveRecipient(to),
    subject: override?.subject ?? "Your Coachnest instructor application has been approved! 🎉",
    html: override?.html ?? shell(`
      <p style="margin:0 0 4px;">${badge("Application Approved", "#22c55e")}</p>
      <h1 style="color:#ffffff;font-size:26px;font-weight:800;margin:12px 0 8px;letter-spacing:-0.5px;">
        Congratulations, ${name}! 🎉
      </h1>
      <p style="color:#a3a3a3;font-size:15px;line-height:1.7;margin:0 0 28px;">
        Your instructor application has been <strong style="color:#22c55e;">approved</strong>.
        You now have full access to the instructor dashboard where you can create and publish courses,
        track student progress, and manage your earnings.
      </p>

      <table cellpadding="0" cellspacing="0" style="background:#0d0d0d;border:1px solid #1f1f1f;border-radius:10px;width:100%;margin-bottom:28px;">
        <tbody>
          ${infoRow("Status",  `<span style="color:#22c55e;font-weight:700;">Approved</span>`)}
          ${infoRow("Access",  "Instructor Dashboard")}
          ${infoRow("Ability", "Create & publish courses")}
        </tbody>
      </table>

      <div style="background:#0d1a0d;border:1px solid #1f3a1f;border-radius:10px;padding:16px 20px;margin-bottom:28px;">
        <p style="color:#86efac;font-size:13px;margin:0;line-height:1.6;">
          💡 <strong>Get started:</strong> Log in and head to your instructor dashboard to create your first course!
        </p>
      </div>

      ${btn("Go to Instructor Dashboard", `${APP}/instructor`)}
    `),
  }, override ? { templateId: override.templateId, templateName: override.templateName } : undefined);
}

// ─── 15. Instructor application rejected ─────────────────────────────────────

export async function sendInstructorRejectedEmail(
  to: string,
  name: string,
  reason?: string
) {
  const override = await resolveTemplate("instructor-rejected", { name, reason: reason ?? "" });
  return send({
    from: FROM,
    to:   resolveRecipient(to),
    subject: override?.subject ?? "Update on your Coachnest instructor application",
    html: override?.html ?? shell(`
      <p style="margin:0 0 4px;">${badge("Application Update", "#6b7280")}</p>
      <h1 style="color:#ffffff;font-size:26px;font-weight:800;margin:12px 0 8px;letter-spacing:-0.5px;">
        Application Status Update
      </h1>
      <p style="color:#a3a3a3;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Hi ${name}, thank you for applying to become an instructor on Coachnest.
        After careful review, we're unable to approve your application at this time.
      </p>

      ${reason ? `
      <div style="background:#0d0d0d;border:1px solid #1f1f1f;border-left:3px solid #6b7280;border-radius:0 10px 10px 0;padding:16px 20px;margin-bottom:24px;">
        <p style="color:#6b6b6b;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin:0 0 8px;">Reason</p>
        <p style="color:#d4d4d4;font-size:14px;line-height:1.7;margin:0;">${reason}</p>
      </div>
      ` : ""}

      <p style="color:#a3a3a3;font-size:14px;line-height:1.7;margin:0 0 28px;">
        You can continue using Coachnest as a student and access all available courses.
        If you have questions, please reach out to our support team.
      </p>

      ${btn("Contact Support", `${APP}/contact`)}
      <p style="color:#525252;font-size:12px;margin:20px 0 0;">
        Thank you for your interest in teaching on Coachnest.
      </p>
    `),
  }, override ? { templateId: override.templateId, templateName: override.templateName } : undefined);
}

// ─── 16. Refund request submitted (student confirmation) ──────────────────────

export async function sendRefundSubmittedEmail(
  to: string,
  name: string,
  courseTitle: string,
  refundAmount: string,
  progressPercent: string
) {
  const override = await resolveTemplate("refund-submitted", {
    name, courseTitle, refundAmount, progressPercent,
  });
  return send({
    from: FROM,
    to:   resolveRecipient(to),
    subject: override?.subject ?? `Refund request received for "${courseTitle}" — Coachnest`,
    html: override?.html ?? shell(`
      <p style="margin:0 0 4px;">${badge("Refund Request Received", "#6b7280")}</p>
      <h1 style="color:#ffffff;font-size:26px;font-weight:800;margin:12px 0 8px;letter-spacing:-0.5px;">
        We've Received Your Request
      </h1>
      <p style="color:#a3a3a3;font-size:15px;line-height:1.7;margin:0 0 28px;">
        Hi ${name}, your refund request has been submitted and is under review.
        Our team will process it within <strong style="color:#e5e5e5;">3–5 business days</strong>.
      </p>

      <table cellpadding="0" cellspacing="0" style="background:#0d0d0d;border:1px solid #1f1f1f;border-radius:10px;width:100%;margin-bottom:28px;">
        <tbody>
          ${infoRow("Course",        courseTitle)}
          ${infoRow("Progress",      `${progressPercent}% completed`)}
          ${infoRow("Refund amount", `₹${refundAmount}`)}
          ${infoRow("Status",        `<span style="color:#f59e0b;font-weight:700;">Under Review</span>`)}
        </tbody>
      </table>

      <div style="background:#111a11;border:1px solid #1f3a1f;border-radius:10px;padding:16px 20px;margin-bottom:28px;">
        <p style="color:#86efac;font-size:13px;margin:0;line-height:1.6;">
          💡 Your course access remains active until the refund is fully processed.
        </p>
      </div>

      ${btn("View Order History", `${APP}/dashboard/orders`)}
    `),
  }, override ? { templateId: override.templateId, templateName: override.templateName } : undefined);
}

// ─── 17. Refund processed (student — money returned) ─────────────────────────

export async function sendRefundProcessedEmail(
  to: string,
  name: string,
  courseTitle: string,
  refundAmount: string
) {
  const override = await resolveTemplate("refund-processed", { name, courseTitle, refundAmount });
  return send({
    from: FROM,
    to:   resolveRecipient(to),
    subject: override?.subject ?? `Your refund for "${courseTitle}" has been processed — Coachnest`,
    html: override?.html ?? shell(`
      <p style="margin:0 0 4px;">${badge("Refund Processed", "#22c55e")}</p>
      <h1 style="color:#ffffff;font-size:26px;font-weight:800;margin:12px 0 8px;letter-spacing:-0.5px;">
        Your Refund Is On Its Way
      </h1>
      <p style="color:#a3a3a3;font-size:15px;line-height:1.7;margin:0 0 28px;">
        Hi ${name}, we've successfully processed your refund for
        <strong style="color:#f97316;">${courseTitle}</strong>.
      </p>

      <table cellpadding="0" cellspacing="0" style="background:#0d0d0d;border:1px solid #1f1f1f;border-radius:10px;width:100%;margin-bottom:28px;">
        <tbody>
          ${infoRow("Course",        courseTitle)}
          ${infoRow("Refund amount", `<span style="color:#22c55e;font-weight:700;">₹${refundAmount}</span>`)}
          ${infoRow("Status",        `<span style="color:#22c55e;font-weight:700;">Processed</span>`)}
          ${infoRow("Arrival",       "5–10 business days")}
        </tbody>
      </table>

      <p style="color:#a3a3a3;font-size:14px;line-height:1.6;margin:0 0 24px;">
        The amount will be credited back to your original payment method.
        If you don't see it within 10 business days, please contact your bank.
      </p>

      ${btn("Explore More Courses", `${APP}/courses`)}
    `),
  }, override ? { templateId: override.templateId, templateName: override.templateName } : undefined);
}

// ─── 18. Refund rejected (student) ───────────────────────────────────────────

export async function sendRefundRejectedEmail(
  to: string,
  name: string,
  courseTitle: string,
  adminNotes?: string
) {
  const override = await resolveTemplate("refund-rejected", {
    name, courseTitle, adminNotes: adminNotes ?? "",
  });
  return send({
    from: FROM,
    to:   resolveRecipient(to),
    subject: override?.subject ?? `Your refund request for "${courseTitle}" was not approved — Coachnest`,
    html: override?.html ?? shell(`
      <p style="margin:0 0 4px;">${badge("Refund Not Approved", "#ef4444")}</p>
      <h1 style="color:#ffffff;font-size:26px;font-weight:800;margin:12px 0 8px;letter-spacing:-0.5px;">
        Refund Request Reviewed
      </h1>
      <p style="color:#a3a3a3;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Hi ${name}, after reviewing your refund request for
        <strong style="color:#f97316;">${courseTitle}</strong>, we were unable to approve it.
      </p>

      ${adminNotes ? `
      <div style="background:#0d0d0d;border:1px solid #1f1f1f;border-left:3px solid #ef4444;border-radius:0 10px 10px 0;padding:16px 20px;margin-bottom:28px;">
        <p style="color:#6b6b6b;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin:0 0 8px;">Review note</p>
        <p style="color:#d4d4d4;font-size:14px;line-height:1.7;margin:0;">${adminNotes}</p>
      </div>` : ""}

      <p style="color:#a3a3a3;font-size:14px;line-height:1.6;margin:0 0 24px;">
        Your access to the course remains active. If you have questions, our support team is happy to help.
      </p>

      ${btn("Contact Support", `${APP}/contact`)}
    `),
  }, override ? { templateId: override.templateId, templateName: override.templateName } : undefined);
}

// ─── 19. Payout request submitted (instructor confirmation) ───────────────────

export async function sendPayoutRequestedEmail(
  to: string,
  name: string,
  amount: string
) {
  const override = await resolveTemplate("payout-requested", { name, amount });
  return send({
    from: FROM,
    to:   resolveRecipient(to),
    subject: override?.subject ?? `Payout request of ₹${amount} received — Coachnest`,
    html: override?.html ?? shell(`
      <p style="margin:0 0 4px;">${badge("Payout Request Submitted", "#6b7280")}</p>
      <h1 style="color:#ffffff;font-size:26px;font-weight:800;margin:12px 0 8px;letter-spacing:-0.5px;">
        Payout Request Received
      </h1>
      <p style="color:#a3a3a3;font-size:15px;line-height:1.7;margin:0 0 28px;">
        Hi ${name}, we've received your payout request. Our team will review and process it within
        <strong style="color:#e5e5e5;">3–7 business days</strong>.
      </p>

      <table cellpadding="0" cellspacing="0" style="background:#0d0d0d;border:1px solid #1f1f1f;border-radius:10px;width:100%;margin-bottom:28px;">
        <tbody>
          ${infoRow("Requested amount", `₹${amount}`)}
          ${infoRow("Status",           `<span style="color:#f59e0b;font-weight:700;">Pending Review</span>`)}
        </tbody>
      </table>

      ${btn("View Wallet", `${APP}/instructor/earnings`)}
    `),
  }, override ? { templateId: override.templateId, templateName: override.templateName } : undefined);
}

// ─── 20. Payout approved (instructor) ────────────────────────────────────────

export async function sendPayoutApprovedEmail(to: string, name: string, amount: string) {
  const override = await resolveTemplate("payout-approved", { name, amount });
  return send({
    from: FROM,
    to:   resolveRecipient(to),
    subject: override?.subject ?? `Your payout request of ₹${amount} has been approved — Coachnest`,
    html: override?.html ?? shell(`
      <p style="margin:0 0 4px;">${badge("Payout Approved", "#22c55e")}</p>
      <h1 style="color:#ffffff;font-size:26px;font-weight:800;margin:12px 0 8px;letter-spacing:-0.5px;">
        Payout Approved!
      </h1>
      <p style="color:#a3a3a3;font-size:15px;line-height:1.7;margin:0 0 28px;">
        Hi ${name}, your payout request of <strong style="color:#22c55e;">₹${amount}</strong> has been
        approved. The transfer will be processed shortly.
      </p>

      <table cellpadding="0" cellspacing="0" style="background:#0d0d0d;border:1px solid #1f1f1f;border-radius:10px;width:100%;margin-bottom:28px;">
        <tbody>
          ${infoRow("Amount", `<span style="color:#22c55e;font-weight:700;">₹${amount}</span>`)}
          ${infoRow("Status", `<span style="color:#22c55e;font-weight:700;">Approved</span>`)}
        </tbody>
      </table>

      ${btn("View Earnings", `${APP}/instructor/earnings`)}
    `),
  }, override ? { templateId: override.templateId, templateName: override.templateName } : undefined);
}

// ─── 21. Payout rejected (instructor) ────────────────────────────────────────

export async function sendPayoutRejectedEmail(
  to: string,
  name: string,
  amount: string,
  adminNotes?: string
) {
  const override = await resolveTemplate("payout-rejected", {
    name, amount, adminNotes: adminNotes ?? "",
  });
  return send({
    from: FROM,
    to:   resolveRecipient(to),
    subject: override?.subject ?? `Your payout request of ₹${amount} was not approved — Coachnest`,
    html: override?.html ?? shell(`
      <p style="margin:0 0 4px;">${badge("Payout Not Approved", "#ef4444")}</p>
      <h1 style="color:#ffffff;font-size:26px;font-weight:800;margin:12px 0 8px;letter-spacing:-0.5px;">
        Payout Request Rejected
      </h1>
      <p style="color:#a3a3a3;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Hi ${name}, your payout request of <strong style="color:#f97316;">₹${amount}</strong> could not be approved.
        The amount has been returned to your wallet balance.
      </p>

      ${adminNotes ? `
      <div style="background:#0d0d0d;border:1px solid #1f1f1f;border-left:3px solid #ef4444;border-radius:0 10px 10px 0;padding:16px 20px;margin-bottom:28px;">
        <p style="color:#6b6b6b;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin:0 0 8px;">Admin note</p>
        <p style="color:#d4d4d4;font-size:14px;line-height:1.7;margin:0;">${adminNotes}</p>
      </div>` : ""}

      ${btn("View Wallet", `${APP}/instructor/earnings`)}
      <p style="color:#525252;font-size:12px;margin:20px 0 0;">
        Have questions? <a href="${APP}/contact" style="color:#f97316;">Contact support</a>.
      </p>
    `),
  }, override ? { templateId: override.templateId, templateName: override.templateName } : undefined);
}

// ─── 22. Payout processed/transferred (instructor) ───────────────────────────

export async function sendPayoutProcessedEmail(to: string, name: string, amount: string) {
  const override = await resolveTemplate("payout-processed", { name, amount });
  return send({
    from: FROM,
    to:   resolveRecipient(to),
    subject: override?.subject ?? `Your payout of ₹${amount} has been transferred — Coachnest`,
    html: override?.html ?? shell(`
      <p style="margin:0 0 4px;">${badge("Payout Transferred", "#22c55e")}</p>
      <h1 style="color:#ffffff;font-size:26px;font-weight:800;margin:12px 0 8px;letter-spacing:-0.5px;">
        Payment Sent! 🎉
      </h1>
      <p style="color:#a3a3a3;font-size:15px;line-height:1.7;margin:0 0 28px;">
        Hi ${name}, your payout of <strong style="color:#22c55e;">₹${amount}</strong> has been
        transferred to your bank account. Keep creating great content!
      </p>

      <table cellpadding="0" cellspacing="0" style="background:#0d0d0d;border:1px solid #1f1f1f;border-radius:10px;width:100%;margin-bottom:28px;">
        <tbody>
          ${infoRow("Amount transferred", `<span style="color:#22c55e;font-weight:700;">₹${amount}</span>`)}
          ${infoRow("Status",             `<span style="color:#22c55e;font-weight:700;">Processed</span>`)}
          ${infoRow("Arrival",            "1–3 business days")}
        </tbody>
      </table>

      ${btn("View Earnings", `${APP}/instructor/earnings`)}
    `),
  }, override ? { templateId: override.templateId, templateName: override.templateName } : undefined);
}

// ─── 23. Course approved by admin (instructor) ────────────────────────────────

export async function sendCourseApprovedEmail(
  to: string,
  name: string,
  courseTitle: string,
  courseId: string
) {
  const override = await resolveTemplate("course-approved", {
    name, courseTitle, link: `${APP}/instructor/courses/${courseId}`,
  });
  return send({
    from: FROM,
    to:   resolveRecipient(to),
    subject: override?.subject ?? `Your course "${courseTitle}" has been approved! 🎉`,
    html: override?.html ?? shell(`
      <p style="margin:0 0 4px;">${badge("Course Approved", "#22c55e")}</p>
      <h1 style="color:#ffffff;font-size:26px;font-weight:800;margin:12px 0 8px;letter-spacing:-0.5px;">
        Your Course Is Live!
      </h1>
      <p style="color:#a3a3a3;font-size:15px;line-height:1.7;margin:0 0 28px;">
        Hi ${name}, great news — <strong style="color:#f97316;">${courseTitle}</strong> has passed
        admin review and is now <strong style="color:#22c55e;">live on the platform</strong>.
        Students can now discover and enroll in your course.
      </p>

      <div style="background:#0d1a0d;border:1px solid #1f3a1f;border-radius:10px;padding:16px 20px;margin-bottom:28px;">
        <p style="color:#86efac;font-size:13px;margin:0;line-height:1.6;">
          💡 <strong>Promote your course!</strong> Share the link on social media to attract your first students.
        </p>
      </div>

      ${btn("View Your Course", `${APP}/instructor/courses/${courseId}`)}
    `),
  }, override ? { templateId: override.templateId, templateName: override.templateName } : undefined);
}

// ─── 25. Assignment graded (student) ─────────────────────────────────────────

export async function sendAssignmentGradedEmail(
  to: string,
  studentName: string,
  assignmentTitle: string,
  classTitle: string,
  score: number,
  maxScore: number,
  feedback: string | null,
  classId: string
) {
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const scoreColor = pct >= 70 ? "#22c55e" : pct >= 40 ? "#f59e0b" : "#ef4444";
  const override = await resolveTemplate("assignment-graded", {
    studentName, assignmentTitle, classTitle,
    score: String(score), maxScore: String(maxScore),
    feedback: feedback ?? "", link: `${APP}/classes/${classId}`,
  });
  return send({
    from: FROM,
    to:   resolveRecipient(to),
    subject: override?.subject ?? `Your assignment "${assignmentTitle}" has been graded`,
    html: override?.html ?? shell(`
      <p style="margin:0 0 4px;">${badge("Assignment Graded", scoreColor)}</p>
      <h1 style="color:#ffffff;font-size:26px;font-weight:800;margin:12px 0 8px;letter-spacing:-0.5px;">
        Your Submission Has Been Graded
      </h1>
      <p style="color:#a3a3a3;font-size:15px;line-height:1.7;margin:0 0 28px;">
        Hi ${studentName}, your instructor has reviewed your submission for
        <strong style="color:#f97316;">${assignmentTitle}</strong> in ${classTitle}.
      </p>

      <table cellpadding="0" cellspacing="0" style="background:#0d0d0d;border:1px solid #1f1f1f;border-radius:10px;width:100%;margin-bottom:28px;">
        <tbody>
          ${infoRow("Assignment", assignmentTitle)}
          ${infoRow("Score", `<span style="color:${scoreColor};font-weight:700;">${score} / ${maxScore} (${pct}%)</span>`)}
        </tbody>
      </table>

      ${feedback ? `
      <div style="background:#0d0d0d;border:1px solid #1f1f1f;border-left:3px solid #f97316;border-radius:0 10px 10px 0;padding:16px 20px;margin-bottom:28px;">
        <p style="color:#6b6b6b;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin:0 0 8px;">Instructor Feedback</p>
        <p style="color:#d4d4d4;font-size:14px;line-height:1.7;margin:0;white-space:pre-wrap;">${feedback}</p>
      </div>` : ""}

      ${btn("View Submission", `${APP}/classes/${classId}`)}
    `),
  }, override ? { templateId: override.templateId, templateName: override.templateName } : undefined);
}

// ─── 26. Assignment submitted — notify instructor ─────────────────────────────

export async function sendAssignmentSubmittedEmail(
  to: string,
  instructorName: string,
  studentName: string,
  assignmentTitle: string,
  classTitle: string,
  classId: string
) {
  const override = await resolveTemplate("assignment-submitted-instructor", {
    instructorName, studentName, assignmentTitle, classTitle,
    link: `${APP}/classes/${classId}/manage`,
  });
  return send({
    from: FROM,
    to:   resolveRecipient(to),
    subject: override?.subject ?? `${studentName} submitted "${assignmentTitle}"`,
    html: override?.html ?? shell(`
      <p style="margin:0 0 4px;">${badge("New Submission", "#6b7280")}</p>
      <h1 style="color:#ffffff;font-size:24px;font-weight:800;margin:12px 0 20px;letter-spacing:-0.5px;">
        Assignment Submission Received
      </h1>
      <p style="color:#a3a3a3;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Hi ${instructorName}, a student has submitted their assignment and is awaiting your review.
      </p>

      <table cellpadding="0" cellspacing="0" style="background:#0d0d0d;border:1px solid #1f1f1f;border-radius:10px;width:100%;margin-bottom:28px;">
        <tbody>
          ${infoRow("Student",    studentName)}
          ${infoRow("Assignment", assignmentTitle)}
          ${infoRow("Class",      classTitle)}
        </tbody>
      </table>

      ${btn("Grade Submission", `${APP}/classes/${classId}/manage`)}
    `),
  }, override ? { templateId: override.templateId, templateName: override.templateName } : undefined);
}

// ─── 27. Class enrollment approved (student) ─────────────────────────────────

export async function sendClassEnrollmentApprovedEmail(
  to: string,
  studentName: string,
  className: string,
  classId: string
) {
  const override = await resolveTemplate("class-enrollment-approved", {
    studentName, className, link: `${APP}/classes/${classId}`,
  });
  return send({
    from: FROM,
    to:   resolveRecipient(to),
    subject: override?.subject ?? `You've been approved to join "${className}" — Coachnest`,
    html: override?.html ?? shell(`
      <p style="margin:0 0 4px;">${badge("Enrollment Approved", "#22c55e")}</p>
      <h1 style="color:#ffffff;font-size:26px;font-weight:800;margin:12px 0 8px;letter-spacing:-0.5px;">
        You're In! 🎉
      </h1>
      <p style="color:#a3a3a3;font-size:15px;line-height:1.7;margin:0 0 28px;">
        Hi ${studentName}, your request to join
        <strong style="color:#f97316;">${className}</strong> has been approved.
        You now have full access to the class materials.
      </p>

      <div style="background:#0d1a0d;border:1px solid #1f3a1f;border-radius:10px;padding:16px 20px;margin-bottom:28px;">
        <p style="color:#86efac;font-size:13px;margin:0;line-height:1.6;">
          💡 Head to your class page to access courses, assignments, and live sessions.
        </p>
      </div>

      ${btn("Go to Class", `${APP}/classes/${classId}`)}
    `),
  }, override ? { templateId: override.templateId, templateName: override.templateName } : undefined);
}

// ─── 28. Class enrollment rejected (student) ─────────────────────────────────

export async function sendClassEnrollmentRejectedEmail(
  to: string,
  studentName: string,
  className: string
) {
  const override = await resolveTemplate("class-enrollment-rejected", { studentName, className });
  return send({
    from: FROM,
    to:   resolveRecipient(to),
    subject: override?.subject ?? `Update on your request to join "${className}" — Coachnest`,
    html: override?.html ?? shell(`
      <p style="margin:0 0 4px;">${badge("Enrollment Update", "#6b7280")}</p>
      <h1 style="color:#ffffff;font-size:26px;font-weight:800;margin:12px 0 8px;letter-spacing:-0.5px;">
        Enrollment Request Reviewed
      </h1>
      <p style="color:#a3a3a3;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Hi ${studentName}, your request to join
        <strong style="color:#f97316;">${className}</strong> was not approved at this time.
      </p>
      <p style="color:#a3a3a3;font-size:14px;line-height:1.7;margin:0 0 28px;">
        If you believe this is a mistake or have questions, please contact the instructor or our support team.
      </p>
      ${btn("Browse Other Classes", `${APP}/classes`)}
    `),
  }, override ? { templateId: override.templateId, templateName: override.templateName } : undefined);
}

// ─── 29. New class join request (instructor) ──────────────────────────────────

export async function sendNewClassJoinRequestEmail(
  to: string,
  instructorName: string,
  studentName: string,
  className: string,
  classId: string
) {
  const override = await resolveTemplate("class-join-request-instructor", {
    instructorName, studentName, className,
    link: `${APP}/classes/${classId}/manage`,
  });
  return send({
    from: FROM,
    to:   resolveRecipient(to),
    subject: override?.subject ?? `${studentName} wants to join "${className}"`,
    html: override?.html ?? shell(`
      <p style="margin:0 0 4px;">${badge("Join Request", "#6b7280")}</p>
      <h1 style="color:#ffffff;font-size:24px;font-weight:800;margin:12px 0 20px;letter-spacing:-0.5px;">
        New Student Join Request
      </h1>
      <p style="color:#a3a3a3;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Hi ${instructorName}, a student is requesting to join your class.
      </p>

      <table cellpadding="0" cellspacing="0" style="background:#0d0d0d;border:1px solid #1f1f1f;border-radius:10px;width:100%;margin-bottom:28px;">
        <tbody>
          ${infoRow("Student", studentName)}
          ${infoRow("Class",   className)}
          ${infoRow("Status",  `<span style="color:#f59e0b;font-weight:700;">Pending your approval</span>`)}
        </tbody>
      </table>

      ${btn("Review Request", `${APP}/classes/${classId}/manage`)}
    `),
  }, override ? { templateId: override.templateId, templateName: override.templateName } : undefined);
}

// ─── 30. Class announcement (enrolled students) ───────────────────────────────

export async function sendClassAnnouncementEmail(
  to: string,
  studentName: string,
  className: string,
  announcementTitle: string,
  announcementBody: string,
  classId: string
) {
  const override = await resolveTemplate("class-announcement", {
    studentName, className, announcementTitle, announcementBody,
    link: `${APP}/classes/${classId}`,
  });
  return send({
    from: FROM,
    to:   resolveRecipient(to),
    subject: override?.subject ?? `New announcement in "${className}"`,
    html: override?.html ?? shell(`
      <p style="margin:0 0 4px;">${badge("Class Announcement")}</p>
      <h1 style="color:#ffffff;font-size:24px;font-weight:800;margin:12px 0 8px;letter-spacing:-0.5px;">
        New Announcement
      </h1>
      <p style="color:#a3a3a3;font-size:15px;line-height:1.7;margin:0 0 20px;">
        Hi ${studentName}, your instructor posted a new announcement in
        <strong style="color:#f97316;">${className}</strong>.
      </p>

      <div style="background:#0d0d0d;border:1px solid #1f1f1f;border-radius:10px;padding:20px 24px;margin-bottom:28px;">
        <p style="color:#e5e5e5;font-size:15px;font-weight:700;margin:0 0 12px;">${announcementTitle}</p>
        <p style="color:#a3a3a3;font-size:14px;line-height:1.7;margin:0;white-space:pre-wrap;">${announcementBody}</p>
      </div>

      ${btn("View in Class", `${APP}/classes/${classId}`)}
    `),
  }, override ? { templateId: override.templateId, templateName: override.templateName } : undefined);
}

// ─── 31. New course review (instructor) ──────────────────────────────────────

export async function sendNewCourseReviewEmail(
  to: string,
  instructorName: string,
  studentName: string,
  courseTitle: string,
  rating: number,
  comment: string | null,
  courseId: string
) {
  const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
  const override = await resolveTemplate("new-course-review", {
    instructorName, studentName, courseTitle,
    rating: String(rating), comment: comment ?? "",
    link: `${APP}/instructor/courses/${courseId}`,
  });
  return send({
    from: FROM,
    to:   resolveRecipient(to),
    subject: override?.subject ?? `New ${rating}-star review on "${courseTitle}"`,
    html: override?.html ?? shell(`
      <p style="margin:0 0 4px;">${badge("New Review")}</p>
      <h1 style="color:#ffffff;font-size:24px;font-weight:800;margin:12px 0 8px;letter-spacing:-0.5px;">
        A Student Left a Review
      </h1>
      <p style="color:#a3a3a3;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Hi ${instructorName}, <strong style="color:#e5e5e5;">${studentName}</strong> reviewed your course
        <strong style="color:#f97316;">${courseTitle}</strong>.
      </p>

      <div style="background:#0d0d0d;border:1px solid #1f1f1f;border-radius:10px;padding:20px 24px;margin-bottom:28px;">
        <p style="color:#fbbf24;font-size:22px;letter-spacing:2px;margin:0 0 10px;">${stars}</p>
        ${comment ? `<p style="color:#d4d4d4;font-size:14px;line-height:1.7;margin:0;white-space:pre-wrap;">"${comment}"</p>` : `<p style="color:#6b6b6b;font-size:13px;margin:0;">No written comment.</p>`}
      </div>

      ${btn("View Course Reviews", `${APP}/instructor/courses/${courseId}`)}
    `),
  }, override ? { templateId: override.templateId, templateName: override.templateName } : undefined);
}

// ─── 32. New refund request (admin) ──────────────────────────────────────────

export async function sendRefundRequestAdminEmail(
  studentName: string,
  studentEmail: string,
  courseTitle: string,
  refundAmount: string,
  requestId: string
) {
  const adminEmail = process.env.ADMIN_EMAIL ?? process.env.DEV_EMAIL_OVERRIDE ?? "admin@coachnest.dev";
  const override = await resolveTemplate("refund-request-admin", {
    studentName, studentEmail, courseTitle, refundAmount,
  });
  return send({
    from: FROM,
    to:   resolveRecipient(adminEmail),
    subject: override?.subject ?? `[Coachnest] New refund request from ${studentName}`,
    html: override?.html ?? shell(`
      <p style="margin:0 0 4px;">${badge("Refund Request", "#f59e0b")}</p>
      <h1 style="color:#ffffff;font-size:24px;font-weight:800;margin:12px 0 20px;letter-spacing:-0.5px;">
        New Refund Request
      </h1>

      <table cellpadding="0" cellspacing="0" style="background:#0d0d0d;border:1px solid #1f1f1f;border-radius:10px;width:100%;margin-bottom:28px;">
        <tbody>
          ${infoRow("Student", studentName)}
          ${infoRow("Email",   `<a href="mailto:${studentEmail}" style="color:#f97316;">${studentEmail}</a>`)}
          ${infoRow("Course",  courseTitle)}
          ${infoRow("Amount",  `<span style="color:#f59e0b;font-weight:700;">₹${refundAmount}</span>`)}
          ${infoRow("Status",  `<span style="color:#f59e0b;font-weight:700;">Pending Review</span>`)}
        </tbody>
      </table>

      ${btn("Review in Admin Panel", `${APP}/admin/refunds`)}
    `),
  }, override ? { templateId: override.templateId, templateName: override.templateName } : undefined);
}

// ─── 33. Course submitted for admin review (admin) ────────────────────────────

export async function sendCoursePendingReviewAdminEmail(
  instructorName: string,
  instructorEmail: string,
  courseTitle: string,
  courseId: string
) {
  const adminEmail = process.env.ADMIN_EMAIL ?? process.env.DEV_EMAIL_OVERRIDE ?? "admin@coachnest.dev";
  const override = await resolveTemplate("course-pending-review-admin", {
    instructorName, instructorEmail, courseTitle,
    link: `${APP}/admin/courses/${courseId}`,
  });
  return send({
    from: FROM,
    to:   resolveRecipient(adminEmail),
    subject: override?.subject ?? `[Coachnest] New course pending review from ${instructorName}`,
    html: override?.html ?? shell(`
      <p style="margin:0 0 4px;">${badge("Course Pending Review", "#6b7280")}</p>
      <h1 style="color:#ffffff;font-size:24px;font-weight:800;margin:12px 0 20px;letter-spacing:-0.5px;">
        New Course Awaiting Review
      </h1>
      <p style="color:#a3a3a3;font-size:15px;line-height:1.7;margin:0 0 24px;">
        An instructor has submitted a free course for review and publication.
      </p>

      <table cellpadding="0" cellspacing="0" style="background:#0d0d0d;border:1px solid #1f1f1f;border-radius:10px;width:100%;margin-bottom:28px;">
        <tbody>
          ${infoRow("Instructor", instructorName)}
          ${infoRow("Email",      `<a href="mailto:${instructorEmail}" style="color:#f97316;">${instructorEmail}</a>`)}
          ${infoRow("Course",     courseTitle)}
          ${infoRow("Status",     `<span style="color:#f59e0b;font-weight:700;">Pending Review</span>`)}
        </tbody>
      </table>

      ${btn("Review Course", `${APP}/admin/courses/${courseId}`)}
    `),
  }, override ? { templateId: override.templateId, templateName: override.templateName } : undefined);
}

// ─── 24. Course rejected by admin (instructor) ────────────────────────────────

export async function sendCourseRejectedEmail(
  to: string,
  name: string,
  courseTitle: string,
  courseId: string,
  reason?: string
) {
  const override = await resolveTemplate("course-rejected", {
    name, courseTitle, reason: reason ?? "", link: `${APP}/instructor/courses/${courseId}`,
  });
  return send({
    from: FROM,
    to:   resolveRecipient(to),
    subject: override?.subject ?? `Update on your course "${courseTitle}" — Coachnest`,
    html: override?.html ?? shell(`
      <p style="margin:0 0 4px;">${badge("Course Not Approved", "#ef4444")}</p>
      <h1 style="color:#ffffff;font-size:26px;font-weight:800;margin:12px 0 8px;letter-spacing:-0.5px;">
        Course Review Update
      </h1>
      <p style="color:#a3a3a3;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Hi ${name}, after reviewing <strong style="color:#f97316;">${courseTitle}</strong>,
        our team was unable to approve it for publication at this time.
      </p>

      ${reason ? `
      <div style="background:#0d0d0d;border:1px solid #1f1f1f;border-left:3px solid #ef4444;border-radius:0 10px 10px 0;padding:16px 20px;margin-bottom:28px;">
        <p style="color:#6b6b6b;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin:0 0 8px;">Rejection reason</p>
        <p style="color:#d4d4d4;font-size:14px;line-height:1.7;margin:0;">${reason}</p>
      </div>` : ""}

      <p style="color:#a3a3a3;font-size:14px;line-height:1.6;margin:0 0 24px;">
        The course has been moved back to <strong>Draft</strong>. Address the feedback,
        make improvements, and resubmit for review.
      </p>

      ${btn("Edit & Resubmit", `${APP}/instructor/courses/${courseId}`)}
      <p style="color:#525252;font-size:12px;margin:20px 0 0;">
        Have questions? <a href="${APP}/contact" style="color:#f97316;">Contact support</a>.
      </p>
    `),
  }, override ? { templateId: override.templateId, templateName: override.templateName } : undefined);
}

// ─── 34. Course completed (student) ──────────────────────────────────────────

export async function sendCourseCompletedEmail(
  to: string,
  studentName: string,
  courseTitle: string,
  instructorName: string,
  courseId: string
) {
  const override = await resolveTemplate("course-completed", {
    studentName, courseTitle, instructorName,
    certLink: `${APP}/dashboard/certificates`,
    courseLink: `${APP}/courses/${courseId}`,
  });
  return send({
    from: FROM,
    to:   resolveRecipient(to),
    subject: override?.subject ?? `You've completed "${courseTitle}" — claim your certificate! 🎓`,
    html: override?.html ?? shell(`
      <div style="text-align:center;margin-bottom:32px;">
        <div style="display:inline-block;width:72px;height:72px;background:linear-gradient(135deg,#f97316,#ea580c);border-radius:18px;line-height:72px;font-size:36px;margin-bottom:16px;">🎓</div>
        <h1 style="color:#ffffff;font-size:28px;font-weight:900;margin:0 0 10px;letter-spacing:-0.5px;">
          Course Complete!
        </h1>
        <p style="color:#a3a3a3;font-size:15px;line-height:1.7;margin:0;">
          Outstanding work, <strong style="color:#f97316;">${studentName}</strong>!
        </p>
      </div>

      <p style="color:#a3a3a3;font-size:15px;line-height:1.7;margin:0 0 24px;text-align:center;">
        You've successfully completed
        <strong style="color:#ffffff;">${courseTitle}</strong>
        by <span style="color:#f97316;">${instructorName}</span>.
        Your certificate of completion is ready to download and share.
      </p>

      <div style="background:linear-gradient(135deg,#1a0e00,#1a1200);border:1px solid #3a2800;border-radius:12px;padding:24px;margin-bottom:28px;text-align:center;">
        <p style="color:#f59e0b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 8px;">Certificate of Completion</p>
        <p style="color:#fbbf24;font-size:18px;font-weight:800;margin:0 0 4px;">${courseTitle}</p>
        <p style="color:#a3a3a3;font-size:12px;margin:0;">Awarded to ${studentName}</p>
      </div>

      <table cellpadding="0" cellspacing="0" style="background:#0d0d0d;border:1px solid #1f1f1f;border-radius:10px;width:100%;margin-bottom:28px;">
        <tbody>
          ${infoRow("Course",     courseTitle)}
          ${infoRow("Instructor", instructorName)}
          ${infoRow("Status",     `<span style="color:#22c55e;font-weight:700;">✓ Completed</span>`)}
        </tbody>
      </table>

      <div style="background:#0d1a0d;border:1px solid #1f3a1f;border-radius:10px;padding:16px 20px;margin-bottom:28px;">
        <p style="color:#86efac;font-size:13px;margin:0;line-height:1.6;">
          💡 <strong>Share your achievement!</strong> Add your certificate to your LinkedIn profile and let your network know about your new skills.
        </p>
      </div>

      <div style="text-align:center;">
        ${btn("Download Certificate", `${APP}/dashboard/certificates`)}
      </div>
      <p style="color:#525252;font-size:12px;margin:20px 0 0;text-align:center;">
        Want to keep learning? <a href="${APP}/courses" style="color:#f97316;">Explore more courses</a>.
      </p>
    `),
  }, override ? { templateId: override.templateId, templateName: override.templateName } : undefined);
}

// ─── Platform-wide promotional offer announcement ────────────────────────────

export async function sendPlatformOfferEmail(
  to: string,
  name: string,
  offer: {
    title:        string;
    description:  string | null;
    discountType: "PERCENTAGE" | "FIXED";
    discountValue: number;
    endsAt:       Date | null;
    ctaText:      string;
    ctaUrl:       string;
  },
) {
  const discountLabel =
    offer.discountType === "PERCENTAGE"
      ? `${offer.discountValue}% OFF`
      : `₹${offer.discountValue.toLocaleString("en-IN")} OFF`;

  const endsLine = offer.endsAt
    ? `Hurry — offer ends ${new Intl.DateTimeFormat("en-IN", {
        day: "numeric", month: "short", year: "numeric",
      }).format(offer.endsAt)}.`
    : "Limited-time offer — grab it while it lasts.";

  const ctaUrl = offer.ctaUrl.startsWith("http")
    ? offer.ctaUrl
    : `${APP}${offer.ctaUrl.startsWith("/") ? "" : "/"}${offer.ctaUrl}`;

  const override = await resolveTemplate("platform-offer-announcement", {
    name,
    offerTitle:       offer.title,
    offerDescription: offer.description ?? "",
    discountLabel,
    endsLine,
    ctaText:          offer.ctaText,
    ctaUrl,
  });

  return send({
    from: FROM,
    to:   resolveRecipient(to),
    subject: override?.subject ?? `${discountLabel} on Coachnest — ${offer.title}`,
    html: override?.html ?? shell(`
      <p style="margin:0 0 4px;">${badge("Limited Offer")}</p>
      <h1 style="color:#ffffff;font-size:26px;font-weight:800;margin:12px 0 8px;letter-spacing:-0.5px;">
        ${offer.title}
      </h1>
      <p style="color:#a3a3a3;font-size:15px;line-height:1.7;margin:0 0 20px;">
        Hi ${name}, we just launched a platform-wide offer for you —
        <strong style="color:#f97316;">${discountLabel}</strong>${offer.description ? `. ${offer.description}` : ""}.
      </p>

      <table cellpadding="0" cellspacing="0" style="background:#0d0d0d;border:1px solid #1f1f1f;border-radius:10px;width:100%;margin-bottom:28px;">
        <tbody>
          ${infoRow("Discount", discountLabel)}
          ${infoRow("Applies",  "Automatically at checkout")}
          ${offer.endsAt ? infoRow(
            "Ends",
            new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(offer.endsAt),
          ) : ""}
        </tbody>
      </table>

      <p style="color:#a3a3a3;font-size:13px;line-height:1.6;margin:0 0 22px;">${endsLine}</p>

      ${btn(offer.ctaText, ctaUrl)}
    `),
  }, override ? { templateId: override.templateId, templateName: override.templateName } : undefined);
}

// ─── Course collaboration invite ──────────────────────────────────────────────

export async function sendCollaborationInviteEmail(opts: {
  to: string;
  courseTitle: string;
  inviterName: string;
  role: string;
  revenueShare: number;
  message?: string;
  token: string;
}) {
  const acceptLink = `${APP}/instructor/invitations?token=${opts.token}`;
  const roleLabel  = opts.role.replace(/_/g, " ").toLowerCase();
  const override   = await resolveTemplate("collaboration-invite", {
    courseTitle:  opts.courseTitle,
    inviterName:  opts.inviterName,
    role:         roleLabel,
    revenueShare: String(opts.revenueShare),
    message:      opts.message?.trim() || "No personal message included.",
    link:         acceptLink,
  });

  return send({
    from: FROM,
    to:   resolveRecipient(opts.to),
    subject: override?.subject ?? `${opts.inviterName} invited you to co-teach "${opts.courseTitle}" — Coachnest`,
    html: override?.html ?? shell(`
      <p style="margin:0 0 4px;">${badge("Collaboration Invite", "#f97316")}</p>
      <h1 style="color:#ffffff;font-size:26px;font-weight:800;margin:12px 0 8px;letter-spacing:-0.5px;">
        You're invited to collaborate
      </h1>
      <p style="color:#a3a3a3;font-size:15px;line-height:1.7;margin:0 0 24px;">
        <strong style="color:#f97316;">${opts.inviterName}</strong> invited you to join
        <strong style="color:#f97316;">${opts.courseTitle}</strong> as a
        <strong style="color:#ffffff;">${roleLabel}</strong>.
      </p>

      <table cellpadding="0" cellspacing="0" style="background:#0d0d0d;border:1px solid #1f1f1f;border-radius:10px;width:100%;margin-bottom:24px;">
        <tbody>
          ${infoRow("Course",        opts.courseTitle)}
          ${infoRow("Role",          roleLabel)}
          ${infoRow("Revenue share", `${opts.revenueShare}%`)}
          ${infoRow("Invited by",    opts.inviterName)}
        </tbody>
      </table>

      ${opts.message ? `
      <div style="background:#0d0d0d;border:1px solid #1f1f1f;border-left:3px solid #f97316;border-radius:0 10px 10px 0;padding:16px 20px;margin-bottom:24px;">
        <p style="color:#6b6b6b;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin:0 0 8px;">Message</p>
        <p style="color:#d4d4d4;font-size:14px;line-height:1.7;margin:0;">${opts.message}</p>
      </div>` : ""}

      ${btn("Review Invitation", acceptLink)}
      <p style="color:#525252;font-size:12px;margin:20px 0 0;">
        This invitation expires in 14 days. If you weren't expecting it, you can safely ignore this email.
      </p>
    `),
  }, override ? { templateId: override.templateId, templateName: override.templateName } : undefined);
}

