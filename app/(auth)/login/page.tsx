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
import { supabaseClient } from "@/lib/supabase/client";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

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

/** Only honor app-internal absolute paths — never protocol-relative or external. */
function safeReturnPath(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  if (raw.startsWith("/login")) return null;
  return raw;
}

export default function LoginPage() {
  const router = useRouter();

  const [email,            setEmail]            = useState("");
  const [password,         setPassword]         = useState("");
  const [showPass,         setShowPass]         = useState(false);
  const [error,            setError]            = useState("");
  const [unconfirmedEmail, setUnconfirmedEmail] = useState("");
  const [loading,          setLoading]          = useState(false);
  const [googleLoading,    setGoogleLoading]    = useState(false);

  async function handleGoogleSignIn() {
    setError("");
    setGoogleLoading(true);
    const from = safeReturnPath(new URLSearchParams(window.location.search).get("from"));
    const callback = `${window.location.origin}/auth/callback${
      from ? `?next=${encodeURIComponent(from)}` : ""
    }`;
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callback,
      },
    });
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  }

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
      // Org-only build: the only platform home is /admin (ADMIN) — every other
      // role lands on /org/register, matching the middleware auth-page guard.
      // (There is no /dashboard or root /instructor route here.)
      const roleHome = data.role === "ADMIN" ? "/admin" : "/org/register";
      // Honor the return path set by middleware (e.g. /org/<slug>/... or any
      // protected route the user was sent here from); route guards re-validate
      // access, so an unauthorized target just bounces to the role home.
      const from = safeReturnPath(new URLSearchParams(window.location.search).get("from"));
      router.push(from ?? roleHome);
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

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4
                       border border-border rounded-lg bg-card hover:bg-secondary
                       text-sm font-medium text-foreground transition-colors
                       disabled:opacity-60 disabled:cursor-not-allowed mb-6"
          >
            {googleLoading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <GoogleIcon />}
            Continue with Google
          </button>

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
