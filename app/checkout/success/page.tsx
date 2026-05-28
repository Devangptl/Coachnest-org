"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, BookOpen, Zap, Library } from "lucide-react";
import Link from "next/link";

function CheckoutSuccessContent() {
  const params    = useSearchParams();
  const type      = params.get("type");
  const courseId  = params.get("courseId");
  const slug      = params.get("slug");

  const isCourse  = type === "course";
  const isFeature = type === "feature";
  const isBooks   = type === "books";

  return (
    <div className="max-w-md w-full text-center space-y-6">
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
            : isBooks
            ? "Your books are now available in your library — download anytime."
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
        {isBooks && (
          <Link
            href="/dashboard/library"
            className="btn-primary px-6 py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
          >
            <Library className="w-4 h-4" /> Go to Library
          </Link>
        )}
        <Link
          href="/dashboard"
          className="px-6 py-2.5 text-sm font-semibold rounded-lg border border-border text-foreground hover:bg-secondary transition-colors flex items-center justify-center"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Suspense fallback={
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Loading…</p>
        </div>
      }>
        <CheckoutSuccessContent />
      </Suspense>
    </div>
  );
}
