"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Mail, ArrowRight, CheckCircle2, Loader2, RefreshCw, Clock, Check,
} from "lucide-react";
import { supabaseClient as supabase } from "@/lib/supabase/client";

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
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-[420px] animate-fade-in">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/">
            <img src="/logo.png" alt="Coachnest" className="h-7 w-auto object-contain" />
          </Link>
        </div>

        <div className="rounded-md border border-border bg-card p-8 text-center">

          {/* Icon */}
          <div className="w-14 h-14 rounded-full bg-orange-500/10 border border-orange-500/20
                          flex items-center justify-center mx-auto mb-5">
            <Mail className="w-7 h-7 text-orange-400" />
          </div>

          <h1 className="text-xl font-bold text-foreground mb-2 tracking-tight">
            Check your email
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed mb-1">
            We sent a confirmation link to
          </p>
          {email && (
            <p className="text-foreground font-semibold text-sm mb-6 break-all">{email}</p>
          )}

          {/* Instructor pending banner */}
          {isPendingInstructor && (
            <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/25
                            rounded-md px-4 py-3.5 text-left mb-6">
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

          {/* Step indicator */}
          <div className="flex items-center mb-6">
            {/* Step 1 — done */}
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div className="w-7 h-7 rounded-full bg-orange-500 border border-orange-600
                              flex items-center justify-center">
                <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
              </div>
              <span className="text-[10px] font-medium text-orange-400 whitespace-nowrap">Signed up</span>
            </div>

            <div className="flex-1 h-px bg-orange-500/40 mx-2 mb-4" />

            {/* Step 2 — current */}
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div className="w-7 h-7 rounded-full border-2 border-orange-500 bg-orange-500/10
                              flex items-center justify-center">
                <span className="text-[11px] font-bold text-orange-400">2</span>
              </div>
              <span className="text-[10px] font-medium text-foreground whitespace-nowrap">Confirm email</span>
            </div>

            <div className="flex-1 h-px bg-border mx-2 mb-4" />

            {/* Step 3 — upcoming */}
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div className="w-7 h-7 rounded-full border border-border bg-muted
                              flex items-center justify-center">
                <span className="text-[11px] font-medium text-muted-foreground">3</span>
              </div>
              <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">Get started</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed mb-6">
            Click the link in the email to activate your account.
            The link expires in{" "}
            <span className="text-foreground font-medium">24 hours</span>.
          </p>

          {/* Resend */}
          <div className="space-y-3">
            {resendStatus === "sent" ? (
              <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm font-medium py-2">
                <CheckCircle2 className="w-4 h-4" />
                Email resent — check your inbox
              </div>
            ) : (
              <button
                onClick={handleResend}
                disabled={cooldown > 0 || resendStatus === "sending" || !email}
                className="btn-secondary w-full justify-center"
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

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <Link href="/login" className="btn-primary w-full justify-center group">
            Back to sign in
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Wrong email address?{" "}
          <Link
            href="/signup"
            className="text-orange-500 hover:text-[#d97757] font-medium transition-colors"
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
