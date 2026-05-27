"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Elements, PaymentElement,
  useStripe, useElements,
} from "@stripe/react-stripe-js";
import {
  Lock, ArrowLeft, BookOpen, Tag, X, Loader2, ShieldCheck,
  ChevronRight, Smartphone, Receipt, Library,
} from "lucide-react";
import { stripePromise } from "@/lib/stripe-client";

// ── Stripe Elements appearance ────────────────────────────────────────────────

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

export interface CheckoutItem {
  bookId:        string;
  title:         string;
  slug:          string;
  coverImage:    string | null;
  author:        string;
  price:         number;
  discountPrice: number | null;
}

interface Props {
  items:    CheckoutItem[];
  subtotal: number;
}

// ─── Card payment form (inside Elements context) ─────────────────────────────

function CardPaymentForm({ amount, onBack }: { amount: number; onBack: () => void }) {
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
      const returnUrl = `${appUrl}/checkout/success?type=books`;

      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: returnUrl },
        redirect:      "if_required",
      });

      if (confirmError) throw new Error(confirmError.message);

      if (paymentIntent?.status === "succeeded" || paymentIntent?.status === "processing") {
        const res  = await fetch("/api/payments/confirm-book-purchase", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ paymentIntentId: paymentIntent.id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Purchase confirmation failed");
        router.push(`/checkout/success?type=books&orderId=${data.orderId}`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Payment failed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement options={{ layout: "tabs" }} />
      {error && <InlineError msg={error} />}
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
          className="flex-1 btn-primary !py-3 !text-base !font-bold justify-center"
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

// ─── UPI payment form ────────────────────────────────────────────────────────

function UpiPaymentForm({
  clientSecret, amount, onBack,
}: { clientSecret: string; amount: number; onBack: () => void }) {
  const stripe = useStripe();
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
    const returnUrl = `${appUrl}/checkout/success?type=books`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: stripeError } = await (stripe as any).confirmUpiPayment(clientSecret, {
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
      <div>
        <label className="label flex items-center gap-1.5">
          <Smartphone className="w-3 h-3" /> UPI ID
        </label>
        <input
          type="text"
          value={upiId}
          onChange={(e) => { setUpiId(e.target.value); setError(null); }}
          placeholder="yourname@bank"
          autoComplete="off"
          spellCheck={false}
          className="input-glass"
        />
        <p className="mt-1 text-[11px] text-muted-foreground/70">
          e.g. name@paytm · 9876543210@ybl · user@okaxis
        </p>
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Supported apps</p>
        <div className="flex flex-wrap gap-1.5">
          {["Google Pay", "PhonePe", "Paytm", "BHIM", "Amazon Pay"].map((app) => (
            <span key={app} className="px-2 py-0.5 rounded-full bg-secondary/60 border border-border text-[10px] text-muted-foreground">
              {app}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-md bg-blue-500/10 border border-blue-500/20 px-3 py-2.5 text-xs text-blue-600 dark:text-blue-400 flex items-start gap-2">
        <span className="mt-0.5 flex-shrink-0">ℹ️</span>
        After clicking Pay, a collect request will be sent to your UPI app. Open the app and approve the payment to finalize your purchase.
      </div>

      {error && <InlineError msg={error} />}

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
          className="flex-1 btn-primary !py-3 !text-base !font-bold justify-center"
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

// ─── Main client ─────────────────────────────────────────────────────────────

export default function BooksCheckoutClient({ items, subtotal }: Props) {
  const [phase,          setPhase]          = useState<"summary" | "payment">("summary");
  const [selectedMethod, setSelectedMethod] = useState<"card" | "upi">("card");
  const [clientSecret,   setClientSecret]   = useState<string | null>(null);
  const [payAmount,      setPayAmount]      = useState(subtotal);

  // Coupon
  const [couponCode,    setCouponCode]    = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string; label: string; discount: number;
  } | null>(null);
  const [couponError,   setCouponError]   = useState<string | null>(null);

  const baseTotal     = items.reduce((s, i) => s + i.price, 0);
  const itemDiscount  = baseTotal - subtotal;
  const displayPrice  = appliedCoupon
    ? Math.max(0, subtotal - appliedCoupon.discount)
    : subtotal;
  const totalSavings  = baseTotal - displayPrice;

  const [initiating, setInitiating] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  // Theme detection for Stripe Elements appearance
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const update = () => setIsDark(!document.documentElement.classList.contains("light"));
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  const appearance = isDark ? APPEARANCE_DARK : APPEARANCE_LIGHT;

  async function handleApplyCoupon() {
    if (!couponCode.trim() || couponLoading) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
      // We let the server validate at payment-intent time, but pre-validate here
      // for a friendlier UX. We compute a client-side estimate of the discount.
      const res  = await fetch("/api/coupons/validate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setCouponError(data.error ?? "Invalid coupon"); return; }
      const discountAmt = data.discountType === "PERCENTAGE"
        ? Math.round(subtotal * data.discount / 100)
        : Math.min(data.discount, subtotal);
      setAppliedCoupon({ code: data.code, label: data.description ?? data.code, discount: discountAmt });
    } catch {
      setCouponError("Could not validate coupon. Please try again.");
    } finally {
      setCouponLoading(false);
    }
  }

  async function handleProceedToPayment(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInitiating(true);
    try {
      const res  = await fetch("/api/payments/create-book-payment-intent", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          couponCode:        appliedCoupon?.code,
          paymentMethodType: selectedMethod,
        }),
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

  // ── Payment phase ─────────────────────────────────────────────────────────
  if (phase === "payment" && clientSecret) {
    const paySavings = baseTotal - payAmount;
    return (
      <div className="grid lg:grid-cols-5 gap-6 lg:gap-8 items-start">
        {/* Order recap */}
        <aside className="lg:col-span-2 space-y-3">
          <OrderRecap items={items} />
          <TotalsCard baseTotal={baseTotal} payAmount={payAmount} savings={paySavings} />
          <TrustSignals />
        </aside>

        {/* Payment form */}
        <div className="lg:col-span-3">
          <div className="rounded-lg border border-border bg-card p-5 sm:p-6">
            <h2 className="text-base font-bold text-foreground mb-1">
              {selectedMethod === "upi" ? "Pay via UPI" : "Complete payment"}
            </h2>
            <p className="text-sm text-muted-foreground mb-5">
              {selectedMethod === "upi"
                ? "Enter your UPI ID to receive a payment request on your phone."
                : "Choose your payment method and enter your details below."}
            </p>
            <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
              {selectedMethod === "upi" ? (
                <UpiPaymentForm
                  clientSecret={clientSecret}
                  amount={payAmount}
                  onBack={() => setPhase("summary")}
                />
              ) : (
                <CardPaymentForm
                  amount={payAmount}
                  onBack={() => setPhase("summary")}
                />
              )}
            </Elements>
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground/60 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Encrypted &amp; processed by Stripe. We never store card details.
          </p>
        </div>
      </div>
    );
  }

  // ── Summary phase ─────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleProceedToPayment} className="grid lg:grid-cols-5 gap-6 lg:gap-8 items-start">
      {/* Order summary */}
      <aside className="lg:col-span-2 space-y-3">
        <OrderRecap items={items} />

        {/* Coupon */}
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="label flex items-center gap-1.5">
            <Tag className="w-3 h-3" /> Coupon code
          </p>
          {appliedCoupon ? (
            <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/25 rounded-md px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <Tag className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-sm truncate">
                  {appliedCoupon.code}
                </span>
                <span className="text-emerald-600/80 dark:text-emerald-400/80 text-xs whitespace-nowrap">
                  −₹{appliedCoupon.discount.toLocaleString("en-IN")}
                </span>
              </div>
              <button
                type="button"
                onClick={() => { setAppliedCoupon(null); setCouponCode(""); }}
                className="p-1 rounded-md hover:bg-emerald-500/20 text-emerald-500/70 hover:text-emerald-500"
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
                className="input-glass uppercase placeholder:normal-case"
              />
              <button
                type="button"
                onClick={handleApplyCoupon}
                disabled={couponLoading || !couponCode.trim()}
                className="btn-secondary !text-xs"
              >
                {couponLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Apply"}
              </button>
            </div>
          )}
          {couponError && <p className="mt-2 text-xs text-red-500">{couponError}</p>}
        </div>

        {/* Totals */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-2 text-sm">
          <h3 className="label flex items-center gap-1.5 !mb-2">
            <Receipt className="w-3 h-3" /> Order Summary
          </h3>
          <Row label={`Items (${items.length})`} value={`₹${baseTotal.toLocaleString("en-IN")}`} />
          {itemDiscount > 0 && (
            <Row label="Item discounts" value={`−₹${itemDiscount.toLocaleString("en-IN")}`} positive />
          )}
          {appliedCoupon && (
            <Row label={`Coupon (${appliedCoupon.code})`} value={`−₹${appliedCoupon.discount.toLocaleString("en-IN")}`} positive />
          )}
          <div className="border-t border-border pt-2 flex items-baseline justify-between">
            <span className="text-muted-foreground">Total today</span>
            <span className="text-xl font-bold text-foreground">
              ₹{displayPrice.toLocaleString("en-IN")}
            </span>
          </div>
          {totalSavings > 0 && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium text-center pt-1">
              You save ₹{totalSavings.toLocaleString("en-IN")}!
            </p>
          )}
        </div>

        <TrustSignals />
      </aside>

      {/* Payment method picker */}
      <div className="lg:col-span-3">
        <div className="rounded-lg border border-border bg-card p-5 sm:p-6">
          <h2 className="text-base font-bold text-foreground mb-1">Choose payment method</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Select how you&apos;d like to pay and continue to enter your details.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-5">
            {([
              { value: "card", label: "Card", sub: "Visa · Mastercard · Amex",     icon: "💳" },
              { value: "upi",  label: "UPI",  sub: "Google Pay · PhonePe · Paytm", icon: "📲" },
            ] as const).map((pm) => (
              <button
                key={pm.value}
                type="button"
                onClick={() => setSelectedMethod(pm.value)}
                className={
                  "flex flex-col items-center gap-1.5 rounded-lg border p-4 text-center transition-all " +
                  (selectedMethod === pm.value
                    ? "border-orange-500/60 bg-orange-500/5 ring-1 ring-orange-500/30"
                    : "border-border bg-secondary/30 hover:border-border/60 hover:bg-secondary/50")
                }
              >
                <span className="text-2xl">{pm.icon}</span>
                <span className="text-sm font-semibold text-foreground">{pm.label}</span>
                <span className="text-[11px] text-muted-foreground leading-tight">{pm.sub}</span>
              </button>
            ))}
          </div>

          {error && <div className="mb-4"><InlineError msg={error} /></div>}

          <button
            type="submit"
            disabled={initiating}
            className="btn-primary !w-full !py-3 !text-base !font-bold justify-center"
          >
            {initiating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Preparing payment…</>
            ) : (
              <><Lock className="w-4 h-4" /> Pay ₹{displayPrice.toLocaleString("en-IN")} <ChevronRight className="w-4 h-4" /></>
            )}
          </button>

          <p className="mt-3 text-center text-[11px] text-muted-foreground/70 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3 h-3" />
            Encrypted &amp; processed by Stripe. We never store card details.
          </p>

          <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
            {["VISA", "Mastercard", "Amex", "UPI", "RuPay"].map((brand) => (
              <span key={brand} className="px-2 py-0.5 rounded border border-border text-[10px] font-bold text-muted-foreground bg-secondary/40 tracking-wide">
                {brand}
              </span>
            ))}
          </div>
        </div>
      </div>
    </form>
  );
}

// ─── small inline components ─────────────────────────────────────────────────

function OrderRecap({ items }: { items: CheckoutItem[] }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="label flex items-center gap-1.5 !mb-3">
        <Library className="w-3 h-3" /> Your books ({items.length})
      </h3>
      <ul className="space-y-2.5">
        {items.map((item) => {
          const finalPrice = item.discountPrice ?? item.price;
          return (
            <li key={item.bookId} className="flex items-start gap-2.5">
              <Link href={`/books/${item.slug}`} className="flex-shrink-0">
                <div className="h-14 w-10 overflow-hidden rounded border border-border bg-secondary/60">
                  {item.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.coverImage} alt={item.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground/30">
                      <BookOpen className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={`/books/${item.slug}`} className="block text-xs font-semibold text-foreground hover:text-orange-500 transition-colors line-clamp-2 leading-snug">
                  {item.title}
                </Link>
                <p className="mt-0.5 text-[11px] text-muted-foreground truncate">by {item.author}</p>
              </div>
              <span className="text-xs font-semibold text-foreground whitespace-nowrap">
                ₹{finalPrice.toLocaleString("en-IN")}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TotalsCard({
  baseTotal, payAmount, savings,
}: { baseTotal: number; payAmount: number; savings: number }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-2 text-sm">
      {baseTotal > payAmount && (
        <Row label="Original price" value={`₹${baseTotal.toLocaleString("en-IN")}`} strike />
      )}
      <div className="border-t border-border pt-2 flex items-baseline justify-between font-bold text-foreground">
        <span>Total today</span>
        <span className="text-lg">₹{payAmount.toLocaleString("en-IN")}</span>
      </div>
      {savings > 0 && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium text-center pt-0.5">
          You save ₹{savings.toLocaleString("en-IN")}!
        </p>
      )}
    </div>
  );
}

function TrustSignals() {
  const items = [
    { icon: Lock,        text: "256-bit SSL encryption" },
    { icon: ShieldCheck, text: "PCI-compliant via Stripe" },
    { icon: Library,     text: "Lifetime download access" },
  ];
  return (
    <ul className="space-y-1.5 px-1">
      {items.map(({ icon: Icon, text }) => (
        <li key={text} className="flex items-center gap-2 text-xs text-muted-foreground">
          <Icon className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
          {text}
        </li>
      ))}
    </ul>
  );
}

function Row({
  label, value, positive, strike,
}: { label: string; value: string; positive?: boolean; strike?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={
        positive
          ? "text-emerald-500 font-medium"
          : strike
            ? "text-muted-foreground line-through"
            : "text-foreground font-medium"
      }>
        {value}
      </span>
    </div>
  );
}

function InlineError({ msg }: { msg: string }) {
  return (
    <div className="flex items-start gap-2.5 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-md px-3.5 py-2.5">
      <span className="flex-shrink-0 mt-0.5">⚠</span>
      {msg}
    </div>
  );
}
