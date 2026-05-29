"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Lock, ArrowLeft, Loader2, ShieldCheck,
  CheckCircle2, ChevronRight, Package, Users,
} from "lucide-react";
import Link from "next/link";
import RazorpayCustomForm, {
  type RazorpayOrderInfo,
} from "@/components/checkout/RazorpayCustomForm";
import type { RazorpaySuccessResponse } from "@/types/razorpay";
import { calcProcessingFee, PROCESSING_FEE_LABEL } from "@/lib/fees";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  featureId:   string;
  featureName: string;
  featureSlug: string;
  description: string | null;
  price:       number;
  includes:    string[];
  userEmail?:  string;
}

const FEATURE_ICON: Record<string, React.ElementType> = {
  community: Users,
};

type Phase = "summary" | "payment";

// ── Main component ─────────────────────────────────────────────────────────────

export default function FeatureCheckoutClient({
  featureId, featureName, featureSlug, description, price, includes, userEmail,
}: Props) {
  const router = useRouter();

  const [phase,      setPhase]      = useState<Phase>("summary");
  const [orderInfo,  setOrderInfo]  = useState<RazorpayOrderInfo | null>(null);
  const [proceeding, setProceeding] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const FeatureIcon = FEATURE_ICON[featureSlug] ?? Package;

  // 2% processing fee added on top of the feature price → final payable amount
  const processingFee = calcProcessingFee(price);
  const payable       = price + processingFee;

  // ── Proceed to payment (Phase 1 → Phase 2) ─────────────────────────────────

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

  // ── Verify payment and redirect (Phase 2 success) ─────────────────────────

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

  // UPI S2S — order already finalised server-side; just redirect
  function handleUpiCaptured() {
    router.push(`/features/${featureSlug}?success=true`);
  }

  // ── Phase 2: Payment form ───────────────────────────────────────────────────

  if (phase === "payment" && orderInfo) {
    return (
      <div className="grid lg:grid-cols-5 gap-8 lg:gap-12 items-start">
        {/* Left: compact feature summary */}
        <div className="lg:col-span-2 space-y-4">
          <button
            type="button"
            onClick={() => setPhase("summary")}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to order summary
          </button>

          <div className="rounded-md border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FeatureIcon className="w-4.5 h-4.5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm">{featureName}</h3>
                <p className="text-xs text-muted-foreground">One-time · Lifetime access</p>
              </div>
            </div>
          </div>

          <div className="rounded-md border border-border bg-secondary/30 p-4 space-y-2.5 text-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>{featureName}</span>
              <span>₹{price.toLocaleString("en-IN")}</span>
            </div>
            {processingFee > 0 && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span>{PROCESSING_FEE_LABEL}</span>
                <span>₹{processingFee.toLocaleString("en-IN")}</span>
              </div>
            )}
            <div className="border-t border-border pt-2.5 flex items-center justify-between font-bold text-foreground">
              <span>Total</span>
              <span>₹{payable.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>

        {/* Right: custom payment form */}
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
          {error && (
            <div className="mt-3 flex items-start gap-2.5 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
              <span className="flex-shrink-0 mt-0.5">⚠</span>
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Phase 1: Order summary + proceed button ─────────────────────────────────

  return (
    <div className="grid lg:grid-cols-5 gap-8 lg:gap-12 items-start">

      {/* Left: feature summary */}
      <div className="lg:col-span-2 space-y-4">
        <Link
          href={`/features/${featureSlug}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to feature
        </Link>

        <div className="rounded-md border border-border bg-card p-5 space-y-4">
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
        </div>

        {includes.length > 0 && (
          <div className="rounded-md border border-border bg-card p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              What&apos;s included
            </p>
            {includes.map((item) => (
              <div key={item} className="flex items-start gap-2.5 text-sm text-foreground/80">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                {item}
              </div>
            ))}
          </div>
        )}

        <div className="rounded-md border border-border bg-secondary/30 p-4 space-y-2.5 text-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>{featureName}</span>
            <span>₹{price.toLocaleString("en-IN")}</span>
          </div>
          {processingFee > 0 && (
            <div className="flex items-center justify-between text-muted-foreground">
              <span>{PROCESSING_FEE_LABEL}</span>
              <span>₹{processingFee.toLocaleString("en-IN")}</span>
            </div>
          )}
          <div className="border-t border-border pt-2.5 flex items-center justify-between font-bold text-foreground">
            <span>Total today</span>
            <span>₹{payable.toLocaleString("en-IN")}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {[
            { icon: Lock,        text: "256-bit SSL encryption" },
            { icon: ShieldCheck, text: "Secured by Razorpay" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2.5 text-xs text-muted-foreground">
              <Icon className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
              {text}
            </div>
          ))}
        </div>
      </div>

      {/* Right: payment method preview + proceed */}
      <div className="lg:col-span-3">
        <div className="rounded-md border border-border bg-card p-6 sm:p-8">
          <h2 className="text-lg font-bold text-foreground mb-1">Complete your purchase</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Pay with Card or UPI — entire checkout stays on this page.
          </p>

          {/* Payment method pills */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: "Card",        sub: "Visa · MC · RuPay" },
              { label: "UPI",         sub: "GPay · PhonePe · Paytm" },
            ].map(({ label, sub }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-1 p-3 rounded-lg border border-border bg-secondary/30 text-center"
              >
                <span className="text-xs font-semibold text-foreground">{label}</span>
                <span className="text-[10px] text-muted-foreground">{sub}</span>
              </div>
            ))}
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2.5 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
              <span className="flex-shrink-0 mt-0.5">⚠</span>
              {error}
            </div>
          )}

          <button
            onClick={handleProceed}
            disabled={proceeding}
            className="w-full btn-primary py-3.5 text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {proceeding ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Preparing checkout…</>
            ) : (
              <><Lock className="w-4 h-4" />
                Proceed to Pay ₹{payable.toLocaleString("en-IN")}
                <ChevronRight className="w-4 h-4" /></>
            )}
          </button>

          <p className="mt-4 text-center text-xs text-muted-foreground/60 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Powered by Razorpay · Cards · UPI
          </p>
        </div>
      </div>

    </div>
  );
}
