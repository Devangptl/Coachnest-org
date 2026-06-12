"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Lock, ArrowLeft, Loader2, ShieldCheck,
  CheckCircle2, ChevronRight,
} from "lucide-react";
import Link from "next/link";
import RazorpayCustomForm, {
  type RazorpayOrderInfo,
} from "@/components/checkout/RazorpayCustomForm";
import type { RazorpaySuccessResponse } from "@/types/razorpay";
import { calcProcessingFee, PROCESSING_FEE_LABEL } from "@/lib/fees";
import { getFeatureMeta } from "@/lib/feature-meta";
import { cn } from "@/lib/utils";

interface Props {
  featureId:   string;
  featureName: string;
  featureSlug: string;
  description: string | null;
  price:       number;
  includes:    string[];
  userEmail?:  string;
}

type Phase = "summary" | "payment";

export default function FeatureCheckoutClient({
  featureId, featureName, featureSlug, description, price, includes, userEmail,
}: Props) {
  const router = useRouter();

  const [phase,      setPhase]      = useState<Phase>("summary");
  const [orderInfo,  setOrderInfo]  = useState<RazorpayOrderInfo | null>(null);
  const [proceeding, setProceeding] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const FeatureIcon   = getFeatureMeta(featureSlug).icon;
  const processingFee = calcProcessingFee(price);
  const payable       = price + processingFee;

  async function handleProceed() {
    setError(null);
    setProceeding(true);
    try {
      const res  = await fetch("/api/razorpay/create-order", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ type: "feature", featureId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create order");
      setOrderInfo({
        razorpayOrderId: data.razorpayOrderId,
        dbOrderId:       data.dbOrderId,
        amount:          data.amount,
        currency:        data.currency ?? "INR",
        key:             data.key,
        type:            "feature",
      });
      setPhase("payment");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setProceeding(false);
    }
  }

  async function handlePaymentSuccess(response: RazorpaySuccessResponse) {
    if (!orderInfo) throw new Error("Order info missing");
    const vRes  = await fetch("/api/razorpay/verify-payment", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        type:              "feature",
        razorpayOrderId:   response.razorpay_order_id,
        razorpayPaymentId: response.razorpay_payment_id,
        razorpaySignature: response.razorpay_signature,
        dbOrderId:         orderInfo.dbOrderId,
      }),
    });
    const vData = await vRes.json();
    if (!vRes.ok) throw new Error(vData.error ?? "Payment verification failed");
    router.push(`/features/${featureSlug}?success=true`);
  }

  function handleUpiCaptured() {
    router.push(`/features/${featureSlug}?success=true`);
  }

  // ── Phase 2: Payment form ───────────────────────────────────────────────────

  if (phase === "payment" && orderInfo) {
    return (
      <div className="grid lg:grid-cols-5 gap-6 lg:gap-10 items-start">
        <div className="lg:col-span-2 space-y-4">
          <button
            type="button"
            onClick={() => setPhase("summary")}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to order summary
          </button>

          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-3 p-4">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FeatureIcon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">{featureName}</h3>
                <p className="text-xs text-muted-foreground">One-time · Lifetime access</p>
              </div>
            </div>
            <div className="border-t border-border bg-secondary/20 px-4 py-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span className="text-xs">{featureName}</span>
                <span className="text-xs font-medium">₹{price.toLocaleString("en-IN")}</span>
              </div>
              {processingFee > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span className="text-xs">{PROCESSING_FEE_LABEL}</span>
                  <span className="text-xs font-medium">₹{processingFee.toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border/60 pt-1.5">
                <span className="text-xs font-semibold text-foreground">Total</span>
                <span className="font-bold text-foreground">₹{payable.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <RazorpayCustomForm
            orderInfo={orderInfo}
            description={`${featureName} — Platform Add-on`}
            prefillEmail={userEmail}
            onSuccess={handlePaymentSuccess}
            onUpiCaptured={handleUpiCaptured}
            onError={(msg) => setError(msg)}
            onBack={() => setPhase("summary")}
          />
          {error && <ErrorBanner msg={error} className="mt-3" />}
        </div>
      </div>
    );
  }

  // ── Phase 1: Order summary + proceed button ─────────────────────────────────

  return (
    <div className="grid lg:grid-cols-5 gap-6 lg:gap-10 items-start">

      {/* Left: feature info + price */}
      <div className="lg:col-span-2 space-y-3">
        <Link
          href={`/features/${featureSlug}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to feature
        </Link>

        {/* Feature card */}
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FeatureIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-base">{featureName}</h3>
              <p className="text-xs text-muted-foreground">One-time purchase · Lifetime access</p>
            </div>
          </div>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
          {includes.length > 0 && (
            <div className="space-y-2 border-t border-border pt-4">
              {includes.map((item) => (
                <div key={item} className="flex items-start gap-2.5 text-sm text-foreground/80">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  {item}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Price breakdown */}
        <div className="rounded-lg border border-border bg-card px-4 py-3 space-y-1.5 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>{featureName}</span>
            <span className="font-medium">₹{price.toLocaleString("en-IN")}</span>
          </div>
          {processingFee > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>{PROCESSING_FEE_LABEL}</span>
              <span className="font-medium">₹{processingFee.toLocaleString("en-IN")}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-border pt-2 mt-1">
            <span className="font-bold text-foreground">Total today</span>
            <span className="font-bold text-lg text-foreground">₹{payable.toLocaleString("en-IN")}</span>
          </div>
        </div>
      </div>

      {/* Right: CTA panel */}
      <div className="lg:col-span-3">
        <div className="rounded-lg border border-border bg-card p-6 space-y-6">

          {/* Amount */}
          <div>
            <p className="text-sm text-muted-foreground mb-1">Order total</p>
            <p className="text-4xl font-bold text-foreground tracking-tight">
              ₹{payable.toLocaleString("en-IN")}
            </p>
            {processingFee > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Includes ₹{processingFee.toLocaleString("en-IN")} processing fee
              </p>
            )}
          </div>

          {error && <ErrorBanner msg={error} />}

          <button
            onClick={handleProceed}
            disabled={proceeding}
            className="w-full btn-primary py-4 text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {proceeding ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Preparing checkout…</>
            ) : (
              <><Lock className="w-4 h-4 flex-shrink-0" />
                Pay ₹{payable.toLocaleString("en-IN")} securely
                <ChevronRight className="w-4 h-4 flex-shrink-0" />
              </>
            )}
          </button>

          {/* Trust */}
          <div className="border-t border-border pt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {[
              { icon: Lock,        text: "256-bit SSL" },
              { icon: ShieldCheck, text: "Secured by Razorpay" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                {text}
              </div>
            ))}
          </div>

        </div>
      </div>

    </div>
  );
}

function ErrorBanner({ msg, className }: { msg: string; className?: string }) {
  return (
    <div className={cn("flex items-start gap-2.5 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3", className)}>
      <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
      {msg}
    </div>
  );
}
