/**
 * Shared email template seed data.
 * Used by both the Prisma seed script and the admin seed API route.
 *
 * All templates follow the light-themed CoachNest email design.
 * {{variable}} placeholders are substituted by the mailer at send time.
 * Built-in: {{logo}}, {{appUrl}}
 */

// ─── HTML helpers ─────────────────────────────────────────────────────────────

function shell(
  eyebrow: string,
  heading: string,
  body: string,
  ctaLabel: string,
  ctaHref: string,
  footerNote = ""
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
</head>
<body style="margin:0;padding:0;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center">
  <table cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

    <tr><td align="center" style="padding:28px 36px 44px;text-align:center;">
      <img src="{{logo}}" alt="CoachNest" width="130" style="display:block;height:auto;margin:0 auto;" />
    </td></tr>

    <tr><td>

      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:0 36px 24px;">
          <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#d97757;margin:0 0 10px;">${eyebrow}</p>
          <h1 style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:24px;font-weight:800;color:#1c1411;margin:0 0 12px;letter-spacing:-0.5px;">${heading}</h1>
          ${body}
        </td></tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:0 36px 32px;">
          <a href="${ctaHref}" style="display:inline-block;background:#d97757;border:1px solid #bc6346;color:#ffffff;font-family:sans-serif;font-size:13px;font-weight:600;text-decoration:none;padding:6px 16px;border-radius:6px;">${ctaLabel} &rarr;</a>
          ${footerNote ? `<p style="font-family:sans-serif;font-size:12px;color:#b0a89f;margin:16px 0 0;">${footerNote}</p>` : ""}
        </td></tr>
      </table>

    </td></tr>

    <tr><td style="padding:20px 0 8px;text-align:center;">
      <p style="font-family:sans-serif;font-size:11px;color:#c4bab3;margin:0 0 5px;">
        &copy; 2026 CoachNest &mdash; Modern Learning Platform
      </p>
      <p style="font-family:sans-serif;font-size:11px;margin:0;">
        <a href="{{appUrl}}/legal/privacy-policy" style="color:#c4bab3;text-decoration:none;">Privacy Policy</a>
        &nbsp;&middot;&nbsp;
        <a href="{{appUrl}}/contact" style="color:#c4bab3;text-decoration:none;">Contact Us</a>
        &nbsp;&middot;&nbsp;
        <a href="{{appUrl}}/dashboard/subscription" style="color:#c4bab3;text-decoration:none;">Manage Subscription</a>
      </p>
    </td></tr>

  </table>
  </td></tr>
</table>
</body>
</html>`;
}

function infoTable(rows: Array<[string, string]>): string {
  const cells = rows
    .map(
      ([label, value]) => `
            <tr>
              <td style="font-family:sans-serif;font-size:12px;color:#9e9188;padding:8px 16px;border-bottom:1px solid #f0ebe7;white-space:nowrap;width:40%;">${label}</td>
              <td style="font-family:sans-serif;font-size:12px;font-weight:600;color:#1c1411;padding:8px 16px;border-bottom:1px solid #f0ebe7;">${value}</td>
            </tr>`
    )
    .join("");
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f6;border:1px solid #ede8e3;border-radius:8px;margin-bottom:24px;"><tbody>${cells}</tbody></table>`;
}

function steps(items: Array<[string, string]>): string {
  const rows = items
    .map(
      ([title, desc], i) => `
            <tr><td style="padding:0 0 14px;">
              <table cellpadding="0" cellspacing="0"><tr>
                <td style="vertical-align:top;padding-right:12px;">
                  <span style="display:inline-block;width:24px;height:24px;background:#d97757;border-radius:6px;text-align:center;line-height:24px;font-family:sans-serif;font-size:11px;font-weight:800;color:#ffffff;">${i + 1}</span>
                </td>
                <td style="vertical-align:top;">
                  <p style="font-family:sans-serif;font-size:13px;font-weight:700;color:#1c1411;margin:0 0 2px;">${title}</p>
                  <p style="font-family:sans-serif;font-size:12px;color:#9e9188;margin:0;">${desc}</p>
                </td>
              </tr></table>
            </td></tr>`
    )
    .join("");
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;"><tr><td style="padding:0 0 10px;"><p style="font-family:sans-serif;font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#b0a89f;margin:0;">What&apos;s next</p></td></tr>${rows}</table>`;
}

function noticeBox(text: string, color = "#d97757"): string {
  return `<div style="background:#fdf6f3;border-left:3px solid ${color};border-radius:0 6px 6px 0;padding:12px 16px;margin-bottom:24px;"><p style="font-family:sans-serif;font-size:13px;color:#776b5f;margin:0;line-height:1.6;">${text}</p></div>`;
}

function quoteBox(label: string, content: string): string {
  return `<div style="background:#faf8f6;border:1px solid #ede8e3;border-left:3px solid #d97757;border-radius:0 6px 6px 0;padding:14px 18px;margin-bottom:24px;"><p style="font-family:sans-serif;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#b0a89f;margin:0 0 6px;">${label}</p><p style="font-family:sans-serif;font-size:13px;color:#1c1411;margin:0;line-height:1.6;white-space:pre-wrap;">${content}</p></div>`;
}

function para(text: string): string {
  return `<p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.75;color:#776b5f;margin:0 0 16px;">${text}</p>`;
}

// ─── Template definitions ─────────────────────────────────────────────────────

export interface EmailTemplateSeed {
  slug: string;
  name: string;
  subject: string;
  description: string;
  variables: string[];
  htmlBody: string;
}

export function getEmailTemplateSeeds(): EmailTemplateSeed[] {
  return [
    // ── 1. Welcome ───────────────────────────────────────────────────────────
    {
      slug: "welcome",
      name: "Welcome",
      subject: "Welcome to CoachNest — you're in! 🎓",
      description: "Sent when a new user signs up.",
      variables: ["name"],
      htmlBody: shell(
        "Welcome aboard",
        "Hey {{name}}, you're in! 👋",
        `${para("Your CoachNest account is ready. Start exploring expert-crafted courses and level up your skills at your own pace.")}
        ${steps([
          ["Browse the course library", "Find courses that match your goals."],
          ["Enroll and start learning", "Learn with video, reading, and quizzes."],
          ["Earn your certificate", "Complete all lessons and download your proof."],
        ])}`,
        "Explore Courses",
        "{{appUrl}}/courses",
        `Questions? <a href="{{appUrl}}/contact" style="color:#d97757;text-decoration:none;">Contact us</a> anytime.`
      ),
    },

    // ── 2. Free Course Enrollment ─────────────────────────────────────────────
    {
      slug: "free-enrollment",
      name: "Free Course Enrollment",
      subject: "You're enrolled in \"{{courseTitle}}\" — CoachNest 🎉",
      description: "Sent when a student enrolls in a free course for the first time.",
      variables: ["name", "courseTitle", "link"],
      htmlBody: shell(
        "Free enrollment confirmed",
        "You're enrolled, {{name}}! 🎉",
        `${para("You now have <strong>free access</strong> to <strong style=\"color:#d97757;\">{{courseTitle}}</strong>. Start learning whenever you're ready.")}
        ${infoTable([
          ["Course", "{{courseTitle}}"],
          ["Access", "Free · Lifetime"],
        ])}
        ${steps([
          ["Start your first lesson", "Jump straight in — no prerequisites needed."],
          ["Track your progress", "Pick up right where you left off any time."],
          ["Earn your certificate", "Complete all lessons to get your certificate."],
        ])}`,
        "Start Learning",
        "{{link}}",
        `Questions? <a href="{{appUrl}}/contact" style="color:#d97757;text-decoration:none;">Contact us</a> anytime.`
      ),
    },

    // ── 3. Purchase Confirmation ──────────────────────────────────────────────
    {
      slug: "purchase-confirmation",
      name: "Purchase Confirmation",
      subject: "You're enrolled in \"{{courseTitle}}\" — CoachNest 🎉",
      description: "Sent when a student successfully purchases a course.",
      variables: ["name", "courseTitle", "amount", "link"],
      htmlBody: shell(
        "Enrollment confirmed",
        "You're in, {{name}}! 🎉",
        `${para("You've successfully enrolled in <strong style=\"color:#d97757;\">{{courseTitle}}</strong>. Start learning whenever you're ready.")}
        ${infoTable([
          ["Course", "{{courseTitle}}"],
          ["Amount paid", "&#8377;{{amount}}"],
          ["Access", "Lifetime"],
        ])}`,
        "Start Learning",
        "{{link}}"
      ),
    },

    // ── 8. Course Update / New Lesson ─────────────────────────────────────────
    {
      slug: "course-update",
      name: "New Lesson Added",
      subject: "New lesson available in \"{{courseTitle}}\"",
      description: "Sent to enrolled students when a new lesson is added to a course.",
      variables: ["name", "courseTitle", "lessonTitle", "link"],
      htmlBody: shell(
        "Course update",
        "New content just dropped, {{name}} 🆕",
        `${para("A new lesson has been added to <strong style=\"color:#d97757;\">{{courseTitle}}</strong>:")}
        ${quoteBox("New lesson", "{{lessonTitle}}")}`,
        "Continue Learning",
        "{{link}}"
      ),
    },

    // ── 9. Course Approved ────────────────────────────────────────────────────
    {
      slug: "course-approved",
      name: "Course Approved",
      subject: "Your course \"{{courseTitle}}\" has been approved! 🎉",
      description: "Sent to an instructor when their course is approved by admin.",
      variables: ["name", "courseTitle", "link"],
      htmlBody: shell(
        "Course approved",
        "Your course is live, {{name}}! 🎉",
        `${para("Great news — <strong style=\"color:#d97757;\">{{courseTitle}}</strong> has passed admin review and is now <strong>live on the platform</strong>. Students can now discover and enroll.")}
        ${steps([
          ["Share your course", "Post the link on social media to attract your first students."],
          ["Track your students", "Monitor enrollments and progress in your instructor dashboard."],
          ["Keep improving", "Add new lessons and respond to student questions."],
        ])}`,
        "View Your Course",
        "{{link}}"
      ),
    },

    // ── 10. Course Rejected ───────────────────────────────────────────────────
    {
      slug: "course-rejected",
      name: "Course Rejected",
      subject: "Update on your course \"{{courseTitle}}\" — CoachNest",
      description: "Sent to an instructor when their course is rejected by admin.",
      variables: ["name", "courseTitle", "reason", "link"],
      htmlBody: shell(
        "Course review update",
        "Course review complete, {{name}}",
        `${para("After reviewing <strong style=\"color:#d97757;\">{{courseTitle}}</strong>, our team was unable to approve it for publication at this time.")}
        ${quoteBox("Rejection reason", "{{reason}}")}
        ${para("The course has been moved back to <strong>Draft</strong>. Address the feedback, make the necessary improvements, and resubmit for review.")}`,
        "Edit & Resubmit",
        "{{link}}",
        `Have questions? <a href="{{appUrl}}/contact" style="color:#d97757;text-decoration:none;">Contact support</a>.`
      ),
    },

    // ── 11. Certificate Issued ────────────────────────────────────────────────
    {
      slug: "certificate",
      name: "Certificate Issued",
      subject: "Your certificate for \"{{courseTitle}}\" is ready! 🏆",
      description: "Sent when a student earns a certificate of completion.",
      variables: ["name", "courseTitle", "certUrl"],
      htmlBody: shell(
        "Certificate ready",
        "Congratulations, {{name}}! 🏆",
        `${para("You've successfully completed <strong style=\"color:#d97757;\">{{courseTitle}}</strong>. Your certificate of completion is ready to download and share.")}
        ${infoTable([
          ["Course", "{{courseTitle}}"],
          ["Award", "Certificate of Completion"],
          ["Status", "Ready to download"],
        ])}
        ${noticeBox("Share your achievement on LinkedIn to showcase your new skills to employers and your network!")}`,
        "Download Certificate",
        "{{certUrl}}"
      ),
    },

    // ── 12. Refund Submitted ──────────────────────────────────────────────────
    {
      slug: "refund-submitted",
      name: "Refund Request Submitted",
      subject: "Refund request received for \"{{courseTitle}}\" — CoachNest",
      description: "Sent to a student when their refund request is submitted.",
      variables: ["name", "courseTitle", "refundAmount", "progressPercent"],
      htmlBody: shell(
        "Refund request received",
        "We've received your refund request",
        `${para("Hi {{name}}, your refund request has been submitted and is under review. Our team will process it within <strong>3–5 business days</strong>.")}
        ${infoTable([
          ["Course", "{{courseTitle}}"],
          ["Progress completed", "{{progressPercent}}%"],
          ["Refund amount", "&#8377;{{refundAmount}}"],
          ["Status", "Under Review"],
        ])}
        ${noticeBox("Your course access remains active until the refund is fully processed.")}`,
        "View Order History",
        "{{appUrl}}/dashboard/orders"
      ),
    },

    // ── 13. Refund Processed ──────────────────────────────────────────────────
    {
      slug: "refund-processed",
      name: "Refund Processed",
      subject: "Your refund for \"{{courseTitle}}\" has been processed — CoachNest",
      description: "Sent to a student when their refund is completed.",
      variables: ["name", "courseTitle", "refundAmount"],
      htmlBody: shell(
        "Refund complete",
        "Your refund is on its way, {{name}} ✅",
        `${para("We've successfully processed your refund for <strong style=\"color:#d97757;\">{{courseTitle}}</strong>.")}
        ${infoTable([
          ["Course", "{{courseTitle}}"],
          ["Refund amount", "&#8377;{{refundAmount}}"],
          ["Status", "Processed"],
          ["Arrival", "5–10 business days"],
        ])}
        ${para("The amount will be credited back to your original payment method. If you don't see it within 10 business days, please contact your bank.")}`,
        "Explore More Courses",
        "{{appUrl}}/courses"
      ),
    },

    // ── 14. Refund Rejected ───────────────────────────────────────────────────
    {
      slug: "refund-rejected",
      name: "Refund Rejected",
      subject: "Your refund request for \"{{courseTitle}}\" was not approved — CoachNest",
      description: "Sent to a student when their refund request is denied.",
      variables: ["name", "courseTitle", "adminNotes"],
      htmlBody: shell(
        "Refund request reviewed",
        "Refund request not approved",
        `${para("Hi {{name}}, after reviewing your refund request for <strong style=\"color:#d97757;\">{{courseTitle}}</strong>, we were unable to approve it.")}
        ${quoteBox("Review note", "{{adminNotes}}")}
        ${para("Your access to the course remains active. If you have any questions, our support team is happy to help.")}`,
        "Contact Support",
        "{{appUrl}}/contact"
      ),
    },

    // ── 15. Payout Requested ──────────────────────────────────────────────────
    {
      slug: "payout-requested",
      name: "Payout Request Submitted",
      subject: "Payout request of &#8377;{{amount}} received — CoachNest",
      description: "Sent to an instructor when they submit a payout request.",
      variables: ["name", "amount"],
      htmlBody: shell(
        "Payout request received",
        "Your payout request is in review, {{name}}",
        `${para("We've received your payout request. Our team will review and process it within <strong>3–7 business days</strong>.")}
        ${infoTable([
          ["Requested amount", "&#8377;{{amount}}"],
          ["Status", "Pending Review"],
        ])}`,
        "View Wallet",
        "{{appUrl}}/instructor/earnings"
      ),
    },

    // ── 16. Payout Approved ───────────────────────────────────────────────────
    {
      slug: "payout-approved",
      name: "Payout Approved",
      subject: "Your payout of &#8377;{{amount}} has been approved — CoachNest",
      description: "Sent to an instructor when their payout request is approved.",
      variables: ["name", "amount"],
      htmlBody: shell(
        "Payout approved",
        "Payout approved, {{name}}! 🎉",
        `${para("Your payout request of <strong style=\"color:#d97757;\">&#8377;{{amount}}</strong> has been approved. The transfer will be processed shortly.")}
        ${infoTable([
          ["Amount", "&#8377;{{amount}}"],
          ["Status", "Approved"],
          ["Transfer", "In progress"],
        ])}`,
        "View Earnings",
        "{{appUrl}}/instructor/earnings"
      ),
    },

    // ── 17. Payout Rejected ───────────────────────────────────────────────────
    {
      slug: "payout-rejected",
      name: "Payout Rejected",
      subject: "Your payout request of &#8377;{{amount}} was not approved — CoachNest",
      description: "Sent to an instructor when their payout request is rejected.",
      variables: ["name", "amount", "adminNotes"],
      htmlBody: shell(
        "Payout request reviewed",
        "Payout request not approved",
        `${para("Hi {{name}}, your payout request of <strong style=\"color:#d97757;\">&#8377;{{amount}}</strong> could not be approved. The amount has been returned to your wallet balance.")}
        ${quoteBox("Admin note", "{{adminNotes}}")}`,
        "View Wallet",
        "{{appUrl}}/instructor/earnings",
        `Have questions? <a href="{{appUrl}}/contact" style="color:#d97757;text-decoration:none;">Contact support</a>.`
      ),
    },

    // ── 18. Payout Processed ──────────────────────────────────────────────────
    {
      slug: "payout-processed",
      name: "Payout Transferred",
      subject: "Your payout of &#8377;{{amount}} has been transferred — CoachNest",
      description: "Sent to an instructor when their payout is transferred to their bank.",
      variables: ["name", "amount"],
      htmlBody: shell(
        "Payment sent",
        "Payment transferred, {{name}}! 🎉",
        `${para("Your payout of <strong style=\"color:#d97757;\">&#8377;{{amount}}</strong> has been transferred to your bank account. Keep creating great content!")}
        ${infoTable([
          ["Amount transferred", "&#8377;{{amount}}"],
          ["Status", "Processed"],
          ["Arrival", "1–3 business days"],
        ])}`,
        "View Earnings",
        "{{appUrl}}/instructor/earnings"
      ),
    },

    // ── 19. Contact Confirmation ──────────────────────────────────────────────
    {
      slug: "contact-confirmation",
      name: "Contact Form Confirmation",
      subject: "We received your message — CoachNest",
      description: "Sent to a user after they submit the contact form.",
      variables: ["name"],
      htmlBody: shell(
        "Message received",
        "Thanks for reaching out, {{name}}! ✉️",
        `${para("We've received your message and our team will review it shortly. You can expect a response within <strong>24 hours</strong> on business days.")}
        ${steps([
          ["Message received", "We've logged your inquiry in our support queue."],
          ["Team review", "A support team member will review your message."],
          ["Reply sent", "We'll respond to this email address."],
        ])}`,
        "Visit CoachNest",
        "{{appUrl}}",
        `For urgent matters, email us at <a href="mailto:support@coachnest.in" style="color:#d97757;text-decoration:none;">support@coachnest.in</a>.`
      ),
    },

    // ── 20. Contact Admin Notification ───────────────────────────────────────
    {
      slug: "contact-admin-notification",
      name: "Contact Admin Notification",
      subject: "[CoachNest] New inquiry from {{name}}",
      description: "Sent to admin when a user submits the contact form.",
      variables: ["name", "email", "subject", "message"],
      htmlBody: shell(
        "New contact inquiry",
        "New message received",
        `${para("A user has submitted a contact form inquiry and is awaiting your response.")}
        ${infoTable([
          ["From", "{{name}}"],
          ["Email", "{{email}}"],
          ["Subject", "{{subject}}"],
        ])}
        ${quoteBox("Message", "{{message}}")}`,
        "Reply in Admin Panel",
        "{{appUrl}}/admin/messages"
      ),
    },

    // ── 21. Contact Reply ─────────────────────────────────────────────────────
    {
      slug: "contact-reply",
      name: "Contact Reply",
      subject: "Re: {{originalSubject}} — CoachNest",
      description: "Sent to a user when an admin replies to their contact inquiry.",
      variables: ["name", "originalSubject", "replyMessage"],
      htmlBody: shell(
        "Support reply",
        "Hi {{name}}, we've replied! 💬",
        `${para("Our team has responded to your inquiry regarding <strong style=\"color:#d97757;\">{{originalSubject}}</strong>:")}
        ${quoteBox("Reply", "{{replyMessage}}")}
        ${para("Have a follow-up question? Simply reply to this email or visit our contact page.")}`,
        "Contact Us Again",
        "{{appUrl}}/contact"
      ),
    },

    // ── 22. Instructor Application (Admin) ────────────────────────────────────
    {
      slug: "instructor-application-admin",
      name: "Instructor Application (Admin)",
      subject: "[CoachNest] New instructor application from {{instructorName}}",
      description: "Sent to admin when a new instructor application is submitted.",
      variables: ["instructorName", "instructorEmail"],
      htmlBody: shell(
        "New application",
        "New instructor application received",
        `${para("A new user has applied to become an instructor on CoachNest and is awaiting your review.")}
        ${infoTable([
          ["Applicant", "{{instructorName}}"],
          ["Email", "{{instructorEmail}}"],
          ["Status", "Pending Review"],
        ])}
        ${steps([
          ["Review the application", "Check the applicant's profile and submitted details."],
          ["Approve or reject", "Use the admin panel to make your decision."],
          ["Applicant notified", "They'll receive an email with your decision automatically."],
        ])}`,
        "Review Application",
        "{{appUrl}}/admin/instructors/approvals"
      ),
    },

    // ── 23. Instructor Approved ───────────────────────────────────────────────
    {
      slug: "instructor-approved",
      name: "Instructor Approved",
      subject: "Your CoachNest instructor application has been approved! 🎉",
      description: "Sent to a user when their instructor application is approved.",
      variables: ["name"],
      htmlBody: shell(
        "Application approved",
        "Congratulations, {{name}}! 🎉",
        `${para("Your instructor application has been <strong style=\"color:#d97757;\">approved</strong>. You now have full access to the instructor dashboard where you can create and publish courses, track student progress, and manage your earnings.")}
        ${infoTable([
          ["Status", "Approved"],
          ["Access", "Instructor Dashboard"],
          ["Ability", "Create & publish courses"],
        ])}
        ${steps([
          ["Go to your instructor dashboard", "Access all instructor tools from one place."],
          ["Create your first course", "Set up sections, lessons, and quizzes."],
          ["Submit for review", "Our team will review and approve your course."],
        ])}`,
        "Go to Instructor Dashboard",
        "{{appUrl}}/instructor"
      ),
    },

    // ── 24. Instructor Rejected ───────────────────────────────────────────────
    {
      slug: "instructor-rejected",
      name: "Instructor Rejected",
      subject: "Update on your CoachNest instructor application",
      description: "Sent to a user when their instructor application is rejected.",
      variables: ["name", "reason"],
      htmlBody: shell(
        "Application update",
        "Application status update",
        `${para("Hi {{name}}, thank you for applying to become an instructor on CoachNest. After careful review, we're unable to approve your application at this time.")}
        ${quoteBox("Reason", "{{reason}}")}
        ${para("You can continue using CoachNest as a student and access all available courses. You're welcome to reapply in the future.")}`,
        "Contact Support",
        "{{appUrl}}/contact",
        `Thank you for your interest in teaching on CoachNest.`
      ),
    },
  ];
}
