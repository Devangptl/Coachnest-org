"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye, EyeOff, Loader2, Mail, Lock, User,
  GraduationCap, Star, BookOpen, Award, Globe,
  ArrowRight, AlertCircle, Zap, BarChart3, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Role = "STUDENT" | "INSTRUCTOR";

// ── Password strength ───────────────────────────────────────────────────────

function passwordStrength(pwd: string) {
  if (!pwd) return { score: 0, label: "", barColor: "", textColor: "" };
  let s = 0;
  if (pwd.length >= 8)           s++;
  if (pwd.length >= 12)          s++;
  if (/[A-Z]/.test(pwd))        s++;
  if (/[0-9]/.test(pwd))        s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  const map = [
    { label: "Weak",   barColor: "bg-red-500",     textColor: "text-red-400"     },
    { label: "Weak",   barColor: "bg-red-500",     textColor: "text-red-400"     },
    { label: "Fair",   barColor: "bg-amber-400",   textColor: "text-amber-400"   },
    { label: "Good",   barColor: "bg-yellow-400",  textColor: "text-yellow-400"  },
    { label: "Strong", barColor: "bg-emerald-400", textColor: "text-emerald-400" },
    { label: "Great",  barColor: "bg-emerald-500", textColor: "text-emerald-500" },
  ];
  return { score: s, ...map[s] };
}

// ── Static panel data ───────────────────────────────────────────────────────

const STUDENT_PERKS = [
  { icon: BookOpen,  text: "500+ expert-curated courses",   sub: "From beginner to advanced"    },
  { icon: Award,     text: "Earn verified certificates",     sub: "Recognised by top companies"  },
  { icon: BarChart3, text: "Track progress with analytics", sub: "Stay on top of your goals"    },
  { icon: Globe,     text: "Learn from anywhere, anytime",  sub: "Fully self-paced"             },
];

const INSTRUCTOR_PERKS = [
  { icon: Globe,    text: "Reach a global audience",        sub: "12,000+ active learners"      },
  { icon: Award,    text: "Build your personal brand",      sub: "Grow your following"           },
  { icon: BookOpen, text: "Powerful creation tools",        sub: "Video, quiz & text lessons"   },
  { icon: Zap,      text: "Earn while you teach",           sub: "Competitive revenue share"    },
];

const AVATARS = [
  { initials: "AL", color: "from-orange-500 to-amber-500"  },
  { initials: "BM", color: "from-rose-500   to-orange-500" },
  { initials: "CJ", color: "from-violet-500 to-purple-500" },
  { initials: "DK", color: "from-sky-500    to-blue-500"   },
];

// ── Component ───────────────────────────────────────────────────────────────

export default function SignupPage() {
  const router = useRouter();

  const [role,     setRole]     = useState<Role>("STUDENT");
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const strength = passwordStrength(password);
  const perks    = role === "INSTRUCTOR" ? INSTRUCTOR_PERKS : STUDENT_PERKS;
  const stat     = role === "INSTRUCTOR"
    ? { value: "$3,200", label: "avg. monthly earnings"    }
    : { value: "94%",    label: "learners meet their goals" };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res  = await fetch("/api/auth/signup", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Signup failed."); return; }
      // Students go through onboarding to select professions; instructors skip it.
      router.push(role === "INSTRUCTOR" ? "/instructor" : "/onboarding");
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
      <aside className="hidden lg:flex lg:w-[30%] xl:w-[33%] flex-col overflow-hidden">

        <div className="flex flex-col items-center justify-center h-full px-10 py-9">
          {/* Logo */}
          <Link href="/"><img src="/logo.png" alt="CoachNest" className="h-7 w-auto object-contain self-start" /></Link>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════════════
          RIGHT — form panel
      ══════════════════════════════════════════════════════════════════ */}
      <main className="flex-1 flex flex-col items-center justify-center
                       px-6 sm:px-10 py-10 bg-background overflow-y-auto">
        <div className="lg:hidden mb-8">
          <Link href="/"><img src="/logo.png" alt="CoachNest" className="h-6 w-auto object-contain mx-auto" /></Link>
        </div>

        <div className="w-full max-w-[420px] animate-fade-in">
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-foreground mb-1.5 tracking-tight">
              Create your account
            </h1>
            <p className="text-muted-foreground text-sm">
              Join as a student or instructor — it&apos;s free
            </p>
          </div>

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-2 mb-6 p-1 rounded-md bg-secondary border border-border">
            {(["STUDENT", "INSTRUCTOR"] as Role[]).map((r) => {
              const Icon   = r === "STUDENT" ? User : GraduationCap;
              const active = role === r;
              return (
                <button key={r} type="button" onClick={() => setRole(r)}
                  className={cn(
                    "flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200",
                    active
                      ? "bg-card border border-border text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}>
                  <Icon className={cn("w-4 h-4", active ? "text-orange-500" : "")} />
                  {r === "STUDENT" ? "Student" : "Instructor"}
                </button>
              );
            })}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {error && (
              <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20
                              rounded-lg px-4 py-3 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div>
              <label className="label" htmlFor="name">Full name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4
                                  text-muted-foreground/50 pointer-events-none" />
                <input id="name" type="text" value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-glass pl-10" placeholder="Jane Doe"
                  required autoComplete="name" />
              </div>
            </div>

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
              <label className="label" htmlFor="password">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4
                                  text-muted-foreground/50 pointer-events-none" />
                <input id="password" type={showPass ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-glass pl-10 pr-12" placeholder="Min. 6 characters"
                  minLength={6} required autoComplete="new-password" />
                <button type="button" tabIndex={-1} onClick={() => setShowPass(!showPass)}
                  aria-label={showPass ? "Hide password" : "Show password"}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2
                             text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {password && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <div key={n} className={cn(
                        "h-1 flex-1 rounded-full transition-all duration-300",
                        n <= strength.score ? strength.barColor : "bg-border",
                      )} />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Strength:{" "}
                    <span className={cn("font-medium", strength.textColor)}>{strength.label}</span>
                  </p>
                </div>
              )}
            </div>

            <p className="text-[0.78rem] text-muted-foreground leading-relaxed">
              By creating an account you agree to our{" "}
              <Link href="/legal/terms-of-service" className="text-orange-500 hover:text-[#d97757] cursor-pointer transition-colors">Terms</Link>
              {" "}and{" "}
              <Link href="/legal/privacy-policy" className="text-orange-500 hover:text-[#d97757] cursor-pointer transition-colors">Privacy Policy</Link>.
            </p>

            <button type="submit" disabled={loading} className="btn-primary w-full group">
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</>
                : <>Join as {role === "INSTRUCTOR" ? "Instructor" : "Student"}
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" /></>}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-orange-500 hover:text-[#d97757] font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
