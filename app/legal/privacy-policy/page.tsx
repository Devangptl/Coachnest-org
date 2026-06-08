import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy — Coachnest",
  description:
    "Learn how Coachnest collects, uses, and protects your personal information.",
};

const SECTIONS = [
  { id: "information-we-collect", title: "Information We Collect" },
  { id: "how-we-use", title: "How We Use Your Information" },
  { id: "sharing", title: "Sharing Your Information" },
  { id: "cookies", title: "Cookies & Tracking" },
  { id: "data-retention", title: "Data Retention" },
  { id: "your-rights", title: "Your Rights" },
  { id: "security", title: "Security" },
  { id: "children", title: "Children's Privacy" },
  { id: "changes", title: "Changes to This Policy" },
  { id: "contact", title: "Contact Us" },
];

export default function PrivacyPolicyPage() {
  return (
    <>
      <div className="min-h-screen px-4 sm:px-6 lg:px-8">
        <div className="mx-auto py-12">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-white/30 mb-10">
            <Link href="/" className="hover:text-white/60 transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white/50">Privacy Policy</span>
          </nav>

          {/* Header */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-md bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-[#d97757]/70" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
                <p className="text-white/30 text-sm mt-0.5">Last updated: June 8, 2026</p>
              </div>
            </div>
            <p className="text-white/50 text-base leading-relaxed max-w-2xl">
              At Coachnest, your privacy is important to us. This policy explains what data we collect,
              why we collect it, and how you can control it.
            </p>
          </div>

          <div className="grid lg:grid-cols-[220px_1fr] gap-10">

            {/* Sticky table of contents */}
            <aside className="hidden lg:block">
              <div className="sticky top-28 rounded-md border border-white/8 bg-white/[.03] p-4">
                <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3">Contents</p>
                <ul className="space-y-1.5">
                  {SECTIONS.map((s) => (
                    <li key={s.id}>
                      <a
                        href={`#${s.id}`}
                        className="text-white/30 hover:text-white/70 text-xs block py-0.5 transition-colors"
                      >
                        {s.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>

            {/* Content */}
            <article className="prose prose-invert prose-sm max-w-none space-y-10">

              <Section id="information-we-collect" title="1. Information We Collect">
                <p>We collect information you provide directly to us and information generated automatically when you use Coachnest.</p>
                <SubHeading>Account Information</SubHeading>
                <p>When you create an account we collect your name, email address, and password (stored as a secure hash). If you sign in via a third-party provider, we receive the profile information that provider makes available.</p>
                <SubHeading>Payment Information</SubHeading>
                <p>Payments are processed through Razorpay. We do not store full card numbers or CVV codes on our servers. We receive and store a Razorpay payment reference ID solely for billing records.</p>
                <SubHeading>Learning Activity</SubHeading>
                <p>We record course enrollments, lesson completion, quiz scores, certificates earned, and time spent on the platform to power your learning dashboard and personalised recommendations.</p>
                <p>We also track gamification activity — XP (experience points) earned from lessons and quizzes, badges awarded, daily and weekly learning streaks, and your position on the platform leaderboard. Community engagement is recorded as well, including forum posts, upvotes given and received, study group participation, shared notes, and peer review submissions and scores. This information powers your progress display, computes rankings, and surfaces relevant content.</p>
                <SubHeading>Real-Time Activity</SubHeading>
                <p>Features such as the live activity feed and community notifications use Supabase Realtime channels. Your display name and activity events (e.g., course completion, forum post) may be broadcast to other connected users in real time as part of the platform&apos;s social features.</p>
                <SubHeading>Usage Data</SubHeading>
                <p>We automatically collect log data including IP address, browser type, pages visited, and referring URLs. This data is aggregated and used for analytics and platform improvement.</p>
              </Section>

              <Section id="how-we-use" title="2. How We Use Your Information">
                <p>We use the information we collect to:</p>
                <ul>
                  <li>Create and manage your account</li>
                  <li>Process payments and issue receipts</li>
                  <li>Deliver course content and track your progress</li>
                  <li>Send transactional emails (receipts, certificates, password resets)</li>
                  <li>Send product updates and promotional content (you can opt out at any time)</li>
                  <li>Detect and prevent fraud or abuse</li>
                  <li>Improve the platform through analytics and A/B testing</li>
                  <li>Comply with legal obligations</li>
                </ul>
                <p>We do not sell your personal data to third parties for their own marketing purposes.</p>
              </Section>

              <Section id="sharing" title="3. Sharing Your Information">
                <p>We share data only in the following circumstances:</p>
                <ul>
                  <li><strong className="text-white/70">Service Providers</strong> — trusted vendors who process data on our behalf (e.g., Razorpay for payments, Resend for email delivery, Supabase for authentication and real-time data, Vercel for hosting, Cloudinary for media and image storage). These parties are contractually bound to protect your data.</li>
                  <li><strong className="text-white/70">Instructors</strong> — if you enrol in a course, the instructor can see your display name and aggregate progress to support your learning journey.</li>
                  <li><strong className="text-white/70">Legal Requirements</strong> — if we believe disclosure is required by law, subpoena, or legal process.</li>
                  <li><strong className="text-white/70">Business Transfers</strong> — in the event of a merger, acquisition, or sale of assets, your data may be transferred. We will notify you before such a transfer occurs.</li>
                </ul>
              </Section>

              <Section id="cookies" title="4. Cookies & Tracking">
                <p>We use cookies and similar technologies to operate the platform and understand how you use it. You can manage your cookie preferences at any time via our <Link href="/legal/cookie-policy" className="text-[#d97757]/80 hover:text-[#d97757] transition-colors underline underline-offset-2">Cookie Policy</Link>.</p>
                <SubHeading>Types of cookies we use</SubHeading>
                <ul>
                  <li><strong className="text-white/70">Strictly Necessary</strong> — required for authentication, session management, and core functionality.</li>
                  <li><strong className="text-white/70">Analytics</strong> — help us understand traffic patterns and feature usage (e.g., aggregate page view data).</li>
                  <li><strong className="text-white/70">Preference</strong> — remember your settings such as language or theme.</li>
                </ul>
                <p>We do not use third-party advertising cookies.</p>
              </Section>

              <Section id="data-retention" title="5. Data Retention">
                <p>We retain your personal data for as long as your account is active or as needed to provide services. If you delete your account:</p>
                <ul>
                  <li>Profile data is deleted within 30 days.</li>
                  <li>Payment records are retained for 7 years to comply with tax and accounting obligations.</li>
                  <li>Anonymised, aggregated analytics data may be retained indefinitely.</li>
                </ul>
              </Section>

              <Section id="your-rights" title="6. Your Rights">
                <p>Depending on your location you may have the following rights regarding your personal data:</p>
                <ul>
                  <li><strong className="text-white/70">Access</strong> — request a copy of the data we hold about you.</li>
                  <li><strong className="text-white/70">Rectification</strong> — correct inaccurate or incomplete data.</li>
                  <li><strong className="text-white/70">Erasure</strong> — request deletion of your personal data ("right to be forgotten").</li>
                  <li><strong className="text-white/70">Portability</strong> — receive your data in a machine-readable format.</li>
                  <li><strong className="text-white/70">Objection</strong> — object to processing based on legitimate interests.</li>
                  <li><strong className="text-white/70">Withdraw Consent</strong> — opt out of marketing emails via the unsubscribe link in any email or through your account settings.</li>
                </ul>
                <p>To exercise any of these rights, please contact us at <Link href="/contact" className="text-[#d97757]/80 hover:text-[#d97757] transition-colors">our contact page</Link>.</p>
              </Section>

              <Section id="security" title="7. Security">
                <p>We implement industry-standard measures to protect your data, including:</p>
                <ul>
                  <li>TLS/HTTPS encryption for all data in transit</li>
                  <li>bcrypt password hashing</li>
                  <li>Regular security audits and dependency updates</li>
                  <li>Least-privilege access controls for internal systems</li>
                </ul>
                <p>No method of transmission over the Internet is 100% secure. While we strive to use commercially acceptable means to protect your data, we cannot guarantee absolute security.</p>
              </Section>

              <Section id="children" title="8. Children's Privacy">
                <p>Coachnest is not directed at children under 13 years of age. We do not knowingly collect personal data from children under 13. If you believe a child has provided us with personal data, please contact us immediately so we can delete the information.</p>
              </Section>

              <Section id="changes" title="9. Changes to This Policy">
                <p>We may update this Privacy Policy from time to time. When we do, we will revise the "last updated" date at the top of this page and notify you via email or an in-app notice for material changes. Your continued use of Coachnest after such notification constitutes your acceptance of the updated policy.</p>
              </Section>

              <Section id="contact" title="10. Contact Us">
                <p>If you have questions, concerns, or requests related to this Privacy Policy, please reach out:</p>
                <div className="rounded-md border border-white/10 bg-white/[.03] p-5 not-prose">
                  <p className="text-white/60 text-sm mb-1 font-medium">Coachnest Privacy Team</p>
                  <Link href="/contact" className="text-[#d97757]/80 hover:text-[#d97757] text-sm transition-colors">
                    Submit a request via our Contact page →
                  </Link>
                </div>
              </Section>

            </article>
          </div>

          {/* Related legal pages */}
          <div className="mt-16 pt-10 border-t border-white/5">
            <p className="text-white/30 text-xs uppercase tracking-wider font-medium mb-5">Related Legal Documents</p>
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { label: "Terms of Service", href: "/legal/terms-of-service", desc: "Rules governing your use of Coachnest." },
                { label: "Refund Policy", href: "/legal/refund-policy", desc: "How to request a refund for purchases." },
                { label: "Cookie Policy", href: "/legal/cookie-policy", desc: "How we use cookies and similar technologies." },
              ].map((doc) => (
                <Link
                  key={doc.href}
                  href={doc.href}
                  className="rounded-md border border-white/8 bg-white/[.02] hover:bg-white/[.04] hover:border-white/15 p-4 group transition-all"
                >
                  <p className="text-white/70 text-sm font-medium  transition-colors mb-1">{doc.label}</p>
                  <p className="text-white/30 text-xs">{doc.desc}</p>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28">
      <h2 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-white/8">{title}</h2>
      <div className="text-white/50 text-sm leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-white/70 font-medium text-sm mt-4 mb-1">{children}</h3>;
}
