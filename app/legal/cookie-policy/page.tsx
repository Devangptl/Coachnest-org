import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Cookie } from "lucide-react";

export const metadata: Metadata = {
  title: "Cookie Policy — CoachNest",
  description:
    "Learn how CoachNest uses cookies and similar tracking technologies.",
};

const SECTIONS = [
  { id: "what-are-cookies", title: "What Are Cookies?" },
  { id: "how-we-use", title: "How We Use Cookies" },
  { id: "types", title: "Types of Cookies We Use" },
  { id: "third-party", title: "Third-Party Cookies" },
  { id: "managing", title: "Managing Your Cookie Preferences" },
  { id: "do-not-track", title: "Do Not Track Signals" },
  { id: "changes", title: "Changes to This Policy" },
  { id: "contact", title: "Contact Us" },
];

const COOKIE_TYPES = [
  {
    category: "Strictly Necessary",
    color: "emerald",
    description: "Essential for the Platform to function correctly. Cannot be disabled.",
    examples: [
      { name: "session_token", purpose: "Keeps you logged in securely.", duration: "Session" },
      { name: "csrf_token", purpose: "Prevents cross-site request forgery attacks.", duration: "Session" },
      { name: "__stripe_mid", purpose: "Fraud detection for payment processing (Stripe).", duration: "1 year" },
    ],
  },
  {
    category: "Analytics",
    color: "blue",
    description: "Help us understand how visitors interact with the Platform so we can improve it.",
    examples: [
      { name: "_ga", purpose: "Distinguishes unique users for analytics aggregation.", duration: "2 years" },
      { name: "_gid", purpose: "Distinguishes users on a shorter cycle.", duration: "24 hours" },
      { name: "cn_session_id", purpose: "Tracks anonymous page-flow within a session.", duration: "30 min" },
    ],
  },
  {
    category: "Preference",
    color: "purple",
    description: "Remember your settings and choices to personalise your experience.",
    examples: [
      { name: "cn_theme", purpose: "Saves your UI theme preference (e.g., dark mode).", duration: "1 year" },
      { name: "cn_locale", purpose: "Stores your preferred language setting.", duration: "1 year" },
      { name: "cn_video_quality", purpose: "Remembers your preferred video playback quality.", duration: "6 months" },
    ],
  },
];

export default function CookiePolicyPage() {
  return (
    <>
      <div className="min-h-screen px-4 sm:px-6 lg:px-8">
        <div className="mx-auto py-12">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-white/30 mb-10">
            <Link href="/" className="hover:text-white/60 transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white/50">Cookie Policy</span>
          </nav>

          {/* Header */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Cookie className="w-5 h-5 text-amber-400/70" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Cookie Policy</h1>
                <p className="text-white/30 text-sm mt-0.5">Last updated: April 19, 2026</p>
              </div>
            </div>
            <p className="text-white/50 text-base leading-relaxed max-w-2xl">
              This Cookie Policy explains how CoachNest uses cookies and similar tracking technologies
              when you visit our Platform, and how you can control them.
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

              <Section id="what-are-cookies" title="1. What Are Cookies?">
                <p>Cookies are small text files placed on your device (computer, tablet, or mobile) by websites you visit. They are widely used to make websites work more efficiently, remember your preferences, and provide analytical information to site owners.</p>
                <p>Similar technologies such as web beacons, pixels, and local storage may also be used in similar ways. In this policy, we refer to all of these collectively as &quot;cookies.&quot;</p>
              </Section>

              <Section id="how-we-use" title="2. How We Use Cookies">
                <p>CoachNest uses cookies for the following purposes:</p>
                <ul>
                  <li><strong className="text-white/70">Authentication</strong> — to keep you securely signed in during your session.</li>
                  <li><strong className="text-white/70">Security</strong> — to detect and prevent fraudulent activity and protect against attacks.</li>
                  <li><strong className="text-white/70">Preferences</strong> — to remember your settings such as theme, language, and video quality.</li>
                  <li><strong className="text-white/70">Analytics</strong> — to understand how users navigate the Platform so we can improve the experience.</li>
                  <li><strong className="text-white/70">Performance</strong> — to monitor and optimise Platform performance.</li>
                </ul>
                <p>We do <strong className="text-white/70">not</strong> use cookies for advertising or to build personal profiles for sale to third parties.</p>
              </Section>

              <Section id="types" title="3. Types of Cookies We Use">
                <div className="space-y-8 not-prose">
                  {COOKIE_TYPES.map((type) => {
                    const colorMap: Record<string, string> = {
                      emerald: "border-emerald-500/20 bg-emerald-500/5",
                      blue: "border-blue-500/20 bg-blue-500/5",
                      purple: "border-purple-500/20 bg-purple-500/5",
                    };
                    const badgeMap: Record<string, string> = {
                      emerald: "bg-emerald-500/15 text-emerald-400/80",
                      blue: "bg-blue-500/15 text-blue-400/80",
                      purple: "bg-purple-500/15 text-purple-400/80",
                    };
                    return (
                      <div key={type.category} className={`rounded-md border p-5 ${colorMap[type.color]}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeMap[type.color]}`}>
                            {type.category}
                          </span>
                        </div>
                        <p className="text-white/45 text-sm mb-4">{type.description}</p>
                        <div className="rounded-lg border border-white/8 overflow-hidden">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-white/8 bg-white/[.03]">
                                <th className="text-left text-white/30 font-medium px-4 py-2.5">Cookie Name</th>
                                <th className="text-left text-white/30 font-medium px-4 py-2.5">Purpose</th>
                                <th className="text-left text-white/30 font-medium px-4 py-2.5 whitespace-nowrap">Duration</th>
                              </tr>
                            </thead>
                            <tbody>
                              {type.examples.map((ex, i) => (
                                <tr key={ex.name} className={i < type.examples.length - 1 ? "border-b border-white/5" : ""}>
                                  <td className="px-4 py-2.5 font-mono text-white/50 text-[11px]">{ex.name}</td>
                                  <td className="px-4 py-2.5 text-white/35">{ex.purpose}</td>
                                  <td className="px-4 py-2.5 text-white/30 whitespace-nowrap">{ex.duration}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>

              <Section id="third-party" title="4. Third-Party Cookies">
                <p>Some cookies on CoachNest are set by trusted third-party services that we use to operate the Platform:</p>
                <ul>
                  <li><strong className="text-white/70">Stripe</strong> — payment processing. Stripe may set cookies to detect fraud and ensure secure transactions. <Link href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-orange-400/80 hover:text-orange-400 transition-colors">Stripe Privacy Policy ↗</Link></li>
                  <li><strong className="text-white/70">Google Analytics</strong> — anonymous usage analytics to help us understand how people use CoachNest. Data is aggregated and not linked to identifiable individuals.</li>
                  <li><strong className="text-white/70">Cloudinary / Unsplash</strong> — image delivery CDNs that may set performance-related cookies.</li>
                </ul>
                <p>We do not use third-party advertising networks or retargeting cookies.</p>
              </Section>

              <Section id="managing" title="5. Managing Your Cookie Preferences">
                <p>You have several options for managing cookies:</p>
                <SubHeading>Browser Settings</SubHeading>
                <p>Most browsers allow you to refuse or delete cookies through their settings. Note that disabling strictly necessary cookies will prevent you from using features that require authentication.</p>
                <ul>
                  <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-orange-400/80 hover:text-orange-400 transition-colors">Chrome cookie settings ↗</a></li>
                  <li><a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener noreferrer" className="text-orange-400/80 hover:text-orange-400 transition-colors">Firefox cookie settings ↗</a></li>
                  <li><a href="https://support.apple.com/en-us/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-orange-400/80 hover:text-orange-400 transition-colors">Safari cookie settings ↗</a></li>
                </ul>
                <SubHeading>Account Settings</SubHeading>
                <p>You can opt out of analytics cookies from your CoachNest account settings under <strong className="text-white/70">Privacy Preferences</strong>.</p>
              </Section>

              <Section id="do-not-track" title="6. Do Not Track Signals">
                <p>Some browsers include a &quot;Do Not Track&quot; (DNT) feature that signals to websites that you do not want to be tracked. There is currently no uniform standard for how to respond to DNT signals. At this time, CoachNest does not alter its data collection practices when a DNT signal is received, but we will continue to monitor developments in this area.</p>
              </Section>

              <Section id="changes" title="7. Changes to This Policy">
                <p>We may update this Cookie Policy as our use of cookies evolves or to comply with new regulations. When changes are made, we will update the &quot;last updated&quot; date at the top of this page. For material changes, we will provide a more prominent notice.</p>
              </Section>

              <Section id="contact" title="8. Contact Us">
                <p>If you have questions about our use of cookies or this Cookie Policy, please contact us:</p>
                <div className="rounded-md border border-white/10 bg-white/[.03] p-5 not-prose">
                  <p className="text-white/60 text-sm mb-1 font-medium">CoachNest Privacy Team</p>
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
                { label: "Terms of Service", href: "/legal/terms-of-service", desc: "Rules governing your use of CoachNest." },
                { label: "Refund Policy", href: "/legal/refund-policy", desc: "How to request a refund for purchases." },
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
      <div className="text-white/50 text-sm leading-relaxed space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5">
        {children}
      </div>
    </section>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-white/70 font-medium text-sm mt-4 mb-1">{children}</h3>;
}
