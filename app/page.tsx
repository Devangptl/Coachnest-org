/**
 * Home page — marketing landing page with hero, features, stats, testimonials,
 * categories, courses, how-it-works, FAQ, instructor CTA, and final CTA.
 * Server Component: fetches data; delegates animations to client components.
 */
import type { Metadata } from "next";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import Footer from "@/components/Footer";
import CourseCard from "@/components/CourseCard";
import FAQItem from "@/components/landing/FAQItem";
import FeaturedCourseCard from "@/components/landing/FeaturedCourseCard";
import FeatureBento from "@/components/landing/FeatureBento";
import PlatformOfferBanner from "@/components/PlatformOfferBanner";

// Lazy-load heavy animation components (framer-motion) — separate JS chunks
const HeroBackground = dynamic(() => import("@/components/landing/HeroBackground"));
const HeroPreview = dynamic(() => import("@/components/landing/HeroPreview"));
const ReviewsMarquee = dynamic(() => import("@/components/landing/ReviewsMarquee"));

const FadeInSection = dynamic(() => import("@/components/landing/FadeInSection"));
const AnimatedCounter = dynamic(() => import("@/components/landing/AnimatedCounter"));
const TestimonialCard = dynamic(() => import("@/components/landing/TestimonialCard"));
const StaggerChildren = dynamic(() => import("@/components/landing/StaggerChildren"));
const StaggerItem = dynamic(() =>
  import("@/components/landing/StaggerChildren").then((mod) => ({ default: mod.StaggerItem }))
);
const CompareSection = dynamic(() => import("@/components/landing/CompareSection"));
import {
  BookOpen, Users, Award, ArrowRight, ArrowLeft, Play, Clock,
  TrendingUp, Globe, Code, Palette, Database, Smartphone, Brain,
  BarChart3, Sparkles, CheckCircle2, GraduationCap, Target,
  MessageSquare, HeartHandshake, ChevronRight, Star,
} from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://coachnest.com";

export const metadata: Metadata = {
  title: "Coachnest — Learn to Code, Design & Build Your Career",
  description:
    "Expert-crafted online courses with interactive quizzes, progress tracking, and verified certificates. Start learning free today — no credit card required.",
  keywords: [
    "online learning platform",
    "learn programming",
    "web development courses",
    "coding tutorials",
    "earn certificates online",
    "e-learning",
    "instructor-led courses",
    "Coachnest",
  ],
  alternates: { canonical: BASE_URL },
  openGraph: {
    type: "website",
    url: BASE_URL,
    title: "Coachnest — Learn to Code, Design & Build Your Career",
    description:
      "Expert-crafted online courses with interactive quizzes, progress tracking, and verified certificates.",
    images: [
      {
        url: "/og-image.png",
        width: 1366,
        height: 654,
        alt: "Coachnest — Learn to Code, Design & Build Your Career",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Coachnest — Learn to Code, Design & Build Your Career",
    description:
      "Expert-crafted online courses with interactive quizzes, progress tracking, and verified certificates.",
    images: ["/og-image.png"],
  },
};

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

const getLandingReviews = unstable_cache(
  () =>
    prisma.review.findMany({
      where: { rating: { gte: 4 }, comment: { not: null } },
      include: {
        user:   { select: { id: true, name: true, avatar: true } },
        course: { select: { title: true } },
      },
      orderBy: [{ helpful: "desc" }, { createdAt: "desc" }],
      take: 12,
    }),
  ["landing-reviews"],
  { revalidate: 600 }
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
  react: "from-cyan-500/10 via-blue-500/5 to-transparent border-cyan-500/20",
  design: "from-pink-500/10 via-rose-500/5 to-transparent border-pink-500/20",
  database: "from-emerald-500/10 via-green-500/5 to-transparent border-emerald-500/20",
  mobile: "from-amber-500/10 via-orange-500/5 to-transparent border-amber-500/20",
  ai: "from-indigo-500/10 via-purple-500/5 to-transparent border-indigo-500/20",
  analytics: "from-teal-500/10 via-cyan-500/5 to-transparent border-teal-500/20",
  default: "from-slate-500/10 via-gray-500/5 to-transparent border-slate-500/20",
};

const CATEGORY_GLOW: Record<string, string> = {
  "web-development": "group-hover:shadow-orange-500/20",
  react: "group-hover:shadow-cyan-500/20",
  design: "group-hover:shadow-pink-500/20",
  database: "group-hover:shadow-emerald-500/20",
  mobile: "group-hover:shadow-amber-500/20",
  ai: "group-hover:shadow-indigo-500/20",
  analytics: "group-hover:shadow-teal-500/20",
  default: "group-hover:shadow-slate-500/20",
};

const CATEGORY_ICON_COLOR: Record<string, string> = {
  "web-development": "text-orange-500",
  react: "text-cyan-500",
  design: "text-pink-500",
  database: "text-emerald-500",
  mobile: "text-amber-500",
  ai: "text-indigo-500",
  analytics: "text-teal-500",
  default: "text-slate-400",
};

export default async function HomePage() {
  // Start DB queries immediately — do NOT await here.
  // The page shell renders instantly; each dynamic section streams in as its query resolves.
  const coursesPromise = getFeaturedCourses();
  const statsPromise   = getStats();
  const reviewsPromise = getLandingReviews();

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Coachnest",
    url: BASE_URL,
    description:
      "Expert-crafted online courses with interactive quizzes, progress tracking, and verified certificates.",
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${BASE_URL}/search?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Coachnest",
    url: BASE_URL,
    logo: `${BASE_URL}/logo.png`,
    sameAs: [],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      url: `${BASE_URL}/contact`,
    },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Is Coachnest really free to get started?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes! You can create a free account and access all our free courses without any credit card. Paid courses are available for purchase individually — no subscription required.",
        },
      },
      {
        "@type": "Question",
        name: "How do certificates work?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "When you complete all lessons in a course, a verified PDF certificate is automatically generated. You can download it, share it on LinkedIn, or add it to your resume. Each certificate has a unique verification code.",
        },
      },
      {
        "@type": "Question",
        name: "Can I learn at my own pace?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Absolutely. All courses are self-paced with no deadlines. Your progress is saved automatically, so you can pick up right where you left off — even across devices.",
        },
      },
      {
        "@type": "Question",
        name: "What payment methods do you accept?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "We accept all major credit/debit cards and UPI through our secure Razorpay payment gateway. All transactions are encrypted and PCI-DSS compliant.",
        },
      },
      {
        "@type": "Question",
        name: "Do I get lifetime access to purchased courses?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Once you purchase a course, you have lifetime access including all future updates and additions the instructor makes. No recurring fees.",
        },
      },
      {
        "@type": "Question",
        name: "Can I become an instructor?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes! Anyone with expertise can apply to become an instructor. You'll get access to our course builder tools, analytics dashboard, and earn 70% of revenue from your course sales.",
        },
      },
      {
        "@type": "Question",
        name: "Is there a refund policy?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "We offer a 30-day money-back guarantee on all paid courses. If you're not satisfied with a course for any reason, contact our support team for a full refund.",
        },
      },
    ],
  };

  return (
    <div className="overflow-hidden">
      {/* Site-wide promotional banner — renders only when an admin offer is active */}
      <PlatformOfferBanner />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {/* ═══════════════════════════════════════════════════════════════════════════
          HERO SECTION — Professional SaaS: copy + CTAs + product preview
      ═══════════════════════════════════════════════════════════════════════════ */}
      <section className="relative -mt-24 pt-24 overflow-hidden">
        <HeroBackground />

        <div className="mx-auto w-full max-w-6xl relative z-10 px-4 sm:px-6 md:px-7 lg:px-8 pt-12 sm:pt-16 lg:pt-20 pb-14 lg:pb-20">
          <div className="text-center">

            {/* Announcement pill */}
            <FadeInSection>
              <Link
                href="/courses"
                className="group inline-flex items-center gap-2 rounded-full border border-orange-500/25 bg-orange-500/[0.07] pl-1.5 pr-3.5 py-1 text-xs text-muted-foreground hover:border-orange-500/40 hover:text-foreground transition-colors mb-7"
              >
                <span className="rounded-full bg-orange-500/15 text-[#d97757] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                  New
                </span>
                Fresh courses added every week
                <ArrowRight className="w-3 h-3 text-[#d97757] group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </FadeInSection>

            {/* Headline */}
            <FadeInSection delay={0.06}>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[56px] font-bold tracking-tight text-foreground leading-[1.15] mb-6 max-w-3xl mx-auto">
                Learn from the best.
                <br />
                Build an extraordinary{" "}
                <span className="text-[#d97757]">career.</span>
              </h1>
            </FadeInSection>

            {/* Sub-headline */}
            <FadeInSection delay={0.12}>
              <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto mb-9 leading-relaxed">
                Expert-crafted courses, interactive quizzes, progress tracking and
                verified certificates — everything you need to level up, in one
                beautifully simple platform.
              </p>
            </FadeInSection>

            {/* CTA Buttons */}
            <FadeInSection delay={0.18}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
                <Link
                  href="/signup"
                  className="group relative btn-primary inline-flex items-center gap-2 px-7 py-3 transition-all overflow-hidden"
                >
                  {/* Shine sweep on hover */}
                  <span aria-hidden="true" className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                  <span className="relative">Start learning free</span>
                  <ArrowRight className="relative w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <Link
                  href="/courses"
                  className="group inline-flex items-center gap-2 bg-secondary/40 hover:bg-secondary/70 backdrop-blur-sm border border-border hover:border-orange-500/30 text-foreground text-[15px] px-6 py-3 rounded-md font-medium transition-all"
                >
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-orange-500/20 group-hover:bg-orange-500/30 transition-colors">
                    <Play className="w-2.5 h-2.5 text-orange-500 fill-current ml-0.5" />
                  </span>
                  Browse courses
                </Link>
              </div>
            </FadeInSection>

            {/* Reassurance */}
            <FadeInSection delay={0.24}>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                No credit card required
              </div>
            </FadeInSection>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════════
          WHY COACHNEST — bento feature grid
      ═══════════════════════════════════════════════════════════════════════════ */}
      <FeatureBento />

      {/* ═══════════════════════════════════════════════════════════════════════════
          PRODUCT PREVIEW — interactive dashboard demo
      ═══════════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 overflow-hidden">
        <div className="mx-auto">
          <FadeInSection>
            <div className="text-center mb-12">
              <span className="inline-flex items-center gap-2 bg-orange-500/[0.07] border border-orange-500/20 text-[#d97757] text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
                Product Preview
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 tracking-tight">
                Take a peek <span className="text-[#d97757]">inside</span>
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg">
                Click through the sidebar to explore your dashboard, courses, quizzes,
                certificates, and community — exactly as you&apos;ll see them.
              </p>
            </div>
          </FadeInSection>
          <FadeInSection delay={0.1}>
            <HeroPreview />
          </FadeInSection>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════════
          HOW IT WORKS — 4-step process
      ═══════════════════════════════════════════════════════════════════════════ */}
      <section className="py-28 relative overflow-hidden">

        <div className="mx-auto relative">
          <FadeInSection>
            <div className="text-center mb-20">
              <span className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 text-[#d97757] text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
                How It Works
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Start learning in{" "}
                <span className="text-[#d97757]">4 simple steps</span>
              </h2>
              <p className="text-white/40 max-w-xl mx-auto text-lg">
                From sign-up to certificate — your learning journey made simple.
              </p>
            </div>
          </FadeInSection>

          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5 md:gap-6">
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
                          <Icon className="w-5 h-5 text-[#d97757]" />
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


      {/* ═══════════════════════════════════════════════════════════════════════════
          FEATURED COURSES — streams in after page shell
      ═══════════════════════════════════════════════════════════════════════════ */}
      <Suspense fallback={<FeaturedCoursesSkeleton />}>
        <FeaturedCoursesSection promise={coursesPromise} />
      </Suspense>

      {/* ═══════════════════════════════════════════════════════════════════════════
          BIG STATS SECTION — streams in after page shell
      ═══════════════════════════════════════════════════════════════════════════ */}
      <Suspense fallback={<StatsSkeleton />}>
        <StatsSection promise={statsPromise} />
      </Suspense>

      {/* ═══════════════════════════════════════════════════════════════════════════
          LEARNING EXPERIENCE — Split section
      ═══════════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 px-4 sm:px-6 md:px-7 lg:px-8">
        <div className="mx-auto">
          <FadeInSection>
            <div className="text-center mb-16">
              <span className="inline-flex items-center gap-1.5 bg-orange-500/[0.07] border border-orange-500/20 text-[#d97757] text-xs font-medium uppercase tracking-widest px-3 py-1 rounded-full mb-4 mx-auto">
                <Sparkles className="w-3 h-3" />
                Learning Experience
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                A learning experience <span className="text-[#d97757]">designed for you</span>
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
                Our platform adapts to your learning style. Whether you prefer video lessons,
                reading material, or hands-on quizzes, we have you covered with a seamless workflow.
              </p>
            </div>
          </FadeInSection>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
            {[
              { title: "Video Lessons", text: "HD video lessons with code-along exercises to master practical skills.", icon: Play, color: "text-[#d97757]", bg: "bg-orange-500/10" },
              { title: "Syntax Highlighting", text: "Rich text lessons with syntax-highlighted code for better readability.", icon: Code, color: "text-blue-400", bg: "bg-blue-500/10" },
              { title: "Adaptive Quizzes", text: "Interactive quizzes to reinforce concepts and test your knowledge.", icon: Target, color: "text-emerald-400", bg: "bg-emerald-500/10" },
              { title: "Certifications", text: "Downloadable certificates of completion to showcase your achievements.", icon: Award, color: "text-yellow-400", bg: "bg-yellow-500/10" },
              { title: "Analytics", text: "Deep progress tracking across all your courses with visual insights.", icon: BarChart3, color: "text-pink-400", bg: "bg-pink-500/10" },
              { title: "Mobile Ready", text: "Mobile-friendly platform — learn anywhere, anytime on any device.", icon: Smartphone, color: "text-violet-400", bg: "bg-violet-500/10" },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <FadeInSection key={item.title} delay={idx * 0.08}>
                  <div className="group p-1 rounded-xl bg-gradient-to-br from-white/5 to-transparent border border-white/5 hover:border-orange-500/20 transition-all h-full">
                    <div className="p-5 flex flex-col gap-4 h-full">
                      <div className={`w-10 h-10 rounded-lg ${item.bg} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                        <Icon className={`w-5 h-5 ${item.color}`} />
                      </div>
                      <div>
                        <h4 className="text-white font-semibold text-base mb-2">{item.title}</h4>
                        <p className="text-muted-foreground text-sm leading-relaxed">{item.text}</p>
                      </div>
                    </div>
                  </div>
                </FadeInSection>
              );
            })}
          </div>
          <FadeInSection delay={0.4}>
            <div className="mt-16 text-center">
              <Link href="/signup" className="btn-primary px-8 py-3">
                Start Learning For Free
              </Link>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════════
          TESTIMONIALS
          <section className="py-24  relative">
        <div className="absolute inset-0 " />
        <div className="mx-auto relative">
          <FadeInSection>
            <div className="text-center mb-16">
              <span className="inline-block text-[#d97757] text-sm font-semibold uppercase tracking-widest mb-3">
                Testimonials
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                What our students{" "}
                <span className="text-[#d97757]">say</span>
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
                comment: "Coachnest's React course completely changed my career. The hands-on projects and quizzes helped me land my dream job. The certificate was a great addition to my LinkedIn profile.",
                rating: 5,
                avatar: "PS",
              },
              {
                name: "Alex Chen",
                role: "Full-Stack Engineer",
                comment: "I've tried many platforms, but Coachnest stands out. The bite-sized lessons fit perfectly into my busy schedule, and the progress tracking keeps me motivated every day.",
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
                comment: "As a complete beginner, I was nervous about learning to code. Coachnest made it approachable and fun. The free courses are genuinely high quality — no catch.",
                rating: 4,
                avatar: "ED",
              },
              {
                name: "Michael Torres",
                role: "CTO at TechStart",
                comment: "We onboard all new engineers with Coachnest courses. The structured content and certificates make it easy to track team progress. Enterprise plan is worth every penny.",
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
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
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
              <span className="inline-block text-[#d97757] text-sm font-semibold uppercase tracking-widest mb-3">
                Teach on Coachnest
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                Share your knowledge,{" "}
                <span className="text-[#d97757]">earn income</span>
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
          COMPARISON TABLE — Why Coachnest vs Others
      ═══════════════════════════════════════════════════════════════════════════ */}
      <CompareSection />

      {/* ═══════════════════════════════════════════════════════════════════════════
          REVIEWS MARQUEE — streams in after page shell
      ═══════════════════════════════════════════════════════════════════════════ */}
      <Suspense fallback={<ReviewsSkeleton />}>
        <ReviewsSection promise={reviewsPromise} />
      </Suspense>

      {/* ═══════════════════════════════════════════════════════════════════════════
          FAQ
      ═══════════════════════════════════════════════════════════════════════════ */}
      <section className="py-24  relative">
        <div className="absolute inset-0 " />
        <div className="max-w-3xl mx-auto relative">
          <FadeInSection>
            <div className="text-center mb-12">
              <span className="inline-block text-[#d97757] text-sm font-semibold uppercase tracking-widest mb-3">
                FAQ
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Frequently asked{" "}
                <span className="text-[#d97757]">questions</span>
              </h2>
              <p className="text-muted-foreground/70 text-lg">
                Everything you need to know about Coachnest.
              </p>
            </div>
          </FadeInSection>

          <FadeInSection delay={0.1}>
            <div className="space-y-3">
              {[
                {
                  question: "Is Coachnest really free to get started?",
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
                  answer: "We accept all major credit/debit cards and UPI through our secure Razorpay payment gateway. All transactions are encrypted and PCI-DSS compliant.",
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
                <Link href="/contact" className="text-[#d97757] hover:text-orange-300 transition-colors underline underline-offset-2">
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
      <section className="py-24">

        <div className="mx-auto relative">
          <FadeInSection>
            <div className="relative rounded-md border border-border bg-secondary/10 overflow-hidden shadow-card">
              {/* Top accent bar */}
              <div className="h-[3px] w-full bg-gradient-to-r from-transparent via-primary to-transparent" />

              <div className="px-4 py-12 sm:px-8 sm:py-16 md:px-12 md:py-20 text-center">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 text-sm text-primary font-medium mb-8">
                  <Sparkles className="w-3.5 h-3.5" />
                  Join 10,000+ learners today
                </div>

                {/* Heading */}
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-5 leading-tight tracking-tight">
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

// ─── Async server components (stream in after page shell) ────────────────────

async function FeaturedCoursesSection({
  promise,
}: {
  promise: ReturnType<typeof getFeaturedCourses>;
}) {
  const courses = await promise;
  if (courses.length === 0) return null;

  return (
    <section className="py-20 relative">
      <div className="mx-auto relative">
        <FadeInSection>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-12 gap-5">
            <div>
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500/20 to-orange-500/5 border border-orange-500/20 rounded-full px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-[#d97757] mb-4 shadow-[0_0_15px_rgba(249,115,22,0.1)]">
                <Sparkles className="w-3.5 h-3.5 text-[#d97757] animate-pulse" /> Trending Now
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                Featured <span className="text-[#ea580c]">Courses</span>
              </h2>
              <p className="text-muted-foreground mt-3 text-[15px] sm:text-lg max-w-xl">
                Hand-picked by our instructors — start with the best and accelerate your career today.
              </p>
            </div>
            <Link
              href="/courses"
              className="group inline-flex items-center gap-2 border border-border text-muted-foreground hover:text-foreground hover:border-[#ea580c]/40 text-sm font-medium px-5 py-2.5 rounded-lg transition-all shrink-0"
            >
              View all courses <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </FadeInSection>

        <StaggerChildren className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 md:gap-4" staggerDelay={0.05}>
          {courses.map((course) => {
            const avg = course.reviews.length
              ? Number((course.reviews.reduce((s, r) => s + r.rating, 0) / course.reviews.length).toFixed(1))
              : 0;
            return (
              <StaggerItem key={course.id}>
                <FeaturedCourseCard
                  id={course.id}
                  title={course.title}
                  thumbnail={course.thumbnail}
                  instructorName={course.createdBy.name}
                  isFree={course.isFree}
                  level={course.level}
                  price={course.price ? Number(course.price) : null}
                  discountPrice={course.discountPrice ? Number(course.discountPrice) : null}
                  enrollmentCount={course._count.enrollments}
                  avgRating={avg}
                />
              </StaggerItem>
            );
          })}
        </StaggerChildren>

        {courses.length >= 6 && (
          <FadeInSection>
            <div className="text-center mt-10">
              <Link href="/courses" className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-600/15 to-orange-500/15 border border-[#d97757]/25 text-orange-300 hover:text-white hover:border-[#d97757]/25 hover:from-orange-600/25 hover:to-orange-500/15 font-medium text-sm px-7 py-2.5 rounded-md transition-all hover:-translate-y-0.5">
                Browse All Courses <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </FadeInSection>
        )}
      </div>
    </section>
  );
}

async function StatsSection({
  promise,
}: {
  promise: ReturnType<typeof getStats>;
}) {
  const stats = await promise;

  return (
    <section className="py-24 relative">
      <div className="mx-auto">
        <div className="bg-secondary/30 border border-border rounded-md p-10 sm:p-16">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 md:gap-10">
            {[
              { end: Math.max(stats.courseCount, 20), suffix: "+", label: "Expert Courses", icon: BookOpen, color: "text-[#d97757]" },
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
  );
}

async function ReviewsSection({
  promise,
}: {
  promise: ReturnType<typeof getLandingReviews>;
}) {
  const rawReviews = await promise;
  const reviews = rawReviews
    .filter((r) => r.comment && r.comment.trim().length > 15)
    .map((r) => ({
      id:     r.id,
      name:   r.user.name,
      role:   r.course.title,
      avatar: r.user.avatar ?? null,
      seed:   r.user.id,
      rating: r.rating,
      text:   r.comment!,
    }));
  return <ReviewsMarquee reviews={reviews} />;
}

// ─── Skeleton fallbacks ───────────────────────────────────────────────────────

function FeaturedCoursesSkeleton() {
  return (
    <section className="py-20">
      <div className="mx-auto">
        <div className="h-7 w-48 rounded bg-white/[.04] animate-pulse mb-4" />
        <div className="h-10 w-72 rounded bg-white/[.04] animate-pulse mb-12" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 md:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 rounded-md bg-white/[.03] animate-pulse border border-white/5" />
          ))}
        </div>
      </div>
    </section>
  );
}

function StatsSkeleton() {
  return (
    <section className="py-24">
      <div className="mx-auto">
        <div className="bg-secondary/30 border border-border rounded-md p-10 sm:p-16">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 md:gap-10">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded bg-white/[.05] animate-pulse" />
                <div className="h-12 w-28 rounded bg-white/[.05] animate-pulse" />
                <div className="h-4 w-24 rounded bg-white/[.04] animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ReviewsSkeleton() {
  return (
    <section className="py-16 overflow-hidden space-y-3">
      <div className="h-28 w-full bg-white/[.02] animate-pulse rounded" />
      <div className="h-28 w-full bg-white/[.02] animate-pulse rounded" />
    </section>
  );
}
