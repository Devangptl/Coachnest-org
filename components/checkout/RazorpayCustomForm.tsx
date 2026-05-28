"use client";

/**
 * RazorpayCustomForm — 100% custom payment UI, zero Razorpay-branded screens.
 *
 *  Card  — Razorpay Custom Checkout (rzp.createPayment).
 *           3DS OTP shown in our own iframe modal, not Razorpay's overlay.
 *
 *  UPI   — two modes, both show no Razorpay UI:
 *    Intent  — user taps an app button (GPay / PhonePe / etc.); we call
 *              rzp.createPayment with "_[flow]":"intent", listen to
 *              payment.next_action, then redirect window.location.href to the
 *              UPI deep-link URL. Razorpay POSTs result to /api/razorpay/upi-return.
 *              Works on any standard Razorpay account — no special activation.
 *    Collect — user enters a UPI ID; we POST to our own /api/razorpay/upi-collect
 *              (S2S). Requires Razorpay to enable "API-based payments" for the account.
 */

import {
  useEffect, useRef, useState, useCallback,
  type ChangeEvent, type FormEvent,
} from "react";
import {
  CreditCard, Smartphone, Loader2, ShieldCheck, ArrowLeft,
  CheckCircle2, Eye, EyeOff, AlertCircle, Lock, X,
} from "lucide-react";
import type {
  RazorpayCustomOptions,
  RazorpayCustomInstance,
  RazorpayActionPayload,
  RazorpayNextActionPayload,
  RazorpaySuccessResponse,
  CardPaymentData,
  UpiIntentPaymentData,
} from "@/types/razorpay";

// ── UPI app definitions (intent flow) ─────────────────────────────────────────

const UPI_APPS = [
  { id: "gpay",    name: "GPay",    pkg: "com.google.android.apps.nbu.paisa.user" },
  { id: "phonepe", name: "PhonePe", pkg: "com.phonepe.app" },
  { id: "paytm",   name: "Paytm",   pkg: "net.one97.paytm" },
  { id: "bhim",    name: "BHIM",    pkg: "in.org.npci.upiapp" },
] as const;

// ── Load razorpay.js (custom checkout SDK) ────────────────────────────────────

function useRazorpayCustomScript() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined" && window.Razorpay) { setLoaded(true); return; }
    const s   = document.createElement("script");
    s.src     = "https://checkout.razorpay.com/v1/razorpay.js";
    s.async   = true;
    s.onload  = () => setLoaded(true);
    s.onerror = () => console.error("[Razorpay] Failed to load razorpay.js");
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
  type:            "course" | "books" | "feature";
}

interface Props {
  orderInfo:     RazorpayOrderInfo;
  description?:  string;
  onSuccess:     (response: RazorpaySuccessResponse) => Promise<void>;
  onUpiSuccess?: () => Promise<void>; // called when UPI S2S collect is captured
  onError:       (message: string) => void;
  onBack?:       () => void;
}

// ── Formatters ────────────────────────────────────────────────────────────────

function formatCardNumber(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function RazorpayCustomForm({
  orderInfo, description, onSuccess, onUpiSuccess, onError, onBack,
}: Props) {
  const scriptLoaded   = useRazorpayCustomScript();
  const rzpRef         = useRef<RazorpayCustomInstance | null>(null);
  const pollRef        = useRef<ReturnType<typeof setInterval> | null>(null);

  const [tab,     setTab]     = useState<PaymentTab>("card");
  const [paying,  setPaying]  = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  // 3DS OTP modal — shown when payment.action fires instead of Razorpay overlay
  const [threedsUrl, setThreedsUrl] = useState<string | null>(null);

  // Shared contact fields (required by Razorpay createPayment)
  const [contact, setContact] = useState("");
  const [email,   setEmail]   = useState("");

  // Card fields
  const [cardNumber, setCardNumber] = useState("");
  const [expiry,     setExpiry]     = useState("");
  const [cvv,        setCvv]        = useState("");
  const [nameOnCard, setNameOnCard] = useState("");
  const [showCvv,    setShowCvv]    = useState(false);

  // UPI
  const [upiId,     setUpiId]     = useState("");
  const [upiStatus, setUpiStatus] = useState<"idle" | "waiting" | "done">("idle");

  // ── Init Razorpay — attach ALL event listeners here ───────────────────────

  useEffect(() => {
    if (!scriptLoaded) return;

    const opts: RazorpayCustomOptions = {
      key:          orderInfo.key,
      order_id:     orderInfo.razorpayOrderId,
      amount:       Math.round(orderInfo.amount * 100), // paise
      currency:     orderInfo.currency ?? "INR",
      name:         "Coachnest",
      description:  description ?? "Payment",
      // Fallback URL after UPI intent: Razorpay POSTs here when the user
      // returns from the UPI app and the JS callback can't fire (page was unloaded).
      callback_url: `${window.location.origin}/api/razorpay/upi-return`,
    };

    const rzp = new window.Razorpay(opts) as unknown as RazorpayCustomInstance;

    // ── payment.action — intercept 3DS BEFORE Razorpay shows its overlay ──
    rzp.on("payment.action", (payload: RazorpayActionPayload) => {
      // Extract the OTP URL from whichever shape Razorpay sends
      const url = payload.url ?? payload.redirect?.url;
      if (url) {
        setPaying(false);           // hide spinner — user is in OTP step
        setThreedsUrl(url);         // show OUR modal instead of Razorpay's
      }
    });

    // ── payment.success ───────────────────────────────────────────────────
    rzp.on("payment.success", async (resp) => {
      setThreedsUrl(null);
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

    // ── payment.error ─────────────────────────────────────────────────────
    rzp.on("payment.error", (resp) => {
      setThreedsUrl(null);
      setPaying(false);
      setUpiStatus("idle");
      const msg = resp.error?.description ?? "Payment failed. Please try again.";
      setFormErr(msg);
      onError(msg);
    });

    // ── payment.next_action — UPI intent deep-link redirect ───────────────
    // Fired when Razorpay is ready to hand off to the UPI app.
    // We redirect the whole page; after approval Razorpay POSTs to callback_url.
    rzp.on("payment.next_action", (data: RazorpayNextActionPayload) => {
      if (data?.url) {
        window.location.href = data.url;
      }
    });

    rzpRef.current = rzp;
  }, [scriptLoaded, orderInfo, description, onSuccess, onError]);

  // ── UPI collect — stop polling on unmount ─────────────────────────────────

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // ── UPI server-side collect + status polling ──────────────────────────────

  const startUpiPoll = useCallback((paymentId: string) => {
    const started = Date.now();
    const MAX_MS  = 5 * 60 * 1000; // 5 minutes

    pollRef.current = setInterval(async () => {
      if (Date.now() - started > MAX_MS) {
        clearInterval(pollRef.current!);
        setPaying(false);
        setUpiStatus("idle");
        setFormErr("Payment timed out. Please try again or contact support.");
        return;
      }

      try {
        const res  = await fetch(
          `/api/razorpay/payment-status/${paymentId}` +
          `?type=${orderInfo.type}&dbOrderId=${orderInfo.dbOrderId}`
        );
        const data = await res.json();

        if (data.status === "captured") {
          clearInterval(pollRef.current!);
          setUpiStatus("done");
          setPaying(false);
          if (onUpiSuccess) await onUpiSuccess();
        } else if (data.status === "failed") {
          clearInterval(pollRef.current!);
          setPaying(false);
          setUpiStatus("idle");
          setFormErr(data.error ?? "UPI payment failed. Please try again.");
        }
        // "pending" → keep polling
      } catch {
        // transient network error — keep polling
      }
    }, 3000);
  }, [orderInfo.type, orderInfo.dbOrderId, onUpiSuccess]);

  // ── Submit ────────────────────────────────────────────────────────────────

  async function initiateUpiCollect(phone: string, email: string) {
    setPaying(true);
    setUpiStatus("waiting");
    try {
      const res = await fetch("/api/razorpay/upi-collect", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          razorpayOrderId: orderInfo.razorpayOrderId,
          amount:          orderInfo.amount,
          vpa:             upiId.trim(),
          contact:         phone,
          email:           email,
          description:     description ?? "Purchase",
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFormErr(json.error ?? "Failed to send UPI request.");
        setPaying(false);
        setUpiStatus("idle");
        return;
      }
      startUpiPoll(json.paymentId);
    } catch {
      setFormErr("Network error. Please try again.");
      setPaying(false);
      setUpiStatus("idle");
    }
  }

  function handleUpiIntent(packageName?: string) {
    if (!rzpRef.current) { setFormErr("Payment gateway not ready. Please wait and try again."); return; }
    const phone = contact.replace(/\D/g, "");
    if (phone.length < 10)                     { setFormErr("Enter a valid 10-digit mobile number."); return; }
    if (!email.trim() || !email.includes("@")) { setFormErr("Enter a valid email address.");          return; }

    setFormErr(null);
    setPaying(true);
    setUpiStatus("waiting");

    const data: UpiIntentPaymentData = {
      method:    "upi",
      "_[flow]": "intent",
      contact:   phone,
      email:     email.trim(),
    };
    if (packageName) (data as unknown as Record<string, string>)["_[app]"] = packageName;

    rzpRef.current.createPayment(data);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!rzpRef.current) { setFormErr("Payment gateway not ready. Please wait and try again."); return; }
    setFormErr(null);

    // Validate shared contact fields
    const phone = contact.replace(/\D/g, "");
    if (phone.length < 10)                          { setFormErr("Enter a valid 10-digit mobile number."); return; }
    if (!email.trim() || !email.includes("@"))      { setFormErr("Enter a valid email address.");          return; }

    if (tab === "card") {
      const raw      = cardNumber.replace(/\s/g, "");
      const [mm, yy] = expiry.split("/");
      if (raw.length < 13)                              { setFormErr("Enter a valid card number.");           return; }
      if (!mm || !yy || mm.length < 2 || yy.length < 2){ setFormErr("Enter a valid expiry date (MM/YY)."); return; }
      if (cvv.length < 3)                               { setFormErr("Enter a valid CVV.");                   return; }
      if (!nameOnCard.trim())                           { setFormErr("Enter the name on your card.");         return; }

      setPaying(true);
      const data: CardPaymentData = {
        method:  "card",
        contact: phone,
        email:   email.trim(),
        card: { number: raw, expiry_month: mm, expiry_year: yy, cvv, name: nameOnCard.trim() },
      };
      rzpRef.current.createPayment(data);
    }

    if (tab === "upi") {
      if (!upiId.trim() || !upiId.includes("@")) { setFormErr("Enter a valid UPI ID — e.g. yourname@paytm"); return; }
      void initiateUpiCollect(phone, email.trim());
    }
  }

  const tabCls = (t: PaymentTab) =>
    `flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors border-b-2 ${
      tab === t
        ? "border-primary text-primary"
        : "border-transparent text-muted-foreground hover:text-foreground"
    }`;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── 3DS OTP Modal ─────────────────────────────────────────────────────
          Shown in place of Razorpay's default overlay when payment.action fires.
          The iframe contains only the bank's OTP page — no Razorpay UI.        */}
      {threedsUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-sm rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col">

            {/* Modal header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-secondary/20">
              <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Bank Verification</p>
                <p className="text-xs text-muted-foreground">Your bank requires OTP to authorise this payment</p>
              </div>
              {/* Allow user to cancel 3DS — will trigger payment.error */}
              <button
                type="button"
                onClick={() => {
                  setThreedsUrl(null);
                  setFormErr("Payment cancelled during OTP verification.");
                }}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Bank OTP iframe — bank-controlled UI, NOT Razorpay */}
            <div className="relative bg-white">
              <iframe
                src={threedsUrl}
                title="Bank OTP Verification"
                className="w-full border-0"
                style={{ height: 460 }}
                /*
                 * allow-forms     — bank form submission
                 * allow-scripts   — bank's OTP validation JS
                 * allow-same-origin — cookies needed by some banks
                 * allow-popups    — some banks open a small window
                 */
                sandbox="allow-forms allow-scripts allow-same-origin allow-popups"
              />
              {/* Spinner while iframe loads */}
              <div
                id="rzp-3ds-loader"
                className="absolute inset-0 flex items-center justify-center bg-white pointer-events-none"
              >
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-4 py-3 border-t border-border bg-secondary/10 text-center">
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                <Lock className="w-3 h-3" />
                This screen is served by your bank — your OTP never touches our servers
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Main payment form ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">

        {/* Header */}
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

        {/* Tab bar */}
        <div className="flex border-b border-border">
          <button type="button" className={tabCls("card")}
            onClick={() => { setTab("card"); setFormErr(null); }}>
            <CreditCard className="w-4 h-4" /> Card
          </button>
          <button type="button" className={tabCls("upi")}
            onClick={() => { setTab("upi"); setFormErr(null); setUpiStatus("idle"); }}>
            <Smartphone className="w-4 h-4" /> UPI
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">

          {/* ── CARD ───────────────────────────────────────────────────────── */}
          {tab === "card" && (
            <div className="space-y-3">
              {/* Card number */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Card Number</label>
                <div className="relative">
                  <input
                    type="text" inputMode="numeric" autoComplete="cc-number"
                    placeholder="1234  5678  9012  3456"
                    value={cardNumber}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setCardNumber(formatCardNumber(e.target.value))}
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
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Expiry</label>
                  <input
                    type="text" inputMode="numeric" autoComplete="cc-exp"
                    placeholder="MM / YY"
                    value={expiry}
                    onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                    maxLength={5} className="input-glass" disabled={paying}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">CVV</label>
                  <div className="relative">
                    <input
                      type={showCvv ? "text" : "password"} inputMode="numeric" autoComplete="cc-csc"
                      placeholder="•••"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      maxLength={4} className="input-glass pr-9" disabled={paying}
                    />
                    <button type="button" tabIndex={-1}
                      onClick={() => setShowCvv((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground/50 hover:text-muted-foreground">
                      {showCvv ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Name on card */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Name on Card</label>
                <input
                  type="text" autoComplete="cc-name"
                  placeholder="As printed on card"
                  value={nameOnCard}
                  onChange={(e) => setNameOnCard(e.target.value)}
                  className="input-glass" disabled={paying}
                />
              </div>

              {/* Card brand chips */}
              <div className="flex items-center gap-2">
                {["VISA", "Mastercard", "RuPay", "Amex"].map((b) => (
                  <span key={b} className="px-1.5 py-0.5 rounded border border-border text-[10px] font-semibold text-muted-foreground bg-secondary/50 tracking-wide">{b}</span>
                ))}
              </div>
            </div>
          )}

          {/* ── UPI ────────────────────────────────────────────────────────── */}
          {tab === "upi" && (
            <div className="space-y-3">

              {/* UPI app shortcut buttons — intent flow, no Razorpay UI */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Tap to open your UPI app
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {UPI_APPS.map((app) => (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => handleUpiIntent(app.pkg)}
                      disabled={paying || !scriptLoaded}
                      className="flex flex-col items-center gap-1 py-3 px-1 rounded-xl border border-border bg-secondary/30 hover:bg-secondary/60 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="text-xs font-semibold text-foreground">{app.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[11px] whitespace-nowrap">or enter UPI ID</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* UPI ID collect input */}
              <div>
                <input
                  type="text" inputMode="email" autoComplete="off"
                  placeholder="yourname@paytm / user@ybl"
                  value={upiId}
                  onChange={(e) => { setUpiId(e.target.value.trim()); setUpiStatus("idle"); setFormErr(null); }}
                  className="input-glass" disabled={paying}
                />
              </div>

              {/* Status indicators */}
              {upiStatus === "waiting" && (
                <div className="flex items-start gap-3 p-3.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-blue-400">Opening your UPI app…</p>
                    <p className="text-xs text-blue-400/70 mt-0.5 leading-relaxed">
                      Approve the ₹{orderInfo.amount.toLocaleString("en-IN")} request in your app.
                    </p>
                  </div>
                </div>
              )}

              {upiStatus === "done" && (
                <div className="flex items-center gap-2.5 p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-semibold">Payment approved!</span>
                </div>
              )}
            </div>
          )}

          {/* ── Contact Details (required by Razorpay) ─────────────────────── */}
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
                  type="tel" inputMode="numeric" autoComplete="tel"
                  placeholder="10-digit mobile"
                  value={contact}
                  onChange={(e) => setContact(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  maxLength={10} className="input-glass" disabled={paying}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email" inputMode="email" autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-glass" disabled={paying}
                />
              </div>
            </div>
          </div>

          {/* ── Error banner ───────────────────────────────────────────────── */}
          {formErr && (
            <div className="flex items-start gap-2.5 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3.5 py-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{formErr}</span>
            </div>
          )}

          {/* ── Pay button ─────────────────────────────────────────────────── */}
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
            Secured by Razorpay &nbsp;·&nbsp; Card details are encrypted end-to-end
          </p>
        </form>
      </div>
    </>
  );
}
