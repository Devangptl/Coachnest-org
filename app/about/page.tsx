import type { Metadata } from "next";
import Link from "next/link";
import { Users, Target, Lightbulb, Globe, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "About Us — Coachnest",
  description:
    "Learn about Coachnest's mission to make world-class education accessible to everyone.",
};

const VALUES = [
  {
    icon: Target,
    title: "Outcome-Focused",
    desc: "Every course is designed with a clear goal in mind — real skills you can apply from day one.",
  },
  {
    icon: Users,
    title: "Community-Driven",
    desc: "Learning is better together. Our platform fosters collaboration between students and instructors.",
  },
  {
    icon: Lightbulb,
    title: "Always Improving",
    desc: "We continuously update our content and platform based on learner feedback and industry trends.",
  },
  {
    icon: Globe,
    title: "Globally Accessible",
    desc: "World-class education shouldn't be limited by geography. We make it available everywhere.",
  },
];

const STATS = [
  { value: "399+", label: "Active Learners" },
  { value: "29+", label: "Expert Courses" },
  { value: "15+", label: "Instructors" },
  { value: "98%", label: "Satisfaction Rate" },
];

const TEAM = [
  { name: "Devang Patel", role: "Co-Founder & CEO", initials: "DP" },
  // { name: "Priya Sharma", role: "Co-Founder & CTO", initials: "PS" },
  // { name: "James Okafor", role: "Head of Content", initials: "JO" },
  // { name: "Sofia Chen", role: "Head of Design", initials: "SC" },
];

export default function AboutPage() {
  return (
    <>
      <div className="min-h-screen px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto py-16">

          {/* Hero */}
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-orange-500/20 bg-orange-500/5 text-[#d97757]/80 text-xs font-medium mb-6">
              Our Story
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6 leading-tight">
              We believe great education<br />
              <span className="text-white/40">changes everything.</span>
            </h1>
            <p className="text-white/40 text-lg leading-relaxed max-w-2xl mx-auto">
              Coachnest was founded in 2026 with a single mission: to make expert-level
              learning accessible to every developer, designer, and creator on the planet —
              regardless of where they live or what they can afford.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-20">
            {STATS.map((stat) => (
              <div key={stat.label} className="rounded-md border border-white/8 bg-white/[.02] p-6 text-center">
                <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
                <p className="text-white/35 text-sm">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Mission */}
          <div className="rounded-md border border-white/8 bg-white/[.02] p-8 sm:p-12 mb-20">
            <h2 className="text-2xl font-bold text-white mb-4">Our Mission</h2>
            <p className="text-white/45 text-base leading-relaxed mb-4">
              The traditional education system was not built for the pace of modern technology. By the time a curriculum is written, approved, and taught, the industry has already moved on. We built Coachnest to close that gap.
            </p>
            <p className="text-white/45 text-base leading-relaxed">
              We partner with working professionals — engineers at top tech companies, award-winning designers, successful entrepreneurs — and give them the tools to share their knowledge with the world. The result is a library of courses that reflect how the industry actually works today, not how a textbook describes it.
            </p>
          </div>

          {/* Values */}
          <div className="mb-20">
            <h2 className="text-2xl font-bold text-white mb-8 text-center">What We Stand For</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {VALUES.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="rounded-md border border-white/8 bg-white/[.02] p-6 flex gap-4">
                  <div className="w-10 h-10 rounded-md bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-[#d97757]/70" />
                  </div>
                  <div>
                    <p className="text-white/80 font-semibold text-sm mb-1">{title}</p>
                    <p className="text-white/35 text-sm leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Team */}
          <div className="mb-20">
            <h2 className="text-2xl font-bold text-white mb-8 text-center">The Team</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {TEAM.map((member) => (
                <div key={member.name} className="rounded-md border border-white/8 bg-white/[.02] p-5 text-center">
                  <div className="w-14 h-14 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-[#d97757]/70 font-bold text-base mx-auto mb-3">
                    {member.initials}
                  </div>
                  <p className="text-white/75 font-medium text-sm">{member.name}</p>
                  <p className="text-white/30 text-xs mt-0.5">{member.role}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="rounded-md border border-white/8 bg-gradient-to-br from-orange-500/5 to-transparent p-8 sm:p-12 text-center">
            <h2 className="text-2xl font-bold text-white mb-3">Join our community</h2>
            <p className="text-white/40 text-sm mb-6">Start learning today or share your expertise as an instructor.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/courses"
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
              >
                Browse Courses <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/contact"
                className="flex items-center gap-2 border border-white/10 hover:border-white/20 text-white/60 hover:text-white/80 text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
              >
                Get in Touch
              </Link>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
