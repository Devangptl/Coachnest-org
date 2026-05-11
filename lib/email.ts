/**
 * Email service — uses Resend (https://resend.com).
 * All emails are sent server-side from API routes / services (fire-and-forget).
 *
 * Theme: dark background (#0a0a0a), orange accent (#ea580c → #f97316),
 * matching the CoachNest UI design language.
 */
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_placeholder");
const FROM   = process.env.EMAIL_FROM ?? "CoachNest <noreply@coachnest.dev>";
const APP    = process.env.NEXT_PUBLIC_APP_URL ?? "https://coachnest.dev";

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
<body style="margin:0;padding:0;background:#0a0a0a;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:48px 16px;">
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
  return resend.emails.send({
    from: FROM,
    to:   resolveRecipient(to),
    subject: "Welcome to CoachNest — you're in! 🎓",
    html: shell(`
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
  });
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

  return resend.emails.send({
    from: FROM,
    to:   resolveRecipient(to),
    subject: `Your CoachNest ${label} plan is now active 🎉`,
    html: shell(`
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
  });
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

  return resend.emails.send({
    from: FROM,
    to:   resolveRecipient(to),
    subject: `Your plan has been ${action.toLowerCase()} to ${newLabel} — CoachNest`,
    html: shell(`
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
  });
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

  return resend.emails.send({
    from: FROM,
    to:   resolveRecipient(to),
    subject: "Your CoachNest subscription has been cancelled",
    html: shell(`
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
  });
}

// ─── 5. Subscription resumed ─────────────────────────────────────────────────

export async function sendSubscriptionResumedEmail(
  to: string,
  name: string,
  plan: string
) {
  const label = planLabel(plan);
  return resend.emails.send({
    from: FROM,
    to:   resolveRecipient(to),
    subject: `Your CoachNest ${label} plan has been reactivated ✅`,
    html: shell(`
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
  });
}

// ─── 6. Payment failed ────────────────────────────────────────────────────────

export async function sendPaymentFailedEmail(to: string, name: string) {
  return resend.emails.send({
    from: FROM,
    to:   resolveRecipient(to),
    subject: "Action required: CoachNest payment failed",
    html: shell(`
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
  });
}

// ─── 7. Purchase / enrollment confirmation ────────────────────────────────────

export async function sendPurchaseEmail(
  to: string,
  name: string,
  courseTitle: string,
  amount: string,
  courseId: string
) {
  return resend.emails.send({
    from: FROM,
    to:   resolveRecipient(to),
    subject: `You're enrolled in "${courseTitle}" — CoachNest`,
    html: shell(`
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
  return resend.emails.send({
    from: FROM,
    to:   resolveRecipient(to),
    subject: `New lesson available in "${courseTitle}"`,
    html: shell(`
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
  });
}

// ─── 9. Contact: confirmation to user ────────────────────────────────────────

export async function sendContactConfirmationEmail(to: string, name: string) {
  return resend.emails.send({
    from: FROM,
    to:   resolveRecipient(to),
    subject: "We received your message — CoachNest",
    html: shell(`
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
  });
}

// ─── 10. Contact: notification to admin ──────────────────────────────────────

export async function sendContactNotificationToAdmin(
  name: string,
  email: string,
  subject: string | null,
  message: string
) {
  const adminEmail = process.env.ADMIN_EMAIL ?? process.env.DEV_EMAIL_OVERRIDE ?? "admin@coachnest.dev";
  return resend.emails.send({
    from: FROM,
    to:   resolveRecipient(adminEmail),
    subject: `[CoachNest] New inquiry from ${name}`,
    html: shell(`
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
  });
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

  return resend.emails.send({
    from: FROM,
    to:   resolveRecipient(to),
    subject: subjectLine,
    html: shell(`
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
  });
}

// ─── 12. Certificate issued ───────────────────────────────────────────────────

export async function sendCertificateEmail(
  to: string,
  name: string,
  courseTitle: string,
  certUrl: string
) {
  return resend.emails.send({
    from: FROM,
    to:   resolveRecipient(to),
    subject: `Your certificate for "${courseTitle}" is ready! 🏆`,
    html: shell(`
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
  });
}

// ─── 13. Instructor application received (to admin) ───────────────────────────

export async function sendInstructorApplicationToAdmin(
  instructorName: string,
  instructorEmail: string,
  userId: string
) {
  const adminEmail = process.env.ADMIN_EMAIL ?? process.env.DEV_EMAIL_OVERRIDE ?? "admin@coachnest.dev";
  return resend.emails.send({
    from: FROM,
    to:   resolveRecipient(adminEmail),
    subject: `[CoachNest] New instructor application from ${instructorName}`,
    html: shell(`
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
  });
}

// ─── 14. Instructor application approved ─────────────────────────────────────

export async function sendInstructorApprovedEmail(to: string, name: string) {
  return resend.emails.send({
    from: FROM,
    to:   resolveRecipient(to),
    subject: "Your CoachNest instructor application has been approved! 🎉",
    html: shell(`
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
  });
}

// ─── 15. Instructor application rejected ─────────────────────────────────────

export async function sendInstructorRejectedEmail(
  to: string,
  name: string,
  reason?: string
) {
  return resend.emails.send({
    from: FROM,
    to:   resolveRecipient(to),
    subject: "Update on your CoachNest instructor application",
    html: shell(`
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
  });
}
