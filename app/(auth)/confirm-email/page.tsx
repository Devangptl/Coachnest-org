"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Mail,
  ArrowRight,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Clock,
  Check,
} from "lucide-react";
import { supabaseClient as supabase } from "@/lib/supabase/client";
import { Suspense } from "react";

function ConfirmEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const isPendingInstructor = searchParams.get("pending") === "instructor";

  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [cooldown, setCooldown] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

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
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setErrorMsg(error.message);
        setResendStatus("error");
      } else {
        setResendStatus("sent");
        setCooldown(60);
        setTimeout(() => setResendStatus("idle"), 4000);
      }
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
      setResendStatus("error");
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      {/* Subtle background glow accents */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-orange-500/8 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-orange-400/6 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-orange-500/4 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md mx-auto px-4 py-12">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <Link href="/" className="opacity-90 hover:opacity-100 transition-opacity">
            <img src="/logo.png" alt="Coachnest" className="h-7 w-auto object-contain" />
          </Link>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border/60 bg-card shadow-xl overflow-hidden">
          {/* Top accent bar */}
          <div className="h-1 w-full bg-gradient-to-r from-orange-500 via-orange-400 to-orange-600" />

          <div className="px-8 py-10">
            {/* Icon */}
            <div className="flex justify-center mb-7">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-orange-500/20 blur-xl scale-150" />
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/30 flex items-center justify-center">
                  <Mail className="w-9 h-9 text-orange-400" />
                </div>
              </div>
            </div>

            {/* Heading */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-foreground tracking-tight mb-2">
                Check your inbox
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We sent a confirmation link to
              </p>
              {email && (
                <div className="inline-flex items-center gap-2 mt-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20">
                  <Mail className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                  <span className="text-sm font-semibold text-foreground break-all">{email}</span>
                </div>
              )}
            </div>

            {/* Instructor pending banner */}
            {isPendingInstructor && (
              <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-4 mb-6">
                <div className="w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-amber-400 font-semibold text-sm">Application pending approval</p>
                  <p className="text-amber-400/70 text-xs mt-1 leading-relaxed">
                    After confirming your email, your instructor application will be reviewed.
                    You&apos;ll hear from us once it&apos;s approved.
                  </p>
                </div>
              </div>
            )}

            {/* Steps */}
            <div className="flex items-center gap-0 mb-8">
              {/* Step 1 */}
              <div className="flex flex-col items-center gap-1.5 flex-1">
                <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                  <Check className="w-4 h-4 text-white" strokeWidth={3} />
                </div>
                <span className="text-[11px] font-medium text-orange-400">Signed up</span>
              </div>
              {/* Connector */}
              <div className="flex-1 h-px bg-gradient-to-r from-orange-500 to-border mb-5" />
              {/* Step 2 */}
              <div className="flex flex-col items-center gap-1.5 flex-1">
                <div className="w-8 h-8 rounded-full bg-orange-500/15 border-2 border-orange-500 flex items-center justify-center animate-pulse">
                  <Mail className="w-3.5 h-3.5 text-orange-400" />
                </div>
                <span className="text-[11px] font-medium text-foreground">Confirm email</span>
              </div>
              {/* Connector */}
              <div className="flex-1 h-px bg-border mb-5" />
              {/* Step 3 */}
              <div className="flex flex-col items-center gap-1.5 flex-1">
                <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center">
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <span className="text-[11px] font-medium text-muted-foreground">Start learning</span>
              </div>
            </div>

            {/* Info text */}
            <p className="text-xs text-muted-foreground text-center leading-relaxed mb-6">
              Click the link in your email to activate your account.
              <br />
              The link expires in&nbsp;<span className="text-foreground font-medium">24 hours</span>.
            </p>

            {/* Resend section */}
            <div className="space-y-3 text-center">
              {resendStatus === "sent" ? (
                <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  Email resent — check your inbox
                </div>
              ) : (
                <button
                  onClick={handleResend}
                  disabled={cooldown > 0 || resendStatus === "sending" || !email}
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl
                             text-sm font-medium border border-orange-500/30 text-orange-400
                             hover:bg-orange-500/10 hover:border-orange-500/50
                             disabled:opacity-50 disabled:cursor-not-allowed
                             transition-all duration-200"
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

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Back to sign in */}
            <Link
              href="/login"
              className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl
                         text-sm text-muted-foreground hover:text-foreground
                         hover:bg-muted/50 border border-transparent hover:border-border
                         transition-all duration-200"
            >
              Back to sign in
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground mt-6 leading-relaxed">
          Wrong email address?{" "}
          <Link
            href="/signup"
            className="text-orange-500 hover:text-orange-400 font-medium transition-colors"
          >
            Sign up again
          </Link>
        </p>
      </div>
    </div>
  );
}

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
