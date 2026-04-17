"use client";

import { useState } from "react";
import {
  Lock, ArrowLeft, Loader2, ShieldCheck,
  CheckCircle2, ChevronRight, Package, Users,
} from "lucide-react";
import Link from "next/link";

interface Props {
  featureId:   string;
  featureName: string;
  featureSlug: string;
  description: string | null;
  price:       number;
  includes:    string[];
}

const FEATURE_ICON: Record<string, React.ElementType> = {
  community: Users,
};

const PAYMENT_METHODS = [
  { label: "Card", sub: "Visa · Mastercard · Amex", icon: "💳" },
  { label: "UPI",  sub: "Google Pay · PhonePe · Paytm", icon: "📲" },
];

export default function FeatureCheckoutClient({
  featureId, featureName, featureSlug, description, price, includes,
}: Props) {
  const [selectedMethod, setSelectedMethod] = useState<"card" | "upi">("card");
  const [redirecting, setRedirecting] = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const FeatureIcon = FEATURE_ICON[featureSlug] ?? Package;

  async function handleCheckout() {
    setError(null);
    setRedirecting(true);
    try {
      const res  = await fetch("/api/payments/create-feature-order", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ featureId, paymentMethod: selectedMethod }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create checkout session");
      if (!data.url) throw new Error("No checkout URL returned");
      window.location.href = data.url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setRedirecting(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-5 gap-8 lg:gap-12 items-start">

      {/* ── Left: Feature summary (2/5) ──────────────────────────────────── */}
      <div className="lg:col-span-2 space-y-4">
        <Link
          href={`/features/${featureSlug}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to feature
        </Link>

        {/* Feature card */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FeatureIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-base">{featureName}</h3>
              <p className="text-xs text-muted-foreground">One-time purchase · Lifetime access</p>
            </div>
          </div>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>

        {/* What's included */}
        {includes.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
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

        {/* Price summary */}
        <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-2.5 text-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>{featureName}</span>
            <span>₹{price.toLocaleString("en-IN")}</span>
          </div>
          <div className="border-t border-border pt-2.5 flex items-center justify-between font-bold text-foreground">
            <span>Total today</span>
            <span>₹{price.toLocaleString("en-IN")}</span>
          </div>
        </div>

        {/* Trust signals */}
        <div className="flex flex-col gap-2">
          {[
            { icon: Lock,        text: "256-bit SSL encryption" },
            { icon: ShieldCheck, text: "Secured & PCI-compliant via Stripe" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2.5 text-xs text-muted-foreground">
              <Icon className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
              {text}
            </div>
          ))}
        </div>
      </div>

      {/* ── Right: Payment options (3/5) ─────────────────────────────────── */}
      <div className="lg:col-span-3">
        <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
          <h2 className="text-lg font-bold text-foreground mb-1">Choose payment method</h2>
          <p className="text-sm text-muted-foreground mb-6">
            You will be securely redirected to Stripe to complete payment.
          </p>

          {/* Payment method tiles */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {PAYMENT_METHODS.map((pm) => {
              const value = pm.label.toLowerCase() as "card" | "upi";
              const selected = selectedMethod === value;
              return (
                <button
                  key={pm.label}
                  type="button"
                  onClick={() => setSelectedMethod(value)}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all ${
                    selected
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border bg-secondary/30 hover:border-border/60 hover:bg-secondary/50"
                  }`}
                >
                  <span className="text-2xl">{pm.icon}</span>
                  <span className="text-sm font-semibold text-foreground">{pm.label}</span>
                  <span className="text-[11px] text-muted-foreground leading-tight">{pm.sub}</span>
                </button>
              );
            })}
          </div>

          {/* UPI note */}
          <div className="mb-5 rounded-lg bg-blue-500/8 border border-blue-500/20 px-4 py-3 text-xs text-blue-600 dark:text-blue-400 flex items-start gap-2">
            <span className="mt-0.5">ℹ️</span>
            <span>
              UPI is available for Indian customers. You can pay via Google Pay, PhonePe, or
              Paytm by scanning the QR code on the next screen.
            </span>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2.5 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
              <span className="flex-shrink-0 mt-0.5">⚠</span>
              {error}
            </div>
          )}

          <button
            onClick={handleCheckout}
            disabled={redirecting}
            className="w-full btn-primary py-3.5 text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {redirecting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting to Stripe…</>
            ) : (
              <><Lock className="w-4 h-4" />
                Pay ₹{price.toLocaleString("en-IN")}
                <ChevronRight className="w-4 h-4" /></>
            )}
          </button>

          <p className="mt-4 text-center text-xs text-muted-foreground/60 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Encrypted and processed by Stripe. We never store card details.
          </p>

          {/* Accepted payment logos */}
          <div className="mt-5 flex items-center justify-center gap-3 flex-wrap">
            {["VISA", "Mastercard", "Amex", "UPI", "RuPay"].map((brand) => (
              <span
                key={brand}
                className="px-2 py-1 rounded border border-border text-[10px] font-bold text-muted-foreground bg-secondary/50 tracking-wide"
              >
                {brand}
              </span>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
