"use client";

/**
 * RazorpayCustomForm
 * ─────────────────────────────────────────────────────────────────────────────
 * A fully custom payment form built on Razorpay Custom Checkout (razorpay.js).
 * Supports Card, UPI, and Net Banking — no Razorpay modal popup.
 *
 * Usage:
 *   <RazorpayCustomForm
 *     orderInfo={{ razorpayOrderId, dbOrderId, amount, currency, key }}
 *     description="Course: React Mastery"
 *     onSuccess={(resp) => verifyAndRedirect(resp)}
 *     onError={(msg) => setError(msg)}
 *     onBack={() => setPhase("summary")}
 *   />
 */

import {
  useEffect, useRef, useState, type ChangeEvent, type FormEvent,
} from "react";
import {
  CreditCard, Smartphone, Building2, Loader2, ShieldCheck, ArrowLeft,
  CheckCircle2, Eye, EyeOff, AlertCircle,
} from "lucide-react";
import type {
  RazorpayCustomOptions,
  RazorpayCustomInstance,
  RazorpaySuccessResponse,
  CardPaymentData,
  UpiPaymentData,
  NetBankingPaymentData,
} from "@/types/razorpay";

// ── Load razorpay.js ──────────────────────────────────────────────────────────

function useRazorpayCustomScript() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    // razorpay.js attaches window.Razorpay just like checkout.js
    if (typeof window !== "undefined" && window.Razorpay) { setLoaded(true); return; }
    const s   = document.createElement("script");
    s.src     = "https://checkout.razorpay.com/v1/razorpay.js";
    s.async   = true;
    s.onload  = () => setLoaded(true);
    s.onerror = () => console.error("Failed to load Razorpay custom checkout script");
    document.body.appendChild(s);
    return () => { /* script stays cached */ };
  }, []);
  return loaded;
}

// ── Bank list (Net Banking) ───────────────────────────────────────────────────

const POPULAR_BANKS = [
  { code: "HDFC", name: "HDFC Bank" },
  { code: "ICIC", name: "ICICI Bank" },
  { code: "SBIN", name: "SBI" },
  { code: "AXIS", name: "Axis Bank" },
  { code: "KKBK", name: "Kotak Bank" },
  { code: "INDB", name: "IndusInd Bank" },
] as const;

const ALL_BANKS = [
  ...POPULAR_BANKS,
  { code: "YESB", name: "Yes Bank" },
  { code: "IDFB", name: "IDFC First Bank" },
  { code: "RATN", name: "RBL Bank" },
  { code: "FDRL", name: "Federal Bank" },
  { code: "BKID", name: "Bank of India" },
  { code: "BARB", name: "Bank of Baroda" },
  { code: "CNRB", name: "Canara Bank" },
  { code: "PUNB", name: "Punjab National Bank" },
  { code: "UBIN", name: "Union Bank of India" },
  { code: "CBIN", name: "Central Bank of India" },
  { code: "IDIB", name: "Indian Bank" },
  { code: "IOBA", name: "Indian Overseas Bank" },
];

// ── Types ─────────────────────────────────────────────────────────────────────

type PaymentTab = "card" | "upi" | "netbanking";

export interface RazorpayOrderInfo {
  razorpayOrderId: string;
  dbOrderId:       string;
  amount:          number;   // in rupees (NOT paise)
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

  // Card fields
  const [cardNumber, setCardNumber] = useState("");
  const [expiry,     setExpiry]     = useState("");
  const [cvv,        setCvv]        = useState("");
  const [nameOnCard, setNameOnCard] = useState("");
  const [showCvv,    setShowCvv]    = useState(false);

  // UPI
  const [upiId,     setUpiId]     = useState("");
  const [upiStatus, setUpiStatus] = useState<"idle" | "waiting" | "done">("idle");

  // Net Banking
  const [selectedBank, setSelectedBank] = useState("");
  const [bankSearch,   setBankSearch]   = useState("");

  // ── Initialise Razorpay instance once script is loaded ────────────────────

  useEffect(() => {
    if (!scriptLoaded) return;
    const opts: RazorpayCustomOptions = {
      key:         orderInfo.key,
      order_id:    orderInfo.razorpayOrderId,
      amount:      Math.round(orderInfo.amount * 100), // paise
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
        onError(err instanceof Error ? err.message : "Verification failed. Contact support.");
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

  // ── Submit handler ────────────────────────────────────────────────────────

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!rzpRef.current) { setFormErr("Payment gateway not ready. Please wait."); return; }
    setFormErr(null);
    setPaying(true);

    if (tab === "card") {
      const raw     = cardNumber.replace(/\s/g, "");
      const [mm, yy] = expiry.split("/");
      if (raw.length < 13) { setFormErr("Enter a valid card number."); setPaying(false); return; }
      if (!mm || !yy || mm.length < 2 || yy.length < 2) { setFormErr("Enter a valid expiry date (MM/YY)."); setPaying(false); return; }
      if (cvv.length < 3) { setFormErr("Enter a valid CVV."); setPaying(false); return; }
      if (!nameOnCard.trim()) { setFormErr("Enter the name on your card."); setPaying(false); return; }

      const data: CardPaymentData = {
        method: "card",
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
        setFormErr("Enter a valid UPI ID (e.g. name@bank).");
        setPaying(false);
        return;
      }
      setUpiStatus("waiting");
      const data: UpiPaymentData = { method: "upi", vpa: upiId.trim() };
      rzpRef.current.createPayment(data);
    }

    if (tab === "netbanking") {
      if (!selectedBank) { setFormErr("Please select your bank."); setPaying(false); return; }
      const data: NetBankingPaymentData = { method: "netbanking", bank: selectedBank };
      rzpRef.current.createPayment(data);
    }
  }

  const filteredBanks = ALL_BANKS.filter(
    (b) => b.name.toLowerCase().includes(bankSearch.toLowerCase()) ||
           b.code.toLowerCase().includes(bankSearch.toLowerCase())
  );

  const tabCls = (t: PaymentTab) =>
    `flex-1 flex flex-col items-center gap-1 py-3 px-2 text-xs font-medium transition-colors border-b-2 ${
      tab === t
        ? "border-primary text-primary"
        : "border-transparent text-muted-foreground hover:text-foreground"
    }`;

  return (
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
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">Secure Payment</p>
          <p className="text-xs text-muted-foreground">
            ₹{orderInfo.amount.toLocaleString("en-IN")} · {description}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>256-bit SSL</span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-border">
        <button type="button" className={tabCls("card")}       onClick={() => { setTab("card");       setFormErr(null); }}>
          <CreditCard  className="w-4 h-4" />
          Card
        </button>
        <button type="button" className={tabCls("upi")}        onClick={() => { setTab("upi");        setFormErr(null); }}>
          <Smartphone  className="w-4 h-4" />
          UPI
        </button>
        <button type="button" className={tabCls("netbanking")} onClick={() => { setTab("netbanking"); setFormErr(null); }}>
          <Building2   className="w-4 h-4" />
          Net Banking
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-5 space-y-5">

        {/* ── Card tab ──────────────────────────────────────────────────── */}
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
                  placeholder="1234 5678 9012 3456"
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
                  Expiry (MM/YY)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="cc-exp"
                  placeholder="MM/YY"
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

            {/* Name */}
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

            {/* Accepted cards */}
            <div className="flex items-center gap-2 pt-0.5">
              {["VISA", "Mastercard", "RuPay", "Amex"].map((b) => (
                <span key={b} className="px-1.5 py-0.5 rounded border border-border text-[10px] font-semibold text-muted-foreground bg-secondary/50 tracking-wide">
                  {b}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── UPI tab ───────────────────────────────────────────────────── */}
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
                onChange={(e) => { setUpiId(e.target.value.trim()); setUpiStatus("idle"); }}
                className="input-glass"
                disabled={paying}
              />
              <p className="mt-1.5 text-xs text-muted-foreground/70">
                e.g. mobilenumber@paytm · yourname@okhdfcbank · user@ybl
              </p>
            </div>

            {upiStatus === "waiting" && (
              <div className="flex items-start gap-3 p-3.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-400">Check your UPI app</p>
                  <p className="text-xs text-blue-400/70 mt-0.5">
                    A payment request of ₹{orderInfo.amount.toLocaleString("en-IN")} has been sent to{" "}
                    <strong>{upiId}</strong>. Approve it within 5 minutes.
                  </p>
                </div>
              </div>
            )}

            {upiStatus === "done" && (
              <div className="flex items-center gap-2.5 p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-medium">Payment approved!</span>
              </div>
            )}

            {/* UPI app logos */}
            <div className="flex items-center gap-2 pt-1">
              {["GPay", "PhonePe", "Paytm", "BHIM"].map((app) => (
                <span key={app} className="px-2 py-0.5 rounded border border-border text-[10px] font-semibold text-muted-foreground bg-secondary/50 tracking-wide">
                  {app}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Net Banking tab ───────────────────────────────────────────── */}
        {tab === "netbanking" && (
          <div className="space-y-3">
            {/* Popular banks grid */}
            <p className="text-xs font-medium text-muted-foreground">Popular Banks</p>
            <div className="grid grid-cols-3 gap-2">
              {POPULAR_BANKS.map((bank) => (
                <button
                  key={bank.code}
                  type="button"
                  onClick={() => { setSelectedBank(bank.code); setFormErr(null); }}
                  className={`p-2.5 rounded-lg border text-xs font-medium transition-colors text-center leading-tight ${
                    selectedBank === bank.code
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary/30 text-foreground hover:bg-secondary/60"
                  }`}
                  disabled={paying}
                >
                  {bank.name}
                </button>
              ))}
            </div>

            {/* All banks dropdown */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                All Banks
              </label>
              <input
                type="text"
                placeholder="Search bank…"
                value={bankSearch}
                onChange={(e) => setBankSearch(e.target.value)}
                className="input-glass mb-1.5"
                disabled={paying}
              />
              <select
                value={selectedBank}
                onChange={(e) => { setSelectedBank(e.target.value); setFormErr(null); }}
                className="select input-glass"
                disabled={paying}
              >
                <option value="">— Select your bank —</option>
                {filteredBanks.map((b) => (
                  <option key={b.code} value={b.code}>{b.name}</option>
                ))}
              </select>
            </div>

            {selectedBank && (
              <p className="text-xs text-muted-foreground/70">
                You will be redirected to{" "}
                <strong className="text-foreground/80">
                  {ALL_BANKS.find((b) => b.code === selectedBank)?.name}
                </strong>{" "}
                to complete the payment.
              </p>
            )}
          </div>
        )}

        {/* ── Error banner ──────────────────────────────────────────────── */}
        {formErr && (
          <div className="flex items-start gap-2.5 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3.5 py-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{formErr}</span>
          </div>
        )}

        {/* ── Pay button ────────────────────────────────────────────────── */}
        <button
          type="submit"
          disabled={paying || !scriptLoaded || upiStatus === "waiting"}
          className="w-full btn-primary py-3 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {paying && upiStatus !== "waiting" ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
          ) : upiStatus === "waiting" ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Waiting for UPI approval…</>
          ) : (
            <><ShieldCheck className="w-4 h-4" />
              {tab === "netbanking"
                ? `Continue to Bank`
                : `Pay ₹${orderInfo.amount.toLocaleString("en-IN")}`}
            </>
          )}
        </button>

        <p className="text-center text-[11px] text-muted-foreground/60">
          Secured by Razorpay · Your payment info is encrypted and never stored on our servers
        </p>
      </form>
    </div>
  );
}
