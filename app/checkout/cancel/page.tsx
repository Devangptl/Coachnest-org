/**
 * /checkout/cancel
 * Landing page when the user cancels out of Stripe Checkout.
 *
 * Query params:
 *   type     - "course" | "feature"
 *   courseId - present when type=course
 *   slug     - present when type=feature
 */
"use client";

import { useSearchParams } from "next/navigation";
import { XCircle, ArrowLeft, RotateCcw } from "lucide-react";
import Link from "next/link";

export default function CheckoutCancelPage() {
  const params   = useSearchParams();
  const type     = params.get("type");
  const courseId = params.get("courseId");
  const slug     = params.get("slug");

  const backHref = type === "course" && courseId
    ? `/courses/${courseId}`
    : type === "feature" && slug
    ? `/features/${slug}`
    : "/courses";

  const retryHref = type === "course" && courseId
    ? `/checkout/course/${courseId}`
    : type === "feature" && slug
    ? `/checkout/feature/${slug}`
    : "/courses";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">

        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto">
          <XCircle className="w-10 h-10 text-muted-foreground" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-foreground">Payment cancelled</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            No charge was made. You can try again whenever you&apos;re ready.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={retryHref}
            className="btn-primary px-6 py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Try Again
          </Link>
          <Link
            href={backHref}
            className="px-6 py-2.5 text-sm font-semibold rounded-lg border border-border text-foreground hover:bg-secondary transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </Link>
        </div>

      </div>
    </div>
  );
}
