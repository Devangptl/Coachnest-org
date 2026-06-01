"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Lock, ArrowLeft, BookOpen, Tag, X, Loader2, ShieldCheck,
  ChevronRight, Library,
} from "lucide-react";
import RazorpayCustomForm, {
  type RazorpayOrderInfo,
} from "@/components/checkout/RazorpayCustomForm";
import type { RazorpaySuccessResponse } from "@/types/razorpay";
import { calcProcessingFee, PROCESSING_FEE_LABEL } from "@/lib/fees";
import { cn } from "@/lib/utils";

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
  items:         CheckoutItem[];
  subtotal:      number;
  userEmail?:    string;
  platformOffer?: { id: string; title: string; discount: number } | null;
}

type Phase = "summary" | "payment";

export default function BooksCheckoutClient({ items, subtotal, userEmail, platformOffer }: Props) {
  const router = useRouter();

  const [phase,     setPhase]     = useState<Phase>("summary");
  const [orderInfo, setOrderInfo] = useState<RazorpayOrderInfo | null>(null);

  const [couponCode,    setCouponCode]    = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string; label: string; discount: number;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const baseTotal     = items.reduce((s, i) => s + i.price, 0);
  const itemDiscount  = baseTotal - subtotal;
  const afterCoupon   = appliedCoupon ? Math.max(0, subtotal - appliedCoupon.discount) : subtotal;
  const offerDiscount = platformOffer ? Math.min(platformOffer.discount, afterCoupon) : 0;
  const goodsTotal    = Math.max(0, afterCoupon - offerDiscount);
  const processingFee = calcProcessingFee(goodsTotal);
  const displayPrice  = goodsTotal + processingFee;
  const totalSavings  = baseTotal - goodsTotal;

  const [proceeding, setProceeding] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  async function handleApplyCoupon() {
    if (!couponCode.trim() || couponLoading) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
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

  async function handleProceed(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setProceeding(true);
    try {
      const res  = await fetch("/api/razorpay/create-order", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ type: "books", couponCode: appliedCoupon?.code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create order");
      setOrderInfo({
        razorpayOrderId: data.razorpayOrderId,
        dbOrderId:       data.dbOrderId,
        amount:          data.amount,
        currency:        data.currency ?? "INR",
        key:             data.key,
        type:            "books",
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
        type:              "books",
        razorpayOrderId:   response.razorpay_order_id,
        razorpayPaymentId: response.razorpay_payment_id,
        razorpaySignature: response.razorpay_signature,
        dbOrderId:         orderInfo.dbOrderId,
      }),
    });
    const vData = await vRes.json();
    if (!vRes.ok) throw new Error(vData.error ?? "Payment verification failed");
    router.push(`/checkout/success?type=books&orderId=${orderInfo.dbOrderId}`);
  }

  function handleUpiCaptured() {
    if (orderInfo) router.push(`/checkout/success?type=books&orderId=${orderInfo.dbOrderId}`);
  }

  const description = `${items.length} book${items.length !== 1 ? "s" : ""}`;

  // ── Phase 2: Payment form ───────────────────────────────────────────────────

  if (phase === "payment" && orderInfo) {
    return (
      <div className="grid lg:grid-cols-5 gap-6 lg:gap-8 items-start">
        <aside className="lg:col-span-2 space-y-3">
          <button
            type="button"
            onClick={() => setPhase("summary")}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to order summary
          </button>

          {/* Book list */}
          <BookList items={items} />

          {/* Price recap */}
          <div className="rounded-lg border border-border bg-card px-4 py-3 space-y-1.5 text-sm">
            <PriceRow label={`Items (${items.length})`} value={`₹${baseTotal.toLocaleString("en-IN")}`} />
            {itemDiscount > 0 && <PriceRow label="Item discounts" value={`−₹${itemDiscount.toLocaleString("en-IN")}`} positive />}
            {appliedCoupon && <PriceRow label={`Coupon (${appliedCoupon.code})`} value={`−₹${appliedCoupon.discount.toLocaleString("en-IN")}`} positive />}
            {platformOffer && offerDiscount > 0 && (
              <PriceRow label={`Offer · ${platformOffer.title}`} value={`−₹${offerDiscount.toLocaleString("en-IN")}`} positive />
            )}
            {processingFee > 0 && <PriceRow label={PROCESSING_FEE_LABEL} value={`₹${processingFee.toLocaleString("en-IN")}`} />}
            <div className="flex justify-between border-t border-border pt-2 mt-1">
              <span className="font-semibold text-foreground">Total</span>
              <span className="font-bold text-lg text-foreground">₹{displayPrice.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </aside>

        <div className="lg:col-span-3">
          <RazorpayCustomForm
            orderInfo={orderInfo}
            description={description}
            prefillEmail={userEmail}
            onSuccess={handlePaymentSuccess}
            onUpiCaptured={handleUpiCaptured}
            onError={(msg) => setError(msg)}
            onBack={() => setPhase("summary")}
          />
          {error && <InlineError msg={error} className="mt-3" />}
        </div>
      </div>
    );
  }

  // ── Phase 1: Order summary + proceed button ─────────────────────────────────

  return (
    <form onSubmit={handleProceed} className="grid lg:grid-cols-5 gap-6 lg:gap-8 items-start">

      {/* Left: books + coupon + totals */}
      <aside className="lg:col-span-2 space-y-3">
        <BookList items={items} />

        {/* Coupon */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
            <Tag className="w-3 h-3" /> Coupon code
          </p>
          {appliedCoupon ? (
            <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/25 rounded-md px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <Tag className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-sm truncate">{appliedCoupon.code}</span>
                <span className="text-emerald-600/70 dark:text-emerald-400/70 text-xs whitespace-nowrap">−₹{appliedCoupon.discount.toLocaleString("en-IN")}</span>
              </div>
              <button
                type="button"
                onClick={() => { setAppliedCoupon(null); setCouponCode(""); }}
                className="p-1 rounded-md hover:bg-emerald-500/20 text-emerald-500/60 hover:text-emerald-500 transition-colors"
              >
                <X className="w-3 h-3" />
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
                className="btn-secondary !text-xs whitespace-nowrap"
              >
                {couponLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Apply"}
              </button>
            </div>
          )}
          {couponError && <p className="text-xs text-red-500">{couponError}</p>}
        </div>

        {/* Price breakdown */}
        <div className="rounded-lg border border-border bg-card px-4 py-3 space-y-1.5 text-sm">
          <PriceRow label={`Items (${items.length})`} value={`₹${baseTotal.toLocaleString("en-IN")}`} />
          {itemDiscount > 0 && <PriceRow label="Item discounts" value={`−₹${itemDiscount.toLocaleString("en-IN")}`} positive />}
          {appliedCoupon && <PriceRow label={`Coupon (${appliedCoupon.code})`} value={`−₹${appliedCoupon.discount.toLocaleString("en-IN")}`} positive />}
          {processingFee > 0 && <PriceRow label={PROCESSING_FEE_LABEL} value={`₹${processingFee.toLocaleString("en-IN")}`} />}
          <div className="flex justify-between border-t border-border pt-2 mt-1">
            <span className="font-bold text-foreground">Total today</span>
            <span className="font-bold text-lg text-foreground">₹{displayPrice.toLocaleString("en-IN")}</span>
          </div>
          {totalSavings > 0 && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium text-center pt-0.5">
              You save ₹{totalSavings.toLocaleString("en-IN")}
            </p>
          )}
        </div>
      </aside>

      {/* Right: CTA panel */}
      <div className="lg:col-span-3">
        <div className="rounded-lg border border-border bg-card p-6 space-y-6">

          {/* Amount */}
          <div>
            <p className="text-sm text-muted-foreground mb-1">Order total</p>
            <p className="text-4xl font-bold text-foreground tracking-tight">
              ₹{displayPrice.toLocaleString("en-IN")}
            </p>
            {processingFee > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Includes ₹{processingFee.toLocaleString("en-IN")} processing fee
              </p>
            )}
          </div>

          {error && <InlineError msg={error} />}

          <button
            type="submit"
            disabled={proceeding}
            className="btn-primary !w-full !py-4 !text-base !font-bold justify-center"
          >
            {proceeding ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Preparing checkout…</>
            ) : (
              <><Lock className="w-4 h-4" />Pay ₹{displayPrice.toLocaleString("en-IN")} securely<ChevronRight className="w-4 h-4" /></>
            )}
          </button>

          {/* Trust */}
          <div className="border-t border-border pt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {[
              { icon: Lock,        text: "256-bit SSL" },
              { icon: ShieldCheck, text: "Secured by Razorpay" },
              { icon: Library,     text: "Lifetime download access" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                {text}
              </div>
            ))}
          </div>

        </div>
      </div>

    </form>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BookList({ items }: { items: CheckoutItem[] }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 mb-3">
        <Library className="w-3 h-3" /> Your books ({items.length})
      </h3>
      <ul className="space-y-3">
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
                <Link
                  href={`/books/${item.slug}`}
                  className="block text-xs font-semibold text-foreground hover:text-[#d97757] transition-colors line-clamp-2 leading-snug"
                >
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

function PriceRow({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium", positive ? "text-emerald-500" : "text-foreground")}>
        {value}
      </span>
    </div>
  );
}

function InlineError({ msg, className }: { msg: string; className?: string }) {
  return (
    <div className={cn("flex items-start gap-2.5 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3", className)}>
      <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
      {msg}
    </div>
  );
}
