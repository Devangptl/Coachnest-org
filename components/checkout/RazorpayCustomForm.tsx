"use client";

/**
 * RazorpayCustomForm — fully custom payment UI built on Razorpay Custom Checkout.
 *
 * CARD
 *   Custom form → rzp.createPayment({ method:"card", ... })
 *   3DS / OTP shown in our own iframe modal (not Razorpay's overlay)
 *   payment.success → onSuccess() → /api/razorpay/verify-payment
 *
 * UPI COLLECT (fully custom — no Razorpay popup)
 *   POST /api/razorpay/upi-collect (server-to-server) → paymentId
 *   Poll GET /api/razorpay/payment-status/[paymentId] every 3 s
 *   Order is finalised server-side by the poll endpoint
 *   On "captured" → onUpiCaptured() (just redirect — no client-side verify needed)
 *   Requires Razorpay S2S UPI to be activated on the merchant account.
 *   Until activated: shows a clear "not available yet" notice.
 *
 * Test mode (rzp_test_*): UPI disabled with notice; card works normally.
 */

import {
  useEffect, useRef, useState,
  type ChangeEvent, type FormEvent,
} from "react";
import {
  CreditCard, Smartphone, Loader2, ShieldCheck,
  ArrowLeft, CheckCircle2, Eye, EyeOff, AlertCircle,
  Lock, X, Clock, RefreshCw,
} from "lucide-react";
import type {
  RazorpayCustomOptions,
  RazorpayCustomInstance,
  RazorpayActionPayload,
  RazorpaySuccessResponse,
  CardPaymentData,
} from "@/types/razorpay";

// ── Razorpay.js script loader ─────────────────────────────────────────────────

function useRazorpayScript() {
  const [loaded,    setLoaded]    = useState(false);
  const [scriptErr, setScriptErr] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined" && window.Razorpay) { setLoaded(true); return; }
    const s   = document.createElement("script");
    s.src     = "https://checkout.razorpay.com/v1/razorpay.js";
    s.async   = true;
    s.onload  = () => setLoaded(true);
    s.onerror = () => { console.error("[Razorpay] Failed to load razorpay.js"); setScriptErr(true); };
    document.body.appendChild(s);
  }, []);
  return { loaded, scriptErr };
}

// ── Error message mapping ─────────────────────────────────────────────────────

function mapRazorpayError(code: string | undefined, description: string | undefined): string {
  if (!code) return description ?? "Payment failed. Please try again.";
  if (code.includes("DECLINED") || code === "BAD_REQUEST_ERROR")
    return "Your card was declined. Please check your details or try a different card.";
  if (code === "PAYMENT_CANCELLED")
    return "Payment was cancelled. You can try again.";
  if (code === "NETWORK_ERROR" || code.includes("NETWORK"))
    return "Network error. Please check your connection and try again.";
  if (code === "GATEWAY_ERROR")
    return "Bank gateway error. Please try again in a moment.";
  if (code === "SERVER_ERROR")
    return "Our payment provider had a temporary issue. Please try again.";
  if (code.includes("EXPIRED"))
    return "Payment session expired. Please go back and start over.";
  if (code.includes("INVALID_VPA") || code.includes("VPA"))
    return "UPI ID not found. Please double-check and try again.";
  return description ?? "Payment failed. Please try again.";
}

// ── Countdown format ──────────────────────────────────────────────────────────

function fmtCountdown(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RazorpayOrderInfo {
  razorpayOrderId: string;
  dbOrderId:       string;
  amount:          number;   // rupees (not paise)
  currency:        string;
  key:             string;
  type:            "course" | "books" | "feature";
}

interface Props {
  orderInfo:       RazorpayOrderInfo;
  description?:    string;
  prefillEmail?:   string;
  /** Card payment — fires with Razorpay signature; call /api/razorpay/verify-payment */
  onSuccess:       (response: RazorpaySuccessResponse) => Promise<void>;
  /** UPI S2S collect — order already finalised server-side; just redirect */
  onUpiCaptured?:  () => void;
  onError?:        (message: string) => void;
  onBack?:         () => void;
}

// ── Card input formatters ─────────────────────────────────────────────────────

function fmtCard(v: string) {
  return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}
function fmtExpiry(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RazorpayCustomForm({
  orderInfo, description, prefillEmail,
  onSuccess, onUpiCaptured, onError, onBack,
}: Props) {
  const { loaded: scriptLoaded, scriptErr } = useRazorpayScript();
  const rzpRef = useRef<RazorpayCustomInstance | null>(null);

  // Stable refs for callbacks
  const onSuccessRef     = useRef(onSuccess);
  const onUpiCapturedRef = useRef(onUpiCaptured);
  const onErrorRef       = useRef(onError);
  useEffect(() => { onSuccessRef.current     = onSuccess;     }, [onSuccess]);
  useEffect(() => { onUpiCapturedRef.current = onUpiCaptured; }, [onUpiCaptured]);
  useEffect(() => { onErrorRef.current       = onError;       }, [onError]);

  // Polling interval ref — cleared on timeout, failure, success, or unmount
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // UI state
  const [tab,          setTab]          = useState<"card" | "upi">("card");
  const [paying,       setPaying]       = useState(false);
  const [formErr,      setFormErr]      = useState<string | null>(null);
  const [upiDone,      setUpiDone]      = useState(false);
  const [upiWaiting,   setUpiWaiting]   = useState(false);
  const [upiCountdown, setUpiCountdown] = useState(0);
  const [threedsUrl,   setThreedsUrl]   = useState<string | null>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  // Shared contact fields
  const [contact, setContact] = useState("");
  const [email,   setEmail]   = useState(prefillEmail ?? "");

  // Card fields
  const [cardNumber, setCardNumber] = useState("");
  const [expiry,     setExpiry]     = useState("");
  const [cvv,        setCvv]        = useState("");
  const [nameOnCard, setNameOnCard] = useState("");
  const [showCvv,    setShowCvv]    = useState(false);

  // UPI field
  const [upiId, setUpiId] = useState("");

  const isTestMode = orderInfo.key.startsWith("rzp_test_");

  // ── UPI 5-minute countdown with auto-timeout ──────────────────────────────

  useEffect(() => {
    if (!upiWaiting) return;
    setUpiCountdown(300);
    const timer = setInterval(() => {
      setUpiCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
          setPaying(false);
          setUpiWaiting(false);
          setFormErr("UPI request timed out. Please try again.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [upiWaiting]);

  // ── Reset iframe loader on new 3DS URL ────────────────────────────────────

  useEffect(() => {
    if (threedsUrl) setIframeLoaded(false);
  }, [threedsUrl]);

  // ── Init Razorpay for CARD payments only ──────────────────────────────────
  // UPI uses S2S server-side — the SDK is not involved in UPI at all.

  useEffect(() => {
    if (!scriptLoaded) return;

    const rzp = new window.Razorpay({
      key:         orderInfo.key,
      order_id:    orderInfo.razorpayOrderId,
      amount:      Math.round(orderInfo.amount * 100),
      currency:    orderInfo.currency ?? "INR",
      name:        "Coachnest",
      description: description ?? "Payment",
    } as RazorpayCustomOptions) as unknown as RazorpayCustomInstance;

    // Fires only for card 3DS — UPI no longer uses rzp.createPayment
    rzp.on("payment.action", (payload: RazorpayActionPayload) => {
      const url = payload.url ?? payload.redirect?.url;
      if (!url) return;
      setPaying(false);
      setThreedsUrl(url);
    });

    rzp.on("payment.success", async (resp) => {
      setThreedsUrl(null);
      setPaying(false);
      setUpiDone(true);
      try {
        await onSuccessRef.current(resp);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Verification failed. Please contact support.";
        setUpiDone(false);
        setFormErr(msg);
        onErrorRef.current?.(msg);
      }
    });

    rzp.on("payment.error", (resp) => {
      setThreedsUrl(null);
      setPaying(false);
      const msg = mapRazorpayError(resp.error?.code, resp.error?.description);
      setFormErr(msg);
      onErrorRef.current?.(msg);
    });

    rzpRef.current = rzp;
  }, [scriptLoaded, orderInfo, description]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  function validateContact(): string | null {
    const phone = contact.replace(/\D/g, "");
    if (phone.length < 10)                     { setFormErr("Enter a valid 10-digit mobile number."); return null; }
    if (!email.trim() || !email.includes("@")) { setFormErr("Enter a valid email address.");          return null; }
    return phone;
  }

  function err(msg: string) { setFormErr(msg); }

  // ── Card submit ───────────────────────────────────────────────────────────

  function handleCardSubmit(e: FormEvent) {
    e.preventDefault();
    if (!rzpRef.current) { err("Payment gateway not ready. Please refresh and try again."); return; }
    setFormErr(null);

    const phone    = validateContact();
    if (!phone) return;

    const raw      = cardNumber.replace(/\s/g, "");
    const [mm, yy] = expiry.split("/");
    if (raw.length < 13)                               { err("Enter a valid card number.");            return; }
    if (!mm || !yy || mm.length < 2 || yy.length < 2) { err("Enter a valid expiry date (MM/YY).");   return; }
    if (cvv.length < 3)                                { err("Enter a valid CVV.");                    return; }
    if (!nameOnCard.trim())                            { err("Enter the name on your card.");          return; }

    setPaying(true);
    rzpRef.current.createPayment({
      method:  "card",
      contact: phone,
      email:   email.trim(),
      card:    { number: raw, expiry_month: mm, expiry_year: yy, cvv, name: nameOnCard.trim() },
    } as CardPaymentData);
  }

  // ── UPI collect — fully custom, no Razorpay popup ────────────────────────
  // Calls our server-side S2S route, then polls payment-status every 3 seconds.
  // Razorpay S2S must be activated on the merchant account for this to work.

  async function handleUpiCollect(e: FormEvent) {
    e.preventDefault();
    setFormErr(null);

    const phone = validateContact();
    if (!phone) return;

    if (!upiId.trim() || !upiId.includes("@")) {
      err("Enter a valid UPI ID — e.g. yourname@paytm");
      return;
    }

    setPaying(true);
    setUpiWaiting(true);

    try {
      const res = await fetch("/api/razorpay/upi-collect", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          razorpayOrderId: orderInfo.razorpayOrderId,
          amount:          orderInfo.amount,
          vpa:             upiId.trim(),
          contact:         phone,
          email:           email.trim(),
          description:     description ?? "Payment",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to initiate UPI payment.");

      const { paymentId } = data as { paymentId: string };

      // Poll payment status every 3 seconds
      pollRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch(
            `/api/razorpay/payment-status/${paymentId}` +
            `?type=${orderInfo.type}&dbOrderId=${orderInfo.dbOrderId}`
          );
          const pollData = await pollRes.json() as {
            status: "pending" | "captured" | "failed";
            error?: string;
          };

          if (pollData.status === "captured") {
            if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
            setUpiWaiting(false);
            setUpiDone(true);
            onUpiCapturedRef.current?.();

          } else if (pollData.status === "failed") {
            if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
            setUpiWaiting(false);
            setPaying(false);
            const msg = pollData.error ?? "Payment failed. Please try again.";
            setFormErr(msg);
            onErrorRef.current?.(msg);
          }
          // "pending" — keep polling until countdown expires
        } catch { /* network hiccup during poll — keep trying */ }
      }, 3000);

    } catch (error) {
      setUpiWaiting(false);
      setPaying(false);
      const msg = error instanceof Error ? error.message : "Failed to initiate UPI payment.";
      setFormErr(msg);
      onErrorRef.current?.(msg);
    }
  }

  // ── Styles ────────────────────────────────────────────────────────────────

  const tabCls = (t: "card" | "upi") =>
    `flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors border-b-2 ${
      tab === t
        ? "border-primary text-primary"
        : "border-transparent text-muted-foreground hover:text-foreground"
    }`;

  // ── Script load error ─────────────────────────────────────────────────────

  if (scriptErr) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
        <p className="text-sm font-semibold text-foreground">Payment gateway failed to load</p>
        <p className="text-xs text-muted-foreground">
          This is usually caused by an ad-blocker or network issue. Disable your
          ad-blocker or try a different network, then reload.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Reload page
        </button>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── 3DS OTP Modal ──────────────────────────────────────────────────── */}
      {threedsUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-sm rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col">

            <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-secondary/20">
              <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Bank Verification</p>
                <p className="text-xs text-muted-foreground">Your bank requires OTP to authorise this payment</p>
              </div>
              <button
                type="button"
                onClick={() => { setThreedsUrl(null); setPaying(false); setFormErr("Payment cancelled during OTP."); }}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative bg-white" style={{ minHeight: 460 }}>
              <iframe
                src={threedsUrl}
                title="Bank OTP Verification"
                className="w-full border-0"
                style={{ height: 460 }}
                sandbox="allow-forms allow-scripts allow-same-origin allow-popups"
                onLoad={() => setIframeLoaded(true)}
              />
              {!iframeLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-white">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>

            <div className="px-4 py-3 border-t border-border bg-secondary/10 text-center">
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                <Lock className="w-3 h-3" />
                This screen is served by your bank — your OTP never touches our servers
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Main payment card ──────────────────────────────────────────────── */}
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
            onClick={() => { setTab("upi"); setFormErr(null); }}>
            <Smartphone className="w-4 h-4" /> UPI
          </button>
        </div>

        {/* ── Card form ────────────────────────────────────────────────────── */}
        {tab === "card" && (
          <form onSubmit={handleCardSubmit} className="p-5 space-y-4">
            <div className="space-y-3">

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Card Number</label>
                <div className="relative">
                  <input
                    type="text" inputMode="numeric" autoComplete="cc-number"
                    placeholder="1234  5678  9012  3456"
                    value={cardNumber}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setCardNumber(fmtCard(e.target.value))}
                    maxLength={19} className="input-glass pr-10" disabled={paying}
                  />
                  <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Expiry</label>
                  <input
                    type="text" inputMode="numeric" autoComplete="cc-exp"
                    placeholder="MM / YY" value={expiry}
                    onChange={(e) => setExpiry(fmtExpiry(e.target.value))}
                    maxLength={5} className="input-glass" disabled={paying}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">CVV</label>
                  <div className="relative">
                    <input
                      type={showCvv ? "text" : "password"} inputMode="numeric" autoComplete="cc-csc"
                      placeholder="•••" value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      maxLength={4} className="input-glass pr-9" disabled={paying}
                    />
                    <button type="button" tabIndex={-1}
                      onClick={() => setShowCvv(v => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground/50 hover:text-muted-foreground">
                      {showCvv ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Name on Card</label>
                <input
                  type="text" autoComplete="cc-name"
                  placeholder="As printed on card" value={nameOnCard}
                  onChange={(e) => setNameOnCard(e.target.value)}
                  className="input-glass" disabled={paying}
                />
              </div>

              <div className="flex items-center gap-2">
                {["VISA", "Mastercard", "RuPay", "Amex"].map(b => (
                  <span key={b} className="px-1.5 py-0.5 rounded border border-border text-[10px] font-semibold text-muted-foreground bg-secondary/50 tracking-wide">{b}</span>
                ))}
              </div>
            </div>

            <ContactFields
              contact={contact} email={email} disabled={paying}
              onContact={setContact} onEmail={setEmail}
            />

            {formErr && <ErrorBanner msg={formErr} />}

            <button
              type="submit"
              disabled={paying || !scriptLoaded}
              className="w-full btn-primary py-3 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {!scriptLoaded ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Loading…</>
              ) : paying ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
              ) : (
                <><Lock className="w-4 h-4" /> Pay ₹{orderInfo.amount.toLocaleString("en-IN")}</>
              )}
            </button>

            <p className="text-center text-[11px] text-muted-foreground/60">
              Secured by Razorpay · Card details are encrypted end-to-end
            </p>
          </form>
        )}

        {/* ── UPI form — custom UI, no Razorpay popup ──────────────────────── */}
        {tab === "upi" && (
          <div className="p-5 space-y-4">

            {isTestMode ? (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/25 px-4 py-4 space-y-1.5">
                <p className="text-sm font-semibold text-amber-500">UPI not available in test mode</p>
                <p className="text-xs text-amber-500/80 leading-relaxed">
                  Razorpay test keys do not support UPI payments. Switch to{" "}
                  <strong>live keys</strong> for UPI in production.
                  Use the <strong>Card</strong> tab to test checkout now.
                </p>
              </div>
            ) : (
              <form onSubmit={handleUpiCollect} className="space-y-4">

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">UPI ID</label>
                  <input
                    type="text" inputMode="email" autoComplete="off"
                    placeholder="yourname@paytm · user@ybl · name@okaxis"
                    value={upiId}
                    onChange={(e) => { setUpiId(e.target.value.trim()); setFormErr(null); }}
                    className="input-glass" disabled={paying}
                  />
                </div>

                {/* Waiting for UPI approval */}
                {upiWaiting && !upiDone && (
                  <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3.5 space-y-2">
                    <div className="flex items-start gap-3">
                      <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-blue-400">Check your UPI app</p>
                        <p className="text-xs text-blue-400/70 mt-0.5">
                          A collect request for ₹{orderInfo.amount.toLocaleString("en-IN")} was
                          sent to <strong>{upiId}</strong>. Open your UPI app and approve it.
                        </p>
                      </div>
                    </div>
                    {upiCountdown > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-blue-400/60 pl-7">
                        <Clock className="w-3 h-3" />
                        Expires in {fmtCountdown(upiCountdown)}
                      </div>
                    )}
                  </div>
                )}

                {/* Payment approved */}
                {upiDone && (
                  <div className="flex items-center gap-2.5 p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-semibold">Payment approved! Redirecting…</span>
                  </div>
                )}

                <ContactFields
                  contact={contact} email={email} disabled={paying}
                  onContact={setContact} onEmail={setEmail}
                />

                {formErr && <ErrorBanner msg={formErr} />}

                <button
                  type="submit"
                  disabled={paying || upiDone}
                  className="w-full btn-primary py-3 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {paying ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                  ) : (
                    <><Lock className="w-4 h-4" /> Pay ₹{orderInfo.amount.toLocaleString("en-IN")}</>
                  )}
                </button>

                <p className="text-center text-[11px] text-muted-foreground/60">
                  Secured by Razorpay · UPI payments are instant and safe
                </p>
              </form>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function ContactFields({
  contact, email, disabled, onContact, onEmail,
}: {
  contact:   string;
  email:     string;
  disabled:  boolean;
  onContact: (v: string) => void;
  onEmail:   (v: string) => void;
}) {
  return (
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
            placeholder="10-digit mobile" value={contact}
            onChange={(e) => onContact(e.target.value.replace(/\D/g, "").slice(0, 10))}
            maxLength={10} className="input-glass" disabled={disabled}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            type="email" inputMode="email" autoComplete="email"
            placeholder="you@example.com" value={email}
            onChange={(e) => onEmail(e.target.value)}
            className="input-glass" disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div className="flex items-start gap-2.5 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3.5 py-3">
      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <span>{msg}</span>
    </div>
  );
}
