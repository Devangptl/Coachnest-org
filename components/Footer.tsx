import Link from "next/link";
import { Twitter, Github, Linkedin, Youtube, Mail } from "lucide-react";

const PLATFORM_LINKS = [
  { label: "Browse Courses", href: "/courses" },
  { label: "Pricing", href: "/pricing" },
  { label: "Search", href: "/search" },
  { label: "Blog", href: "/blog" },
  { label: "Become Instructor", href: "/signup" },
  { label: "Enterprise", href: "/pricing" },
];

const RESOURCES_LINKS = [
  { label: "Contact Us", href: "/contact" },
  { label: "Help Center", href: "/contact" },
  { label: "Blog Articles", href: "/blog" },
  { label: "Community", href: "/community" },
  { label: "Documentation", href: "/blog" },
  { label: "Changelog", href: "/blog" },
];

const COMPANY_LINKS = [
  { label: "About Us", href: "/about" },
  { label: "Careers", href: "/careers" },
  { label: "Press & Media", href: "/press" },
  { label: "Partners", href: "/contact" },
  { label: "Affiliate Program", href: "/contact" },
];

const LEGAL_LINKS = [
  { label: "Privacy Policy", href: "/legal/privacy-policy" },
  { label: "Terms of Service", href: "/legal/terms-of-service" },
  { label: "Refund Policy", href: "/legal/refund-policy" },
  { label: "Cookie Policy", href: "/legal/cookie-policy" },
];

const SOCIAL_LINKS = [
  { label: "Twitter / X", href: "#", icon: Twitter },
  { label: "GitHub", href: "#", icon: Github },
  { label: "LinkedIn", href: "#", icon: Linkedin },
  { label: "YouTube", href: "#", icon: Youtube },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-black/30 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Main grid */}
        <div className="py-16 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-10">

          {/* Brand — takes 2 cols on sm, 1 col on lg */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <div className="mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="CoachNest"
                className="h-6 w-auto object-contain"
              />
            </div>
            <p className="text-white/30 text-sm leading-relaxed mb-6 max-w-xs">
              The modern learning platform for ambitious developers and designers.
              Master new skills and advance your career with expert-crafted courses.
            </p>

            {/* Social links */}
            <div className="flex items-center gap-2.5 mb-6">
              {SOCIAL_LINKS.map(({ label, href, icon: Icon }) => (
                <Link
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/10 hover:border-white/20 transition-all"
                >
                  <Icon className="w-3.5 h-3.5" />
                </Link>
              ))}
            </div>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-white/80 font-semibold text-xs uppercase tracking-wider mb-5">Platform</h4>
            <ul className="space-y-3">
              {PLATFORM_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-white/35 hover:text-white/70 text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-white/80 font-semibold text-xs uppercase tracking-wider mb-5">Resources</h4>
            <ul className="space-y-3">
              {RESOURCES_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-white/35 hover:text-white/70 text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white/80 font-semibold text-xs uppercase tracking-wider mb-5">Company</h4>
            <ul className="space-y-3">
              {COMPANY_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-white/35 hover:text-white/70 text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white/80 font-semibold text-xs uppercase tracking-wider mb-5">Legal</h4>
            <ul className="space-y-3">
              {LEGAL_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-white/35 hover:text-white/70 text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Trust badges */}
            <div className="mt-8 space-y-2">
              <div className="flex items-center gap-2 text-white/20 text-xs">
                <span className="w-4 h-4 rounded bg-white/5 border border-white/10 flex items-center justify-center text-[9px]">🔒</span>
                SSL Secured
              </div>
              <div className="flex items-center gap-2 text-white/20 text-xs">
                <span className="w-4 h-4 rounded bg-white/5 border border-white/10 flex items-center justify-center text-[9px]">✓</span>
                GDPR Compliant
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/5 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <p className="text-white/20 text-xs">
              &copy; {new Date().getFullYear()} CoachNest. All rights reserved.
            </p>
            <div className="flex items-center gap-1.5 text-white/15 text-xs">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/60 animate-pulse" />
              All systems operational
            </div>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-white/15 text-xs">
              Built with Next.js, Tailwind CSS &amp; Prisma
            </p>
            <Link
              href="/contact"
              className="flex items-center gap-1.5 text-white/20 hover:text-white/50 text-xs transition-colors"
            >
              <Mail className="w-3 h-3" />
              Get in touch
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
