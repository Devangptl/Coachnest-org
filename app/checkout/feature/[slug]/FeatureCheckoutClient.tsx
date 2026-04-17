"use client";

import { useState, FormEvent, useEffect } from "react";
import {
  Elements, PaymentElement,
  useStripe, useElements,
} from "@stripe/react-stripe-js";
import { useRouter } from "next/navigation";
import {
  Lock, ArrowLeft, Loader2, ShieldCheck,
  CheckCircle2, ChevronRight, Package, Users,
} from "lucide-react";
import Link from "next/link";
import { stripePromise } from "@/lib/stripe-client";

// ── Stripe appearance (mirrors StripeProvider) ────────────────────────────────

const APPEARANCE_DARK = {
  theme:     "night" as const,
  variables: {
    colorPrimary:    "#d4703f",
    colorBackground: "#0d0d0d",
    colorText:       "#e2e8f0",
    colorDanger:     "#ef4444",
    fontFamily:      "system-ui, sans-serif",
    borderRadius:    "8px",
    spacingUnit:     "4px",
  },
  rules: {
    ".Input": { backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" },
    ".Input:focus": { border: "1px solid #d4703f", boxShadow: "0 0 0 2px rgba(212,112,63,0.15)" },
  },
};

const APPEARANCE_LIGHT = {
  theme:     "flat" as const,
  variables: {
    colorPrimary:    "#d4703f",
    colorBackground: "#fdf9f5",
    colorText:       "#1c1411",
    colorDanger:     "#ef4444",
    fontFamily:      "system-ui, sans-serif",
    borderRadius:    "8px",
    spacingUnit:     "4px",
  },
  rules: {
    ".Input": { backgroundColor: "#f0ece6", border: "1px solid #ddd5c9" },
    ".Input:focus": { border: "1px solid #d4703f", boxShadow: "0 0 0 2px rgba(212,112,63,0.15)" },
  },
};

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Inner payment form — must live inside an Elements context ─────────────────

function PaymentForm({
  featureSlug,
  amount,
  onBack,
}: {
  featureSlug: string;
  amount:      number;
  onBack:      () => void;
}) {
  const stripe   = useStripe();
  const elements = useElements();
  const router   = useRouter();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setError(null);
    setLoading(true);

    try {
      const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
      const returnUrl = `${appUrl}/checkout/success?type=feature&slug=${featureSlug}`;

      // redirect:"if_required" — card payments resolve here; UPI redirects then returns to returnUrl
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: returnUrl },
        redirect:      "if_required",
      });

      if (confirmError) throw new Error(confirmError.message);

      // Reached only for non-redirect methods (card). Grant feature access immediately.
      if (paymentIntent?.status === "succeeded" || paymentIntent?.status === "processing") {
        const res  = await fetch("/api/payments/confirm-feature-access", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ paymentIntentId: paymentIntent.id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Feature access confirmation failed");
        router.push(`/features/${featureSlug}?success=true`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Payment failed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement options={{ layout: "tabs" }} />

      {error && (
        <div className="flex items-start gap-2.5 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
          <span className="flex-shrink-0 mt-0.5">⚠</span>
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-3 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all disabled:opacity-40"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          type="submit"
          disabled={!stripe || loading}
          className="flex-1 btn-primary py-3 text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
          ) : (
            <><Lock className="w-4 h-4" /> Pay ₹{amount.toLocaleString("en-IN")}</>
          )}
        </button>
      </div>
    </form>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function FeatureCheckoutClient({
  featureId, featureName, featureSlug, description, price, includes,
}: Props) {
  // Phase: "summary" shows feature info; "payment" shows embedded PaymentElement
  const [phase,        setPhase]        = useState<"summary" | "payment">("summary");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [initiating,   setInitiating]   = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  // Theme detection for Stripe appearance
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const update = () => setIsDark(!document.documentElement.classList.contains("light"));
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  const appearance = isDark ? APPEARANCE_DARK : APPEARANCE_LIGHT;

  // Create PaymentIntent then show PaymentElement
  async function handleProceedToPayment() {
    setError(null);
    setInitiating(true);
    try {
      const res  = await fetch("/api/payments/create-feature-payment-intent", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ featureId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to initialize payment");
      setClientSecret(data.clientSecret);
      setPhase("payment");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setInitiating(false);
    }
  }

  const FeatureIcon = FEATURE_ICON[featureSlug] ?? Package;

  // ── Payment phase ──────────────────────────────────────────────────────────
  if (phase === "payment" && clientSecret) {
    return (
      <div className="grid lg:grid-cols-5 gap-8 lg:gap-12 items-start">

        {/* Left: condensed feature summary */}
        <div className="lg:col-span-2 space-y-4">
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
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>

          <div className="rounded-xl border border-border bg-secondary/30 p-4 text-sm">
            <div className="flex items-center justify-between font-bold text-foreground">
              <span>Total today</span>
              <span>₹{price.toLocaleString("en-IN")}</span>
            </div>
          </div>

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

        {/* Right: Stripe Payment Element */}
        <div className="lg:col-span-3">
          <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
            <h2 className="text-lg font-bold text-foreground mb-1">Complete payment</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Choose your payment method and enter your details below.
            </p>
            <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
              <PaymentForm featureSlug={featureSlug} amount={price} onBack={() => setPhase("summary")} />
            </Elements>
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground/60 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Encrypted and processed by Stripe. We never store card details.
          </p>
        </div>

      </div>
    );
  }

  // ── Summary phase ──────────────────────────────────────────────────────────
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
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
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

      {/* Right: payment method overview + proceed button */}
      <div className="lg:col-span-3">
        <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
          <h2 className="text-lg font-bold text-foreground mb-1">Choose payment method</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Card, UPI, and other eligible methods will be shown on the next step.
          </p>

          {/* Informational payment method tiles */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { label: "Card", sub: "Visa · Mastercard · Amex",     icon: "💳" },
              { label: "UPI",  sub: "Google Pay · PhonePe · Paytm", icon: "📲" },
            ].map((pm) => (
              <div
                key={pm.label}
                className="flex flex-col items-center gap-2 rounded-xl border border-border bg-secondary/30 p-4 text-center"
              >
                <span className="text-2xl">{pm.icon}</span>
                <span className="text-sm font-semibold text-foreground">{pm.label}</span>
                <span className="text-[11px] text-muted-foreground leading-tight">{pm.sub}</span>
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
            onClick={handleProceedToPayment}
            disabled={initiating}
            className="w-full btn-primary py-3.5 text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {initiating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Preparing payment…</>
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
