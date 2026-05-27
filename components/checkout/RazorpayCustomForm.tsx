"use client";

/**
 * RazorpayCustomForm
 * ─────────────────────────────────────────────────────────────────────────────
 * A fully custom payment form built on Razorpay Custom Checkout (razorpay.js).
 *
 * Supported methods — both stay 100% on YOUR page:
 *   Card  — user enters details here; bank 3DS OTP appears as a small overlay
 *           (bank-mandated, unavoidable) and resolves back on this page.
 *   UPI   — user enters VPA; a push notification goes to their phone; they
 *           approve there; payment.success fires back on this page.
 *
 * Net Banking is intentionally excluded — it always redirects the browser to
 * the bank's website, leaving your UI entirely.
 */

import {
  useEffect, useRef, useState, type ChangeEvent, type FormEvent,
} from "react";
import {
  CreditCard, Smartphone, Loader2, ShieldCheck, ArrowLeft,
  CheckCircle2, Eye, EyeOff, AlertCircle, Lock,
} from "lucide-react";
import type {
  RazorpayCustomOptions,
  RazorpayCustomInstance,
  RazorpaySuccessResponse,
  CardPaymentData,
  UpiPaymentData,
} from "@/types/razorpay";

// ── Load razorpay.js ──────────────────────────────────────────────────────────

function useRazorpayCustomScript() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined" && window.Razorpay) { setLoaded(true); return; }
    const s   = document.createElement("script");
    s.src     = "https://checkout.razorpay.com/v1/razorpay.js";
    s.async   = true;
    s.onload  = () => setLoaded(true);
    s.onerror = () => console.error("Failed to load Razorpay script");
    document.body.appendChild(s);
  }, []);
  return loaded;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type PaymentTab = "card" | "upi";

export interface RazorpayOrderInfo {
  razorpayOrderId: string;
  dbOrderId:       string;
  amount:          number;   // rupees (NOT paise)
  currency:        string;
  key:             string;
}

interface Props {
  orderInfo:    RazorpayOrderInfo;
  description?: string;
  onSuccess:    (response: RazorpaySuccessResponse) => Promise<void>;
  onError:      (message: string) => void;
  onBack?:      () => void;
}

// ── Formatters ────────────────────────────────────────────────────────────────

function formatCardNumber(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function RazorpayCustomForm({
  orderInfo, description, onSuccess, onError, onBack,
}: Props) {
  const scriptLoaded = useRazorpayCustomScript();
  const rzpRef       = useRef<RazorpayCustomInstance | null>(null);

  const [tab,     setTab]     = useState<PaymentTab>("card");
  const [paying,  setPaying]  = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  // ── Shared contact fields (required by Razorpay for every method) ────────
  const [contact, setContact] = useState("");
  const [email,   setEmail]   = useState("");

  // ── Card fields ───────────────────────────────────────────────────────────
  const [cardNumber, setCardNumber] = useState("");
  const [expiry,     setExpiry]     = useState("");
  const [cvv,        setCvv]        = useState("");
  const [nameOnCard, setNameOnCard] = useState("");
  const [showCvv,    setShowCvv]    = useState(false);

  // ── UPI fields ────────────────────────────────────────────────────────────
  const [upiId,     setUpiId]     = useState("");
  const [upiStatus, setUpiStatus] = useState<"idle" | "waiting" | "done">("idle");

  // ── Init Razorpay instance once script is loaded ──────────────────────────

  useEffect(() => {
    if (!scriptLoaded) return;

    const opts: RazorpayCustomOptions = {
      key:         orderInfo.key,
      order_id:    orderInfo.razorpayOrderId,
      amount:      Math.round(orderInfo.amount * 100), // convert to paise
      currency:    orderInfo.currency ?? "INR",
      name:        "Coachnest",
      description: description ?? "Payment",
    };

    const rzp = new window.Razorpay(opts) as unknown as RazorpayCustomInstance;

    rzp.on("payment.success", async (resp) => {
      setPaying(false);
      setUpiStatus("done");
      try {
        await onSuccess(resp);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Verification failed. Please contact support.";
        setFormErr(msg);
        onError(msg);
      }
    });

    rzp.on("payment.error", (resp) => {
      setPaying(false);
      setUpiStatus("idle");
      const msg = resp.error?.description ?? "Payment failed. Please try again.";
      setFormErr(msg);
      onError(msg);
    });

    rzpRef.current = rzp;
  }, [scriptLoaded, orderInfo, description, onSuccess, onError]);

  // ── Submit ────────────────────────────────────────────────────────────────

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!rzpRef.current) {
      setFormErr("Payment gateway not ready. Please wait a moment and try again.");
      return;
    }
    setFormErr(null);

    // Validate shared contact fields
    const phone = contact.replace(/\D/g, "");
    if (phone.length < 10) {
      setFormErr("Enter a valid 10-digit mobile number.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setFormErr("Enter a valid email address.");
      return;
    }

    if (tab === "card") {
      const raw      = cardNumber.replace(/\s/g, "");
      const [mm, yy] = expiry.split("/");

      if (raw.length < 13)                            { setFormErr("Enter a valid card number.");           return; }
      if (!mm || !yy || mm.length < 2 || yy.length < 2) { setFormErr("Enter a valid expiry date (MM/YY)."); return; }
      if (cvv.length < 3)                             { setFormErr("Enter a valid CVV.");                   return; }
      if (!nameOnCard.trim())                         { setFormErr("Enter the name on your card.");         return; }

      setPaying(true);
      const data: CardPaymentData = {
        method:  "card",
        contact: phone,
        email:   email.trim(),
        card: {
          number:       raw,
          expiry_month: mm,
          expiry_year:  yy,
          cvv,
          name:         nameOnCard.trim(),
        },
      };
      rzpRef.current.createPayment(data);
    }

    if (tab === "upi") {
      if (!upiId.trim() || !upiId.includes("@")) {
        setFormErr("Enter a valid UPI ID — e.g. yourname@paytm");
        return;
      }
      setPaying(true);
      setUpiStatus("waiting");
      const data: UpiPaymentData = {
        method:  "upi",
        vpa:     upiId.trim(),
        contact: phone,
        email:   email.trim(),
      };
      rzpRef.current.createPayment(data);
    }
  }

  // ── Tab class helper ──────────────────────────────────────────────────────

  const tabCls = (t: PaymentTab) =>
    `flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors border-b-2 ${
      tab === t
        ? "border-primary text-primary"
        : "border-transparent text-muted-foreground hover:text-foreground"
    }`;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-secondary/20">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Secure Payment</p>
          <p className="text-xs text-muted-foreground truncate">
            ₹{orderInfo.amount.toLocaleString("en-IN")}
            {description ? ` · ${description}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span className="hidden sm:inline">256-bit SSL</span>
        </div>
      </div>

      {/* ── Tab bar: Card | UPI ────────────────────────────────────────────── */}
      <div className="flex border-b border-border">
        <button
          type="button"
          className={tabCls("card")}
          onClick={() => { setTab("card"); setFormErr(null); }}
        >
          <CreditCard className="w-4 h-4" />
          Card
        </button>
        <button
          type="button"
          className={tabCls("upi")}
          onClick={() => { setTab("upi"); setFormErr(null); setUpiStatus("idle"); }}
        >
          <Smartphone className="w-4 h-4" />
          UPI
        </button>
      </div>

      {/* ── Form ──────────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="p-5 space-y-4">

        {/* ── CARD tab ────────────────────────────────────────────────────── */}
        {tab === "card" && (
          <div className="space-y-3">

            {/* Card number */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Card Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  placeholder="1234  5678  9012  3456"
                  value={cardNumber}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setCardNumber(formatCardNumber(e.target.value))
                  }
                  maxLength={19}
                  className="input-glass pr-10"
                  disabled={paying}
                />
                <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 pointer-events-none" />
              </div>
            </div>

            {/* Expiry + CVV */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Expiry
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="cc-exp"
                  placeholder="MM / YY"
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  maxLength={5}
                  className="input-glass"
                  disabled={paying}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  CVV
                </label>
                <div className="relative">
                  <input
                    type={showCvv ? "text" : "password"}
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    placeholder="•••"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    maxLength={4}
                    className="input-glass pr-9"
                    disabled={paying}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowCvv((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground/50 hover:text-muted-foreground"
                  >
                    {showCvv ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Name on card */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Name on Card
              </label>
              <input
                type="text"
                autoComplete="cc-name"
                placeholder="As printed on card"
                value={nameOnCard}
                onChange={(e) => setNameOnCard(e.target.value)}
                className="input-glass"
                disabled={paying}
              />
            </div>

            {/* Accepted card brands */}
            <div className="flex items-center gap-2">
              {["VISA", "Mastercard", "RuPay", "Amex"].map((b) => (
                <span key={b} className="px-1.5 py-0.5 rounded border border-border text-[10px] font-semibold text-muted-foreground bg-secondary/50 tracking-wide">
                  {b}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── UPI tab ─────────────────────────────────────────────────────── */}
        {tab === "upi" && (
          <div className="space-y-3">

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                UPI ID
              </label>
              <input
                type="text"
                inputMode="email"
                autoComplete="off"
                placeholder="yourname@upi"
                value={upiId}
                onChange={(e) => {
                  setUpiId(e.target.value.trim());
                  setUpiStatus("idle");
                  setFormErr(null);
                }}
                className="input-glass"
                disabled={paying}
              />
              <p className="mt-1.5 text-xs text-muted-foreground/70">
                e.g.&nbsp;&nbsp;9999999999@paytm &nbsp;·&nbsp; yourname@okhdfcbank &nbsp;·&nbsp; user@ybl
              </p>
            </div>

            {/* Waiting for phone approval */}
            {upiStatus === "waiting" && (
              <div className="flex items-start gap-3 p-3.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-400">Check your UPI app</p>
                  <p className="text-xs text-blue-400/70 mt-0.5 leading-relaxed">
                    A request for{" "}
                    <span className="font-semibold">₹{orderInfo.amount.toLocaleString("en-IN")}</span>{" "}
                    was sent to <span className="font-semibold">{upiId}</span>.
                    Open your UPI app and approve within 5 minutes.
                  </p>
                </div>
              </div>
            )}

            {/* Approved */}
            {upiStatus === "done" && (
              <div className="flex items-center gap-2.5 p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-semibold">Payment approved!</span>
              </div>
            )}

            {/* UPI app hints */}
            <div className="flex items-center gap-2">
              {["GPay", "PhonePe", "Paytm", "BHIM"].map((app) => (
                <span key={app} className="px-2 py-0.5 rounded border border-border text-[10px] font-semibold text-muted-foreground bg-secondary/50 tracking-wide">
                  {app}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Contact details (required by Razorpay) ──────────────────────── */}
        <div className="space-y-3 pt-1 border-t border-border">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground pt-1">
            Contact Details
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="10-digit mobile number"
                value={contact}
                onChange={(e) => setContact(e.target.value.replace(/\D/g, "").slice(0, 10))}
                maxLength={10}
                className="input-glass"
                disabled={paying}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-glass"
                disabled={paying}
              />
            </div>
          </div>
        </div>

        {/* ── Error banner ──────────────────────────────────────────────────── */}
        {formErr && (
          <div className="flex items-start gap-2.5 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3.5 py-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{formErr}</span>
          </div>
        )}

        {/* ── Submit button ──────────────────────────────────────────────────── */}
        <button
          type="submit"
          disabled={paying || !scriptLoaded || upiStatus === "waiting"}
          className="w-full btn-primary py-3 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {!scriptLoaded ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Loading…</>
          ) : paying && upiStatus !== "waiting" ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
          ) : upiStatus === "waiting" ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Waiting for UPI approval…</>
          ) : (
            <><Lock className="w-4 h-4" /> Pay ₹{orderInfo.amount.toLocaleString("en-IN")}</>
          )}
        </button>

        <p className="text-center text-[11px] text-muted-foreground/60 leading-relaxed">
          Secured by Razorpay &nbsp;·&nbsp; Your card details are encrypted and never stored on our servers
        </p>
      </form>
    </div>
  );
}
