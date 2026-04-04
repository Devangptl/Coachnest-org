"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import HeroBackground from "@/components/landing/HeroBackground";
import { Mail, ArrowRight, Sparkles, BookOpen, Users, Zap, BarChart3 } from "lucide-react";

// ── Countdown hook ───────────────────────────────────────────────────────────
function useCountdown(target: Date) {
  const [t, setT] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    function calc() {
      const diff = target.getTime() - Date.now();
      if (diff <= 0) { setT({ days: 0, hours: 0, minutes: 0, seconds: 0 }); return; }
      setT({
        days:    Math.floor(diff / 86_400_000),
        hours:   Math.floor((diff / 3_600_000) % 24),
        minutes: Math.floor((diff / 60_000)    % 60),
        seconds: Math.floor((diff / 1_000)     % 60),
      });
    }
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [target]);

  return t;
}

// ── Set your public launch date here ────────────────────────────────────────
const LAUNCH_DATE = new Date("2026-08-01T00:00:00Z");

const FEATURES = [
  { icon: BookOpen, label: "Expert-crafted courses" },
  { icon: Users,    label: "Live community sessions" },
  { icon: Zap,      label: "AI-powered learning paths" },
  { icon: BarChart3,label: "Progress & analytics" },
];

const COUNTDOWN_UNITS = ["Days", "Hours", "Minutes", "Seconds"] as const;

export default function LaunchPage() {
  const { days, hours, minutes, seconds } = useCountdown(LAUNCH_DATE);
  const values = [days, hours, minutes, seconds];

  const [email, setEmail]         = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
      } else {
        setSubmitted(true);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    // fixed + z-[100] covers the Navbar rendered by root layout
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-background">

      {/* ── Animated background ─────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <HeroBackground />
        {/* Mirror the root-layout glow orbs */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-orange-600/[.07] rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-80 h-80 bg-orange-500/[.04] rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-amber-600/[.04] rounded-full blur-3xl" />
      </div>

      {/* ── Page content ────────────────────────────────────────────────── */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-20 text-center">

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-7"
        >
          <span className="badge badge-orange inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            Something exciting is coming
          </span>
        </motion.div>

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.08 }}
          className="mb-6 flex items-center gap-3"
        >
          <img src="/logo.png" alt="CoachNest" className="h-10 w-auto max-w-[180px] object-contain" />
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.15 }}
          className="text-4xl sm:text-4xl lg:text-5xl font-bold tracking-[-0.04em] leading-[1.1] max-w-3xl mb-6"
        >
          We&apos;re launching{" "}
          <span className="bg-gradient-to-r from-orange-600 via-orange-500 to-orange-400 bg-clip-text text-transparent">
            very soon
          </span>
        </motion.h1>

        {/* Sub-headline */}
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.22 }}
          className="text-lg text-muted-foreground max-w-xl mb-12 leading-relaxed"
        >
          CoachNest is a modern learning platform where expert instructors and
          curious learners connect. Master new skills at your own pace.
        </motion.p>

        {/* Countdown */}
        {/* <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.3 }}
          className="grid grid-cols-4 gap-3 sm:gap-4 mb-12"
        >
          {COUNTDOWN_UNITS.map((label, i) => (
            <div
              key={label}
              className="glass flex flex-col items-center justify-center rounded-xl p-4 sm:p-6 min-w-[70px] sm:min-w-[90px]"
            >
              <span className="text-3xl sm:text-4xl font-bold text-foreground tabular-nums leading-none">
                {String(values[i]).padStart(2, "0")}
              </span>
              <span className="mt-2 text-[10px] sm:text-xs text-muted-foreground uppercase tracking-widest">
                {label}
              </span>
            </div>
          ))}
        </motion.div> */}

        {/* Email / waitlist form */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.38 }}
          className="w-full max-w-md mb-10"
        >
          {submitted ? (
            <div className="glass border-orange-400/30 shadow-glow flex items-center justify-center gap-2.5 py-4 px-6 rounded-xl text-orange-400 font-medium">
              <Sparkles className="w-4 h-4 shrink-0" />
              You&apos;re on the list — we&apos;ll be in touch!
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="input-glass w-full pl-10 pr-4 py-3 rounded-lg text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-medium whitespace-nowrap disabled:opacity-60"
              >
                {loading ? (
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <>
                    Notify me
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
          {error && (
            <p className="mt-2 text-xs text-red-400">{error}</p>
          )}
          <p className="mt-2.5 text-xs text-muted-foreground/60">
            No spam, ever. Unsubscribe at any time.
          </p>
        </motion.div>

        {/* Feature pills */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.46 }}
          className="flex flex-wrap items-center justify-center gap-3 mb-16"
        >
          {FEATURES.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 bg-card border border-border rounded-full px-4 py-2 text-sm text-muted-foreground"
            >
              <Icon className="w-3.5 h-3.5 text-orange-500" />
              {label}
            </div>
          ))}
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-xs text-muted-foreground/40"
        >
          © {new Date().getFullYear()} CoachNest. All rights reserved.
        </motion.p>
      </div>
    </div>
  );
}
