import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Terms of Service — CoachNest",
  description:
    "Read the terms and conditions that govern your use of the CoachNest platform.",
};

const SECTIONS = [
  { id: "acceptance", title: "Acceptance of Terms" },
  { id: "eligibility", title: "Eligibility" },
  { id: "accounts", title: "User Accounts" },
  { id: "courses", title: "Courses & Content" },
  { id: "payments", title: "Payments & Billing" },
  { id: "instructor", title: "Instructor Terms" },
  { id: "prohibited", title: "Prohibited Conduct" },
  { id: "ip", title: "Intellectual Property" },
  { id: "disclaimers", title: "Disclaimers" },
  { id: "liability", title: "Limitation of Liability" },
  { id: "termination", title: "Termination" },
  { id: "governing", title: "Governing Law" },
  { id: "changes", title: "Changes to Terms" },
  { id: "contact", title: "Contact Us" },
];

export default function TermsOfServicePage() {
  return (
    <>
      <div className="min-h-screen px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto py-12">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-white/30 mb-10">
            <Link href="/" className="hover:text-white/60 transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white/50">Terms of Service</span>
          </nav>

          {/* Header */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-md bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-400/70" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Terms of Service</h1>
                <p className="text-white/30 text-sm mt-0.5">Last updated: March 28, 2026</p>
              </div>
            </div>
            <p className="text-white/50 text-base leading-relaxed max-w-2xl">
              These Terms of Service govern your use of the CoachNest platform. By creating an account or
              accessing any part of our service, you agree to be bound by these terms.
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
            <article className="space-y-10">

              <Section id="acceptance" title="1. Acceptance of Terms">
                <p>By accessing or using CoachNest (&quot;the Platform&quot;, &quot;we&quot;, &quot;us&quot;, &quot;our&quot;), you agree to comply with and be legally bound by these Terms of Service and our <Link href="/legal/privacy-policy" className="legal-link">Privacy Policy</Link>. If you do not agree, please do not use the Platform.</p>
                <p>These Terms apply to all visitors, registered users, instructors, and anyone else who accesses the Platform.</p>
              </Section>

              <Section id="eligibility" title="2. Eligibility">
                <p>You must be at least 13 years of age to use CoachNest. If you are under 18, you represent that you have your parent&apos;s or legal guardian&apos;s permission to use the Platform and that they have read and agreed to these Terms on your behalf.</p>
                <p>By using CoachNest you represent and warrant that you have the right, authority, and capacity to enter into these Terms and to abide by all of the terms and conditions set forth herein.</p>
              </Section>

              <Section id="accounts" title="3. User Accounts">
                <p>To access most features of CoachNest you must register for an account. When you create an account you agree to:</p>
                <ul>
                  <li>Provide accurate, current, and complete registration information.</li>
                  <li>Maintain and promptly update your account information to keep it accurate and complete.</li>
                  <li>Maintain the security and confidentiality of your password.</li>
                  <li>Notify us immediately of any unauthorised use of your account.</li>
                  <li>Accept responsibility for all activities that occur under your account.</li>
                </ul>
                <p>We reserve the right to suspend or terminate your account if any information you provide proves to be inaccurate, false, or incomplete.</p>
              </Section>

              <Section id="courses" title="4. Courses & Content">
                <SubHeading>Enrollment & Access</SubHeading>
                <p>When you enrol in a course you receive a limited, non-exclusive, non-transferable licence to access and view the course content for your personal, non-commercial educational purposes.</p>
                <SubHeading>Lifetime Access</SubHeading>
                <p>For paid courses, you receive lifetime access to the content as long as CoachNest continues to operate and the instructor does not remove the course. We are not responsible for instructor decisions to remove or update course material.</p>
                <SubHeading>User-Generated Content</SubHeading>
                <p>You retain ownership of content you submit (reviews, forum posts, etc.) but grant CoachNest a worldwide, royalty-free licence to use, display, and distribute that content on the Platform. You represent that your content does not infringe any third-party rights.</p>
              </Section>

              <Section id="payments" title="5. Payments & Billing">
                <p>All prices are displayed in USD unless otherwise stated. Payments are processed securely by Stripe. By providing payment information you authorise us to charge the applicable fees.</p>
                <SubHeading>Refunds</SubHeading>
                <p>Please review our <Link href="/legal/refund-policy" className="legal-link">Refund Policy</Link> for full details on eligibility and the refund process. We offer a 30-day money-back guarantee on most courses.</p>
                <SubHeading>Subscriptions</SubHeading>
                <p>Subscription plans renew automatically at the end of each billing period. You can cancel anytime from your account settings; cancellation takes effect at the end of the current billing period.</p>
                <SubHeading>Taxes</SubHeading>
                <p>You are responsible for any applicable sales taxes, VAT, or similar charges based on your jurisdiction. Where required by law, CoachNest may collect and remit such taxes on your behalf.</p>
              </Section>

              <Section id="instructor" title="6. Instructor Terms">
                <p>If you apply to become an instructor and are approved, additional Instructor Terms apply. In general:</p>
                <ul>
                  <li>You retain ownership of your course content but grant CoachNest a licence to host, market, and distribute it on the Platform.</li>
                  <li>You are responsible for the accuracy and quality of your course content.</li>
                  <li>You must ensure your content does not infringe third-party intellectual property rights.</li>
                  <li>Revenue sharing terms are outlined in the separate Instructor Agreement provided at onboarding.</li>
                  <li>CoachNest reserves the right to remove any course that violates these Terms or our content standards.</li>
                </ul>
              </Section>

              <Section id="prohibited" title="7. Prohibited Conduct">
                <p>You agree not to:</p>
                <ul>
                  <li>Share your account credentials or course access with others who have not purchased the course.</li>
                  <li>Download, reproduce, redistribute, or resell course content without explicit permission.</li>
                  <li>Use the Platform for any unlawful purpose or in violation of any applicable law.</li>
                  <li>Post false, misleading, or defamatory reviews or content.</li>
                  <li>Harass, threaten, or intimidate other users or instructors.</li>
                  <li>Attempt to gain unauthorised access to any part of the Platform or its related systems.</li>
                  <li>Use automated means to scrape content, data, or other materials from the Platform.</li>
                  <li>Introduce malware, viruses, or other malicious code into the Platform.</li>
                </ul>
              </Section>

              <Section id="ip" title="8. Intellectual Property">
                <p>The CoachNest name, logo, brand identity, and all Platform software are owned by CoachNest and protected by applicable intellectual property laws. Nothing in these Terms transfers any ownership rights to you.</p>
                <p>Course content belongs to the respective instructors. Platform infrastructure, design, and code belong to CoachNest. You may not copy, modify, distribute, sell, or lease any part of our services or software, nor may you reverse engineer or extract source code, unless applicable law permits it or you have our written permission.</p>
              </Section>

              <Section id="disclaimers" title="9. Disclaimers">
                <p>THE PLATFORM IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. COACHNEST DISCLAIMS ALL WARRANTIES INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.</p>
                <p>We do not warrant that the Platform will always be available, uninterrupted, secure, or error-free, or that course content is accurate, complete, or up to date. Courses are for educational purposes only and do not constitute professional, legal, financial, or medical advice.</p>
              </Section>

              <Section id="liability" title="10. Limitation of Liability">
                <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, COACHNEST AND ITS OFFICERS, EMPLOYEES, AGENTS, PARTNERS, AND LICENSORS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR GOODWILL, ARISING OUT OF OR RELATED TO YOUR USE OF THE PLATFORM.</p>
                <p>Our total cumulative liability to you for any claims arising out of or relating to these Terms or your use of the Platform shall not exceed the greater of (a) $100 or (b) the total amount you paid to CoachNest in the 12 months preceding the claim.</p>
              </Section>

              <Section id="termination" title="11. Termination">
                <p>You may delete your account at any time from your account settings. CoachNest may suspend or terminate your access to the Platform immediately, without prior notice or liability, for any reason including if you breach these Terms.</p>
                <p>Upon termination, your right to use the Platform ceases. Provisions that by their nature should survive termination (including ownership, disclaimers, indemnity, and limitations of liability) will survive.</p>
              </Section>

              <Section id="governing" title="12. Governing Law">
                <p>These Terms are governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict-of-law provisions. You agree to submit to the personal and exclusive jurisdiction of the state and federal courts located within Delaware for resolution of any disputes.</p>
              </Section>

              <Section id="changes" title="13. Changes to Terms">
                <p>We may revise these Terms at any time. We will notify you of material changes by posting a notice on the Platform or sending an email to the address on your account. Continued use of the Platform after the effective date of any changes constitutes your acceptance of the new Terms.</p>
              </Section>

              <Section id="contact" title="14. Contact Us">
                <p>Questions about these Terms? Please reach out:</p>
                <div className="rounded-md border border-white/10 bg-white/[.03] p-5 not-prose">
                  <p className="text-white/60 text-sm mb-1 font-medium">CoachNest Legal Team</p>
                  <Link href="/contact" className="text-orange-400/80 hover:text-orange-400 text-sm transition-colors">
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
                { label: "Privacy Policy", href: "/legal/privacy-policy", desc: "How we collect and protect your data." },
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
      <Footer />
    </>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28">
      <h2 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-white/8">{title}</h2>
      <div className="text-white/50 text-sm leading-relaxed space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_a.legal-link]:text-orange-400/80 [&_a.legal-link]:hover:text-orange-400 [&_a.legal-link]:transition-colors [&_a.legal-link]:underline [&_a.legal-link]:underline-offset-2">
        {children}
      </div>
    </section>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-white/70 font-medium text-sm mt-4 mb-1">{children}</h3>;
}
