import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquare, Users, Trophy, BookOpen, ArrowRight, Star } from "lucide-react";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Community — CoachNest",
  description:
    "Join the CoachNest learner community — ask questions, share progress, and grow together.",
};

const CHANNELS = [
  {
    icon: MessageSquare,
    title: "General Discussion",
    desc: "Introduce yourself, share what you're learning, and connect with fellow students.",
    members: "12.4k",
  },
  {
    icon: BookOpen,
    title: "Course Q&A",
    desc: "Get help from instructors and peers on any course-related questions.",
    members: "8.9k",
  },
  {
    icon: Trophy,
    title: "Wins & Milestones",
    desc: "Celebrate completions, new jobs, and personal achievements with the community.",
    members: "5.2k",
  },
  {
    icon: Users,
    title: "Study Groups",
    desc: "Find accountability partners and study groups for specific courses or topics.",
    members: "3.7k",
  },
];

const HIGHLIGHTS = [
  {
    name: "Sarah K.",
    initials: "SK",
    quote: "The community helped me land my first dev job. I got feedback on my portfolio from people who had just done the same thing.",
    course: "Full-Stack Web Dev",
  },
  {
    name: "Marcus T.",
    initials: "MT",
    quote: "Study groups here are underrated. My group finished the React course together in 3 weeks and we all held each other accountable.",
    course: "Advanced React",
  },
  {
    name: "Aisha B.",
    initials: "AB",
    quote: "Instructors actually respond to questions. I posted a question on a Monday and had a detailed answer by Tuesday morning.",
    course: "UI/UX Design",
  },
];

export default function CommunityPage() {
  return (
    <>
      <div className="min-h-screen px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto py-16">

          {/* Hero */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-orange-500/20 bg-orange-500/5 text-orange-400/80 text-xs font-medium mb-6">
              <Users className="w-3 h-3" /> 50,000+ members
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-5 leading-tight">
              Learn better,<br />
              <span className="text-white/40">together.</span>
            </h1>
            <p className="text-white/40 text-lg leading-relaxed max-w-xl mx-auto">
              The CoachNest community is where learning continues outside the course player —
              ask questions, share work, find study partners, and celebrate wins.
            </p>
          </div>

          {/* Community channels */}
          <div className="mb-16">
            <h2 className="text-xl font-bold text-white mb-6">Community Channels</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {CHANNELS.map(({ icon: Icon, title, desc, members }) => (
                <div key={title} className="rounded-xl border border-white/8 bg-white/[.02] hover:bg-white/[.04] hover:border-white/15 p-6 group transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-orange-400/70" />
                    </div>
                    <span className="text-white/25 text-xs">{members} members</span>
                  </div>
                  <p className="text-white/75 font-semibold text-sm mb-1.5 group-hover:text-white transition-colors">{title}</p>
                  <p className="text-white/35 text-xs leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonials */}
          <div className="mb-16">
            <h2 className="text-xl font-bold text-white mb-6">What members say</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {HIGHLIGHTS.map((item) => (
                <div key={item.name} className="rounded-xl border border-white/8 bg-white/[.02] p-5">
                  <div className="flex items-center gap-1 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-orange-400/60 text-orange-400/60" />
                    ))}
                  </div>
                  <p className="text-white/45 text-xs leading-relaxed mb-4">&ldquo;{item.quote}&rdquo;</p>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400/70 text-xs font-bold">
                      {item.initials}
                    </div>
                    <div>
                      <p className="text-white/60 text-xs font-medium">{item.name}</p>
                      <p className="text-white/25 text-[10px]">{item.course}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* How to join */}
          <div className="rounded-2xl border border-white/8 bg-white/[.02] p-8 sm:p-10 mb-8">
            <h2 className="text-xl font-bold text-white mb-5">How to join</h2>
            <div className="space-y-4">
              {[
                { step: "01", title: "Create your free account", desc: "Sign up in under 30 seconds — no credit card required." },
                { step: "02", title: "Enrol in any course", desc: "Free and paid courses both come with full community access." },
                { step: "03", title: "Join the discussion", desc: "Introduce yourself, ask questions, and find your people." },
              ].map((item) => (
                <div key={item.step} className="flex gap-4">
                  <span className="text-orange-400/40 font-bold text-sm w-8 shrink-0 pt-0.5">{item.step}</span>
                  <div>
                    <p className="text-white/70 font-medium text-sm">{item.title}</p>
                    <p className="text-white/35 text-xs leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signup"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium px-6 py-3 rounded-lg transition-colors"
            >
              Join for Free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/courses"
              className="w-full sm:w-auto flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 text-white/55 hover:text-white/75 text-sm font-medium px-6 py-3 rounded-lg transition-colors"
            >
              Browse Courses
            </Link>
          </div>

        </div>
      </div>
      <Footer />
    </>
  );
}
