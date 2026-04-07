import type { Metadata } from "next";
import Link from "next/link";
import { Download, ExternalLink, Mail, ArrowRight } from "lucide-react";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Press & Media — CoachNest",
  description:
    "Press resources, media kit, and contact information for journalists and media professionals.",
};

const COVERAGE = [
  {
    outlet: "TechCrunch",
    headline: "CoachNest raises $8M to bring expert-led tech education to emerging markets",
    date: "Jan 2026",
    href: "#",
  },
  {
    outlet: "Product Hunt",
    headline: "#1 Product of the Day — CoachNest launches its AI-powered learning paths",
    date: "Nov 2025",
    href: "#",
  },
  {
    outlet: "Hacker News",
    headline: "Ask HN: How CoachNest is rethinking online course delivery",
    date: "Sep 2025",
    href: "#",
  },
  {
    outlet: "Forbes",
    headline: "30 EdTech startups redefining how professionals learn in 2025",
    date: "Aug 2025",
    href: "#",
  },
];

const ASSETS = [
  { name: "Logo Pack (SVG + PNG)", size: "2.4 MB", desc: "Full-color, white, and dark variants." },
  { name: "Brand Guidelines", size: "1.1 MB", desc: "Colors, typography, usage rules." },
  { name: "Product Screenshots", size: "8.7 MB", desc: "High-resolution UI screenshots." },
  { name: "Founder Headshots", size: "4.2 MB", desc: "Professional photos of key team members." },
];

const FACTS = [
  { value: "2022", label: "Founded" },
  { value: "50,000+", label: "Active Learners" },
  { value: "500+", label: "Courses" },
  { value: "Global", label: "Reach" },
];

export default function PressPage() {
  return (
    <>
      <div className="min-h-screen px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto py-16">

          {/* Hero */}
          <div className="mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-orange-500/20 bg-orange-500/5 text-orange-400/80 text-xs font-medium mb-6">
              Press & Media
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-5">
              Media Resources
            </h1>
            <p className="text-white/40 text-lg leading-relaxed max-w-2xl">
              Everything you need to write about CoachNest — brand assets, company facts,
              and a direct line to our press team.
            </p>
          </div>

          {/* Quick facts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-16">
            {FACTS.map((fact) => (
              <div key={fact.label} className="rounded-md border border-white/8 bg-white/[.02] p-5 text-center">
                <p className="text-2xl font-bold text-white mb-1">{fact.value}</p>
                <p className="text-white/35 text-xs">{fact.label}</p>
              </div>
            ))}
          </div>

          {/* Press contact */}
          <div className="rounded-2xl border border-orange-500/15 bg-orange-500/5 p-6 sm:p-8 mb-16">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-white/80 font-semibold text-base mb-1">Press Enquiries</p>
                <p className="text-white/40 text-sm leading-relaxed max-w-md">
                  For interview requests, fact-checking, or embargo announcements, please reach out to our communications team. We aim to respond within one business day.
                </p>
              </div>
              <Link
                href="/contact"
                className="shrink-0 flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors whitespace-nowrap"
              >
                <Mail className="w-4 h-4" />
                Contact Press Team
              </Link>
            </div>
          </div>

          {/* Media kit */}
          <div className="mb-16">
            <h2 className="text-xl font-bold text-white mb-6">Media Kit</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {ASSETS.map((asset) => (
                <div
                  key={asset.name}
                  className="rounded-md border border-white/8 bg-white/[.02] hover:bg-white/[.04] hover:border-white/15 p-5 flex items-center justify-between gap-4 group transition-all cursor-pointer"
                >
                  <div>
                    <p className="text-white/70 font-medium text-sm  transition-colors">
                      {asset.name}
                    </p>
                    <p className="text-white/30 text-xs mt-0.5">{asset.desc}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-white/20 text-xs">{asset.size}</span>
                    <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/30 /60 transition-colors">
                      <Download className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-white/20 text-xs mt-3">
              Assets are provided for editorial use only. Please review our brand guidelines before publishing.
            </p>
          </div>

          {/* Media coverage */}
          <div className="mb-16">
            <h2 className="text-xl font-bold text-white mb-6">In the News</h2>
            <div className="space-y-3">
              {COVERAGE.map((item) => (
                <Link
                  key={item.headline}
                  href={item.href}
                  className="flex items-start justify-between gap-4 rounded-md border border-white/8 bg-white/[.02] hover:bg-white/[.04] hover:border-white/15 p-5 group transition-all"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-orange-400/70 text-xs font-semibold">{item.outlet}</span>
                      <span className="text-white/15 text-xs">•</span>
                      <span className="text-white/25 text-xs">{item.date}</span>
                    </div>
                    <p className="text-white/55 text-sm leading-relaxed /75 transition-colors">
                      {item.headline}
                    </p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-white/20 /50 transition-colors shrink-0 mt-0.5" />
                </Link>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="rounded-2xl border border-white/8 bg-white/[.02] p-8 text-center">
            <p className="text-white/60 font-semibold text-base mb-2">Want to learn more?</p>
            <p className="text-white/30 text-sm mb-5">Explore our platform or read what our learners are saying.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/about" className="flex items-center gap-2 border border-white/10 hover:border-white/20 text-white/55 hover:text-white/75 text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
                About CoachNest <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/courses" className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/55 hover:text-white/75 text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
                Browse Courses
              </Link>
            </div>
          </div>

        </div>
      </div>
      <Footer />
    </>
  );
}
