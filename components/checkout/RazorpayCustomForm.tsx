"use client";

/**
 * RazorpayCustomForm — wraps Razorpay Standard Checkout (checkout.js).
 *
 * On mount, automatically opens the Razorpay payment modal which supports
 * Card, UPI, Netbanking, Wallets and all other methods configured in the
 * Razorpay dashboard — no custom UI needed.
 *
 * States:
 *   loading     — checkout.js script is being fetched
 *   open        — Razorpay modal is visible to the user
 *   verifying   — handler fired; calling onSuccess / verify-payment API
 *   dismissed   — user closed the modal; shows "Continue Payment" retry
 *   verifyFailed — payment captured but server-side verify errored
 *   scriptError — checkout.js failed to load (ad-blocker / network)
 */

import { useEffect, useRef, useState } from "react";
import {
  Loader2, ShieldCheck, AlertCircle, RefreshCw, ArrowLeft,
} from "lucide-react";
import type { RazorpayOptions, RazorpaySuccessResponse } from "@/types/razorpay";

// ── Exported types (re-used by checkout clients) ──────────────────────────────

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
  /** Fires when Razorpay reports success — call /api/razorpay/verify-payment here */
  onSuccess:       (response: RazorpaySuccessResponse) => Promise<void>;
  /** Legacy prop — Standard Checkout handles UPI internally, this is never called */
  onUpiCaptured?:  () => void;
  onError?:        (message: string) => void;
  onBack?:         () => void;
}

type UIState =
  | "loading"
  | "open"
  | "verifying"
  | "dismissed"
  | "verifyFailed"
  | "scriptError";

// ── checkout.js loader ────────────────────────────────────────────────────────

function useCheckoutScript() {
  const [loaded, setLoaded] = useState(
    typeof window !== "undefined" && !!window.Razorpay
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (loaded || failed) return;
    const s   = document.createElement("script");
    s.src     = "https://checkout.razorpay.com/v1/checkout.js";
    s.async   = true;
    s.onload  = () => setLoaded(true);
    s.onerror = () => { console.error("[Razorpay] Failed to load checkout.js"); setFailed(true); };
    document.body.appendChild(s);
  }, [loaded, failed]);

  return { loaded, failed };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RazorpayCustomForm({
  orderInfo, description, prefillEmail,
  onSuccess, onError, onBack,
}: Props) {
  const { loaded: scriptLoaded, failed: scriptFailed } = useCheckoutScript();

  // Stable callback refs — never cause modal to re-open
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef   = useRef(onError);
  useEffect(() => { onSuccessRef.current = onSuccess; }, [onSuccess]);
  useEffect(() => { onErrorRef.current   = onError;   }, [onError]);

  const [uiState,  setUiState]  = useState<UIState>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Propagate script load failure
  useEffect(() => {
    if (scriptFailed) setUiState("scriptError");
  }, [scriptFailed]);

  // Auto-open modal as soon as the script is ready
  useEffect(() => {
    if (scriptLoaded && uiState === "loading") openModal();
    // openModal captures orderInfo/description/prefillEmail from closure;
    // they're set once before this component mounts so the dependency is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptLoaded, uiState]);

  function openModal() {
    setUiState("open");
    setErrorMsg(null);

    const options: RazorpayOptions = {
      key:         orderInfo.key,
      amount:      Math.round(orderInfo.amount * 100), // rupees → paise
      currency:    orderInfo.currency ?? "INR",
      order_id:    orderInfo.razorpayOrderId,
      name:        "Coachnest",
      description: description ?? "Payment",
      image:       "/logo.png",
      prefill:     { email: prefillEmail ?? "" },
      theme:       { color: "#d97757" },
      modal: {
        confirm_close: true,
        ondismiss: () => setUiState("dismissed"),
      },
      handler: (response) => {
        setUiState("verifying");
        onSuccessRef.current(response).catch((err) => {
          const msg = err instanceof Error
            ? err.message
            : "Payment verification failed. Please contact support.";
          setUiState("verifyFailed");
          setErrorMsg(msg);
          onErrorRef.current?.(msg);
        });
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (uiState === "scriptError") {
    return (
      <StatusCard
        icon={<AlertCircle className="w-8 h-8 text-red-500" />}
        title="Payment gateway failed to load"
      >
        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          Usually caused by an ad-blocker or network issue.
          Disable your ad-blocker or try a different network, then reload.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="btn-secondary w-full mt-1 justify-center"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Reload page
        </button>
      </StatusCard>
    );
  }

  if (uiState === "loading") {
    return (
      <StatusCard
        icon={<Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />}
        title="Loading payment gateway…"
      >
        <p className="text-xs text-muted-foreground">Please wait a moment.</p>
      </StatusCard>
    );
  }

  if (uiState === "open") {
    return (
      <StatusCard
        icon={<Loader2 className="w-7 h-7 text-primary animate-spin" />}
        title="Razorpay checkout is open"
      >
        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          Complete your payment in the Razorpay window.
          Supports Card, UPI, Netbanking &amp; Wallets.
        </p>
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/50 mt-1">
          <ShieldCheck className="w-3 h-3" /> Secured by Razorpay
        </div>
      </StatusCard>
    );
  }

  if (uiState === "verifying") {
    return (
      <StatusCard
        icon={<Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />}
        title="Confirming your payment…"
      >
        <p className="text-xs text-muted-foreground text-center">
          Verifying with Razorpay and activating your purchase.
          Don&apos;t close this tab.
        </p>
      </StatusCard>
    );
  }

  if (uiState === "verifyFailed") {
    return (
      <StatusCard
        icon={<AlertCircle className="w-8 h-8 text-red-500" />}
        title="Verification failed"
      >
        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          Your payment was received by Razorpay but our server could not confirm it.
          If your account was charged, please contact support with your payment ID.
        </p>
        {errorMsg && (
          <p className="text-xs text-red-400 text-center bg-red-500/10 rounded-lg px-3 py-2 w-full">
            {errorMsg}
          </p>
        )}
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="btn-secondary w-full mt-1 justify-center"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Go back
          </button>
        )}
      </StatusCard>
    );
  }

  // dismissed
  return (
    <StatusCard
      icon={<AlertCircle className="w-8 h-8 text-amber-400" />}
      title="Payment cancelled"
    >
      <p className="text-xs text-muted-foreground text-center leading-relaxed">
        You closed the payment window before completing the transaction.
        Your order is still reserved — click below to continue.
      </p>
      <button
        type="button"
        onClick={openModal}
        className="btn-primary w-full mt-1 justify-center"
      >
        <RefreshCw className="w-3.5 h-3.5" /> Continue Payment
      </button>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="btn-secondary w-full justify-center"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to order
        </button>
      )}
    </StatusCard>
  );
}

// ── Shared status card layout ─────────────────────────────────────────────────

function StatusCard({
  icon, title, children,
}: {
  icon:     React.ReactNode;
  title:    string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-8 flex flex-col items-center gap-3">
      {icon}
      <p className="text-sm font-semibold text-foreground text-center">{title}</p>
      {children}
    </div>
  );
}
