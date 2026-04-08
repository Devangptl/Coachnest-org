"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStripe, useElements, CardNumberElement, CardExpiryElement, CardCvcElement } from "@stripe/react-stripe-js";
import {
  CheckCircle2, Loader2, ShieldCheck, CreditCard,
  Lock, ArrowLeft, Calendar, Zap, Crown, Building2,
  ChevronRight, BadgeCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SavedCard {
  id:       string;
  brand:    string;
  last4:    string;
  expMonth: number;
  expYear:  number;
  isDefault: boolean;
}

interface Props {
  planKey:   string;
  planLabel: string;
  billing:   "monthly" | "yearly";
  price:     number;
  features:  string[];
  popular:   boolean;
  color:     string;
  bg:        string;
  border:    string;
}

const PLAN_ICONS: Record<string, React.ElementType> = {
  BASIC:      Zap,
  PRO:        Crown,
  ENTERPRISE: Building2,
};

// ─── Stripe card element appearance ──────────────────────────────────────────

function useCardStyle() {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const update = () =>
      setIsDark(!document.documentElement.classList.contains("light"));
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

// ─── Brand chip display ───────────────────────────────────────────────────────

const BRAND_DISPLAY: Record<string, string> = {
  visa: "VISA", mastercard: "Mastercard", amex: "Amex",
  discover: "Discover", jcb: "JCB", unionpay: "UnionPay",
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function CheckoutClient({
  planKey, planLabel, billing, price, features, popular, color, bg, border,
}: Props) {
  const router   = useRouter();
  const stripe   = useStripe();
  const elements = useElements();
  const cardStyle = useCardStyle();

  const [savedCards,    setSavedCards]    = useState<SavedCard[]>([]);
  const [selectedCard,  setSelectedCard]  = useState<string | "new">("new");
  const [nameOnCard,    setNameOnCard]    = useState("");
  const [cardComplete,  setCardComplete]  = useState({ number: false, expiry: false, cvc: false });
  const [loading,       setLoading]       = useState(false);
  const [loadingCards,  setLoadingCards]  = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [succeeded,     setSucceeded]     = useState(false);

  // Fetch saved payment methods
  useEffect(() => {
    fetch("/api/billing/payment-methods")
      .then((r) => r.json())
      .then((d) => {
        const cards: SavedCard[] = (d.paymentMethods ?? []).map((pm: any) => ({
          id:        pm.id,
          brand:     pm.card?.brand ?? "card",
          last4:     pm.card?.last4 ?? "••••",
          expMonth:  pm.card?.exp_month,
          expYear:   pm.card?.exp_year,
          isDefault: pm.id === d.defaultPaymentMethodId,
        }));
        setSavedCards(cards);
        if (cards.length > 0) setSelectedCard(cards[0].id);
      })
      .catch(() => {})
      .finally(() => setLoadingCards(false));
  }, []);

  const isNewCard   = selectedCard === "new";
  const allComplete = isNewCard
    ? (cardComplete.number && cardComplete.expiry && cardComplete.cvc && nameOnCard.trim().length > 0)
    : true;

  const yearlyMonthly = billing === "yearly" ? Math.round(price / 12) : price;
  const Icon          = PLAN_ICONS[planKey] ?? Zap;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setError(null);
    setLoading(true);

    try {
      // Step 1 — Create subscription & get PaymentIntent clientSecret
      const subRes = await fetch("/api/billing/subscribe", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ plan: planKey, billing }),
      });
      const subData = await subRes.json();

      if (!subRes.ok) throw new Error(subData.error ?? "Failed to create subscription");

      // Step 2a — Already succeeded (customer had a working default card)
      if (subData.success) {
        setSucceeded(true);
        setTimeout(() => router.push("/dashboard/subscription?success=true"), 1500);
        return;
      }

      // Step 2b — Needs card confirmation
      if (!subData.clientSecret) throw new Error("No payment intent returned");

      const confirmPayload: any = { payment_method: {} };

      if (isNewCard) {
        const cardNumber = elements.getElement(CardNumberElement);
        if (!cardNumber) throw new Error("Card element not ready");
        confirmPayload.payment_method = {
          card:             cardNumber,
          billing_details:  { name: nameOnCard.trim(), address: { country: "IN" } },
        };
      } else {
        confirmPayload.payment_method = selectedCard;
      }

      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        subData.clientSecret,
        confirmPayload
      );

      if (stripeError) throw new Error(stripeError.message);

      if (paymentIntent?.status === "succeeded" || paymentIntent?.status === "processing") {
        // Sync subscription to DB (in case webhook hasn't fired yet)
        await fetch("/api/subscriptions/sync", { method: "POST" }).catch(() => {});
        setSucceeded(true);
        setTimeout(() => router.push("/dashboard/subscription?success=true"), 1500);
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
          <p className="text-muted-foreground mt-1 text-sm">
            Welcome to CoachNest {planLabel}. Redirecting…
          </p>
        </div>
        <div className="w-5 h-5">
          <Loader2 className="animate-spin text-primary w-5 h-5" />
        </div>
      </div>
    );
  }

  // ── Checkout layout ─────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit}>
      <div className="grid lg:grid-cols-5 gap-8 lg:gap-12 items-start">

        {/* ── Left: Order Summary (2/5) ──────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to plans
          </Link>

          {/* Plan card */}
          <div className={cn("rounded-xl border bg-card p-6", border)}>
            {/* Plan header */}
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", bg)}>
                  <Icon className={cn("w-5 h-5", color)} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-foreground">{planLabel}</h3>
                    {popular && (
                      <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        Popular
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs capitalize">{billing} billing</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-foreground">
                  ₹{price.toLocaleString("en-IN")}
                </div>
                <div className="text-xs text-muted-foreground">
                  /{billing === "yearly" ? "year" : "month"}
                </div>
              </div>
            </div>

            {/* Yearly savings note */}
            {billing === "yearly" && (
              <div className="flex items-center gap-2 mb-5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                <BadgeCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  ₹{yearlyMonthly.toLocaleString("en-IN")}/mo effective — save vs monthly
                </p>
              </div>
            )}

            {/* Feature list */}
            <ul className="space-y-2.5">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/80">{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Billing summary */}
          <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-2.5 text-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>{planLabel} Plan ({billing})</span>
              <span>₹{price.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Tax</span>
              <span>Included</span>
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
              { icon: Calendar,    text: "Cancel anytime — no long-term contracts" },
            ].map(({ icon: TrustIcon, text }) => (
              <div key={text} className="flex items-center gap-2.5 text-xs text-muted-foreground">
                <TrustIcon className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
                {text}
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Payment form (3/5) ──────────────────────────────────────── */}
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
                        : "border-border hover:border-border/80 hover:bg-secondary/40"
                    )}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={card.id}
                      checked={selectedCard === card.id}
                      onChange={() => setSelectedCard(card.id)}
                      className="accent-primary"
                    />
                    <CreditCard className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-foreground capitalize">
                        {BRAND_DISPLAY[card.brand] ?? card.brand}
                      </span>
                      <span className="text-muted-foreground text-sm"> •••• {card.last4}</span>
                    </div>
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

                <label
                  className={cn(
                    "flex items-center gap-3 p-3.5 rounded-lg border cursor-pointer transition-all",
                    selectedCard === "new"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-border/80 hover:bg-secondary/40"
                  )}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="new"
                    checked={selectedCard === "new"}
                    onChange={() => setSelectedCard("new")}
                    className="accent-primary"
                  />
                  <span className="text-sm font-medium text-foreground">Use a new card</span>
                </label>
              </div>
            )}

            {/* New card fields */}
            {(isNewCard || savedCards.length === 0) && !loadingCards && (
              <div className="space-y-4">
                {/* Name on card */}
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

                {/* Card number */}
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

                {/* Expiry + CVC */}
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

            {/* Loading cards skeleton */}
            {loadingCards && (
              <div className="space-y-3 mb-6">
                {[1, 2].map((i) => (
                  <div key={i} className="h-14 rounded-lg bg-secondary/50 animate-pulse" />
                ))}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mt-4 flex items-start gap-2.5 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                <span className="flex-shrink-0 mt-0.5">⚠</span>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!stripe || !allComplete || loading}
              className="mt-6 w-full btn-primary py-3.5 text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing…
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Pay ₹{price.toLocaleString("en-IN")}
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Stripe badge */}
            <p className="mt-4 text-center text-xs text-muted-foreground/60 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Your payment info is encrypted and processed by Stripe. We never store card details.
            </p>
          </div>
        </div>
      </div>
    </form>
  );
}
