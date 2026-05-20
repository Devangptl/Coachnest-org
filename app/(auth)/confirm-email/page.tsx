"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mail, ArrowRight, CheckCircle2, Loader2, RefreshCw, Clock } from "lucide-react";
import { supabaseClient as supabase } from "@/lib/supabase/client";
import { Suspense } from "react";

// ── Inner component (needs useSearchParams) ─────────────────────────────────

function ConfirmEmailContent() {
  const searchParams   = useSearchParams();
  const email          = searchParams.get("email") ?? "";
  const isPendingInstructor = searchParams.get("pending") === "instructor";

  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [cooldown, setCooldown]         = useState(0);
  const [errorMsg, setErrorMsg]         = useState("");

  // Countdown timer after resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  async function handleResend() {
    if (!email || cooldown > 0 || resendStatus === "sending") return;
    setResendStatus("sending");
    setErrorMsg("");
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setErrorMsg(error.message);
        setResendStatus("error");
      } else {
        setResendStatus("sent");
        setCooldown(60);
        // Reset back to idle after 4 s so the button re-appears
        setTimeout(() => setResendStatus("idle"), 4000);
      }
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
      setResendStatus("error");
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

        <div className="rounded-md border border-border bg-card shadow-card p-8 text-center">

          {/* Icon */}
          <div className="w-16 h-16 rounded-full bg-orange-500/10 border border-orange-500/20
                          flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-orange-400" />
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-2 tracking-tight">
            Check your email
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed mb-1">
            We sent a confirmation link to
          </p>
          {email && (
            <p className="text-foreground font-medium text-sm mb-4 break-all">{email}</p>
          )}
          <p className="text-muted-foreground text-sm leading-relaxed mb-4">
            Click the link in the email to activate your account. The link expires in&nbsp;24&nbsp;hours.
          </p>

          {isPendingInstructor && (
            <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/25 rounded-lg px-4 py-3.5 text-left mb-6">
              <Clock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-400 font-semibold text-sm">Application pending approval</p>
                <p className="text-amber-400/70 text-xs mt-0.5 leading-relaxed">
                  After confirming your email, your instructor application will be reviewed by our team.
                  You&apos;ll receive an email once approved.
                </p>
              </div>
            </div>
          )}

          {/* Resend section */}
          <div className="space-y-3">
            {resendStatus === "sent" ? (
              <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Email resent — check your inbox
              </div>
            ) : (
              <button
                onClick={handleResend}
                disabled={cooldown > 0 || resendStatus === "sending" || !email}
                className="inline-flex items-center justify-center gap-2 text-sm
                           text-orange-500 hover:text-[#d97757] disabled:text-muted-foreground
                           disabled:cursor-not-allowed transition-colors font-medium"
              >
                {resendStatus === "sending" ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending…</>
                ) : cooldown > 0 ? (
                  <><RefreshCw className="w-3.5 h-3.5" /> Resend in {cooldown}s</>
                ) : (
                  <><RefreshCw className="w-3.5 h-3.5" /> Resend confirmation email</>
                )}
              </button>
            )}

            {resendStatus === "error" && errorMsg && (
              <p className="text-red-400 text-xs">{errorMsg}</p>
            )}
          </div>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground
                       hover:text-foreground transition-colors"
          >
            Back to sign in
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6 leading-relaxed">
          Wrong email address?{" "}
          <Link href="/signup" className="text-orange-500 hover:text-[#d97757] transition-colors">
            Sign up again
          </Link>
        </p>
      </div>
    </div>
  );
}

// ── Page shell ──────────────────────────────────────────────────────────────

export default function ConfirmEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
        </div>
      }
    >
      <ConfirmEmailContent />
    </Suspense>
  );
}
