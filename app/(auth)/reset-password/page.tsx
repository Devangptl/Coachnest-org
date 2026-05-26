"use client";

import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import { Lock, Eye, EyeOff, ArrowRight, Loader2, CheckCircle2, AlertCircle, ShieldAlert } from "lucide-react";
import { supabaseClient as supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

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

// ── Inner component (needs useSearchParams) ─────────────────────────────────

function ResetPasswordForm() {
  const [status,      setStatus]      = useState<"loading" | "ready" | "invalid" | "done">("loading");
  const [password,    setPassword]    = useState("");
  const [confirm,     setConfirm]     = useState("");
  const [showPass,    setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error,       setError]       = useState("");
  const [submitting,  setSubmitting]  = useState(false);

  const strength = passwordStrength(password);

  useEffect(() => {
    const hash   = new URLSearchParams(window.location.hash.slice(1));
    const search = new URLSearchParams(window.location.search);

    // Supabase puts errors in the hash fragment before we even load —
    // detect and bail immediately instead of waiting for a timeout.
    if (hash.get("error")) {
      setStatus("invalid");
      return;
    }

    const code        = search.get("code");           // PKCE flow
    const accessToken = hash.get("access_token");     // implicit flow
    const tokenType   = hash.get("type");

    if (!code && !accessToken) {
      setStatus("invalid");
      return;
    }

    let settled = false;
    const settle = (valid: boolean) => {
      if (settled) return;
      settled = true;
      setStatus(valid ? "ready" : "invalid");
    };

    // Subscribe first so we don't miss the event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") settle(true);
      // implicit flow signs the user in directly
      if (event === "SIGNED_IN" && tokenType === "recovery") settle(true);
    });

    // Fallback: exchange may have completed before we subscribed
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) settle(true);
    });

    const timer = setTimeout(() => settle(false), 8000);

    return () => { subscription.unsubscribe(); clearTimeout(timer); };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) { setError(error.message); return; }

      // Sign out so the user logs in fresh with the new password
      await supabase.auth.signOut();
      setStatus("done");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <Loader2 className="w-8 h-8 text-[#d97757] animate-spin" />
        <p className="text-muted-foreground text-sm">Verifying your reset link…</p>
      </div>
    );
  }

  // ── Invalid / expired token ──────────────────────────────────────────────
  if (status === "invalid") {
    return (
      <div className="text-center py-4">
        <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20
                        flex items-center justify-center mx-auto mb-5">
          <ShieldAlert className="w-7 h-7 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Link expired or invalid</h2>
        <p className="text-muted-foreground text-sm leading-relaxed mb-6">
          This reset link has expired or already been used. Links expire after 1 hour and can only be used once.
          Request a new one below.
        </p>
        <Link href="/forgot-password" className="btn-primary inline-flex">
          Request a new link
        </Link>
      </div>
    );
  }

  // ── Success ──────────────────────────────────────────────────────────────
  if (status === "done") {
    return (
      <div className="text-center py-4">
        <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20
                        flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-7 h-7 text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Password updated!</h2>
        <p className="text-muted-foreground text-sm leading-relaxed mb-6">
          Your password has been changed successfully. Sign in with your new password.
        </p>
        <Link href="/login" className="btn-primary inline-flex">
          Sign in now
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  // ── Ready — show form ────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {error && (
        <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20
                        rounded-lg px-4 py-3 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* New password */}
      <div>
        <label className="label" htmlFor="password">New password</label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4
                            text-muted-foreground/50 pointer-events-none" />
          <input
            id="password"
            type={showPass ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-glass pl-10 pr-12"
            placeholder="Min. 6 characters"
            minLength={6}
            required
            autoFocus
            autoComplete="new-password"
          />
          <button
            type="button" tabIndex={-1}
            onClick={() => setShowPass(!showPass)}
            aria-label={showPass ? "Hide password" : "Show password"}
            className="absolute right-3.5 top-1/2 -translate-y-1/2
                       text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Strength meter */}
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

      {/* Confirm password */}
      <div>
        <label className="label" htmlFor="confirm">Confirm new password</label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4
                            text-muted-foreground/50 pointer-events-none" />
          <input
            id="confirm"
            type={showConfirm ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={cn(
              "input-glass pl-10 pr-12",
              confirm && password !== confirm ? "border-red-500/50 focus:border-red-500/70" : "",
            )}
            placeholder="Repeat your password"
            required
            autoComplete="new-password"
          />
          <button
            type="button" tabIndex={-1}
            onClick={() => setShowConfirm(!showConfirm)}
            aria-label={showConfirm ? "Hide password" : "Show password"}
            className="absolute right-3.5 top-1/2 -translate-y-1/2
                       text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {confirm && password !== confirm && (
          <p className="text-xs text-red-400 mt-1.5">Passwords do not match.</p>
        )}
      </div>

      <button type="submit" disabled={submitting} className="btn-primary w-full group">
        {submitting ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Updating password…</>
        ) : (
          <>
            Update password
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </>
        )}
      </button>
    </form>
  );
}

// ── Page shell ──────────────────────────────────────────────────────────────

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-[420px] animate-fade-in">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/">
            <img src="/logo.png" alt="Coachnest" className="h-7 w-auto object-contain" />
          </Link>
        </div>

        <div className="rounded-md border border-border bg-card shadow-card p-8">
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-foreground mb-1.5 tracking-tight">
              Set new password
            </h1>
            <p className="text-muted-foreground text-sm">
              Choose a strong password for your account.
            </p>
          </div>
          <ResetPasswordForm />
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Remember your password?{" "}
          <Link href="/login" className="text-orange-500 hover:text-[#d97757] font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
