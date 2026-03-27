/**
 * Email service — uses Resend (https://resend.com).
 * All emails are sent server-side from API routes / server actions.
 */
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_placeholder");
const FROM = process.env.EMAIL_FROM ?? "CoachNest <noreply@coachnest.dev>";

/**
 * In dev / when using the Resend sandbox (`onboarding@resend.dev`),
 * emails can only be delivered to the account-owner address.
 * Set DEV_EMAIL_OVERRIDE in .env to redirect all emails there.
 */
const DEV_EMAIL_OVERRIDE = process.env.DEV_EMAIL_OVERRIDE;

function resolveRecipient(to: string): string {
  if (DEV_EMAIL_OVERRIDE && FROM.includes("resend.dev")) {
    console.log(`[email] Dev mode: redirecting email from ${to} → ${DEV_EMAIL_OVERRIDE}`);
    return DEV_EMAIL_OVERRIDE;
  }
  return to;
}

// ─── Welcome email ────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, name: string) {
  return resend.emails.send({
    from: FROM,
    to: resolveRecipient(to),
    subject: "Welcome to CoachNest! 🎓",
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;">
        <h1 style="color:#7c3aed;">Welcome, ${name}!</h1>
        <p>You're all set to start learning. Explore our course library and enroll in something new today.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/courses"
           style="background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;">
          Browse Courses
        </a>
      </div>`,
  });
}

// ─── Purchase confirmation ────────────────────────────────────────────────────

export async function sendPurchaseEmail(
  to: string,
  name: string,
  courseTitle: string,
  amount: string,
  courseId: string
) {
  return resend.emails.send({
    from: FROM,
    to: resolveRecipient(to),
    subject: `You're enrolled in "${courseTitle}"`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;">
        <h1 style="color:#7c3aed;">Enrollment Confirmed!</h1>
        <p>Hi ${name}, you've successfully enrolled in <strong>${courseTitle}</strong>.</p>
        <p><strong>Amount paid:</strong> ₹${amount}</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/courses/${courseId}"
           style="background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;">
          Start Learning
        </a>
      </div>`,
  });
}

// ─── Course update / drip notification ───────────────────────────────────────

export async function sendCourseUpdateEmail(
  to: string,
  name: string,
  courseTitle: string,
  lessonTitle: string,
  courseId: string
) {
  return resend.emails.send({
    from: FROM,
    to: resolveRecipient(to),
    subject: `New lesson available in "${courseTitle}"`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;">
        <h2 style="color:#7c3aed;">New Lesson Unlocked</h2>
        <p>Hi ${name}, a new lesson is now available in <strong>${courseTitle}</strong>:</p>
        <p style="font-size:18px;font-weight:bold;">${lessonTitle}</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/courses/${courseId}"
           style="background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;">
          Continue Learning
        </a>
      </div>`,
  });
}

// ─── Contact: confirmation to user ────────────────────────────────────────────

export async function sendContactConfirmationEmail(to: string, name: string) {
  return resend.emails.send({
    from: FROM,
    to: resolveRecipient(to),
    subject: "We received your message — CoachNest",
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;background:#0d0d0d;border-radius:12px;overflow:hidden;border:1px solid #222;">
        <div style="padding:32px 28px;">
          <div style="width:48px;height:48px;background:linear-gradient(135deg,#ea580c,#f97316);border-radius:12px;margin-bottom:24px;display:flex;align-items:center;justify-content:center;">
            <span style="font-size:24px;">✉️</span>
          </div>
          <h1 style="color:#f5f5f5;font-size:22px;margin:0 0 8px;">Thanks for reaching out, ${name}!</h1>
          <p style="color:#a3a3a3;font-size:15px;line-height:1.6;margin:0 0 24px;">
            We've received your message and our team will review it shortly. You can expect a response within 24 hours on business days.
          </p>
          <div style="background:#171717;border:1px solid #262626;border-radius:8px;padding:16px;margin-bottom:24px;">
            <p style="color:#a3a3a3;font-size:13px;margin:0;">
              <strong style="color:#f5f5f5;">What happens next?</strong><br/>
              A team member will review your inquiry and respond via email. For urgent matters, you can also reach us at support@coachnest.com.
            </p>
          </div>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}"
             style="background:linear-gradient(135deg,#ea580c,#f97316);color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;font-size:14px;">
            Visit CoachNest
          </a>
        </div>
        <div style="border-top:1px solid #222;padding:16px 28px;text-align:center;">
          <p style="color:#525252;font-size:12px;margin:0;">© CoachNest · Modern Learning Platform</p>
        </div>
      </div>`,
  });
}

// ─── Contact: notification to admin ───────────────────────────────────────────

export async function sendContactNotificationToAdmin(
  name: string,
  email: string,
  subject: string | null,
  message: string
) {
  const adminEmail = process.env.ADMIN_EMAIL ?? process.env.DEV_EMAIL_OVERRIDE ?? "admin@coachnest.dev";
  return resend.emails.send({
    from: FROM,
    to: resolveRecipient(adminEmail),
    subject: `New Contact Inquiry from ${name}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;background:#0d0d0d;border-radius:12px;overflow:hidden;border:1px solid #222;">
        <div style="padding:32px 28px;">
          <div style="width:48px;height:48px;background:linear-gradient(135deg,#ea580c,#f97316);border-radius:12px;margin-bottom:24px;display:flex;align-items:center;justify-content:center;">
            <span style="font-size:24px;">📬</span>
          </div>
          <h1 style="color:#f5f5f5;font-size:22px;margin:0 0 16px;">New Contact Inquiry</h1>
          <div style="background:#171717;border:1px solid #262626;border-radius:8px;padding:16px;margin-bottom:16px;">
            <p style="color:#a3a3a3;font-size:13px;margin:0 0 8px;"><strong style="color:#f5f5f5;">From:</strong> ${name} (${email})</p>
            ${subject ? `<p style="color:#a3a3a3;font-size:13px;margin:0 0 8px;"><strong style="color:#f5f5f5;">Subject:</strong> ${subject}</p>` : ""}
            <p style="color:#a3a3a3;font-size:13px;margin:0;"><strong style="color:#f5f5f5;">Message:</strong></p>
            <p style="color:#d4d4d4;font-size:14px;line-height:1.6;margin:8px 0 0;white-space:pre-wrap;">${message}</p>
          </div>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/messages"
             style="background:linear-gradient(135deg,#ea580c,#f97316);color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;font-size:14px;">
            View in Admin Panel
          </a>
        </div>
      </div>`,
  });
}

// ─── Contact: admin reply to user ─────────────────────────────────────────────

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
    to: resolveRecipient(to),
    subject: subjectLine,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;background:#0d0d0d;border-radius:12px;overflow:hidden;border:1px solid #222;">
        <div style="padding:32px 28px;">
          <div style="width:48px;height:48px;background:linear-gradient(135deg,#ea580c,#f97316);border-radius:12px;margin-bottom:24px;display:flex;align-items:center;justify-content:center;">
            <span style="font-size:24px;">💬</span>
          </div>
          <h1 style="color:#f5f5f5;font-size:22px;margin:0 0 8px;">Hi ${name},</h1>
          <p style="color:#a3a3a3;font-size:15px;line-height:1.6;margin:0 0 20px;">
            Our team has responded to your inquiry:
          </p>
          <div style="background:#171717;border:1px solid #262626;border-left:3px solid #f97316;border-radius:8px;padding:16px;margin-bottom:24px;">
            <p style="color:#d4d4d4;font-size:14px;line-height:1.7;margin:0;white-space:pre-wrap;">${replyMessage}</p>
          </div>
          <p style="color:#a3a3a3;font-size:14px;line-height:1.6;margin:0 0 24px;">
            If you have any follow-up questions, feel free to reply to this email or visit our contact page.
          </p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/contact"
             style="background:linear-gradient(135deg,#ea580c,#f97316);color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;font-size:14px;">
            Contact Us Again
          </a>
        </div>
        <div style="border-top:1px solid #222;padding:16px 28px;text-align:center;">
          <p style="color:#525252;font-size:12px;margin:0;">© CoachNest · Modern Learning Platform</p>
        </div>
      </div>`,
  });
}

// ─── Certificate issued ───────────────────────────────────────────────────────

export async function sendCertificateEmail(
  to: string,
  name: string,
  courseTitle: string,
  certUrl: string
) {
  return resend.emails.send({
    from: FROM,
    to: resolveRecipient(to),
    subject: `Your certificate for "${courseTitle}" is ready!`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;">
        <h1 style="color:#7c3aed;">Congratulations, ${name}! 🎉</h1>
        <p>You've completed <strong>${courseTitle}</strong>. Your certificate is ready to download.</p>
        <a href="${certUrl}"
           style="background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;">
          Download Certificate
        </a>
      </div>`,
  });
}
