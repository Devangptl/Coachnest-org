"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye, EyeOff, Loader2, Mail, Lock,
  Star, Users, BookOpen, TrendingUp,
  ArrowRight, AlertCircle, Award, MailCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Static data ─────────────────────────────────────────────────────────────

const STATS = [
  { icon: Users,      value: "12k+", label: "Learners"   },
  { icon: BookOpen,   value: "500+", label: "Courses"    },
  { icon: TrendingUp, value: "94%",  label: "Completion" },
];

const TESTIMONIAL = {
  quote:    "Coachnest completely changed how I approach learning. I landed my first dev job 4 months after finishing the React course.",
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

  const [email,            setEmail]            = useState("");
  const [password,         setPassword]         = useState("");
  const [showPass,         setShowPass]         = useState(false);
  const [error,            setError]            = useState("");
  const [unconfirmedEmail, setUnconfirmedEmail] = useState("");
  const [loading,          setLoading]          = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setUnconfirmedEmail("");
    setLoading(true);
    try {
      const res  = await fetch("/api/auth/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "email_not_confirmed") {
          setUnconfirmedEmail(data.email ?? email);
        } else {
          setError(data.error ?? "Login failed.");
        }
        return;
      }
      const isPendingInstructor =
        data.role === "INSTRUCTOR" &&
        (data.instructorStatus === "PENDING" || data.instructorStatus === "REJECTED");
      router.push(
        data.role === "ADMIN"      ? "/admin" :
        data.role === "INSTRUCTOR" ? (isPendingInstructor ? "/instructor/pending" : "/instructor") :
        "/dashboard",
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
      <aside className="hidden md:flex md:w-[28%] lg:w-[30%] xl:w-[33%] flex-col overflow-hidden">

        <div className="flex flex-col items-center justify-center h-full px-10 py-9">

          {/* Logo */}
          <Link href="/"><img src="/logo.png" alt="Coachnest" className="h-7 w-auto object-contain self-start" /></Link>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════════════
          RIGHT — form panel
      ══════════════════════════════════════════════════════════════════ */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 sm:px-8 md:px-10 py-12 bg-background">
        <div className="md:hidden mb-8">
          <Link href="/"><img src="/logo.png" alt="Coachnest" className="h-6 w-auto object-contain mx-auto" /></Link>
        </div>

        <div className="w-full max-w-[360px] sm:max-w-[400px] md:max-w-[440px] animate-fade-in">
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

            {unconfirmedEmail && (
              <div className="flex items-start gap-2.5 bg-amber-500/10 border border-amber-500/25
                              rounded-lg px-4 py-3.5 animate-fade-in">
                <MailCheck className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-400 text-sm font-medium">Email not confirmed</p>
                  <p className="text-amber-400/70 text-xs mt-0.5 leading-relaxed">
                    Please confirm your email before signing in.{" "}
                    <Link
                      href={`/confirm-email?email=${encodeURIComponent(unconfirmedEmail)}`}
                      className="text-amber-400 underline underline-offset-2 hover:text-amber-300 transition-colors"
                    >
                      Resend confirmation email
                    </Link>
                  </p>
                </div>
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
                  className="text-xs text-orange-500 hover:text-[#d97757] transition-colors">
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
            <Link href="/signup" className="text-orange-500 hover:text-[#d97757] font-medium transition-colors">
              Create one free
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
