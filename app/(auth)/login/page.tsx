"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye, EyeOff, Loader2, Mail, Lock,
  Star, Users, BookOpen, TrendingUp,
  ArrowRight, AlertCircle, Award,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Static data ─────────────────────────────────────────────────────────────

const STATS = [
  { icon: Users,      value: "12k+", label: "Learners"   },
  { icon: BookOpen,   value: "500+", label: "Courses"    },
  { icon: TrendingUp, value: "94%",  label: "Completion" },
];

const TESTIMONIAL = {
  quote:    "CoachNest completely changed how I approach learning. I landed my first dev job 4 months after finishing the React course.",
  name:     "Sarah Mitchell",
  role:     "Frontend Developer",
  initials: "SM",
};

const LESSONS: Array<true | "active" | false> = [
  true, true, true, true, true, "active", false, false, false, false,
];

// ── Component ───────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res  = await fetch("/api/auth/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Login failed."); return; }
      router.push(
        data.role === "ADMIN"      ? "/admin" :
        data.role === "INSTRUCTOR" ? "/instructor" : "/dashboard",
      );
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ══════════════════════════════════════════════════════════════════
          LEFT — brand panel (no background — inherits app bg)
      ══════════════════════════════════════════════════════════════════ */}
      <aside className="hidden lg:flex lg:w-[45%] xl:w-[44%] flex-col overflow-hidden
                        border-r border-border">

        <div className="flex flex-col h-full px-10 py-9">

          {/* Logo */}
          <Link href="/"><img src="/logo.png" alt="CoachNest" className="h-7 w-auto object-contain self-start" /></Link>

          <div className="flex-1 flex flex-col justify-center gap-0 mt-6">

            {/* ── Headline ── */}
            <div className="mb-7">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border
                               border-orange-500/25 bg-orange-500/10 text-orange-400
                               text-[11px] font-semibold tracking-wide uppercase mb-5">
                <Star className="w-3 h-3 fill-current" />
                Trusted learning platform
              </span>

              <h2 className="text-[2.1rem] xl:text-[2.4rem] font-bold leading-[1.12] mb-3 text-foreground">
                Accelerate your<br />
                <span className="hero-gradient-text">learning journey</span>
              </h2>
              <p className="text-sm leading-relaxed max-w-[260px] text-muted-foreground">
                Access world-class courses, connect with expert instructors, and reach your goals faster.
              </p>
            </div>

            {/* ── Floating course card ── */}
            <div className="relative mb-7">

              {/* Achievement badge */}
              <div className="absolute -top-3.5 -right-2 z-10 flex items-center gap-2
                              rounded-xl border border-border bg-card shadow-md px-3 py-2">
                <div className="w-6 h-6 rounded-full bg-amber-400/20 flex items-center justify-center flex-shrink-0">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="leading-none">
                  <div className="text-[10px] font-bold mb-0.5 text-foreground">Badge Earned!</div>
                  <div className="text-[9px] text-muted-foreground">React Expert</div>
                </div>
              </div>

              {/* Course card */}
              <div className="rounded-2xl border border-border bg-card shadow-card p-5">
                {/* Header */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-400
                                  flex items-center justify-center flex-shrink-0
                                  shadow-lg shadow-orange-500/20">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate text-foreground">
                      React Masterclass 2025
                    </div>
                    <div className="text-xs mt-0.5 text-muted-foreground">by Alice Chen · 42 lessons</div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0
                                   text-emerald-500 bg-emerald-500/10 border-emerald-500/20">
                    Active
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-muted-foreground">Progress</span>
                    <span className="text-xs font-bold text-orange-400">68%</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full w-[68%] rounded-full
                                    bg-gradient-to-r from-orange-500 to-amber-400" />
                  </div>
                </div>

                {/* Lesson dots */}
                <div className="flex items-center gap-1">
                  {LESSONS.map((state, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex-1 h-1.5 rounded-full transition-all",
                        state === true     ? "bg-orange-500" :
                        state === "active" ? "bg-orange-400/50 ring-1 ring-orange-400/60" :
                                             "bg-border",
                      )}
                    />
                  ))}
                </div>

                {/* Next lesson */}
                <div className="mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-xs
                                bg-orange-500/8 border border-orange-500/15">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0 animate-pulse" />
                  <span className="font-medium text-orange-400">
                    Next: Hooks &amp; State Management
                  </span>
                </div>
              </div>
            </div>

            {/* ── Stats ── */}
            <div className="grid grid-cols-3 divide-x divide-border rounded-2xl border border-border
                            overflow-hidden bg-card mb-7">
              {STATS.map(({ icon: Icon, value, label }) => (
                <div key={label} className="flex flex-col items-center py-4 px-2">
                  <Icon className="w-4 h-4 text-orange-400 mb-1.5 opacity-80" />
                  <span className="text-xl font-bold leading-none mb-0.5 text-foreground">{value}</span>
                  <span className="text-[11px] text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>

            {/* ── Testimonial ── */}
            <div className="rounded-2xl border border-border bg-card shadow-card p-5 relative overflow-hidden">
              {/* Decorative quote mark */}
              <div className="absolute -top-3 -left-1 text-[90px] font-serif leading-none
                              select-none pointer-events-none text-orange-500/10">
                &ldquo;
              </div>
              <div className="relative">
                <div className="flex gap-0.5 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-current" />
                  ))}
                </div>
                <p className="text-[0.82rem] leading-relaxed mb-4 text-muted-foreground">
                  {TESTIMONIAL.quote}
                </p>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-500
                                  flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {TESTIMONIAL.initials}
                  </div>
                  <div>
                    <div className="text-sm font-semibold leading-none mb-0.5 text-foreground">
                      {TESTIMONIAL.name}
                    </div>
                    <div className="text-xs text-muted-foreground">{TESTIMONIAL.role}</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════════════
          RIGHT — form panel
      ══════════════════════════════════════════════════════════════════ */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 sm:px-10 py-12 bg-background">
        <div className="lg:hidden mb-8">
          <Link href="/"><img src="/logo.png" alt="CoachNest" className="h-6 w-auto object-contain mx-auto" /></Link>
        </div>

        <div className="w-full max-w-[400px] animate-fade-in">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-1.5 tracking-tight">Welcome back</h1>
            <p className="text-muted-foreground text-sm">Sign in to continue your learning journey</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {error && (
              <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20
                              rounded-lg px-4 py-3 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div>
              <label className="label" htmlFor="email">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4
                                  text-muted-foreground/50 pointer-events-none" />
                <input id="email" type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-glass pl-10" placeholder="you@example.com"
                  required autoComplete="email" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label !mb-0" htmlFor="password">Password</label>
                <Link href="/forgot-password"
                  className="text-xs text-orange-500 hover:text-orange-400 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4
                                  text-muted-foreground/50 pointer-events-none" />
                <input id="password" type={showPass ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-glass pl-10 pr-12" placeholder="••••••••"
                  required autoComplete="current-password" />
                <button type="button" tabIndex={-1} onClick={() => setShowPass(!showPass)}
                  aria-label={showPass ? "Hide password" : "Show password"}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2
                             text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2 group">
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
                : <>Sign In <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" /></>}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-orange-500 hover:text-orange-400 font-medium transition-colors">
              Create one free
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
