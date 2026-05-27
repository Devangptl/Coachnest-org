"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Lock, ArrowLeft, Loader2, ShieldCheck,
  CheckCircle2, ChevronRight, Package, Users,
} from "lucide-react";
import Link from "next/link";
import type { RazorpayOptions } from "@/types/razorpay";

// ── Load Razorpay checkout script ────────────────────────────────────────────

function useRazorpayScript() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined" && window.Razorpay) { setLoaded(true); return; }
    const script   = document.createElement("script");
    script.src     = "https://checkout.razorpay.com/v1/checkout.js";
    script.async   = true;
    script.onload  = () => setLoaded(true);
    script.onerror = () => console.error("Failed to load Razorpay script");
    document.body.appendChild(script);
  }, []);
  return loaded;
}

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

// ── Main component ─────────────────────────────────────────────────────────────

export default function FeatureCheckoutClient({
  featureId, featureName, featureSlug, description, price, includes,
}: Props) {
  const router         = useRouter();
  const razorpayLoaded = useRazorpayScript();

  const [paying, setPaying] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  const FeatureIcon = FEATURE_ICON[featureSlug] ?? Package;

  async function handlePay() {
    if (!razorpayLoaded) { setError("Payment gateway not loaded. Please refresh."); return; }
    setError(null);
    setPaying(true);

    try {
      // Step 1 — create Razorpay order
      const res  = await fetch("/api/razorpay/create-order", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ type: "feature", featureId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create order");

      const { razorpayOrderId, dbOrderId, amount, currency, key } = data;

      // Step 2 — open Razorpay modal
      await new Promise<void>((resolve, reject) => {
        const options: RazorpayOptions = {
          key,
          amount:      Math.round(amount * 100), // paise
          currency:    currency ?? "INR",
          name:        "Coachnest",
          description: `${featureName} — Platform Add-on`,
          order_id:    razorpayOrderId,
          theme:       { color: "#d4703f" },
          modal: {
            ondismiss: () => {
              setPaying(false);
              reject(new Error("Payment was cancelled."));
            },
          },
          handler: async (response) => {
            try {
              // Step 3 — verify signature
              const vRes  = await fetch("/api/razorpay/verify-payment", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({
                  type:               "feature",
                  razorpayOrderId:    response.razorpay_order_id,
                  razorpayPaymentId:  response.razorpay_payment_id,
                  razorpaySignature:  response.razorpay_signature,
                  dbOrderId,
                }),
              });
              const vData = await vRes.json();
              if (!vRes.ok) throw new Error(vData.error ?? "Payment verification failed");
              resolve();
              router.push(`/features/${featureSlug}?success=true`);
            } catch (err) {
              reject(err);
            }
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", (r) => {
          reject(new Error(r.error?.description ?? "Payment failed. Please try again."));
        });
        rzp.open();
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      if (msg !== "Payment was cancelled.") setError(msg);
    } finally {
      setPaying(false);
    }
  }

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
          <div className="border-t border-border pt-2.5 flex items-center justify-between font-bold text-foreground">
            <span>Total today</span>
            <span>₹{price.toLocaleString("en-IN")}</span>
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

      {/* Right: pay button */}
      <div className="lg:col-span-3">
        <div className="rounded-md border border-border bg-card p-6 sm:p-8">
          <h2 className="text-lg font-bold text-foreground mb-1">Complete your purchase</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Click below to open the secure Razorpay payment window. Supports
            UPI, cards, net banking, and wallets.
          </p>

          {error && (
            <div className="mb-4 flex items-start gap-2.5 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
              <span className="flex-shrink-0 mt-0.5">⚠</span>
              {error}
            </div>
          )}

          <button
            onClick={handlePay}
            disabled={paying || !razorpayLoaded}
            className="w-full btn-primary py-3.5 text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {paying ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
            ) : (
              <><Lock className="w-4 h-4" />
                Pay ₹{price.toLocaleString("en-IN")}
                <ChevronRight className="w-4 h-4" /></>
            )}
          </button>

          <p className="mt-4 text-center text-xs text-muted-foreground/60 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Powered by Razorpay · UPI · Cards · Net Banking · Wallets
          </p>

          <div className="mt-5 flex items-center justify-center gap-3 flex-wrap">
            {["UPI", "VISA", "Mastercard", "RuPay", "Net Banking"].map((brand) => (
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
