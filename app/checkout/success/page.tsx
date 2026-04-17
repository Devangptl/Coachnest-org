/**
 * /checkout/success
 * Landing page after Stripe Checkout completes.
 * Verifies enrollment (webhook fallback) then offers navigation links.
 *
 * Query params:
 *   type       - "course" | "feature"
 *   courseId   - present when type=course
 *   slug       - present when type=feature
 *   session_id - Stripe Checkout Session ID (injected by Stripe)
 */
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, BookOpen, Zap } from "lucide-react";
import Link from "next/link";

type State = "verifying" | "success" | "error";

export default function CheckoutSuccessPage() {
  const params    = useSearchParams();
  const type      = params.get("type");
  const courseId  = params.get("courseId");
  const slug      = params.get("slug");
  const sessionId = params.get("session_id");

  const [state,   setState]   = useState<State>("verifying");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function verify() {
      if (!sessionId) { setState("success"); return; }

      try {
        // Fallback verification in case webhook hasn't fired yet
        const res = await fetch("/api/payments/verify", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ sessionId }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          // Non-fatal: enrollment may already be handled by webhook
          console.warn("[checkout/success] verify returned", res.status, d);
        }
      } catch {
        // Non-fatal — webhook may have already processed it
      }

      setState("success");
    }

    verify();
  }, [sessionId]);

  const isCourse  = type === "course";
  const isFeature = type === "feature";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">

        {state === "verifying" && (
          <>
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground text-sm">Confirming your payment…</p>
          </>
        )}

        {state === "success" && (
          <>
            <div className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-foreground">Payment successful!</h1>
              <p className="text-muted-foreground mt-2 text-sm">
                {isCourse
                  ? "You're now enrolled. Start learning right away."
                  : isFeature
                  ? "You now have lifetime access to this feature."
                  : "Your purchase is complete."}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {isCourse && courseId && (
                <Link
                  href={`/courses/${courseId}`}
                  className="btn-primary px-6 py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
                >
                  <BookOpen className="w-4 h-4" /> Go to Course
                </Link>
              )}
              {isFeature && slug && (
                <Link
                  href={`/features/${slug}`}
                  className="btn-primary px-6 py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4" /> Open Feature
                </Link>
              )}
              <Link
                href="/dashboard"
                className="px-6 py-2.5 text-sm font-semibold rounded-lg border border-border text-foreground hover:bg-secondary transition-colors flex items-center justify-center"
              >
                Go to Dashboard
              </Link>
            </div>
          </>
        )}

        {state === "error" && (
          <>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
              <p className="text-muted-foreground mt-2 text-sm">
                {message || "Your payment may have been processed. Check your dashboard or contact support."}
              </p>
            </div>
            <Link href="/dashboard" className="btn-primary px-6 py-2.5 text-sm font-semibold">
              Go to Dashboard
            </Link>
          </>
        )}

      </div>
    </div>
  );
}
