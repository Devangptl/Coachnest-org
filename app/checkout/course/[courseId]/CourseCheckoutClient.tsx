"use client";

import { useState, FormEvent, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  useStripe, useElements,
  CardNumberElement, CardExpiryElement, CardCvcElement,
} from "@stripe/react-stripe-js";
import {
  CheckCircle2, Loader2, ShieldCheck, CreditCard,
  Lock, ArrowLeft, Calendar, BookOpen, Tag, X, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";

interface SavedCard {
  id:        string;
  brand:     string;
  last4:     string;
  expMonth:  number;
  expYear:   number;
  isDefault: boolean;
}

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

const BRAND_DISPLAY: Record<string, string> = {
  visa: "VISA", mastercard: "Mastercard", amex: "Amex",
  discover: "Discover", jcb: "JCB", unionpay: "UnionPay",
};

function useCardStyle() {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const update = () => setIsDark(!document.documentElement.classList.contains("light"));
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return {
    style: {
      base: {
        color:           isDark ? "#e2e8f0" : "#1c1411",
        fontFamily:      "system-ui, -apple-system, sans-serif",
        fontSize:        "15px",
        fontSmoothing:   "antialiased",
        "::placeholder": { color: isDark ? "#64748b" : "#a8998e" },
        iconColor:       "#d4703f",
      },
      invalid: { color: "#ef4444", iconColor: "#ef4444" },
    },
  };
}

export default function CourseCheckoutClient({
  courseId, courseName, instructorName, lessonCount,
  thumbnail, price: initialPrice, originalPrice, initialCoupon,
}: Props) {
  const router     = useRouter();
  const stripe     = useStripe();
  const elements   = useElements();
  const cardStyle  = useCardStyle();

  // Coupon
  const [couponCode,    setCouponCode]    = useState(initialCoupon ?? "");
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; label: string; discount: number } | null>(null);
  const [couponError,   setCouponError]   = useState<string | null>(null);
  const finalPrice = appliedCoupon ? Math.max(0, initialPrice - appliedCoupon.discount) : initialPrice;

  // Payment
  const [savedCards,   setSavedCards]   = useState<SavedCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<string | "new">("new");
  const [nameOnCard,   setNameOnCard]   = useState("");
  const [cardComplete, setCardComplete] = useState({ number: false, expiry: false, cvc: false });
  const [loading,      setLoading]      = useState(false);
  const [loadingCards, setLoadingCards] = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [succeeded,    setSucceeded]    = useState(false);

  // Auto-apply coupon from URL
  const applyInitialCoupon = useCallback(async () => {
    if (!initialCoupon) return;
    const res  = await fetch("/api/coupons/validate", {
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

  // Fetch saved cards
  useEffect(() => {
    fetch("/api/billing/payment-methods")
      .then((r) => r.json())
      .then((d) => {
        const cards: SavedCard[] = (d.paymentMethods ?? []).map((pm: any) => ({
          id: pm.id, brand: pm.card?.brand ?? "card", last4: pm.card?.last4 ?? "••••",
          expMonth: pm.card?.exp_month, expYear: pm.card?.exp_year,
          isDefault: pm.id === d.defaultPaymentMethodId,
        }));
        setSavedCards(cards);
        if (cards.length > 0) setSelectedCard(cards[0].id);
      })
      .catch(() => {})
      .finally(() => setLoadingCards(false));
  }, []);

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

  const isNewCard   = selectedCard === "new";
  const allComplete = isNewCard
    ? (cardComplete.number && cardComplete.expiry && cardComplete.cvc && nameOnCard.trim().length > 0)
    : true;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setError(null);
    setLoading(true);

    try {
      // Step 1 — Create PaymentIntent
      const piRes  = await fetch("/api/payments/create-payment-intent", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ courseId, couponCode: appliedCoupon?.code }),
      });
      const piData = await piRes.json();
      if (!piRes.ok) throw new Error(piData.error ?? "Failed to initialise payment");
      if (!piData.clientSecret) throw new Error("No payment secret returned");

      // Step 2 — Confirm card payment
      const confirmPayload: any = {};
      if (isNewCard) {
        const cardNumber = elements.getElement(CardNumberElement);
        if (!cardNumber) throw new Error("Card element not ready");
        confirmPayload.payment_method = {
          card:            cardNumber,
          billing_details: { name: nameOnCard.trim(), address: { country: "IN" } },
        };
      } else {
        confirmPayload.payment_method = selectedCard;
      }

      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        piData.clientSecret, confirmPayload
      );
      if (stripeError) throw new Error(stripeError.message);

      if (paymentIntent?.status === "succeeded" || paymentIntent?.status === "processing") {
        // Immediately enroll — don't wait for webhook
        const enrollRes = await fetch("/api/payments/confirm-enrollment", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ paymentIntentId: paymentIntent.id }),
        });
        if (!enrollRes.ok) {
          const enrollData = await enrollRes.json();
          throw new Error(enrollData.error ?? "Payment succeeded but enrollment failed. Please contact support.");
        }
        setSucceeded(true);
        setTimeout(() => router.push(`/courses/${courseId}?payment=success`), 1500);
      } else {
        throw new Error("Payment was not completed. Please try again.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (succeeded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-5 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Payment successful!</h2>
          <p className="text-muted-foreground mt-1 text-sm">You're now enrolled. Redirecting…</p>
        </div>
        <Loader2 className="animate-spin text-primary w-5 h-5" />
      </div>
    );
  }

  const hasDiscount = originalPrice > initialPrice || appliedCoupon;
  const savings     = originalPrice - finalPrice;

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid lg:grid-cols-5 gap-8 lg:gap-12 items-start">

        {/* ── Left: Order summary (2/5) ───────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          <Link
            href={`/courses/${courseId}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to course
          </Link>

          {/* Course card */}
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
              <span>₹{finalPrice.toLocaleString("en-IN")}</span>
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

        {/* ── Right: Payment form (3/5) ──────────────────────────────────── */}
        <div className="lg:col-span-3">
          <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
            <h2 className="text-lg font-bold text-foreground mb-6">Payment details</h2>

            {/* Saved cards */}
            {!loadingCards && savedCards.length > 0 && (
              <div className="mb-6 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                  Saved cards
                </p>
                {savedCards.map((card) => (
                  <label
                    key={card.id}
                    className={cn(
                      "flex items-center gap-3 p-3.5 rounded-lg border cursor-pointer transition-all",
                      selectedCard === card.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-secondary/40"
                    )}
                  >
                    <input type="radio" name="payment" value={card.id}
                      checked={selectedCard === card.id}
                      onChange={() => setSelectedCard(card.id)}
                      className="accent-primary" />
                    <CreditCard className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="flex-1 text-sm font-medium text-foreground capitalize">
                      {BRAND_DISPLAY[card.brand] ?? card.brand} •••• {card.last4}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {String(card.expMonth).padStart(2, "0")}/{String(card.expYear).slice(-2)}
                    </span>
                    {card.isDefault && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                        Default
                      </span>
                    )}
                  </label>
                ))}
                <label className={cn(
                  "flex items-center gap-3 p-3.5 rounded-lg border cursor-pointer transition-all",
                  selectedCard === "new" ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/40"
                )}>
                  <input type="radio" name="payment" value="new"
                    checked={selectedCard === "new"}
                    onChange={() => setSelectedCard("new")}
                    className="accent-primary" />
                  <span className="text-sm font-medium text-foreground">Use a new card</span>
                </label>
              </div>
            )}

            {/* New card fields */}
            {(isNewCard || savedCards.length === 0) && !loadingCards && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                    Name on card
                  </label>
                  <input
                    type="text"
                    value={nameOnCard}
                    onChange={(e) => setNameOnCard(e.target.value)}
                    placeholder="Full name as on card"
                    className="w-full bg-secondary/30 border border-border rounded-lg px-3.5 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                    Card number
                  </label>
                  <div className="bg-secondary/30 border border-border rounded-lg px-3.5 py-3 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                    <CardNumberElement
                      options={{ ...cardStyle, showIcon: true }}
                      onChange={(e) => setCardComplete((p) => ({ ...p, number: e.complete }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                      Expiry date
                    </label>
                    <div className="bg-secondary/30 border border-border rounded-lg px-3.5 py-3 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                      <CardExpiryElement
                        options={cardStyle}
                        onChange={(e) => setCardComplete((p) => ({ ...p, expiry: e.complete }))}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                      CVC
                    </label>
                    <div className="bg-secondary/30 border border-border rounded-lg px-3.5 py-3 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                      <CardCvcElement
                        options={cardStyle}
                        onChange={(e) => setCardComplete((p) => ({ ...p, cvc: e.complete }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {loadingCards && (
              <div className="space-y-3 mb-6">
                {[1, 2].map((i) => <div key={i} className="h-14 rounded-lg bg-secondary/50 animate-pulse" />)}
              </div>
            )}

            {error && (
              <div className="mt-4 flex items-start gap-2.5 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                <span className="flex-shrink-0 mt-0.5">⚠</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!stripe || !allComplete || loading}
              className="mt-6 w-full btn-primary py-3.5 text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
              ) : (
                <><Lock className="w-4 h-4" />
                  {finalPrice === 0
                    ? "Enroll for Free"
                    : `Pay ₹${finalPrice.toLocaleString("en-IN")}`}
                  <ChevronRight className="w-4 h-4" /></>
              )}
            </button>

            <p className="mt-4 text-center text-xs text-muted-foreground/60 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Encrypted and processed by Stripe. We never store card details.
            </p>
          </div>
        </div>

      </div>
    </form>
  );
}
