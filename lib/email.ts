/**
 * Email service — uses Resend (https://resend.com).
 * All emails are sent server-side from API routes / services (fire-and-forget).
 *
 * Theme: dark background (#0a0a0a), orange accent (#ea580c → #f97316),
 * matching the CoachNest UI design language.
 */
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

const resend   = new Resend(process.env.RESEND_API_KEY || "re_placeholder");
const FROM     = process.env.EMAIL_FROM ?? "CoachNest <noreply@coachnest.dev>";
const APP      = process.env.NEXT_PUBLIC_APP_URL ?? "https://coachnest.dev";
const LOGO_URL = process.env.EMAIL_LOGO_URL ?? `${APP}/logo.png`;

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

    const allVars = { logo: LOGO_URL, appUrl: APP, ...vars };

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

function planLabel(plan: string) {
  return plan.charAt(0).toUpperCase() + plan.slice(1).toLowerCase();
}

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

/** Wraps any body HTML in the standard CoachNest email shell. */
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
          Coach<span style="color:#f97316;">Nest</span>
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
        © ${new Date().getFullYear()} CoachNest — Modern Learning Platform
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
    subject: override?.subject ?? "Welcome to CoachNest — you're in! 🎓",
    html: override?.html ?? shell(`
      <h1 style="color:#ffffff;font-size:26px;font-weight:800;margin:0 0 8px;letter-spacing:-0.5px;">
        Welcome, ${name}! 👋
      </h1>
      <p style="color:#a3a3a3;font-size:15px;line-height:1.7;margin:0 0 28px;">
        Your CoachNest account is ready. Start exploring expert-crafted courses and
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

// ─── 2. Subscription activated ────────────────────────────────────────────────

export async function sendSubscriptionEmail(
  to: string,
  name: string,
  plan: string,
  billing: string
) {
  const label    = planLabel(plan);
  const isBasic  = plan.toUpperCase() === "BASIC";
  const access   = isBasic ? "Access up to 5 courses." : "Unlimited access to every course.";
  const bilLabel = billing === "yearly" ? "Annual" : "Monthly";
  const override = await resolveTemplate("subscription-activated", { name, plan: label, billing: bilLabel });

  return send({
    from: FROM,
    to:   resolveRecipient(to),
    subject: override?.subject ?? `Your CoachNest ${label} plan is now active 🎉`,
    html: override?.html ?? shell(`
      <p style="margin:0 0 4px;">${badge(label + " Plan", "#f97316")}</p>
      <h1 style="color:#ffffff;font-size:26px;font-weight:800;margin:12px 0 8px;letter-spacing:-0.5px;">
        Subscription Activated!
      </h1>
      <p style="color:#a3a3a3;font-size:15px;line-height:1.7;margin:0 0 28px;">
        Hi ${name}, your <strong style="color:#f97316;">${label} plan</strong> is live. ${access}
      </p>

      <table cellpadding="0" cellspacing="0" style="background:#0d0d0d;border:1px solid #1f1f1f;border-radius:10px;width:100%;margin-bottom:28px;">
        <tbody>
          ${infoRow("Plan",    label)}
          ${infoRow("Billing", bilLabel)}
          ${infoRow("Status",  "Active")}
          ${infoRow("Access",  access)}
        </tbody>
      </table>

      ${btn("Start Learning", `${APP}/courses`)}
      <p style="color:#525252;font-size:12px;margin:20px 0 0;">
        Manage your plan anytime from
        <a href="${APP}/dashboard/subscription" style="color:#f97316;">your subscription dashboard</a>.
      </p>
    `),
  }, override ? { templateId: override.templateId, templateName: override.templateName } : undefined);
}

// ─── 3. Plan changed (upgrade / downgrade) ────────────────────────────────────

export async function sendPlanChangeEmail(
  to: string,
  name: string,
  oldPlan: string,
  newPlan: string,
  billing: string
) {
  const oldLabel = planLabel(oldPlan);
  const newLabel = planLabel(newPlan);
  const isUpgrade = ["FREE","BASIC","PRO","ENTERPRISE"].indexOf(newPlan.toUpperCase()) >
                    ["FREE","BASIC","PRO","ENTERPRISE"].indexOf(oldPlan.toUpperCase());
  const action   = isUpgrade ? "Upgraded" : "Downgraded";
  const bilLabel = billing === "yearly" ? "Annual" : "Monthly";
  const override = await resolveTemplate("plan-changed", { name, oldPlan: oldLabel, newPlan: newLabel, billing: bilLabel, action });

  return send({
    from: FROM,
    to:   resolveRecipient(to),
    subject: override?.subject ?? `Your plan has been ${action.toLowerCase()} to ${newLabel} — CoachNest`,
    html: override?.html ?? shell(`
      <p style="margin:0 0 4px;">${badge(action, isUpgrade ? "#f97316" : "#a3a3a3")}</p>
      <h1 style="color:#ffffff;font-size:26px;font-weight:800;margin:12px 0 8px;letter-spacing:-0.5px;">
        Plan ${action}
      </h1>
      <p style="color:#a3a3a3;font-size:15px;line-height:1.7;margin:0 0 28px;">
        Hi ${name}, your subscription has been ${action.toLowerCase()} successfully.
        Your new plan is now active.
      </p>

      <table cellpadding="0" cellspacing="0" style="background:#0d0d0d;border:1px solid #1f1f1f;border-radius:10px;width:100%;margin-bottom:28px;">
        <tbody>
          ${infoRow("Previous plan", oldLabel)}
          ${infoRow("New plan",      `<span style="color:#f97316;font-weight:700;">${newLabel}</span>`)}
          ${infoRow("Billing",       bilLabel)}
          ${infoRow("Effective",     "Immediately")}
        </tbody>
      </table>

      ${btn("View My Plan", `${APP}/dashboard/subscription`)}
      <p style="color:#525252;font-size:12px;margin:20px 0 0;">
        If you didn't make this change, please
        <a href="${APP}/contact" style="color:#f97316;">contact support</a> immediately.
      </p>
    `),
  }, override ? { templateId: override.templateId, templateName: override.templateName } : undefined);
}

// ─── 4. Subscription cancelled ───────────────────────────────────────────────

export async function sendSubscriptionCancelledEmail(
  to: string,
  name: string,
  plan: string,
  endDate: Date
) {
  const label   = planLabel(plan);
  const endStr  = endDate.toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });
  const override = await resolveTemplate("subscription-cancelled", { name, plan: label, endDate: endStr });

  return send({
    from: FROM,
    to:   resolveRecipient(to),
    subject: override?.subject ?? "Your CoachNest subscription has been cancelled",
    html: override?.html ?? shell(`
      <p style="margin:0 0 4px;">${badge("Cancellation Notice", "#6b7280")}</p>
      <h1 style="color:#ffffff;font-size:26px;font-weight:800;margin:12px 0 8px;letter-spacing:-0.5px;">
        Subscription Cancelled
      </h1>
      <p style="color:#a3a3a3;font-size:15px;line-height:1.7;margin:0 0 28px;">
        Hi ${name}, your <strong style="color:#e5e5e5;">${label} plan</strong> has been
        cancelled. You'll retain full access until your current billing period ends.
      </p>

      <table cellpadding="0" cellspacing="0" style="background:#0d0d0d;border:1px solid #1f1f1f;border-radius:10px;width:100%;margin-bottom:28px;">
        <tbody>
          ${infoRow("Plan",         label)}
          ${infoRow("Status",       "Cancelled")}
          ${infoRow("Access until", `<span style="color:#f97316;font-weight:700;">${endStr}</span>`)}
        </tbody>
      </table>

      <div style="background:#111a11;border:1px solid #1f3a1f;border-radius:10px;padding:16px 20px;margin-bottom:28px;">
        <p style="color:#86efac;font-size:13px;margin:0;line-height:1.6;">
          💡 <strong>Changed your mind?</strong> You can reactivate your plan anytime before
          ${endStr} and keep your progress and enrollments.
        </p>
      </div>

      ${btn("Reactivate Plan", `${APP}/dashboard/subscription`)}
      <p style="color:#525252;font-size:12px;margin:20px 0 0;">
        We're sad to see you go. If there's anything we can improve,
        <a href="${APP}/contact" style="color:#f97316;">let us know</a>.
      </p>
    `),
  }, override ? { templateId: override.templateId, templateName: override.templateName } : undefined);
}

// ─── 5. Subscription resumed ─────────────────────────────────────────────────

export async function sendSubscriptionResumedEmail(
  to: string,
  name: string,
  plan: string
) {
  const label = planLabel(plan);
  const override = await resolveTemplate("subscription-resumed", { name, plan: label });

  return send({
    from: FROM,
    to:   resolveRecipient(to),
    subject: override?.subject ?? `Your CoachNest ${label} plan has been reactivated ✅`,
    html: override?.html ?? shell(`
      <p style="margin:0 0 4px;">${badge("Reactivated", "#22c55e")}</p>
      <h1 style="color:#ffffff;font-size:26px;font-weight:800;margin:12px 0 8px;letter-spacing:-0.5px;">
        Welcome Back!
      </h1>
      <p style="color:#a3a3a3;font-size:15px;line-height:1.7;margin:0 0 28px;">
        Hi ${name}, your <strong style="color:#f97316;">${label} plan</strong> is active again.
        Your subscription will now renew normally at the next billing date — no action required.
      </p>

      <table cellpadding="0" cellspacing="0" style="background:#0d0d0d;border:1px solid #1f1f1f;border-radius:10px;width:100%;margin-bottom:28px;">
        <tbody>
          ${infoRow("Plan",   label)}
          ${infoRow("Status", `<span style="color:#22c55e;font-weight:700;">Active</span>`)}
        </tbody>
      </table>

      ${btn("Continue Learning", `${APP}/courses`)}
    `),
  }, override ? { templateId: override.templateId, templateName: override.templateName } : undefined);
}

// ─── 6. Payment failed ────────────────────────────────────────────────────────

export async function sendPaymentFailedEmail(to: string, name: string) {
  const override = await resolveTemplate("payment-failed", { name });
  return send({
    from: FROM,
    to:   resolveRecipient(to),
    subject: override?.subject ?? "Action required: CoachNest payment failed",
    html: override?.html ?? shell(`
      <p style="margin:0 0 4px;">${badge("Payment Failed", "#ef4444")}</p>
      <h1 style="color:#ffffff;font-size:26px;font-weight:800;margin:12px 0 8px;letter-spacing:-0.5px;">
        We Couldn't Process Your Payment
      </h1>
      <p style="color:#a3a3a3;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Hi ${name}, your latest subscription payment was declined. To keep your
        access uninterrupted, please update your billing details.
      </p>

      <div style="background:#1a0d0d;border:1px solid #3a1f1f;border-radius:10px;padding:16px 20px;margin-bottom:28px;">
        <p style="color:#fca5a5;font-size:13px;margin:0;line-height:1.6;">
          ⚠️ If payment is not updated soon, your subscription will be suspended and
          you'll lose access to your enrolled courses.
        </p>
      </div>

      ${btn("Update Payment Method", `${APP}/dashboard/subscription`)}
      <p style="color:#525252;font-size:12px;margin:20px 0 0;">
        Need help? <a href="${APP}/contact" style="color:#f97316;">Contact our support team</a>.
      </p>
    `),
  }, override ? { templateId: override.templateId, templateName: override.templateName } : undefined);
}

// ─── 7. Purchase / enrollment confirmation ────────────────────────────────────

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
    subject: override?.subject ?? `You're enrolled in "${courseTitle}" — CoachNest`,
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
    subject: override?.subject ?? "We received your message — CoachNest",
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

      ${btn("Visit CoachNest", APP)}
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
    subject: override?.subject ?? `[CoachNest] New inquiry from ${name}`,
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
    ? `Re: ${originalSubject} — CoachNest`
    : "Reply to your inquiry — CoachNest";
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
    subject: override?.subject ?? `[CoachNest] New instructor application from ${instructorName}`,
    html: override?.html ?? shell(`
      <p style="margin:0 0 4px;">${badge("Instructor Application", "#6b7280")}</p>
      <h1 style="color:#ffffff;font-size:24px;font-weight:800;margin:12px 0 20px;letter-spacing:-0.5px;">
        New Instructor Application
      </h1>
      <p style="color:#a3a3a3;font-size:15px;line-height:1.7;margin:0 0 24px;">
        A new user has applied to become an instructor on CoachNest and is awaiting your review.
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
    subject: override?.subject ?? "Your CoachNest instructor application has been approved! 🎉",
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
    subject: override?.subject ?? "Update on your CoachNest instructor application",
    html: override?.html ?? shell(`
      <p style="margin:0 0 4px;">${badge("Application Update", "#6b7280")}</p>
      <h1 style="color:#ffffff;font-size:26px;font-weight:800;margin:12px 0 8px;letter-spacing:-0.5px;">
        Application Status Update
      </h1>
      <p style="color:#a3a3a3;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Hi ${name}, thank you for applying to become an instructor on CoachNest.
        After careful review, we're unable to approve your application at this time.
      </p>

      ${reason ? `
      <div style="background:#0d0d0d;border:1px solid #1f1f1f;border-left:3px solid #6b7280;border-radius:0 10px 10px 0;padding:16px 20px;margin-bottom:24px;">
        <p style="color:#6b6b6b;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin:0 0 8px;">Reason</p>
        <p style="color:#d4d4d4;font-size:14px;line-height:1.7;margin:0;">${reason}</p>
      </div>
      ` : ""}

      <p style="color:#a3a3a3;font-size:14px;line-height:1.7;margin:0 0 28px;">
        You can continue using CoachNest as a student and access all available courses.
        If you have questions, please reach out to our support team.
      </p>

      ${btn("Contact Support", `${APP}/contact`)}
      <p style="color:#525252;font-size:12px;margin:20px 0 0;">
        Thank you for your interest in teaching on CoachNest.
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
    subject: override?.subject ?? `Refund request received for "${courseTitle}" — CoachNest`,
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
    subject: override?.subject ?? `Your refund for "${courseTitle}" has been processed — CoachNest`,
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
    subject: override?.subject ?? `Your refund request for "${courseTitle}" was not approved — CoachNest`,
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
    subject: override?.subject ?? `Payout request of ₹${amount} received — CoachNest`,
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
    subject: override?.subject ?? `Your payout request of ₹${amount} has been approved — CoachNest`,
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
    subject: override?.subject ?? `Your payout request of ₹${amount} was not approved — CoachNest`,
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
    subject: override?.subject ?? `Your payout of ₹${amount} has been transferred — CoachNest`,
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
    subject: override?.subject ?? `Update on your course "${courseTitle}" — CoachNest`,
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

