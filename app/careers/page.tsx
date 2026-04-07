import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase, MapPin, Clock, ArrowRight, Zap, Heart, Coffee } from "lucide-react";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Careers — CoachNest",
  description:
    "Join the CoachNest team and help shape the future of online education.",
};

const PERKS = [
  { icon: Zap, title: "Remote-first", desc: "Work from wherever you do your best thinking. We are 100% remote." },
  { icon: Heart, title: "Health & Wellness", desc: "Comprehensive health coverage and a monthly wellness stipend." },
  { icon: Coffee, title: "Learning Budget", desc: "$2,000/year to spend on courses, books, and conferences." },
  { icon: Briefcase, title: "Equity Package", desc: "Everyone who joins gets meaningful equity in the company." },
];

const OPENINGS = [
  {
    title: "Senior Full-Stack Engineer",
    team: "Engineering",
    location: "Remote",
    type: "Full-time",
    desc: "Help build and scale the platform that tens of thousands of learners rely on every day. Strong experience with Next.js, TypeScript, and PostgreSQL preferred.",
  },
  {
    title: "Curriculum Designer",
    team: "Content",
    location: "Remote",
    type: "Full-time",
    desc: "Work with our network of expert instructors to design engaging, outcome-focused course structures that deliver real results.",
  },
  {
    title: "Product Designer",
    team: "Design",
    location: "Remote",
    type: "Full-time",
    desc: "Own the end-to-end design of learner-facing features — from first-time onboarding to advanced course consumption experiences.",
  },
  {
    title: "Growth Marketing Manager",
    team: "Marketing",
    location: "Remote",
    type: "Full-time",
    desc: "Drive learner acquisition and retention through data-driven campaigns, SEO, and partnerships. Experience with EdTech a plus.",
  },
  {
    title: "Instructor Success Manager",
    team: "Partnerships",
    location: "Remote",
    type: "Full-time",
    desc: "Support and grow our community of instructors — helping them create great content and build successful teaching businesses on CoachNest.",
  },
];

export default function CareersPage() {
  return (
    <>
      <div className="min-h-screen px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto py-16">

          {/* Hero */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-orange-500/20 bg-orange-500/5 text-orange-400/80 text-xs font-medium mb-6">
              We&apos;re hiring
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-5 leading-tight">
              Build the future of<br />
              <span className="text-white/40">online learning.</span>
            </h1>
            <p className="text-white/40 text-lg leading-relaxed max-w-xl mx-auto">
              Join a small, ambitious team that is helping hundreds of thousands of people
              level up their careers. We move fast, care deeply, and ship often.
            </p>
          </div>

          {/* Perks */}
          <div className="grid sm:grid-cols-2 gap-4 mb-16">
            {PERKS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-md border border-white/8 bg-white/[.02] p-5 flex gap-4">
                <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-orange-400/70" />
                </div>
                <div>
                  <p className="text-white/75 font-medium text-sm mb-0.5">{title}</p>
                  <p className="text-white/35 text-xs leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Open roles */}
          <div className="mb-16">
            <h2 className="text-xl font-bold text-white mb-6">Open Positions</h2>
            <div className="space-y-3">
              {OPENINGS.map((role) => (
                <div
                  key={role.title}
                  className="rounded-md border border-white/8 bg-white/[.02] hover:bg-white/[.04] hover:border-white/15 p-5 sm:p-6 transition-all group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                    <div>
                      <p className="text-white/80 font-semibold text-sm  transition-colors">
                        {role.title}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-white/30 text-xs flex items-center gap-1">
                          <Briefcase className="w-3 h-3" /> {role.team}
                        </span>
                        <span className="text-white/30 text-xs flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {role.location}
                        </span>
                        <span className="text-white/30 text-xs flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {role.type}
                        </span>
                      </div>
                    </div>
                    <Link
                      href="/contact"
                      className="shrink-0 flex items-center gap-1.5 text-xs text-orange-400/70 hover:text-orange-400 font-medium transition-colors"
                    >
                      Apply <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                  <p className="text-white/35 text-xs leading-relaxed">{role.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* No match CTA */}
          <div className="rounded-2xl border border-white/8 bg-white/[.02] p-8 text-center">
            <p className="text-white/60 font-semibold text-base mb-2">Don&apos;t see a perfect fit?</p>
            <p className="text-white/30 text-sm mb-5">
              We are always looking for exceptional people. Send us your details and we&apos;ll keep you in mind for future roles.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/60 hover:text-white/80 text-sm font-medium px-5 py-2.5 rounded-lg transition-all"
            >
              Send a General Application <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>
      </div>
      <Footer />
    </>
  );
}
