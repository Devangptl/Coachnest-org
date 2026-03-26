/**
 * Home page — marketing landing page with hero, features, stats, testimonials,
 * categories, courses, how-it-works, FAQ, instructor CTA, and final CTA.
 * Server Component: fetches data; delegates animations to client components.
 */
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import CourseCard from "@/components/CourseCard";
import GlassCard from "@/components/GlassCard";
import HeroBackground from "@/components/landing/HeroBackground";
import RotatingWords from "@/components/landing/RotatingWords";
import FadeInSection from "@/components/landing/FadeInSection";
import AnimatedCounter from "@/components/landing/AnimatedCounter";
import TestimonialCard from "@/components/landing/TestimonialCard";
import FAQItem from "@/components/landing/FAQItem";
import StaggerChildren, { StaggerItem } from "@/components/landing/StaggerChildren";
import {
  BookOpen, Zap, Users, Award, ArrowRight, Play, Shield, Clock,
  TrendingUp, Globe, Code, Palette, Database, Smartphone, Brain,
  BarChart3, Sparkles, CheckCircle2, GraduationCap, Target,
  MessageSquare, HeartHandshake, ChevronRight, Star,
} from "lucide-react";

const getFeaturedCourses = unstable_cache(
  () =>
    prisma.course.findMany({
      where: { status: "PUBLISHED" },
      take: 6,
      include: {
        createdBy: { select: { name: true } },
        _count: { select: { lessons: true, enrollments: true } },
        reviews: { select: { rating: true } },
      },
      orderBy: { enrollments: { _count: "desc" } },
    }),
  ["landing-featured-courses"],
  { revalidate: 300 }
);

const getCategories = unstable_cache(
  () =>
    prisma.category.findMany({
      include: { _count: { select: { courses: true } } },
      orderBy: { courses: { _count: "desc" } },
      take: 8,
    }),
  ["landing-categories"],
  { revalidate: 300 }
);

const getStats = unstable_cache(
  async () => {
    const [courseCount, studentCount, enrollmentCount, reviewCount] = await Promise.all([
      prisma.course.count({ where: { status: "PUBLISHED" } }),
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.enrollment.count(),
      prisma.review.count(),
    ]);
    return { courseCount, studentCount, enrollmentCount, reviewCount };
  },
  ["landing-stats"],
  { revalidate: 300 }
);

const CATEGORY_ICONS: Record<string, typeof Code> = {
  "web-development": Globe,
  react: Code,
  design: Palette,
  database: Database,
  mobile: Smartphone,
  ai: Brain,
  analytics: BarChart3,
  default: BookOpen,
};

const CATEGORY_COLORS: Record<string, string> = {
  "web-development": "from-violet-500 to-purple-600",
  react: "from-cyan-500 to-blue-600",
  design: "from-pink-500 to-rose-600",
  database: "from-emerald-500 to-green-600",
  mobile: "from-orange-500 to-amber-600",
  ai: "from-indigo-500 to-violet-600",
  analytics: "from-teal-500 to-cyan-600",
  default: "from-slate-500 to-gray-600",
};

export default async function HomePage() {
  const [courses, categories, stats] = await Promise.all([
    getFeaturedCourses(),
    getCategories(),
    getStats(),
  ]);

  return (
    <div className="overflow-hidden">
      {/* ═══════════════════════════════════════════════════════════════════════════
          HERO SECTION
      ═══════════════════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-[100vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 -mt-24 pt-24">
        <HeroBackground />

        <div className="max-w-6xl mx-auto text-center relative z-10 py-10">
          {/* ── Announcement badge ────────────────────────────────────── */}
          <FadeInSection delay={0}>
            <div className="inline-flex items-center gap-2.5 bg-white/[0.07] border border-white/[0.12] rounded-full pl-2 pr-4 py-1.5 text-sm backdrop-blur-md mb-10 group hover:bg-white/[0.1] hover:border-white/20 transition-all cursor-default">
              <span className="bg-gradient-to-r from-violet-500 to-purple-500 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                New
              </span>
              <span className="text-white/60 text-sm">
                AI-powered course recommendations are here
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all" />
            </div>
          </FadeInSection>

          {/* ── Main heading with rotating words ─────────────────────── */}
          <FadeInSection delay={0.1}>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-[5.5rem] font-bold text-white leading-[1.08] mb-8 tracking-tight">
              Learn{" "}
              <RotatingWords
                words={["Development", "Design", "AI & ML", "DevOps", "Data Science"]}
                className="min-w-[200px] sm:min-w-[280px] lg:min-w-[360px] justify-center"
              />
              <br />
              <span className="hero-gradient-text">
                without limits
              </span>
            </h1>
          </FadeInSection>

          {/* ── Subheading ───────────────────────────────────────────── */}
          <FadeInSection delay={0.2}>
            <p className="text-lg sm:text-xl text-white/45 max-w-2xl mx-auto mb-12 leading-relaxed">
              Expert-crafted courses with interactive quizzes, progress tracking, and
              verified certificates. Join thousands of learners accelerating their careers.
            </p>
          </FadeInSection>

          {/* ── CTA buttons ──────────────────────────────────────────── */}
          <FadeInSection delay={0.3}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-5">
              <Link
                href="/courses"
                className="hero-cta-ring bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold text-base px-10 py-4 rounded-2xl hover:from-violet-600 hover:to-purple-700 transition-all shadow-xl shadow-purple-500/25 hover:shadow-purple-500/40 hover:-translate-y-0.5 inline-flex items-center justify-center gap-2.5"
              >
                Explore Courses <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/signup"
                className="backdrop-blur-sm bg-white/[0.07] border border-white/[0.15] text-white/80 hover:text-white font-medium text-base px-10 py-4 rounded-2xl hover:bg-white/[0.12] hover:border-white/25 transition-all inline-flex items-center justify-center gap-2.5 hover:-translate-y-0.5"
              >
                <Play className="w-5 h-5" /> Start for Free
              </Link>
            </div>
            <p className="text-white/25 text-sm">No credit card required · Free courses available · Cancel anytime</p>
          </FadeInSection>

          {/* ── Social proof: avatar stack + text ────────────────────── */}
          <FadeInSection delay={0.45}>
            <div className="mt-12 flex items-center justify-center gap-4">
              {/* Avatar stack */}
              <div className="flex -space-x-2.5">
                {["S", "R", "A", "P", "M"].map((letter, i) => (
                  <div
                    key={i}
                    className="w-9 h-9 rounded-full border-2 border-[#0f0c29] flex items-center justify-center text-white text-xs font-bold avatar-glow"
                    style={{
                      background: [
                        "linear-gradient(135deg, #7c3aed, #a855f7)",
                        "linear-gradient(135deg, #2563eb, #06b6d4)",
                        "linear-gradient(135deg, #ec4899, #f43f5e)",
                        "linear-gradient(135deg, #10b981, #14b8a6)",
                        "linear-gradient(135deg, #f59e0b, #ef4444)",
                      ][i],
                      animationDelay: `${i * 0.3}s`,
                    }}
                  >
                    {letter}
                  </div>
                ))}
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                  ))}
                  <span className="text-white/50 text-xs ml-1">4.9</span>
                </div>
                <p className="text-white/35 text-xs mt-0.5">
                  Loved by <span className="text-white/55 font-medium">10,000+</span> students
                </p>
              </div>
            </div>
          </FadeInSection>

          {/* ── Stat cards ───────────────────────────────────────────── */}
          <FadeInSection delay={0.55}>
            <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-3xl mx-auto">
              {[
                { value: Math.max(stats.courseCount, 50), suffix: "+", label: "Courses", icon: BookOpen, gradient: "from-violet-500/20 to-purple-500/10" },
                { value: Math.max(stats.studentCount, 10000), suffix: "+", label: "Students", icon: Users, gradient: "from-blue-500/20 to-cyan-500/10" },
                { value: Math.max(stats.enrollmentCount, 25000), suffix: "+", label: "Enrollments", icon: TrendingUp, gradient: "from-emerald-500/20 to-teal-500/10" },
                { value: Math.max(stats.reviewCount, 5000), suffix: "+", label: "Reviews", icon: Star, gradient: "from-amber-500/20 to-yellow-500/10" },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className={`backdrop-blur-md bg-gradient-to-br ${stat.gradient} border border-white/[0.08] rounded-2xl p-4 sm:p-5 text-center hover:border-white/[0.15] transition-all group`}
                  >
                    <Icon className="w-5 h-5 text-white/30 mx-auto mb-2 group-hover:text-white/50 transition-colors" />
                    <div className="text-2xl sm:text-3xl font-bold text-white mb-0.5">
                      <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                    </div>
                    <div className="text-white/35 text-xs">{stat.label}</div>
                  </div>
                );
              })}
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════════
          TRUSTED BY / SOCIAL PROOF BAR
      ═══════════════════════════════════════════════════════════════════════════ */}
      <section className="relative py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInSection>
            <p className="text-center text-white/30 text-sm uppercase tracking-widest mb-8">
              Trusted by learners from top companies
            </p>
            <div className="flex flex-wrap justify-center items-center gap-8 sm:gap-16">
              {["Google", "Microsoft", "Amazon", "Meta", "Apple", "Netflix"].map((company) => (
                <span key={company} className="text-white/20 font-bold text-xl sm:text-2xl tracking-wider hover:text-white/40 transition-colors">
                  {company}
                </span>
              ))}
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════════
          WHY LEARNHUB — 6 feature cards
      ═══════════════════════════════════════════════════════════════════════════ */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <FadeInSection>
            <div className="text-center mb-16">
              <span className="inline-block text-purple-400 text-sm font-semibold uppercase tracking-widest mb-3">
                Why LearnHub
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                Everything you need to{" "}
                <span className="text-purple-400">level up</span>
              </h2>
              <p className="text-white/40 max-w-2xl mx-auto text-lg">
                A platform built from the ground up with features that make learning effective, engaging, and enjoyable.
              </p>
            </div>
          </FadeInSection>

          <StaggerChildren className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" staggerDelay={0.08}>
            {[
              {
                icon: BookOpen,
                title: "Expert-Crafted Content",
                desc: "Every course is reviewed, structured, and optimized for clarity. Learn from industry professionals who practice what they teach.",
                color: "text-violet-400",
                bg: "bg-violet-500/10",
              },
              {
                icon: Zap,
                title: "Bite-Sized Lessons",
                desc: "Micro-lessons designed to fit your schedule. Complete a lesson in 5-15 minutes during your commute or lunch break.",
                color: "text-yellow-400",
                bg: "bg-yellow-500/10",
              },
              {
                icon: Target,
                title: "Interactive Quizzes",
                desc: "Test your knowledge with built-in quizzes after each section. Reinforce learning and track comprehension in real-time.",
                color: "text-blue-400",
                bg: "bg-blue-500/10",
              },
              {
                icon: Award,
                title: "Verified Certificates",
                desc: "Earn downloadable PDF certificates upon course completion. Share your achievements on LinkedIn and your resume.",
                color: "text-emerald-400",
                bg: "bg-emerald-500/10",
              },
              {
                icon: TrendingUp,
                title: "Progress Tracking",
                desc: "Visual dashboards show your learning journey. Pick up exactly where you left off with automatic progress saving.",
                color: "text-orange-400",
                bg: "bg-orange-500/10",
              },
              {
                icon: Shield,
                title: "Lifetime Access",
                desc: "Buy once, learn forever. All course updates and new materials are included at no extra cost.",
                color: "text-pink-400",
                bg: "bg-pink-500/10",
              },
            ].map((feature) => {
              const Icon = feature.icon;
              return (
                <StaggerItem key={feature.title}>
                  <GlassCard className="group text-left h-full">
                    <div className={`w-12 h-12 rounded-2xl ${feature.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <Icon className={`w-6 h-6 ${feature.color}`} />
                    </div>
                    <h3 className="text-white font-semibold text-lg mb-2">{feature.title}</h3>
                    <p className="text-white/45 text-sm leading-relaxed">
                      {feature.desc}
                    </p>
                  </GlassCard>
                </StaggerItem>
              );
            })}
          </StaggerChildren>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════════
          HOW IT WORKS — 4-step process
      ═══════════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-900/5 to-transparent" />
        <div className="max-w-6xl mx-auto relative">
          <FadeInSection>
            <div className="text-center mb-16">
              <span className="inline-block text-purple-400 text-sm font-semibold uppercase tracking-widest mb-3">
                How It Works
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                Start learning in{" "}
                <span className="text-purple-400">4 simple steps</span>
              </h2>
              <p className="text-white/40 max-w-xl mx-auto text-lg">
                From sign-up to certificate — your learning journey made simple.
              </p>
            </div>
          </FadeInSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                step: "01",
                icon: Users,
                title: "Create Account",
                desc: "Sign up for free in under 30 seconds. No credit card required.",
                color: "from-violet-500 to-purple-600",
              },
              {
                step: "02",
                icon: BookOpen,
                title: "Browse Courses",
                desc: "Explore our curated library. Filter by topic, level, and price.",
                color: "from-blue-500 to-cyan-600",
              },
              {
                step: "03",
                icon: Play,
                title: "Learn at Your Pace",
                desc: "Watch videos, read lessons, and take quizzes. Track your progress.",
                color: "from-emerald-500 to-teal-600",
              },
              {
                step: "04",
                icon: GraduationCap,
                title: "Earn Certificate",
                desc: "Complete the course and download your verified certificate.",
                color: "from-orange-500 to-pink-600",
              },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <FadeInSection key={item.step} delay={idx * 0.12}>
                  <div className="relative text-center group">
                    {/* Connecting line */}
                    {idx < 3 && (
                      <div className="hidden lg:block absolute top-10 left-[60%] w-[80%] h-px bg-gradient-to-r from-white/20 to-transparent" />
                    )}
                    {/* Step circle */}
                    <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mx-auto mb-5 shadow-lg group-hover:scale-110 transition-transform`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <span className="text-white/20 text-xs font-bold uppercase tracking-widest">
                      Step {item.step}
                    </span>
                    <h3 className="text-white font-semibold text-lg mt-2 mb-2">{item.title}</h3>
                    <p className="text-white/40 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </FadeInSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════════
          BROWSE BY CATEGORY
      ═══════════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <FadeInSection>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-12 gap-4">
              <div>
                <span className="inline-block text-purple-400 text-sm font-semibold uppercase tracking-widest mb-3">
                  Categories
                </span>
                <h2 className="text-3xl sm:text-4xl font-bold text-white">
                  Browse by category
                </h2>
                <p className="text-white/40 mt-2">Find the perfect course for your goals.</p>
              </div>
              <Link
                href="/courses"
                className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1 transition-colors"
              >
                View all courses <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </FadeInSection>

          <StaggerChildren className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4" staggerDelay={0.06}>
            {(categories.length > 0
              ? categories.map((cat) => ({
                  name: cat.name,
                  slug: cat.slug,
                  count: cat._count.courses,
                  icon: cat.icon,
                }))
              : [
                  { name: "Web Development", slug: "web-development", count: 12, icon: null },
                  { name: "React & Next.js", slug: "react", count: 8, icon: null },
                  { name: "UI/UX Design", slug: "design", count: 6, icon: null },
                  { name: "Databases", slug: "database", count: 5, icon: null },
                  { name: "Mobile Dev", slug: "mobile", count: 4, icon: null },
                  { name: "AI & ML", slug: "ai", count: 7, icon: null },
                  { name: "Data Analytics", slug: "analytics", count: 3, icon: null },
                  { name: "DevOps", slug: "default", count: 4, icon: null },
                ]
            ).map((cat) => {
              const IconComponent = CATEGORY_ICONS[cat.slug] ?? CATEGORY_ICONS.default;
              const gradient = CATEGORY_COLORS[cat.slug] ?? CATEGORY_COLORS.default;
              return (
                <StaggerItem key={cat.slug}>
                  <Link
                    href={`/courses?category=${cat.slug}`}
                    className="group block backdrop-blur-lg bg-white/[0.05] border border-white/10 rounded-2xl p-5 hover:bg-white/[0.1] hover:border-white/20 transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg`}>
                      {cat.icon ? (
                        <span className="text-xl">{cat.icon}</span>
                      ) : (
                        <IconComponent className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <h3 className="text-white font-semibold text-sm mb-1">{cat.name}</h3>
                    <p className="text-white/30 text-xs">{cat.count} course{cat.count !== 1 ? "s" : ""}</p>
                  </Link>
                </StaggerItem>
              );
            })}
          </StaggerChildren>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════════
          FEATURED COURSES
      ═══════════════════════════════════════════════════════════════════════════ */}
      {courses.length > 0 && (
        <section className="py-24 px-4 sm:px-6 lg:px-8 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-900/5 to-transparent" />
          <div className="max-w-7xl mx-auto relative">
            <FadeInSection>
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-12 gap-4">
                <div>
                  <span className="inline-block text-purple-400 text-sm font-semibold uppercase tracking-widest mb-3">
                    Popular Courses
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-bold text-white">
                    Featured courses
                  </h2>
                  <p className="text-white/40 mt-2">
                    Hand-picked by our instructors. Start with the most popular.
                  </p>
                </div>
                <Link
                  href="/courses"
                  className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1 transition-colors"
                >
                  View all <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </FadeInSection>

            <StaggerChildren className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" staggerDelay={0.08}>
              {courses.map((course) => {
                const avg = course.reviews.length
                  ? Number((course.reviews.reduce((s, r) => s + r.rating, 0) / course.reviews.length).toFixed(1))
                  : 0;
                return (
                  <StaggerItem key={course.id}>
                    <CourseCard
                      id={course.id}
                      title={course.title}
                      description={course.description}
                      thumbnail={course.thumbnail}
                      instructorName={course.createdBy.name}
                      price={course.price ? Number(course.price) : null}
                      discountPrice={course.discountPrice ? Number(course.discountPrice) : null}
                      isFree={course.isFree}
                      level={course.level}
                      totalLessons={course._count.lessons}
                      enrollmentCount={course._count.enrollments}
                      avgRating={avg}
                      reviewCount={course.reviews.length}
                    />
                  </StaggerItem>
                );
              })}
            </StaggerChildren>

            {courses.length >= 6 && (
              <FadeInSection>
                <div className="text-center mt-12">
                  <Link href="/courses" className="btn-secondary px-8 py-3">
                    Browse All Courses <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </FadeInSection>
            )}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          BIG STATS SECTION
      ═══════════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-6xl mx-auto">
          <div className="backdrop-blur-lg bg-gradient-to-br from-violet-500/10 to-purple-600/10 border border-white/10 rounded-3xl p-10 sm:p-16 relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px]" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/10 rounded-full blur-[80px]" />

            <div className="relative grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
              {[
                { end: Math.max(stats.courseCount, 50), suffix: "+", label: "Expert Courses", icon: BookOpen, color: "text-violet-400" },
                { end: Math.max(stats.studentCount, 10000), suffix: "+", label: "Active Students", icon: Users, color: "text-blue-400" },
                { end: Math.max(stats.enrollmentCount, 25000), suffix: "+", label: "Total Enrollments", icon: TrendingUp, color: "text-emerald-400" },
                { end: Math.max(stats.reviewCount, 5000), suffix: "+", label: "5-Star Reviews", icon: Star, color: "text-yellow-400" },
              ].map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <FadeInSection key={stat.label} delay={idx * 0.1}>
                    <div className="text-center">
                      <Icon className={`w-8 h-8 ${stat.color} mx-auto mb-3`} />
                      <div className="text-4xl sm:text-5xl font-bold text-white mb-2">
                        <AnimatedCounter end={stat.end} suffix={stat.suffix} />
                      </div>
                      <p className="text-white/40 text-sm">{stat.label}</p>
                    </div>
                  </FadeInSection>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════════
          LEARNING EXPERIENCE — Split section
      ═══════════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <FadeInSection direction="right">
              <span className="inline-block text-purple-400 text-sm font-semibold uppercase tracking-widest mb-3">
                Learning Experience
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                A learning experience{" "}
                <span className="text-purple-400">designed for you</span>
              </h2>
              <p className="text-white/45 text-lg leading-relaxed mb-8">
                Our platform adapts to your learning style. Whether you prefer video lessons,
                reading material, or hands-on quizzes, we have you covered.
              </p>
              <div className="space-y-4">
                {[
                  { text: "HD video lessons with code-along exercises", icon: Play },
                  { text: "Rich text lessons with syntax-highlighted code", icon: Code },
                  { text: "Interactive quizzes to reinforce concepts", icon: Target },
                  { text: "Downloadable certificates of completion", icon: Award },
                  { text: "Progress tracking across all your courses", icon: BarChart3 },
                  { text: "Mobile-friendly — learn anywhere, anytime", icon: Smartphone },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.text} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-purple-400" />
                      </div>
                      <span className="text-white/60 text-sm">{item.text}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-8">
                <Link href="/signup" className="btn-primary inline-flex items-center gap-2">
                  Start Learning Free <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </FadeInSection>

            <FadeInSection direction="left">
              <div className="relative">
                {/* Mock course viewer */}
                <div className="backdrop-blur-lg bg-white/[0.07] border border-white/15 rounded-2xl overflow-hidden shadow-2xl">
                  {/* Title bar */}
                  <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border-b border-white/10">
                    <div className="w-3 h-3 rounded-full bg-red-400/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
                    <div className="w-3 h-3 rounded-full bg-green-400/60" />
                    <span className="text-white/30 text-xs ml-2">LearnHub Course Viewer</span>
                  </div>
                  {/* Video placeholder */}
                  <div className="aspect-video bg-gradient-to-br from-violet-600/30 to-purple-800/30 flex items-center justify-center relative">
                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                      <Play className="w-7 h-7 text-white ml-1" />
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
                      <div className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full w-[35%] bg-gradient-to-r from-violet-500 to-purple-500 rounded-full" />
                      </div>
                      <span className="text-white/40 text-xs">3:24 / 9:45</span>
                    </div>
                  </div>
                  {/* Lesson info */}
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-white/50 text-xs">Lesson 4 of 12</span>
                    </div>
                    <h4 className="text-white font-semibold text-sm mb-1">Building Responsive Layouts</h4>
                    <p className="text-white/30 text-xs">Learn CSS Grid and Flexbox to create modern, responsive designs.</p>
                  </div>
                </div>

                {/* Floating progress card */}
                <div className="absolute -bottom-6 -right-6 backdrop-blur-lg bg-white/10 border border-white/20 rounded-xl p-4 shadow-xl w-48">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span className="text-white text-xs font-medium">Your Progress</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-1">
                    <div className="h-full w-[68%] bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" />
                  </div>
                  <span className="text-white/40 text-[10px]">68% complete</span>
                </div>

                {/* Floating certificate badge */}
                <div className="absolute -top-4 -left-4 backdrop-blur-lg bg-white/10 border border-white/20 rounded-xl p-3 shadow-xl">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-yellow-400" />
                    <div>
                      <p className="text-white text-[10px] font-medium">Certificate Earned!</p>
                      <p className="text-white/30 text-[9px]">Web Dev Fundamentals</p>
                    </div>
                  </div>
                </div>
              </div>
            </FadeInSection>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════════
          TESTIMONIALS
      ═══════════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-900/5 to-transparent" />
        <div className="max-w-6xl mx-auto relative">
          <FadeInSection>
            <div className="text-center mb-16">
              <span className="inline-block text-purple-400 text-sm font-semibold uppercase tracking-widest mb-3">
                Testimonials
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                What our students{" "}
                <span className="text-purple-400">say</span>
              </h2>
              <p className="text-white/40 max-w-xl mx-auto text-lg">
                Join thousands of satisfied learners who have transformed their careers.
              </p>
            </div>
          </FadeInSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                name: "Priya Sharma",
                role: "Frontend Developer at Google",
                comment: "LearnHub's React course completely changed my career. The hands-on projects and quizzes helped me land my dream job. The certificate was a great addition to my LinkedIn profile.",
                rating: 5,
                avatar: "PS",
              },
              {
                name: "Alex Chen",
                role: "Full-Stack Engineer",
                comment: "I've tried many platforms, but LearnHub stands out. The bite-sized lessons fit perfectly into my busy schedule, and the progress tracking keeps me motivated every day.",
                rating: 5,
                avatar: "AC",
              },
              {
                name: "Sarah Johnson",
                role: "UX Designer at Spotify",
                comment: "The design courses here are exceptional. Real-world projects, expert instructors, and a supportive community. I went from beginner to professional in just 3 months.",
                rating: 5,
                avatar: "SJ",
              },
              {
                name: "Rahul Patel",
                role: "Data Scientist at Amazon",
                comment: "The AI and machine learning courses are top-notch. Clear explanations, practical exercises, and the quizzes really test your understanding. Highly recommend!",
                rating: 5,
                avatar: "RP",
              },
              {
                name: "Emily Davis",
                role: "Junior Developer",
                comment: "As a complete beginner, I was nervous about learning to code. LearnHub made it approachable and fun. The free courses are genuinely high quality — no catch.",
                rating: 4,
                avatar: "ED",
              },
              {
                name: "Michael Torres",
                role: "CTO at TechStart",
                comment: "We onboard all new engineers with LearnHub courses. The structured content and certificates make it easy to track team progress. Enterprise plan is worth every penny.",
                rating: 5,
                avatar: "MT",
              },
            ].map((testimonial, idx) => (
              <TestimonialCard
                key={testimonial.name}
                {...testimonial}
                delay={idx * 0.08}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════════
          BECOME AN INSTRUCTOR
      ═══════════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <FadeInSection direction="right">
              <div className="backdrop-blur-lg bg-gradient-to-br from-purple-500/10 to-violet-600/10 border border-purple-400/20 rounded-3xl p-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/15 rounded-full blur-[60px]" />
                <div className="relative grid grid-cols-2 gap-6">
                  {[
                    { value: "70%", label: "Revenue share" },
                    { value: "10K+", label: "Active students" },
                    { value: "24/7", label: "Platform support" },
                    { value: "Free", label: "Course hosting" },
                  ].map((stat) => (
                    <div key={stat.label} className="text-center">
                      <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                      <p className="text-white/40 text-sm">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </FadeInSection>

            <FadeInSection direction="left">
              <span className="inline-block text-purple-400 text-sm font-semibold uppercase tracking-widest mb-3">
                Teach on LearnHub
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                Share your knowledge,{" "}
                <span className="text-purple-400">earn income</span>
              </h2>
              <p className="text-white/45 text-lg leading-relaxed mb-6">
                Create and publish courses on our platform. Reach thousands of eager learners
                and earn revenue from every enrollment. We handle payments, hosting, and marketing.
              </p>
              <div className="space-y-3 mb-8">
                {[
                  "Easy-to-use course builder with drag-and-drop",
                  "Support for video, text, and quiz-based lessons",
                  "Built-in analytics to track student engagement",
                  "Automatic certificate generation for completions",
                  "Get paid directly — transparent 70/30 revenue split",
                ].map((point) => (
                  <div key={point} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-white/60 text-sm">{point}</span>
                  </div>
                ))}
              </div>
              <Link href="/signup" className="btn-primary inline-flex items-center gap-2">
                Start Teaching Today <ArrowRight className="w-4 h-4" />
              </Link>
            </FadeInSection>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════════
          COMPARISON TABLE — Why LearnHub vs Others
      ═══════════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <FadeInSection>
            <div className="text-center mb-12">
              <span className="inline-block text-purple-400 text-sm font-semibold uppercase tracking-widest mb-3">
                Compare
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                LearnHub vs{" "}
                <span className="text-white/40">the rest</span>
              </h2>
            </div>
          </FadeInSection>

          <FadeInSection delay={0.1}>
            <div className="backdrop-blur-lg bg-white/[0.05] border border-white/10 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-5 text-white/50 font-medium">Feature</th>
                    <th className="p-5 text-center">
                      <span className="text-purple-400 font-bold">LearnHub</span>
                    </th>
                    <th className="p-5 text-center text-white/30 font-medium">Others</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { feature: "Glassmorphism UI", us: true, them: false },
                    { feature: "Free courses available", us: true, them: "Limited" },
                    { feature: "Verified certificates", us: true, them: "Paid extra" },
                    { feature: "Interactive quizzes", us: true, them: "Some" },
                    { feature: "Progress tracking", us: true, them: true },
                    { feature: "70% instructor revenue", us: true, them: false },
                    { feature: "Lifetime course access", us: true, them: "Subscription" },
                    { feature: "No ads or distractions", us: true, them: false },
                  ].map((row) => (
                    <tr key={row.feature} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="p-5 text-white/60">{row.feature}</td>
                      <td className="p-5 text-center">
                        {row.us === true ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" />
                        ) : (
                          <span className="text-white/40">{String(row.us)}</span>
                        )}
                      </td>
                      <td className="p-5 text-center">
                        {row.them === true ? (
                          <CheckCircle2 className="w-5 h-5 text-white/30 mx-auto" />
                        ) : row.them === false ? (
                          <span className="text-white/20">—</span>
                        ) : (
                          <span className="text-white/30 text-xs">{row.them}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════════
          FAQ
      ═══════════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-900/5 to-transparent" />
        <div className="max-w-3xl mx-auto relative">
          <FadeInSection>
            <div className="text-center mb-12">
              <span className="inline-block text-purple-400 text-sm font-semibold uppercase tracking-widest mb-3">
                FAQ
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Frequently asked{" "}
                <span className="text-purple-400">questions</span>
              </h2>
              <p className="text-white/40 text-lg">
                Everything you need to know about LearnHub.
              </p>
            </div>
          </FadeInSection>

          <FadeInSection delay={0.1}>
            <div className="space-y-3">
              {[
                {
                  question: "Is LearnHub really free to get started?",
                  answer: "Yes! You can create a free account and access all our free courses without any credit card. Paid courses are available for purchase individually — no subscription required.",
                },
                {
                  question: "How do certificates work?",
                  answer: "When you complete all lessons in a course, a verified PDF certificate is automatically generated. You can download it, share it on LinkedIn, or add it to your resume. Each certificate has a unique verification code.",
                },
                {
                  question: "Can I learn at my own pace?",
                  answer: "Absolutely. All courses are self-paced with no deadlines. Your progress is saved automatically, so you can pick up right where you left off — even across devices.",
                },
                {
                  question: "What payment methods do you accept?",
                  answer: "We accept all major credit/debit cards, UPI, net banking, and wallets through our secure Stripe payment gateway. All transactions are encrypted and PCI-DSS compliant.",
                },
                {
                  question: "Do I get lifetime access to purchased courses?",
                  answer: "Yes. Once you purchase a course, you have lifetime access including all future updates and additions the instructor makes. No recurring fees.",
                },
                {
                  question: "Can I become an instructor?",
                  answer: "Yes! Anyone with expertise can apply to become an instructor. You'll get access to our course builder tools, analytics dashboard, and earn 70% of revenue from your course sales.",
                },
                {
                  question: "Is there a refund policy?",
                  answer: "We offer a 30-day money-back guarantee on all paid courses. If you're not satisfied with a course for any reason, contact our support team for a full refund.",
                },
              ].map((faq) => (
                <FAQItem key={faq.question} question={faq.question} answer={faq.answer} />
              ))}
            </div>
          </FadeInSection>

          <FadeInSection delay={0.2}>
            <div className="text-center mt-8">
              <p className="text-white/30 text-sm">
                Still have questions?{" "}
                <Link href="/contact" className="text-purple-400 hover:text-purple-300 transition-colors underline underline-offset-2">
                  Contact our support team
                </Link>
              </p>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════════
          FINAL CTA
      ═══════════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <FadeInSection>
            <div className="relative backdrop-blur-lg bg-gradient-to-br from-violet-500/15 to-purple-600/15 border border-purple-400/20 rounded-3xl p-10 sm:p-16 text-center overflow-hidden">
              {/* Glow effects */}
              <div className="absolute top-0 left-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-[100px]" />
              <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-violet-500/15 rounded-full blur-[100px]" />

              <div className="relative">
                <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm text-white/60 mb-6 backdrop-blur-sm">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  Join 10,000+ learners today
                </div>

                <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                  Ready to transform{" "}
                  <br className="hidden sm:block" />
                  <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
                    your career?
                  </span>
                </h2>
                <p className="text-white/50 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
                  Start with our free courses, earn certificates, and join a community
                  of passionate learners. Your future self will thank you.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/signup" className="btn-primary text-base px-10 py-4 inline-flex items-center gap-2">
                    Get Started Free <ArrowRight className="w-5 h-5" />
                  </Link>
                  <Link href="/courses" className="btn-ghost inline-flex items-center gap-2 border border-white/20 text-base px-8 py-4">
                    Browse Courses <ChevronRight className="w-5 h-5" />
                  </Link>
                </div>

                <p className="text-white/25 text-xs mt-6">
                  Free forever plan available. No credit card needed.
                </p>
              </div>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-white/5 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <BookOpen className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-white text-lg tracking-tight">
                  Learn<span className="text-purple-400">Hub</span>
                </span>
              </div>
              <p className="text-white/30 text-sm leading-relaxed mb-4">
                The modern learning platform for ambitious developers and designers. Master new skills and advance your career.
              </p>
              <div className="flex items-center gap-3">
                {["Twitter", "GitHub", "LinkedIn", "YouTube"].map((social) => (
                  <span key={social} className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/30 text-xs hover:bg-white/10 hover:text-white/50 transition-colors cursor-pointer">
                    {social[0]}
                  </span>
                ))}
              </div>
            </div>

            {/* Platform */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Platform</h4>
              <ul className="space-y-2.5">
                {[
                  { label: "Browse Courses", href: "/courses" },
                  { label: "Pricing", href: "/pricing" },
                  { label: "Search", href: "/search" },
                  { label: "Become Instructor", href: "/signup" },
                  { label: "Enterprise", href: "/pricing" },
                ].map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-white/30 hover:text-white/60 text-sm transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Resources</h4>
              <ul className="space-y-2.5">
                {[
                  { label: "Help Center", href: "#" },
                  { label: "Blog", href: "#" },
                  { label: "Documentation", href: "#" },
                  { label: "Community", href: "#" },
                  { label: "Changelog", href: "#" },
                ].map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-white/30 hover:text-white/60 text-sm transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Legal</h4>
              <ul className="space-y-2.5">
                {[
                  { label: "Privacy Policy", href: "#" },
                  { label: "Terms of Service", href: "#" },
                  { label: "Refund Policy", href: "#" },
                  { label: "Cookie Policy", href: "#" },
                ].map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-white/30 hover:text-white/60 text-sm transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-white/20 text-xs">
              &copy; {new Date().getFullYear()} LearnHub. All rights reserved.
            </p>
            <p className="text-white/15 text-xs">
              Built with Next.js, Tailwind CSS, and Prisma
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
