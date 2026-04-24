/**
 * Home page — marketing landing page with hero, features, stats, testimonials,
 * categories, courses, how-it-works, FAQ, instructor CTA, and final CTA.
 * Server Component: fetches data; delegates animations to client components.
 */
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import Footer from "@/components/Footer";
import CourseCard from "@/components/CourseCard";
import GlassCard from "@/components/GlassCard";
import FAQItem from "@/components/landing/FAQItem";

// Lazy-load heavy animation components (framer-motion) — separate JS chunks
const HeroBackground = dynamic(() => import("@/components/landing/HeroBackground"));

const FadeInSection = dynamic(() => import("@/components/landing/FadeInSection"));
const AnimatedCounter = dynamic(() => import("@/components/landing/AnimatedCounter"));
const TestimonialCard = dynamic(() => import("@/components/landing/TestimonialCard"));
const StaggerChildren = dynamic(() => import("@/components/landing/StaggerChildren"));
const StaggerItem = dynamic(() =>
  import("@/components/landing/StaggerChildren").then((mod) => ({ default: mod.StaggerItem }))
);
const CompareSection = dynamic(() => import("@/components/landing/CompareSection"));
import {
  BookOpen, Zap, Users, Award, ArrowRight, ArrowLeft, Play, Shield, Clock,
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
  "web-development": "from-orange-600 to-orange-500",
  react: "from-cyan-500 to-blue-600",
  design: "from-pink-500 to-rose-600",
  database: "from-emerald-500 to-green-600",
  mobile: "from-orange-500 to-amber-600",
  ai: "from-indigo-500 to-orange-500",
  analytics: "from-teal-500 to-cyan-600",
  default: "from-slate-500 to-gray-600",
};

// Soft background wash colours that match each category gradient
const CATEGORY_BG: Record<string, string> = {
  "web-development": "from-orange-500/10 via-orange-500/5 to-transparent border-orange-500/20",
  react:             "from-cyan-500/10 via-blue-500/5 to-transparent border-cyan-500/20",
  design:            "from-pink-500/10 via-rose-500/5 to-transparent border-pink-500/20",
  database:          "from-emerald-500/10 via-green-500/5 to-transparent border-emerald-500/20",
  mobile:            "from-amber-500/10 via-orange-500/5 to-transparent border-amber-500/20",
  ai:                "from-indigo-500/10 via-purple-500/5 to-transparent border-indigo-500/20",
  analytics:         "from-teal-500/10 via-cyan-500/5 to-transparent border-teal-500/20",
  default:           "from-slate-500/10 via-gray-500/5 to-transparent border-slate-500/20",
};

const CATEGORY_GLOW: Record<string, string> = {
  "web-development": "group-hover:shadow-orange-500/20",
  react:             "group-hover:shadow-cyan-500/20",
  design:            "group-hover:shadow-pink-500/20",
  database:          "group-hover:shadow-emerald-500/20",
  mobile:            "group-hover:shadow-amber-500/20",
  ai:                "group-hover:shadow-indigo-500/20",
  analytics:         "group-hover:shadow-teal-500/20",
  default:           "group-hover:shadow-slate-500/20",
};

const CATEGORY_ICON_COLOR: Record<string, string> = {
  "web-development": "text-orange-500",
  react:             "text-cyan-500",
  design:            "text-pink-500",
  database:          "text-emerald-500",
  mobile:            "text-amber-500",
  ai:                "text-indigo-500",
  analytics:         "text-teal-500",
  default:           "text-slate-400",
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
          HERO SECTION — Supabase-style clean, centered layout
      ═══════════════════════════════════════════════════════════════════════════ */}
      <section className="relative -mt-24 pt-24 pb-4 overflow-hidden">
        <HeroBackground />

        <div className="mx-auto w-full relative z-10 pt-12 sm:pt-16 lg:pt-24 pb-8 lg:pb-12">
          <div className="max-w-3xl mx-auto text-center px-4 sm:px-6">

            {/* Announcement banner */}
            <FadeInSection delay={0}>
              <Link
                href="/courses"
                className="group inline-flex items-center gap-2.5 bg-orange-500/[0.07] hover:bg-orange-500/[0.12] border border-orange-500/20 hover:border-orange-500/30 text-orange-400 text-[13px] font-medium rounded-full px-4 py-1.5 mb-6 transition-all duration-300"
              >
                <span className="flex items-center gap-1.5 bg-orange-500/20 text-orange-300 text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5">
                  <Sparkles className="w-3 h-3" />
                  New
                </span>
                Explore our latest courses and start learning today
                <ArrowRight className="w-3.5 h-3.5 text-orange-400/70 group-hover:text-orange-400 group-hover:translate-x-0.5 transition-all" />
              </Link>
            </FadeInSection>

            {/* Headline */}
            <FadeInSection delay={0.06}>
              <h1 className="text-[32px] sm:text-[44px] lg:text-[56px] font-semibold tracking-tight leading-[1.1] mb-4">
                <span className="text-foreground">CoachNest is the </span>
                <span className="bg-gradient-to-r from-orange-500 via-orange-400 to-amber-400 bg-clip-text text-transparent">
                  Learning Platform
                </span>
              </h1>
            </FadeInSection>

            {/* Sub-headline */}
            <FadeInSection delay={0.12}>
              <p className="text-muted-foreground text-sm sm:text-base lg:text-lg max-w-xl mx-auto mb-8 leading-relaxed">
                Start your learning journey with expert-crafted courses, interactive quizzes, progress tracking, and verified certificates.
              </p>
            </FadeInSection>

            {/* CTA Buttons — Supabase style */}
            <FadeInSection delay={0.18}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/signup"
                  className="btn-primary"
                >
                  Start your project
                </Link>
                <Link
                  href="/courses"
                  className="inline-flex items-center gap-2 bg-transparent hover:bg-secondary/60 border border-border text-foreground text-sm px-5 py-2 rounded-md font-medium transition-colors"
                >
                  Browse Courses
                </Link>
              </div>
            </FadeInSection>

          </div>
        </div>
      </section>


      {/* ═══════════════════════════════════════════════════════════════════════════
          TRUSTED BY / SOCIAL PROOF BAR

          <section className="relative py-12">
        <div className="">
          <FadeInSection>
            <p className="text-center text-white/30 text-sm uppercase tracking-widest mb-8">
              Trusted by learners from top companies
            </p>
            <div className="flex flex-wrap justify-center items-center gap-8 sm:gap-16">
              {["Google", "Microsoft", "Amazon", "Meta", "Apple", "Netflix"].map((company) => (
                <span key={company} className="text-white/20 font-bold text-xl sm:text-2xl tracking-wider hover:text-muted-foreground/70 transition-colors">
                  {company}
                </span>
              ))}
            </div>
          </FadeInSection>
        </div>
      </section>
      ═══════════════════════════════════════════════════════════════════════════ */}
      

      {/* ═══════════════════════════════════════════════════════════════════════════
          WHY COACHNEST — 6 feature cards
      ═══════════════════════════════════════════════════════════════════════════ */}
      <section className="py-12 ">
        <div className="mx-auto">
          <FadeInSection>
            <div className="text-center mb-16">
              <span className="inline-block text-orange-400 text-sm font-semibold uppercase tracking-widest mb-3">
                Why CoachNest
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                Everything you need to{" "}
                <span className="text-orange-400">level up</span>
              </h2>
              <p className="text-muted-foreground/70 max-w-2xl mx-auto text-lg">
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
                color: "text-orange-400",
                bg: "bg-orange-500/10",
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
                    <div className={`w-12 h-12 rounded-lg ${feature.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
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
      <section className="py-28 relative overflow-hidden">

        <div className="mx-auto relative">
          <FadeInSection>
            <div className="text-center mb-20">
              <span className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
                How It Works
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                Start learning in{" "}
                <span className="text-orange-400">4 simple steps</span>
              </h2>
              <p className="text-white/40 max-w-xl mx-auto text-lg">
                From sign-up to certificate — your learning journey made simple.
              </p>
            </div>
          </FadeInSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                icon: Users,
                title: "Create Account",
                desc: "Sign up for free in under 30 seconds. No credit card required.",
              },
              {
                step: "02",
                icon: BookOpen,
                title: "Browse Courses",
                desc: "Explore our curated library. Filter by topic, level, and price.",
              },
              {
                step: "03",
                icon: Play,
                title: "Learn at Your Pace",
                desc: "Watch videos, read lessons, and take quizzes. Track your progress.",
              },
              {
                step: "04",
                icon: GraduationCap,
                title: "Earn Certificate",
                desc: "Complete the course and download your verified certificate.",
              },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <FadeInSection key={item.step} delay={idx * 0.12}>
                  <div className="relative group h-full">
                    {/* Connector arrow between cards */}
                    {idx < 3 && (
                      <div className="hidden lg:flex absolute top-10 -right-3 z-10 items-center justify-center w-6 h-6 rounded-full bg-card border border-border text-white/30">
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    )}

                    <div className="h-full bg-card border border-border rounded-md p-6 flex flex-col gap-5 hover:border-orange-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/5">
                      {/* Top row: step number + icon */}
                      <div className="flex items-start justify-between">
                        <span className="text-5xl font-black text-white/[0.06] leading-none select-none">
                          {item.step}
                        </span>
                        <div className="w-12 h-12 rounded-md bg-orange-500/10 border border-orange-500/20 flex items-center justify-center group-hover:bg-orange-500/20 group-hover:border-orange-500/40 transition-all duration-300">
                          <Icon className="w-5 h-5 text-orange-400" />
                        </div>
                      </div>

                      {/* Text */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-bold text-orange-500/70 uppercase tracking-widest">
                            Step {item.step}
                          </span>
                        </div>
                        <h3 className="text-white font-semibold text-base mb-2">{item.title}</h3>
                        <p className="text-white/40 text-sm leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
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
      <section className="py-24 ">
        <div className="mx-auto">
          <FadeInSection>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-4">
              <div>
                <p className="text-orange-500 text-xs font-semibold uppercase tracking-widest mb-3">
                  Explore Topics
                </p>
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                  Browse by category
                </h2>
                <p className="text-muted-foreground mt-2.5 text-[15px] max-w-md">
                  Explore curated paths across the skills that matter most.
                </p>
              </div>
              <Link
                href="/courses"
                className="group inline-flex items-center gap-1.5 text-orange-500 hover:text-orange-400 text-sm font-semibold transition-colors shrink-0 pb-1"
              >
                View all courses
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
            {/* Section accent line */}
            <div className="w-10 h-0.5 bg-orange-500 rounded-full mb-12" />
          </FadeInSection>

          <StaggerChildren className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3" staggerDelay={0.05}>
            {(categories.length > 0
              ? categories.map((cat) => ({
                  name: cat.name,
                  slug: cat.slug,
                  count: cat._count.courses,
                  icon: cat.icon,
                }))
              : [
                  { name: "Web Development", slug: "web-development", count: 12, icon: null },
                  { name: "React & Next.js", slug: "react",           count: 8,  icon: null },
                  { name: "UI/UX Design",    slug: "design",          count: 6,  icon: null },
                  { name: "Databases",       slug: "database",        count: 5,  icon: null },
                  { name: "Mobile Dev",      slug: "mobile",          count: 4,  icon: null },
                  { name: "AI & ML",         slug: "ai",              count: 7,  icon: null },
                  { name: "Data Analytics",  slug: "analytics",       count: 3,  icon: null },
                  { name: "DevOps",          slug: "default",         count: 4,  icon: null },
                ]
            ).map((cat) => {
              const IconComponent = CATEGORY_ICONS[cat.slug]      ?? CATEGORY_ICONS.default;
              const iconColor     = CATEGORY_ICON_COLOR[cat.slug] ?? CATEGORY_ICON_COLOR.default;

              return (
                <StaggerItem key={cat.slug}>
                  <Link
                    href={`/courses?category=${cat.slug}`}
                    className="group relative flex flex-col rounded-md border border-border bg-card hover:border-orange-500/35 hover:shadow-md transition-all duration-200 p-5 overflow-hidden"
                  >
                    {/* Left accent bar — slides in on hover */}
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-orange-500 origin-bottom scale-y-0 group-hover:scale-y-100 transition-transform duration-250 rounded-r-sm" />

                    {/* Icon tile */}
                    <div className="w-11 h-11 rounded-lg bg-secondary flex items-center justify-center mb-4 group-hover:bg-orange-500/10 transition-colors duration-200 shrink-0">
                      {cat.icon ? (
                        <span className="text-xl">{cat.icon}</span>
                      ) : (
                        <IconComponent className={`w-5 h-5 ${iconColor} group-hover:text-orange-500 transition-colors duration-200`} />
                      )}
                    </div>

                    {/* Category name */}
                    <h3 className="text-foreground font-semibold text-sm leading-snug mb-1">
                      {cat.name}
                    </h3>

                    {/* Course count */}
                    <p className="text-muted-foreground text-xs">
                      {cat.count} course{cat.count !== 1 ? "s" : ""}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center gap-1 mt-4 pt-3 border-t border-border/50 text-muted-foreground/40 group-hover:text-orange-500 text-xs font-medium transition-colors duration-200">
                      Explore
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform duration-200" />
                    </div>
                  </Link>
                </StaggerItem>
              );
            })}
          </StaggerChildren>

          {/* Bottom CTA strip */}
          <FadeInSection>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-md border border-border bg-secondary/20 px-6 py-5">
              <div>
                <p className="text-foreground font-semibold text-sm">Can&apos;t find your topic?</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Browse the full catalog — 340+ courses across all skill levels.
                </p>
              </div>
              <Link
                href="/courses"
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors shrink-0"
              >
                <BookOpen className="w-4 h-4" />
                Browse all courses
              </Link>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════════
          FEATURED COURSES — Premium Compact
      ═══════════════════════════════════════════════════════════════════════════ */}
      {courses.length > 0 && (
        <section className="py-20  relative">
          <div className="absolute inset-0 " />
          <div className="mx-auto relative">
            {/* Section Header */}
            <FadeInSection>
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-10 gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-orange-500 mb-3">
                    <Sparkles className="w-3.5 h-3.5" /> Trending Now
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
                    Featured courses
                  </h2>
                  <p className="text-muted-foreground mt-2 text-[15px]">
                    Hand-picked by our instructors — start with the best.
                  </p>
                </div>
                <Link
                  href="/courses"
                  className="group inline-flex items-center gap-1.5 bg-secondary border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/70 hover:border-border/80 text-sm font-medium px-4 py-2 rounded-md transition-all shrink-0"
                >
                  View all courses <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </FadeInSection>

            {/* Course Grid — compact horizontal cards */}
            <StaggerChildren className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3" staggerDelay={0.07}>
              {courses.map((course) => {
                const avg = course.reviews.length
                  ? Number((course.reviews.reduce((s, r) => s + r.rating, 0) / course.reviews.length).toFixed(1))
                  : 0;
                const hasDiscount = course.discountPrice != null && course.price != null && Number(course.discountPrice) < Number(course.price);
                const displayPrice = hasDiscount ? Number(course.discountPrice) : Number(course.price);

                return (
                  <StaggerItem key={course.id}>
                    <Link
                      href={`/courses/${course.id}`}
                      className="group flex gap-3 p-3 rounded-lg border border-white/[0.07] bg-white/[0.03] hover:border-orange-400/30 hover:bg-white/[0.06] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-orange-600/10"
                    >
                      {/* Compact thumbnail */}
                      <div className="relative w-20 h-[3.75rem] flex-shrink-0 rounded-md overflow-hidden bg-gradient-to-br from-orange-700/30 to-orange-600/10">
                        {course.thumbnail ? (
                          <Image
                            src={course.thumbnail}
                            alt={course.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-white/20" />
                          </div>
                        )}
                        {course.isFree && (
                          <div className="absolute inset-x-0 top-0 bg-emerald-500/90 text-white text-[8px] font-bold text-center py-[2px] uppercase tracking-wide">
                            Free
                          </div>
                        )}
                        {course.level && (
                          <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white/80 text-[8px] font-semibold text-center py-[2px] capitalize">
                            {course.level}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between gap-1">
                        <h3 className="text-white/90 font-semibold text-[13px] line-clamp-2 leading-snug group-hover:text-orange-300 transition-colors">
                          {course.title}
                        </h3>
                        <div>
                          {course.createdBy.name && (
                            <p className="text-white/30 text-[11px] truncate mb-1.5">{course.createdBy.name}</p>
                          )}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-[11px]">
                              {avg > 0 && (
                                <span className="flex items-center gap-0.5 text-amber-400 font-semibold">
                                  <Star className="w-3 h-3 fill-current" />
                                  {avg}
                                </span>
                              )}
                              <span className="flex items-center gap-0.5 text-white/25">
                                <Users className="w-3 h-3" />
                                {course._count.enrollments > 0 ? course._count.enrollments.toLocaleString() : "0"}
                              </span>
                            </div>
                            {course.isFree ? (
                              <span className="text-emerald-400 text-[11px] font-bold shrink-0">Free</span>
                            ) : course.price != null ? (
                              <div className="flex items-center gap-1 shrink-0">
                                {hasDiscount && (
                                  <span className="text-white/20 text-[10px] line-through leading-none">
                                    ₹{Number(course.price).toLocaleString("en-IN")}
                                  </span>
                                )}
                                <span className="text-orange-300 font-bold text-xs leading-none">
                                  ₹{displayPrice.toLocaleString("en-IN")}
                                </span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </StaggerItem>
                );
              })}
            </StaggerChildren>

            {/* CTA */}
            {courses.length >= 6 && (
              <FadeInSection>
                <div className="text-center mt-10">
                  <Link href="/courses" className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-600/15 to-orange-500/15 border border-orange-400/25 text-orange-300 hover:text-white hover:border-orange-400/25 hover:from-orange-600/25 hover:to-orange-500/15 font-medium text-sm px-7 py-2.5 rounded-md transition-all hover:-translate-y-0.5">
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
      <section className="py-24  relative">
        <div className="mx-auto">
          <div className="bg-secondary/30 border border-border rounded-md p-10 sm:p-16">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
              {[
                { end: Math.max(stats.courseCount, 20), suffix: "+", label: "Expert Courses", icon: BookOpen, color: "text-orange-400" },
                { end: Math.max(stats.studentCount, 99), suffix: "+", label: "Active Students", icon: Users, color: "text-blue-400" },
                { end: Math.max(stats.enrollmentCount, 299), suffix: "+", label: "Total Enrollments", icon: TrendingUp, color: "text-emerald-400" },
                { end: Math.max(stats.reviewCount, 399), suffix: "+", label: "5-Star Reviews", icon: Star, color: "text-yellow-400" },
              ].map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <FadeInSection key={stat.label} delay={idx * 0.1}>
                    <div className="text-center">
                      <Icon className={`w-8 h-8 ${stat.color} mx-auto mb-3`} />
                      <div className="text-4xl sm:text-5xl font-bold text-white mb-2">
                        <AnimatedCounter end={stat.end} suffix={stat.suffix} />
                      </div>
                      <p className="text-muted-foreground/70 text-sm">{stat.label}</p>
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
        <div className="mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <FadeInSection direction="right">
              <span className="inline-block text-orange-400 text-sm font-semibold uppercase tracking-widest mb-3">
                Learning Experience
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                A learning experience{" "}
                <span className="text-orange-400">designed for you</span>
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
                      <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-orange-400" />
                      </div>
                      <span className="text-muted-foreground text-sm">{item.text}</span>
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
                <div className="backdrop-blur-lg bg-white/[0.07] border border-border rounded-lg overflow-hidden shadow-2xl">
                  {/* Title bar */}
                  <div className="flex items-center gap-2 px-4 py-3 bg-secondary border-b border-border">
                    <div className="w-3 h-3 rounded-full bg-red-400/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
                    <div className="w-3 h-3 rounded-full bg-green-400/60" />
                    <span className="text-white/30 text-xs ml-2">CoachNest Course Viewer</span>
                  </div>
                  {/* Video placeholder */}
                  <div className="aspect-video bg-gradient-to-br from-orange-700/30 to-orange-700/30 flex items-center justify-center relative">
                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                      <Play className="w-7 h-7 text-white ml-1" />
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
                      <div className="h-1 flex-1 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full w-[35%] bg-gradient-to-r from-orange-600 to-orange-500 rounded-full" />
                      </div>
                      <span className="text-muted-foreground/70 text-xs">3:24 / 9:45</span>
                    </div>
                  </div>
                  {/* Lesson info */}
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-muted-foreground text-xs">Lesson 4 of 12</span>
                    </div>
                    <h4 className="text-white font-semibold text-sm mb-1">Building Responsive Layouts</h4>
                    <p className="text-white/30 text-xs">Learn CSS Grid and Flexbox to create modern, responsive designs.</p>
                  </div>
                </div>

                {/* Floating progress card */}
                <div className="absolute -bottom-6 -right-6 bg-card border border-border rounded-md p-4 shadow-xl w-48">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span className="text-white text-xs font-medium">Your Progress</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden mb-1">
                    <div className="h-full w-[68%] bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" />
                  </div>
                  <span className="text-muted-foreground/70 text-[10px]">68% complete</span>
                </div>

                {/* Floating certificate badge */}
                <div className="absolute -top-4 -left-4 bg-card border border-border rounded-md p-3 shadow-xl">
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
          <section className="py-24  relative">
        <div className="absolute inset-0 " />
        <div className="mx-auto relative">
          <FadeInSection>
            <div className="text-center mb-16">
              <span className="inline-block text-orange-400 text-sm font-semibold uppercase tracking-widest mb-3">
                Testimonials
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                What our students{" "}
                <span className="text-orange-400">say</span>
              </h2>
              <p className="text-muted-foreground/70 max-w-xl mx-auto text-lg">
                Join thousands of satisfied learners who have transformed their careers.
              </p>
            </div>
          </FadeInSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                name: "Priya Sharma",
                role: "Frontend Developer at Google",
                comment: "CoachNest's React course completely changed my career. The hands-on projects and quizzes helped me land my dream job. The certificate was a great addition to my LinkedIn profile.",
                rating: 5,
                avatar: "PS",
              },
              {
                name: "Alex Chen",
                role: "Full-Stack Engineer",
                comment: "I've tried many platforms, but CoachNest stands out. The bite-sized lessons fit perfectly into my busy schedule, and the progress tracking keeps me motivated every day.",
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
                comment: "As a complete beginner, I was nervous about learning to code. CoachNest made it approachable and fun. The free courses are genuinely high quality — no catch.",
                rating: 4,
                avatar: "ED",
              },
              {
                name: "Michael Torres",
                role: "CTO at TechStart",
                comment: "We onboard all new engineers with CoachNest courses. The structured content and certificates make it easy to track team progress. Enterprise plan is worth every penny.",
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
      ═══════════════════════════════════════════════════════════════════════════ */}
      

      {/* ═══════════════════════════════════════════════════════════════════════════
          BECOME AN INSTRUCTOR
      ═══════════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 ">
        <div className="mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <FadeInSection direction="right">
              <div className="bg-secondary/50 border border-border rounded-md p-10 relative overflow-hidden">
                <div className="relative grid grid-cols-2 gap-6">
                  {[
                    { value: "70%", label: "Revenue share" },
                    { value: "99+", label: "Active students" },
                    { value: "24/7", label: "Platform support" },
                    { value: "Free", label: "Course hosting" },
                  ].map((stat) => (
                    <div key={stat.label} className="text-center">
                      <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                      <p className="text-muted-foreground/70 text-sm">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </FadeInSection>

            <FadeInSection direction="left">
              <span className="inline-block text-orange-400 text-sm font-semibold uppercase tracking-widest mb-3">
                Teach on CoachNest
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                Share your knowledge,{" "}
                <span className="text-orange-400">earn income</span>
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
                    <span className="text-muted-foreground text-sm">{point}</span>
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
          COMPARISON TABLE — Why CoachNest vs Others
      ═══════════════════════════════════════════════════════════════════════════ */}
      <CompareSection />

      {/* ═══════════════════════════════════════════════════════════════════════════
          FAQ
      ═══════════════════════════════════════════════════════════════════════════ */}
      <section className="py-24  relative">
        <div className="absolute inset-0 " />
        <div className="max-w-3xl mx-auto relative">
          <FadeInSection>
            <div className="text-center mb-12">
              <span className="inline-block text-orange-400 text-sm font-semibold uppercase tracking-widest mb-3">
                FAQ
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Frequently asked{" "}
                <span className="text-orange-400">questions</span>
              </h2>
              <p className="text-muted-foreground/70 text-lg">
                Everything you need to know about CoachNest.
              </p>
            </div>
          </FadeInSection>

          <FadeInSection delay={0.1}>
            <div className="space-y-3">
              {[
                {
                  question: "Is CoachNest really free to get started?",
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
                <Link href="/contact" className="text-orange-400 hover:text-orange-300 transition-colors underline underline-offset-2">
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

        <div className="mx-auto relative">
          <FadeInSection>
            <div className="relative rounded-md border border-border bg-secondary/10 overflow-hidden shadow-card">
              {/* Top accent bar */}
              <div className="h-[3px] w-full bg-gradient-to-r from-transparent via-primary to-transparent" />

              <div className="px-6 py-14 sm:px-14 sm:py-20 text-center">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 text-sm text-primary font-medium mb-8">
                  <Sparkles className="w-3.5 h-3.5" />
                  Join 10,000+ learners today
                </div>

                {/* Heading */}
                <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-5 leading-tight tracking-tight">
                  Ready to transform
                  <br className="hidden sm:block" />
                  <span className="text-primary"> your career?</span>
                </h2>

                {/* Subtext */}
                <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto mb-10 leading-relaxed">
                  Start with our free courses, earn certificates, and join a community
                  of passionate learners. Your future self will thank you.
                </p>

                {/* CTA buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
                  <Link href="/signup" className="btn-primary text-base px-10 py-3.5 inline-flex items-center gap-2">
                    Get Started Free <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link href="/courses" className="btn-ghost inline-flex items-center gap-2 border border-border text-base px-8 py-3.5">
                    Browse Courses <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>

                {/* Micro trust signals */}
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                  {[
                    "Free forever plan",
                    "No credit card needed",
                    "Cancel anytime",
                  ].map((text) => (
                    <span key={text} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/70">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      {text}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════════
          FOOTER
          //<Footer />
      ═══════════════════════════════════════════════════════════════════════════ */}
      
    </div>
  );
}
