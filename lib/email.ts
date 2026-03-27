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
