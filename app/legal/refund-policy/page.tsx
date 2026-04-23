import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "Refund Policy — CoachNest",
  description:
    "Understand CoachNest's 30-day money-back guarantee and refund process.",
};

const SECTIONS = [
  { id: "overview", title: "Overview" },
  { id: "eligibility", title: "Refund Eligibility" },
  { id: "ineligible", title: "Non-Refundable Situations" },
  { id: "process", title: "How to Request a Refund" },
  { id: "timeline", title: "Refund Timeline" },
  { id: "subscriptions", title: "Subscription Plans" },
  { id: "exceptions", title: "Exceptions & Special Cases" },
  { id: "contact", title: "Contact Us" },
];

export default function RefundPolicyPage() {
  return (
    <>
      <div className="min-h-screen px-4 sm:px-6 lg:px-8">
        <div className="max-w-10xl mx-auto py-12">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-white/30 mb-10">
            <Link href="/" className="hover:text-white/60 transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white/50">Refund Policy</span>
          </nav>

          {/* Header */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-emerald-400/70" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Refund Policy</h1>
                <p className="text-white/30 text-sm mt-0.5">Last updated: April 19, 2026</p>
              </div>
            </div>
            <p className="text-white/50 text-base leading-relaxed max-w-2xl">
              We stand behind the quality of our courses. If you are not satisfied with your purchase,
              we offer a straightforward 30-day money-back guarantee on eligible courses.
            </p>
          </div>

          {/* Quick summary cards */}
          <div className="grid sm:grid-cols-3 gap-4 mb-12">
            <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-5">
              <CheckCircle className="w-6 h-6 text-emerald-400/70 mb-3" />
              <p className="text-white/80 font-semibold text-sm mb-1">30-Day Guarantee</p>
              <p className="text-white/35 text-xs leading-relaxed">Full refund within 30 days of purchase on most courses.</p>
            </div>
            <div className="rounded-md border border-white/10 bg-white/[.02] p-5">
              <Clock className="w-6 h-6 text-white/30 mb-3" />
              <p className="text-white/80 font-semibold text-sm mb-1">5-10 Business Days</p>
              <p className="text-white/35 text-xs leading-relaxed">Typical time for funds to appear in your account.</p>
            </div>
            <div className="rounded-md border border-red-500/20 bg-red-500/5 p-5">
              <XCircle className="w-6 h-6 text-red-400/60 mb-3" />
              <p className="text-white/80 font-semibold text-sm mb-1">No Limit Exceeded</p>
              <p className="text-white/35 text-xs leading-relaxed">Refund requests must be made within 30 days of purchase.</p>
            </div>
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
            <article className="space-y-10">

              <Section id="overview" title="1. Overview">
                <p>CoachNest offers a 30-day money-back guarantee on individual course purchases. We believe in the quality of our content and want every learner to feel confident in their investment. If a course is not what you expected, we will make it right.</p>
                <p>This policy covers individual course purchases made directly on CoachNest. Subscription plans have separate terms described in the <a href="#subscriptions" className="text-orange-400/80 hover:text-orange-400 transition-colors">Subscriptions</a> section below.</p>
              </Section>

              <Section id="eligibility" title="2. Refund Eligibility">
                <p>You are eligible for a full refund if <strong>all</strong> of the following conditions are met:</p>
                <ul>
                  <li>Your refund request is submitted within <strong className="text-white/70">30 calendar days</strong> of the original purchase date.</li>
                  <li>You have completed <strong className="text-white/70">less than 30%</strong> of the course content.</li>
                  <li>You have not previously received a refund for the same course.</li>
                  <li>The purchase was made directly on CoachNest (not through a third-party bundle or partner site).</li>
                </ul>
                <p>Refunds are issued to the original payment method used at checkout.</p>
              </Section>

              <Section id="ineligible" title="3. Non-Refundable Situations">
                <p>Refunds will <strong className="text-white/70">not</strong> be granted in the following circumstances:</p>
                <ul>
                  <li>Refund requests submitted more than 30 days after the purchase date.</li>
                  <li>Courses where more than 30% of lessons have been completed or marked as watched.</li>
                  <li>Courses purchased as part of a bundle or promotional package (unless explicitly stated otherwise).</li>
                  <li>Courses purchased with a coupon providing 100% discount (free coupon enrolments).</li>
                  <li>Accounts that have been suspended or terminated for violating our <Link href="/legal/terms-of-service" className="text-orange-400/80 hover:text-orange-400 transition-colors">Terms of Service</Link>.</li>
                  <li>Downloadable resources, certificates, or other non-course digital goods.</li>
                </ul>
              </Section>

              <Section id="process" title="4. How to Request a Refund">
                <p>Requesting a refund is simple:</p>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>
                    <strong className="text-white/70">Log in</strong> to your CoachNest account and go to your <strong className="text-white/70">Order History</strong> under Dashboard → Orders.
                  </li>
                  <li>
                    Find the course you wish to return and click <strong className="text-white/70">&quot;Request Refund&quot;</strong>.
                  </li>
                  <li>
                    Select a reason for the refund and add any optional comments to help us improve.
                  </li>
                  <li>
                    Submit the form. You will receive a confirmation email within 24 hours.
                  </li>
                </ol>
                <p>Alternatively, you can contact us directly via our <Link href="/contact" className="text-orange-400/80 hover:text-orange-400 transition-colors">Contact page</Link> and our support team will assist you.</p>
              </Section>

              <Section id="timeline" title="5. Refund Timeline">
                <p>Once your refund request is approved:</p>
                <ul>
                  <li><strong className="text-white/70">Processing time:</strong> Refunds are reviewed and approved within 1-2 business days.</li>
                  <li><strong className="text-white/70">Credit/Debit card:</strong> 5-10 business days for the amount to appear on your statement, depending on your bank.</li>
                  <li><strong className="text-white/70">PayPal:</strong> 1-3 business days.</li>
                </ul>
                <p>You will receive an email notification once the refund has been processed. If you have not received your refund after 10 business days, please contact your bank before reaching out to us, as processing times vary.</p>
              </Section>

              <Section id="subscriptions" title="6. Subscription Plans">
                <SubHeading>Monthly Subscriptions</SubHeading>
                <p>Monthly subscription fees are non-refundable once the billing period has started. You can cancel your subscription at any time from your account settings, and you will retain access until the end of the current billing period.</p>
                <SubHeading>Annual Subscriptions</SubHeading>
                <p>If you cancel an annual subscription within the first 14 days and have completed less than 10% of any course content, you are eligible for a pro-rated refund. After 14 days, annual subscriptions are non-refundable but you retain access until the subscription expires.</p>
                <SubHeading>Free Plan</SubHeading>
                <p>The free plan has no payment associated and is not eligible for refunds.</p>
              </Section>

              <Section id="exceptions" title="7. Exceptions & Special Cases">
                <p>We understand that exceptional circumstances arise. In the following cases, we review refund requests on a case-by-case basis regardless of the standard eligibility criteria:</p>
                <ul>
                  <li>Technical issues that prevented you from accessing course content.</li>
                  <li>Duplicate accidental purchases (same course charged twice).</li>
                  <li>Significant discrepancy between the course description and actual content.</li>
                  <li>Prolonged service outages affecting your access.</li>
                </ul>
                <p>Please include as much detail as possible when submitting exception requests to help us resolve the issue quickly.</p>
              </Section>

              <Section id="contact" title="8. Contact Us">
                <p>If you have any questions about our refund policy or need help with a refund request, please get in touch:</p>
                <div className="rounded-md border border-white/10 bg-white/[.03] p-5 not-prose">
                  <p className="text-white/60 text-sm mb-1 font-medium">CoachNest Support Team</p>
                  <Link href="/contact" className="text-orange-400/80 hover:text-orange-400 text-sm transition-colors">
                    Submit a support request →
                  </Link>
                  <p className="text-white/25 text-xs mt-2">We aim to respond within 24 hours on business days.</p>
                </div>
              </Section>

            </article>
          </div>

          {/* Related legal pages */}
          <div className="mt-16 pt-10 border-t border-white/5">
            <p className="text-white/30 text-xs uppercase tracking-wider font-medium mb-5">Related Legal Documents</p>
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { label: "Privacy Policy", href: "/legal/privacy-policy", desc: "How we collect and protect your data." },
                { label: "Terms of Service", href: "/legal/terms-of-service", desc: "Rules governing your use of CoachNest." },
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
      <div className="text-white/50 text-sm leading-relaxed space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ol]:pl-5 [&_ol]:space-y-2">
        {children}
      </div>
    </section>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-white/70 font-medium text-sm mt-4 mb-1">{children}</h3>;
}
