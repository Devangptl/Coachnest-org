/**
 * /request-demo — Request a personalized product demo
 */
import type { Metadata } from "next";
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  MonitorPlay,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import RequestDemoForm from "@/components/demo/RequestDemoForm";

export const metadata: Metadata = {
  title: "Request a Demo — Coachnest",
  description:
    "See Coachnest in action. Book a personalized 30–45 minute demo with a product specialist covering course delivery, payments, gamification, and more.",
};

const DEMO_HIGHLIGHTS = [
  "Live walkthrough tailored to your use case",
  "Course creation, delivery & lesson player",
  "Razorpay payments & instructor revenue splits",
  "Gamification engine: XP, badges & leaderboards",
  "Community tools: forums, groups & peer review",
  "Admin analytics & reporting deep-dive",
];

const STEPS = [
  {
    icon: CalendarCheck,
    title: "Submit your request",
    detail: "Tell us about your team and what you want to see.",
  },
  {
    icon: Clock,
    title: "We confirm within 1 business day",
    detail: "A specialist emails you a calendar invite with a meeting link.",
  },
  {
    icon: MonitorPlay,
    title: "Join your live demo",
    detail: "A focused 30–45 minute session with time for your questions.",
  },
];

export default function RequestDemoPage() {
  return (
    <div className="min-h-screen">
      {/* ─── Hero ─────────────────────────────────────────────────── */}
      <section className="relative pt-8 pb-16 overflow-hidden">
        <div className="absolute inset-0 hero-dot-grid opacity-40 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-orange-600/[.06] rounded-full blur-[120px] pointer-events-none" />

        <div className="relative mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-[#d97757]/20 text-orange-500 text-xs font-semibold mb-6">
            <MonitorPlay className="w-3.5 h-3.5" />
            Live Product Demo
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground mb-4">
            See Coachnest{" "}
            <span className="hero-gradient-text">in Action</span>
          </h1>
          <p className="text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
            Book a personalized walkthrough with a product specialist. We&apos;ll show
            you exactly how Coachnest fits your team — no slides, just the real product.
          </p>
        </div>
      </section>

      {/* ─── Main Form + Sidebar ──────────────────────────────────── */}
      <section className="mx-auto px-4 sm:px-6 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">

          {/* Sidebar */}
          <div className="lg:col-span-2 space-y-4">
            {/* What you'll see */}
            <div className="rounded-md border border-border/60 bg-secondary/20 p-6">
              <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-500" />
                What You&apos;ll See
              </h2>
              <ul className="space-y-3">
                {DEMO_HIGHLIGHTS.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* How it works */}
            <div className="rounded-md border border-border/60 bg-secondary/20 p-6">
              <h2 className="text-base font-bold text-foreground mb-4">How It Works</h2>
              <div className="space-y-4">
                {STEPS.map(({ icon: StepIcon, title, detail }, i) => (
                  <div key={title} className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                      <StepIcon className="w-4 h-4 text-orange-500" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">
                        {i + 1}. {title}
                      </h4>
                      <p className="text-muted-foreground text-xs leading-relaxed mt-0.5">
                        {detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Trust strip */}
            <div className="rounded-md border border-orange-500/20 bg-orange-500/5 p-5 space-y-3">
              <div className="flex gap-3 items-center">
                <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <p className="text-foreground text-sm font-semibold">Built for Teams of Any Size</p>
                  <p className="text-muted-foreground text-xs">From solo creators to enterprise academies</p>
                </div>
              </div>
              <div className="flex gap-3 items-center">
                <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <p className="text-foreground text-sm font-semibold">No Commitment Required</p>
                  <p className="text-muted-foreground text-xs">Just a conversation — no credit card, no pressure</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-3">
            <RequestDemoForm />
          </div>

        </div>
      </section>
    </div>
  );
}
