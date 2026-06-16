import Link from "next/link";
import { BookOpen, Shield, Zap, Building2 } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

// ─── Link data ────────────────────────────────────────────────────────────────

const ORG_LINKS = [
  { label: "Create Organization", href: "/org/register" },
  { label: "Sign In",             href: "/login"        },
];

const LEGAL_LINKS = [
  { label: "Privacy Policy",   href: "/legal/privacy-policy"    },
  { label: "Terms of Service", href: "/legal/terms-of-service"  },
  { label: "Cookie Policy",    href: "/legal/cookie-policy"     },
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

      <div className="relative mx-auto px-4 sm:px-6 md:px-7 lg:px-8">

        {/* ── CTA strip ── */}
        <div className="py-10 sm:py-12 border-b border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-white font-bold text-xl sm:text-2xl mb-1">
              Bring your organization online
            </h2>
            <p className="text-white/40 text-sm">
              Launch your own learning workspace in minutes.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link
              href="/org/register"
              className="btn-primary px-5 py-2.5 font-semibold inline-flex items-center gap-2"
            >
              <Building2 className="w-4 h-4" />
              Create Organization
            </Link>
          </div>
        </div>

        {/* ── Main link grid ── */}
        <div className="py-12 grid grid-cols-2 md:grid-cols-3 gap-8 lg:gap-10">

          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-block mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="Coachnest"
                className="h-7 w-auto object-contain"
              />
            </Link>
            <p className="text-white/35 text-sm leading-relaxed mb-6 max-w-[220px]">
              Multi-tenant learning workspaces for organizations.
            </p>

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

          {/* Organizations */}
          <div>
            <h4 className="text-white/60 font-semibold text-[11px] uppercase tracking-widest mb-5">
              Organizations
            </h4>
            <ul className="space-y-3">
              {ORG_LINKS.map((link) => (
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
              &copy; {new Date().getFullYear()} Coachnest. All rights reserved.
            </p>
            <div className="flex items-center gap-1.5 text-white/15 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/70 animate-pulse" />
              All systems operational
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </div>

      </div>
    </footer>
  );
}
