import Link from "next/link";
import { Twitter, Github, Linkedin, Youtube, Mail, BookOpen, Shield, Zap } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

// ─── Link data ────────────────────────────────────────────────────────────────

const PLATFORM_LINKS = [
  { label: "Browse Courses",    href: "/courses"  },
  { label: "Pricing",           href: "/pricing"  },
  { label: "Search",            href: "/search"   },
  { label: "Blog",              href: "/blog"     },
  { label: "Become Instructor", href: "/signup"   },
  { label: "Enterprise",        href: "/pricing"  },
];

const RESOURCES_LINKS = [
  { label: "Help Center",  href: "/contact"   },
  { label: "Blog",         href: "/blog"      },
  { label: "Community",    href: "/community" },
  { label: "Contact Us",   href: "/contact"   },
];

const COMPANY_LINKS = [
  { label: "About Us",         href: "/about"   },
  { label: "Careers",          href: "/careers" },
  { label: "Press & Media",    href: "/press"   },
  { label: "Partners",         href: "/contact" },
  { label: "Affiliate Program",href: "/contact" },
];

const LEGAL_LINKS = [
  { label: "Privacy Policy",   href: "/legal/privacy-policy"    },
  { label: "Terms of Service", href: "/legal/terms-of-service"  },
  { label: "Refund Policy",    href: "/legal/refund-policy"     },
  { label: "Cookie Policy",    href: "/legal/cookie-policy"     },
];

const SOCIAL_LINKS = [
  { label: "Twitter / X", href: "#", icon: Twitter  },
  { label: "GitHub",       href: "#", icon: Github   },
  { label: "LinkedIn",     href: "#", icon: Linkedin },
  { label: "YouTube",      href: "#", icon: Youtube  },
];

const TRUST_BADGES = [
  { icon: Shield, label: "SSL Secured"    },
  { icon: Zap,    label: "99.9% Uptime"   },
  { icon: BookOpen, label: "GDPR Compliant" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function Footer() {
  return (
    <footer className="relative border-t border-white/[0.06] bg-background">

      {/* Top gradient accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />

      {/* Subtle background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-40 bg-orange-500/[0.04] blur-3xl rounded-full" />
      </div>

      <div className="relative max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── CTA strip ── */}
        <div className="py-10 sm:py-12 border-b border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-white font-bold text-xl sm:text-2xl mb-1">
              Ready to level up your skills?
            </h2>
            <p className="text-white/40 text-sm">
              Join thousands of learners already building their future.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link
              href="/courses"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-semibold text-sm transition-all shadow-lg shadow-orange-600/20"
            >
              Explore Courses
            </Link>
            <Link
              href="/pricing"
              className="px-5 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white font-medium text-sm transition-all"
            >
              View Plans
            </Link>
          </div>
        </div>

        {/* ── Main link grid ── */}
        <div className="py-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-10">

          {/* Brand column — spans 2 cols on sm */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <Link href="/" className="inline-block mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="CoachNest"
                className="h-7 w-auto object-contain"
              />
            </Link>
            <p className="text-white/35 text-sm leading-relaxed mb-6 max-w-[220px]">
              The modern learning platform for ambitious developers and designers.
            </p>

            {/* Social links */}
            <div className="flex items-center gap-2 mb-6">
              {SOCIAL_LINKS.map(({ label, href, icon: Icon }) => (
                <Link
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-white/30 hover:text-orange-400 hover:bg-orange-500/10 hover:border-orange-400/25 transition-all"
                >
                  <Icon className="w-3.5 h-3.5" />
                </Link>
              ))}
            </div>

            {/* Trust badges */}
            <div className="flex flex-col gap-1.5">
              {TRUST_BADGES.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-white/20 text-xs">
                  <div className="w-5 h-5 rounded bg-white/[0.04] border border-white/[0.07] flex items-center justify-center">
                    <Icon className="w-3 h-3" />
                  </div>
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-white/60 font-semibold text-[11px] uppercase tracking-widest mb-5">
              Platform
            </h4>
            <ul className="space-y-3">
              {PLATFORM_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-white/35 hover:text-white/70 text-sm transition-colors hover:translate-x-0.5 inline-block"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-white/60 font-semibold text-[11px] uppercase tracking-widest mb-5">
              Resources
            </h4>
            <ul className="space-y-3">
              {RESOURCES_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-white/35 hover:text-white/70 text-sm transition-colors hover:translate-x-0.5 inline-block"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white/60 font-semibold text-[11px] uppercase tracking-widest mb-5">
              Company
            </h4>
            <ul className="space-y-3">
              {COMPANY_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-white/35 hover:text-white/70 text-sm transition-colors hover:translate-x-0.5 inline-block"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white/60 font-semibold text-[11px] uppercase tracking-widest mb-5">
              Legal
            </h4>
            <ul className="space-y-3">
              {LEGAL_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-white/35 hover:text-white/70 text-sm transition-colors hover:translate-x-0.5 inline-block"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="border-t border-white/[0.05] py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <p className="text-white/20 text-xs">
              &copy; {new Date().getFullYear()} CoachNest. All rights reserved.
            </p>
            <div className="flex items-center gap-1.5 text-white/15 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/70 animate-pulse" />
              All systems operational
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-white/10 text-xs hidden sm:block">
              Built with Next.js &amp; Tailwind CSS
            </span>
            <div className="w-px h-3 bg-white/10 hidden sm:block" />
            <Link
              href="/contact"
              className="flex items-center gap-1.5 text-white/20 hover:text-white/50 text-xs transition-colors"
            >
              <Mail className="w-3 h-3" />
              Get in touch
            </Link>
            <div className="w-px h-3 bg-white/10" />
            <ThemeToggle />
          </div>
        </div>

      </div>
    </footer>
  );
}
