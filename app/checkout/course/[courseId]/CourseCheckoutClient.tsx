"use client";

import { useState, FormEvent, useEffect, useCallback } from "react";
import {
  Elements, PaymentElement,
  useStripe, useElements,
} from "@stripe/react-stripe-js";
import { useRouter } from "next/navigation";
import {
  Lock, ArrowLeft, Calendar, BookOpen, Tag, X,
  Loader2, ShieldCheck, ChevronRight, Smartphone,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
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
  courseId:       string;
  courseName:     string;
  instructorName: string;
  lessonCount:    number;
  thumbnail:      string | null;
  price:          number;
  originalPrice:  number;
  initialCoupon?: string;
}

// ── Card payment form (inside Elements context) ───────────────────────────────

function CardPaymentForm({
  courseId,
  amount,
  onBack,
}: {
  courseId: string;
  amount:   number;
  onBack:   () => void;
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
      const returnUrl = `${appUrl}/checkout/success?type=course&courseId=${courseId}`;

      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: returnUrl },
        redirect:      "if_required",
      });

      if (confirmError) throw new Error(confirmError.message);

      if (paymentIntent?.status === "succeeded" || paymentIntent?.status === "processing") {
        const res  = await fetch("/api/payments/confirm-enrollment", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ paymentIntentId: paymentIntent.id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Enrollment confirmation failed");
        router.push(`/courses/${courseId}?enrolled=true`);
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

// ── UPI payment form (inside Elements context) ────────────────────────────────

function UpiPaymentForm({
  clientSecret,
  courseId,
  amount,
  onBack,
}: {
  clientSecret: string;
  courseId:     string;
  amount:       number;
  onBack:       () => void;
}) {
  const stripe  = useStripe();
  const [upiId,   setUpiId]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const isValidVpa = /^[a-zA-Z0-9._-]{2,}@[a-zA-Z]{3,}$/.test(upiId.trim());

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!stripe || !isValidVpa) return;
    setError(null);
    setLoading(true);

    const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
    const returnUrl = `${appUrl}/checkout/success?type=course&courseId=${courseId}`;

    // confirmUpiPayment always redirects — Stripe sends a collect request to the UPI app,
    // then redirects back to returnUrl once the user approves on their phone.
    const { error: stripeError } = await stripe.confirmUpiPayment(clientSecret, {
      payment_method: { upi: { vpa: upiId.trim() } },
      return_url:     returnUrl,
    });

    if (stripeError) {
      setError(stripeError.message ?? "Payment request failed. Check your UPI ID and try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* UPI ID input */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
          UPI ID
        </label>
        <div className="relative">
          <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
          <input
            type="text"
            value={upiId}
            onChange={(e) => { setUpiId(e.target.value); setError(null); }}
            placeholder="yourname@bank"
            autoComplete="off"
            spellCheck={false}
            className="w-full pl-10 pr-3.5 py-3 bg-secondary/30 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all"
          />
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground/70">
          e.g.&nbsp; name@paytm &nbsp;·&nbsp; 9876543210@ybl &nbsp;·&nbsp; user@okaxis
        </p>
      </div>

      {/* Supported apps */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Supported apps</p>
        <div className="flex flex-wrap gap-2">
          {["Google Pay", "PhonePe", "Paytm", "BHIM", "Amazon Pay"].map((app) => (
            <span
              key={app}
              className="px-2.5 py-1 rounded-full bg-secondary/50 border border-border text-[11px] text-muted-foreground"
            >
              {app}
            </span>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="rounded-lg bg-blue-500/8 border border-blue-500/20 px-4 py-3 text-xs text-blue-600 dark:text-blue-400 flex items-start gap-2">
        <span className="mt-0.5 flex-shrink-0">ℹ️</span>
        <span>
          After clicking Pay, a collect request will be sent to your UPI app.
          Open your app and approve the payment to complete enrollment.
        </span>
      </div>

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
          disabled={!stripe || !isValidVpa || loading}
          className="flex-1 btn-primary py-3 text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Sending request…</>
          ) : (
            <><Smartphone className="w-4 h-4" /> Pay ₹{amount.toLocaleString("en-IN")} via UPI</>
          )}
        </button>
      </div>
    </form>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function CourseCheckoutClient({
  courseId, courseName, instructorName, lessonCount,
  thumbnail, price: initialPrice, originalPrice, initialCoupon,
}: Props) {
  const [phase,          setPhase]          = useState<"summary" | "payment">("summary");
  const [selectedMethod, setSelectedMethod] = useState<"card" | "upi">("card");
  const [clientSecret,   setClientSecret]   = useState<string | null>(null);
  const [payAmount,      setPayAmount]      = useState(initialPrice);

  // Coupon
  const [couponCode,    setCouponCode]    = useState(initialCoupon ?? "");
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string; label: string; discount: number;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const displayPrice = appliedCoupon
    ? Math.max(0, initialPrice - appliedCoupon.discount)
    : initialPrice;

  const [initiating, setInitiating] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

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

  // Auto-apply coupon from URL
  const applyInitialCoupon = useCallback(async () => {
    if (!initialCoupon) return;
    const res = await fetch("/api/coupons/validate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: initialCoupon, courseId }),
    }).catch(() => null);
    if (!res?.ok) return;
    const data = await res.json();
    const discountAmt = data.discountType === "PERCENTAGE"
      ? Math.round(initialPrice * data.discount / 100)
      : Math.min(data.discount, initialPrice);
    setAppliedCoupon({ code: data.code, label: data.description ?? data.code, discount: discountAmt });
  }, [initialCoupon, courseId, initialPrice]);
  useEffect(() => { applyInitialCoupon(); }, [applyInitialCoupon]);

  async function handleApplyCoupon() {
    if (!couponCode.trim() || couponLoading) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
      const res  = await fetch("/api/coupons/validate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim(), courseId }),
      });
      const data = await res.json();
      if (!res.ok) { setCouponError(data.error ?? "Invalid coupon"); return; }
      const discountAmt = data.discountType === "PERCENTAGE"
        ? Math.round(initialPrice * data.discount / 100)
        : Math.min(data.discount, initialPrice);
      setAppliedCoupon({ code: data.code, label: data.description ?? data.code, discount: discountAmt });
    } finally {
      setCouponLoading(false);
    }
  }

  async function handleProceedToPayment(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInitiating(true);
    try {
      const res  = await fetch("/api/payments/create-payment-intent", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ courseId, couponCode: appliedCoupon?.code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to initialize payment");
      setClientSecret(data.clientSecret);
      setPayAmount(data.amount);
      setPhase("payment");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setInitiating(false);
    }
  }

  const hasDiscount = originalPrice > initialPrice || appliedCoupon;
  const savings     = originalPrice - displayPrice;

  // ── Payment phase ──────────────────────────────────────────────────────────
  if (phase === "payment" && clientSecret) {
    const paySavings = originalPrice - payAmount;
    return (
      <div className="grid lg:grid-cols-5 gap-8 lg:gap-12 items-start">

        {/* Left: condensed order summary */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {thumbnail && (
              <div className="relative w-full aspect-video bg-secondary">
                <Image src={thumbnail} alt={courseName} fill className="object-cover" />
              </div>
            )}
            <div className="p-5">
              <p className="text-xs text-muted-foreground mb-1">by {instructorName}</p>
              <h3 className="font-bold text-foreground text-base leading-snug mb-3">{courseName}</h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <BookOpen className="w-3.5 h-3.5" />
                {lessonCount} lessons · Lifetime access
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-2.5 text-sm">
            {originalPrice > payAmount && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Original price</span>
                <span className="line-through">₹{originalPrice.toLocaleString("en-IN")}</span>
              </div>
            )}
            <div className="border-t border-border pt-2.5 flex items-center justify-between font-bold text-foreground">
              <span>Total today</span>
              <span>₹{payAmount.toLocaleString("en-IN")}</span>
            </div>
            {paySavings > 0 && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium text-center pt-0.5">
                You save ₹{paySavings.toLocaleString("en-IN")} on this purchase!
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {[
              { icon: Lock,        text: "256-bit SSL encryption" },
              { icon: ShieldCheck, text: "Secured & PCI-compliant via Stripe" },
              { icon: Calendar,    text: "30-day money-back guarantee" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2.5 text-xs text-muted-foreground">
                <Icon className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
                {text}
              </div>
            ))}
          </div>
        </div>

        {/* Right: card or UPI form */}
        <div className="lg:col-span-3">
          <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
            <h2 className="text-lg font-bold text-foreground mb-1">
              {selectedMethod === "upi" ? "Pay via UPI" : "Complete payment"}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              {selectedMethod === "upi"
                ? "Enter your UPI ID to receive a payment request on your phone."
                : "Choose your payment method and enter your details below."}
            </p>

            <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
              {selectedMethod === "upi" ? (
                <UpiPaymentForm
                  clientSecret={clientSecret}
                  courseId={courseId}
                  amount={payAmount}
                  onBack={() => setPhase("summary")}
                />
              ) : (
                <CardPaymentForm
                  courseId={courseId}
                  amount={payAmount}
                  onBack={() => setPhase("summary")}
                />
              )}
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
    <form onSubmit={handleProceedToPayment}>
      <div className="grid lg:grid-cols-5 gap-8 lg:gap-12 items-start">

        {/* Left: order summary */}
        <div className="lg:col-span-2 space-y-4">
          <Link
            href={`/courses/${courseId}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to course
          </Link>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {thumbnail && (
              <div className="relative w-full aspect-video bg-secondary">
                <Image src={thumbnail} alt={courseName} fill className="object-cover" />
              </div>
            )}
            <div className="p-5">
              <p className="text-xs text-muted-foreground mb-1">by {instructorName}</p>
              <h3 className="font-bold text-foreground text-base leading-snug mb-3">{courseName}</h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <BookOpen className="w-3.5 h-3.5" />
                {lessonCount} lessons · Lifetime access
              </div>
            </div>
          </div>

          {/* Coupon input */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Coupon code
            </p>
            {appliedCoupon ? (
              <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                    {appliedCoupon.code}
                  </span>
                  <span className="text-emerald-600/70 dark:text-emerald-400/70 text-xs">
                    −₹{appliedCoupon.discount.toLocaleString("en-IN")} off
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => { setAppliedCoupon(null); setCouponCode(""); }}
                  className="p-1 rounded-md hover:bg-emerald-500/20 text-emerald-500/70 hover:text-emerald-500 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(null); }}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleApplyCoupon())}
                  placeholder="Enter code"
                  className="flex-1 bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponCode.trim()}
                  className="px-3.5 py-2 bg-secondary border border-border rounded-lg text-sm font-medium text-foreground hover:bg-secondary/70 transition-all disabled:opacity-40"
                >
                  {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                </button>
              </div>
            )}
            {couponError && <p className="text-xs text-red-500">{couponError}</p>}
          </div>

          {/* Price summary */}
          <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-2.5 text-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Course price</span>
              <span className={hasDiscount ? "line-through" : ""}>
                ₹{originalPrice.toLocaleString("en-IN")}
              </span>
            </div>
            {initialPrice < originalPrice && (
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                <span>Sale discount</span>
                <span>−₹{(originalPrice - initialPrice).toLocaleString("en-IN")}</span>
              </div>
            )}
            {appliedCoupon && (
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                <span>Coupon ({appliedCoupon.code})</span>
                <span>−₹{appliedCoupon.discount.toLocaleString("en-IN")}</span>
              </div>
            )}
            <div className="border-t border-border pt-2.5 flex items-center justify-between font-bold text-foreground">
              <span>Total today</span>
              <span>₹{displayPrice.toLocaleString("en-IN")}</span>
            </div>
            {savings > 0 && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium text-center pt-0.5">
                You save ₹{savings.toLocaleString("en-IN")} on this purchase!
              </p>
            )}
          </div>

          {/* Trust signals */}
          <div className="flex flex-col gap-2">
            {[
              { icon: Lock,        text: "256-bit SSL encryption" },
              { icon: ShieldCheck, text: "Secured & PCI-compliant via Stripe" },
              { icon: Calendar,    text: "30-day money-back guarantee" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2.5 text-xs text-muted-foreground">
                <Icon className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
                {text}
              </div>
            ))}
          </div>
        </div>

        {/* Right: selectable payment method tiles + proceed button */}
        <div className="lg:col-span-3">
          <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
            <h2 className="text-lg font-bold text-foreground mb-1">Choose payment method</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Select how you&apos;d like to pay and continue to enter your details.
            </p>

            {/* Selectable payment method tiles */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {([
                { value: "card", label: "Card", sub: "Visa · Mastercard · Amex",     icon: "💳" },
                { value: "upi",  label: "UPI",  sub: "Google Pay · PhonePe · Paytm", icon: "📲" },
              ] as const).map((pm) => (
                <button
                  key={pm.value}
                  type="button"
                  onClick={() => setSelectedMethod(pm.value)}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all ${
                    selectedMethod === pm.value
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border bg-secondary/30 hover:border-border/60 hover:bg-secondary/50"
                  }`}
                >
                  <span className="text-2xl">{pm.icon}</span>
                  <span className="text-sm font-semibold text-foreground">{pm.label}</span>
                  <span className="text-[11px] text-muted-foreground leading-tight">{pm.sub}</span>
                </button>
              ))}
            </div>

            {error && (
              <div className="mb-4 flex items-start gap-2.5 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                <span className="flex-shrink-0 mt-0.5">⚠</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={initiating}
              className="w-full btn-primary py-3.5 text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {initiating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Preparing payment…</>
              ) : (
                <><Lock className="w-4 h-4" />
                  {displayPrice === 0
                    ? "Enroll for Free"
                    : `Pay ₹${displayPrice.toLocaleString("en-IN")}`}
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
    </form>
  );
}
