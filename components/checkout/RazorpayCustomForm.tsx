"use client";

/**
 * RazorpayCustomForm — fully custom payment UI with zero Razorpay-branded screens.
 *
 * CARD  — Custom Checkout (rzp.createPayment).
 *         3DS / OTP shown in our own iframe modal, not Razorpay's overlay.
 *         On success: payment.success fires → onSuccess() → /api/razorpay/verify-payment.
 *
 * UPI   — Two sub-modes (both show NO Razorpay UI):
 *
 *   Intent (live keys only)
 *     User taps a UPI app button → rzp.createPayment({ "_[flow]": "intent" })
 *     → payment.next_action fires with UPI deep-link
 *     → window.location.href redirects to GPay / PhonePe / etc.
 *     → after approval, Razorpay POSTs to /api/razorpay/upi-return (server finalises)
 *     → OR payment.success fires if page stays in memory → onSuccess() handles it.
 *
 *   Collect (requires S2S API activation — contact Razorpay support)
 *     User enters UPI ID → POST /api/razorpay/upi-collect → poll payment-status
 *     → onUpiSuccess() called when captured (server has already finalised).
 *
 * Test mode (rzp_test_* keys): UPI is disabled with a clear notice.
 * Card works fine in test mode.
 */

import {
  useEffect, useRef, useState,
  type ChangeEvent, type FormEvent,
} from "react";
import {
  CreditCard, Smartphone, Loader2, ShieldCheck,
  ArrowLeft, CheckCircle2, Eye, EyeOff, AlertCircle, Lock, X,
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

// ── UPI app shortcuts (intent flow) ───────────────────────────────────────────

const UPI_APPS = [
  { id: "gpay",    name: "GPay",    pkg: "com.google.android.apps.nbu.paisa.user" },
  { id: "phonepe", name: "PhonePe", pkg: "com.phonepe.app" },
  { id: "paytm",   name: "Paytm",   pkg: "net.one97.paytm" },
  { id: "bhim",    name: "BHIM",    pkg: "in.org.npci.upiapp" },
] as const;

// ── Razorpay.js script loader ─────────────────────────────────────────────────

function useRazorpayScript() {
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

export interface RazorpayOrderInfo {
  razorpayOrderId: string;
  dbOrderId:       string;
  amount:          number;   // rupees (not paise)
  currency:        string;
  key:             string;
  type:            "course" | "books" | "feature";
}

interface Props {
  orderInfo:     RazorpayOrderInfo;
  description?:  string;
  /** Called after card payment (or UPI intent if payment.success fires while page is alive) */
  onSuccess:     (response: RazorpaySuccessResponse) => Promise<void>;
  /** Called after UPI collect S2S polling confirms capture (server already finalised) */
  onUpiSuccess?: () => Promise<void>;
  onError?:      (message: string) => void;
  onBack?:       () => void;
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
  orderInfo, description, onSuccess, onUpiSuccess, onError, onBack,
}: Props) {
  const scriptLoaded = useRazorpayScript();
  const rzpRef       = useRef<RazorpayCustomInstance | null>(null);
  const pollRef      = useRef<ReturnType<typeof setInterval> | null>(null);

  // UI state
  const [tab,        setTab]        = useState<"card" | "upi">("card");
  const [paying,     setPaying]     = useState(false);
  const [formErr,    setFormErr]    = useState<string | null>(null);
  const [upiDone,    setUpiDone]    = useState(false);
  const [upiWaiting, setUpiWaiting] = useState(false); // UPI collect waiting for approval
  const [threedsUrl, setThreedsUrl] = useState<string | null>(null); // 3DS OTP iframe

  // Shared contact fields
  const [contact, setContact] = useState("");
  const [email,   setEmail]   = useState("");

  // Card fields
  const [cardNumber, setCardNumber] = useState("");
  const [expiry,     setExpiry]     = useState("");
  const [cvv,        setCvv]        = useState("");
  const [nameOnCard, setNameOnCard] = useState("");
  const [showCvv,    setShowCvv]    = useState(false);

  // UPI collect field
  const [upiId, setUpiId] = useState("");

  const isTestMode = orderInfo.key.startsWith("rzp_test_");

  // ── Init Razorpay — wire all event listeners once ─────────────────────────

  useEffect(() => {
    if (!scriptLoaded) return;

    const rzp = new window.Razorpay({
      key:          orderInfo.key,
      order_id:     orderInfo.razorpayOrderId,
      amount:       Math.round(orderInfo.amount * 100),
      currency:     orderInfo.currency ?? "INR",
      name:         "Coachnest",
      description:  description ?? "Payment",
      // Fallback redirect after UPI intent when page was unloaded
      callback_url: `${window.location.origin}/api/razorpay/upi-return`,
    } as RazorpayCustomOptions) as unknown as RazorpayCustomInstance;

    // 3DS: intercept before Razorpay shows its own overlay
    rzp.on("payment.action", (payload: RazorpayActionPayload) => {
      const url = payload.url ?? payload.redirect?.url;
      if (url) { setPaying(false); setThreedsUrl(url); }
    });

    // UPI intent: redirect to the UPI app deep-link
    rzp.on("payment.next_action", (data: RazorpayNextActionPayload) => {
      if (data?.url) window.location.href = data.url;
    });

    // Success (card or UPI intent when page stays in memory)
    rzp.on("payment.success", async (resp) => {
      setThreedsUrl(null);
      setPaying(false);
      setUpiDone(true);
      try {
        await onSuccess(resp);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Verification failed. Please contact support.";
        setFormErr(msg);
        onError?.(msg);
      }
    });

    // Error
    rzp.on("payment.error", (resp) => {
      setThreedsUrl(null);
      setPaying(false);
      setUpiWaiting(false);
      const msg = resp.error?.description ?? "Payment failed. Please try again.";
      setFormErr(msg);
      onError?.(msg);
    });

    rzpRef.current = rzp;
  }, [scriptLoaded, orderInfo, description, onSuccess, onError]);

  // Stop polling on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Validates mobile + email. Returns phone digits-only string, or null on failure. */
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

  // ── UPI intent — opens UPI app directly (no Razorpay UI) ─────────────────

  function handleUpiIntent(packageName?: string) {
    if (!rzpRef.current) { err("Payment gateway not ready. Please refresh and try again."); return; }
    setFormErr(null);

    const phone = validateContact();
    if (!phone) return;

    setPaying(true);
    const data = {
      method:    "upi",
      "_[flow]": "intent",
      contact:   phone,
      email:     email.trim(),
    } as UpiIntentPaymentData & Record<string, string>;
    if (packageName) data["_[app]"] = packageName;

    rzpRef.current.createPayment(data);
  }

  // ── UPI collect — S2S via UPI ID (requires account activation) ───────────

  async function handleUpiCollect(e: FormEvent) {
    e.preventDefault();
    if (!rzpRef.current) { err("Payment gateway not ready. Please refresh and try again."); return; }
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
      const res  = await fetch("/api/razorpay/upi-collect", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          razorpayOrderId: orderInfo.razorpayOrderId,
          amount:          orderInfo.amount,
          vpa:             upiId.trim(),
          contact:         phone,
          email:           email.trim(),
          description:     description ?? "Purchase",
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setPaying(false);
        setUpiWaiting(false);
        err(json.error ?? "Could not send UPI request. Try an app button above.");
        return;
      }
      startPoll(json.paymentId);
    } catch {
      setPaying(false);
      setUpiWaiting(false);
      err("Network error. Please try again.");
    }
  }

  // ── UPI collect polling ───────────────────────────────────────────────────

  function startPoll(paymentId: string) {
    const startedAt = Date.now();
    const TIMEOUT   = 5 * 60 * 1000; // 5 min

    pollRef.current = setInterval(async () => {
      if (Date.now() - startedAt > TIMEOUT) {
        clearInterval(pollRef.current!);
        setPaying(false);
        setUpiWaiting(false);
        err("Payment request timed out. Please try again.");
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
          setPaying(false);
          setUpiWaiting(false);
          setUpiDone(true);
          if (onUpiSuccess) await onUpiSuccess();
        } else if (data.status === "failed") {
          clearInterval(pollRef.current!);
          setPaying(false);
          setUpiWaiting(false);
          err(data.error ?? "UPI payment failed. Please try again.");
        }
        // status === "pending" → keep polling
      } catch { /* network blip — keep polling */ }
    }, 3_000);
  }

  // ── Styles ────────────────────────────────────────────────────────────────

  const tabCls = (t: "card" | "upi") =>
    `flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors border-b-2 ${
      tab === t
        ? "border-primary text-primary"
        : "border-transparent text-muted-foreground hover:text-foreground"
    }`;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── 3DS OTP Modal ──────────────────────────────────────────────────────
          Replaces Razorpay's default overlay. Contains only the bank's OTP page. */}
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
                onClick={() => { setThreedsUrl(null); setFormErr("Payment cancelled during OTP."); }}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative bg-white">
              <iframe
                src={threedsUrl}
                title="Bank OTP Verification"
                className="w-full border-0"
                style={{ height: 460 }}
                sandbox="allow-forms allow-scripts allow-same-origin allow-popups"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-white pointer-events-none" id="rzp-3ds-loader">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
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

              {/* Card number */}
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

              {/* Expiry + CVV */}
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

              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Name on Card</label>
                <input
                  type="text" autoComplete="cc-name"
                  placeholder="As printed on card" value={nameOnCard}
                  onChange={(e) => setNameOnCard(e.target.value)}
                  className="input-glass" disabled={paying}
                />
              </div>

              {/* Brand chips */}
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

        {/* ── UPI form ─────────────────────────────────────────────────────── */}
        {tab === "upi" && (
          <div className="p-5 space-y-4">

            {isTestMode ? (
              /* Test mode notice */
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

                {/* UPI app intent buttons */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Tap to open your UPI app
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {UPI_APPS.map(app => (
                      <button
                        key={app.id}
                        type="button"
                        onClick={() => handleUpiIntent(app.pkg)}
                        disabled={paying || !scriptLoaded}
                        className="flex items-center justify-center py-3 px-1 rounded-xl border border-border bg-secondary/30 hover:bg-secondary/60 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="text-xs font-semibold text-foreground">{app.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">or enter UPI ID</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* UPI ID collect */}
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

                {/* UPI status indicators */}
                {upiWaiting && !upiDone && (
                  <div className="flex items-start gap-3 p-3.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-blue-400">Check your UPI app</p>
                      <p className="text-xs text-blue-400/70 mt-0.5">
                        A request for ₹{orderInfo.amount.toLocaleString("en-IN")} was sent to{" "}
                        <strong>{upiId}</strong>. Approve within 5 minutes.
                      </p>
                    </div>
                  </div>
                )}

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
                  disabled={paying || !scriptLoaded || upiDone}
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
