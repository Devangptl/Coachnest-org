"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { Mail, ArrowRight, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabaseClient as supabase } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const redirectTo =
        `${window.location.origin}/reset-password`;

      // Must call from the browser so Supabase stores the PKCE
      // code_verifier in THIS browser's localStorage. Calling it
      // server-side (API route) loses the verifier → link always fails.
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (error) { setError(error.message); return; }

      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-[420px] animate-fade-in">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/">
            <img src="/logo.png" alt="CoachNest" className="h-7 w-auto object-contain" />
          </Link>
        </div>

        {sent ? (
          /* ── Success state ── */
          <div className="rounded-2xl border border-border bg-card shadow-card p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20
                            flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">Check your inbox</h1>
            <p className="text-muted-foreground text-sm leading-relaxed mb-1">
              We sent a password reset link to
            </p>
            <p className="font-semibold text-foreground text-sm mb-6">{email}</p>
            <p className="text-xs text-muted-foreground mb-6">
              Didn&apos;t receive it? Check your spam folder, or{" "}
              <button
                onClick={() => { setSent(false); }}
                className="text-orange-500 hover:text-orange-400 transition-colors font-medium"
              >
                try again
              </button>
              .
            </p>
            <Link
              href="/login"
              className="btn-primary w-full justify-center"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          /* ── Form state ── */
          <div className="rounded-2xl border border-border bg-card shadow-card p-8">
            {/* Back link */}
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground
                         hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to sign in
            </Link>

            <h1 className="text-2xl font-bold text-foreground mb-1.5 tracking-tight">
              Forgot password?
            </h1>
            <p className="text-muted-foreground text-sm mb-7 leading-relaxed">
              No worries — enter your email and we&apos;ll send you a reset link.
            </p>

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
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-glass pl-10"
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full group">
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Sending link…</>
                ) : (
                  <>
                    Send reset link
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        <p className="text-center text-sm text-muted-foreground mt-6">
          Remember your password?{" "}
          <Link href="/login" className="text-orange-500 hover:text-orange-400 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
