/**
 * "Why Coachnest" bento grid — professional SaaS feature section with
 * mini product visuals built from styled divs (no images, theme-aware).
 */
import FadeInSection from "@/components/landing/FadeInSection";
import {
  BookOpen, Zap, Target, Award, TrendingUp, Shield,
  CheckCircle2, Circle, Star, Flame,
} from "lucide-react";

export default function FeatureBento() {
  return (
    <section className="py-24 px-4 sm:px-6 md:px-7 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <FadeInSection>
          <div className="text-center mb-14">
            <span className="inline-flex items-center gap-2 bg-orange-500/[0.07] border border-orange-500/20 text-[#d97757] text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
              Why Coachnest
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 tracking-tight">
              Everything you need to <span className="text-[#d97757]">level up</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg">
              A platform built from the ground up with features that make learning
              effective, engaging, and enjoyable.
            </p>
          </div>
        </FadeInSection>

        <div className="grid md:grid-cols-3 gap-5">
          {/* ── Expert-crafted content (wide) ─────────────────────── */}
          <FadeInSection className="md:col-span-2">
            <div className="group h-full rounded-xl border border-border bg-card p-6 sm:p-7 hover:border-orange-500/30 transition-colors overflow-hidden">
              <div className="grid sm:grid-cols-2 gap-6 items-center h-full">
                <div>
                  <div className="w-11 h-11 rounded-lg bg-orange-500/10 flex items-center justify-center mb-4">
                    <BookOpen className="w-5 h-5 text-[#d97757]" />
                  </div>
                  <h3 className="text-foreground font-semibold text-lg mb-2">
                    Expert-crafted courses
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Every course is reviewed, structured, and optimized for clarity.
                    Learn from industry professionals who practice what they teach.
                  </p>
                </div>
                {/* Mini visual: stacked course rows */}
                <div aria-hidden="true" className="space-y-2 select-none">
                  {[
                    { title: "React Mastery", meta: "24 lessons · 4.9", active: true },
                    { title: "UI/UX Design", meta: "18 lessons · 4.8", active: false },
                    { title: "SQL & Databases", meta: "16 lessons · 4.7", active: false },
                  ].map((row) => (
                    <div
                      key={row.title}
                      className={`flex items-center gap-3 rounded-lg border p-2.5 transition-colors ${
                        row.active
                          ? "border-orange-500/30 bg-orange-500/[0.06]"
                          : "border-border bg-secondary/30"
                      }`}
                    >
                      <div className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-foreground text-[11px] font-semibold truncate">{row.title}</p>
                        <p className="text-muted-foreground text-[10px] flex items-center gap-1">
                          {row.meta} <Star className="w-2.5 h-2.5 text-amber-400 fill-current" />
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FadeInSection>

          {/* ── Interactive quizzes ───────────────────────────────── */}
          <FadeInSection delay={0.08}>
            <div className="group h-full rounded-xl border border-border bg-card p-6 sm:p-7 hover:border-orange-500/30 transition-colors flex flex-col">
              <div className="w-11 h-11 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
                <Target className="w-5 h-5 text-blue-500" />
              </div>
              <h3 className="text-foreground font-semibold text-lg mb-2">Interactive quizzes</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-5">
                Test your knowledge after each section and reinforce learning in real time.
              </p>
              {/* Mini visual: quiz answer options */}
              <div aria-hidden="true" className="mt-auto space-y-1.5 select-none">
                {[
                  { text: "useEffect runs after render", state: "correct" },
                  { text: "useEffect blocks painting", state: "idle" },
                ].map((opt) => (
                  <div
                    key={opt.text}
                    className={`flex items-center gap-2 rounded-md border px-2.5 py-2 text-[11px] ${
                      opt.state === "correct"
                        ? "border-emerald-500/40 bg-emerald-500/[0.08] text-foreground"
                        : "border-border bg-secondary/30 text-muted-foreground"
                    }`}
                  >
                    {opt.state === "correct" ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
                    )}
                    {opt.text}
                  </div>
                ))}
              </div>
            </div>
          </FadeInSection>

          {/* ── Verified certificates ─────────────────────────────── */}
          <FadeInSection delay={0.08}>
            <div className="group h-full rounded-xl border border-border bg-card p-6 sm:p-7 hover:border-orange-500/30 transition-colors flex flex-col">
              <div className="w-11 h-11 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4">
                <Award className="w-5 h-5 text-emerald-500" />
              </div>
              <h3 className="text-foreground font-semibold text-lg mb-2">Verified certificates</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-5">
                Earn shareable PDF certificates with unique verification codes on completion.
              </p>
              {/* Mini visual: certificate card */}
              <div
                aria-hidden="true"
                className="mt-auto rounded-lg border border-border bg-secondary/30 p-3.5 text-center select-none"
              >
                <div className="w-8 h-8 mx-auto rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mb-2">
                  <Award className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-foreground text-[11px] font-semibold">Certificate of Completion</p>
                <p className="text-muted-foreground text-[10px] mt-0.5">ID · CN-8F2K-2026</p>
                <div className="mt-2 h-px bg-border" />
                <p className="text-muted-foreground text-[9px] mt-2 uppercase tracking-widest">Verified by Coachnest</p>
              </div>
            </div>
          </FadeInSection>

          {/* ── Progress tracking (wide) ──────────────────────────── */}
          <FadeInSection delay={0.08} className="md:col-span-2">
            <div className="group h-full rounded-xl border border-border bg-card p-6 sm:p-7 hover:border-orange-500/30 transition-colors overflow-hidden">
              <div className="grid sm:grid-cols-2 gap-6 items-center h-full">
                <div>
                  <div className="w-11 h-11 rounded-lg bg-orange-500/10 flex items-center justify-center mb-4">
                    <TrendingUp className="w-5 h-5 text-[#d97757]" />
                  </div>
                  <h3 className="text-foreground font-semibold text-lg mb-2">
                    Progress tracking &amp; streaks
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Visual dashboards, XP, and daily streaks keep you motivated. Pick up
                    exactly where you left off — progress saves automatically.
                  </p>
                </div>
                {/* Mini visual: progress bars + streak */}
                <div aria-hidden="true" className="space-y-3 select-none">
                  {[
                    { label: "React Mastery", value: 65 },
                    { label: "UI/UX Design", value: 38 },
                  ].map((bar) => (
                    <div key={bar.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-foreground font-medium">{bar.label}</span>
                        <span className="text-[10px] text-muted-foreground">{bar.value}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-border overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-orange-600 to-orange-400"
                          style={{ width: `${bar.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 rounded-lg border border-orange-500/20 bg-orange-500/[0.06] px-3 py-2">
                    <Flame className="w-4 h-4 text-[#d97757]" />
                    <span className="text-[11px] text-foreground font-semibold">12-day streak</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">+10 XP daily</span>
                  </div>
                </div>
              </div>
            </div>
          </FadeInSection>

          {/* ── Bottom row: three compact features ────────────────── */}
          {[
            {
              icon: Zap,
              title: "Bite-sized lessons",
              desc: "Micro-lessons that fit your schedule — finish one in 5–15 minutes.",
              color: "text-amber-500",
              bg: "bg-amber-500/10",
            },
            {
              icon: Shield,
              title: "Lifetime access",
              desc: "Buy once, learn forever. All future course updates included free.",
              color: "text-pink-500",
              bg: "bg-pink-500/10",
            },
            {
              icon: TrendingUp,
              title: "Career-focused paths",
              desc: "Curated playlists take you from fundamentals to job-ready skills.",
              color: "text-violet-500",
              bg: "bg-violet-500/10",
            },
          ].map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <FadeInSection key={feature.title} delay={0.1 + idx * 0.06}>
                <div className="group h-full rounded-xl border border-border bg-card p-6 hover:border-orange-500/30 transition-colors">
                  <div className={`w-10 h-10 rounded-lg ${feature.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-5 h-5 ${feature.color}`} />
                  </div>
                  <h3 className="text-foreground font-semibold text-base mb-1.5">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
                </div>
              </FadeInSection>
            );
          })}
        </div>
      </div>
    </section>
  );
}
