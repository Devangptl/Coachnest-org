"use client";

/**
 * AddCardModal — In-UI card entry using Stripe CardElement + SetupIntent.
 * No redirect to Stripe pages. Handles 3DS via confirmCardSetup.
 *
 * Usage:
 *   <AddCardModal open={open} onClose={close} onSuccess={(pmId) => ...} />
 *
 * Must be rendered inside <StripeProvider> (which provides the Elements context).
 */
import { useState, FormEvent } from "react";
import { useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import { Loader2, CreditCard, ShieldCheck, Lock } from "lucide-react";
import toast from "react-hot-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/Dialog";

// ─── Stripe card element appearance ──────────────────────────────────────────

const CARD_STYLE = {
  style: {
    base: {
      color:          "#e2e8f0",
      fontFamily:     "system-ui, -apple-system, sans-serif",
      fontSize:       "15px",
      fontSmoothing:  "antialiased",
      "::placeholder": { color: "#475569" },
      iconColor:       "#f97316",
    },
    invalid: { color: "#f87171", iconColor: "#f87171" },
  },
};

// ─── Inner form (needs to be inside Elements context) ─────────────────────────

interface FormProps {
  onSuccess: (paymentMethodId: string) => void;
  onClose:   () => void;
  title?:       string;
  description?: string;
  submitLabel?: string;
}

function AddCardForm({ onSuccess, onClose, title, description, submitLabel = "Save Card" }: FormProps) {
  const stripe   = useStripe();
  const elements = useElements();
  const [loading,      setLoading]      = useState(false);
  const [cardComplete, setCardComplete] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    try {
      // 1 — Ask server to create a SetupIntent
      const res  = await fetch("/api/billing/setup-intent", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to initialize card setup");

      // 2 — Confirm card setup client-side (handles 3DS / authentication)
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Card element not mounted");

      const { error, setupIntent } = await stripe.confirmCardSetup(data.clientSecret, {
        payment_method: { card: cardElement },
      });

      if (error) throw new Error(error.message);
      if (!setupIntent?.payment_method) throw new Error("Card setup did not return a payment method");

      const pmId = typeof setupIntent.payment_method === "string"
        ? setupIntent.payment_method
        : setupIntent.payment_method.id;

      // 3 — Set the new card as the default payment method
      await fetch(`/api/billing/payment-methods/${pmId}`, { method: "PATCH" });

      toast.success("Card saved successfully");
      onSuccess(pmId);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save card");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Header */}
      <DialogHeader>
        <DialogTitle>{title ?? "Add Payment Method"}</DialogTitle>
        <DialogDescription>
          {description ?? "Your card is encrypted and stored securely by Stripe. We never see your full card number."}
        </DialogDescription>
      </DialogHeader>

      {/* Card field */}
      <div className="rounded-md border border-border bg-secondary/30 p-4 space-y-3">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <CreditCard className="w-3.5 h-3.5" />
          Card information
        </p>
        <CardElement
          options={CARD_STYLE}
          onChange={(e) => setCardComplete(e.complete)}
        />
      </div>

      {/* Security badge */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/30 rounded-lg px-3 py-2.5">
        <Lock className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
        <span>
          Secured by{" "}
          <span className="font-semibold text-foreground">Stripe</span>.
          Card details are tokenised and never touch our servers.
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2.5 rounded-md border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || !cardComplete || loading}
          className="flex-1 py-2.5 rounded-md bg-gradient-to-r from-orange-500 to-orange-400 text-white text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
          ) : (
            <><ShieldCheck className="w-4 h-4" /> {submitLabel}</>
          )}
        </button>
      </div>
    </form>
  );
}

// ─── Public modal wrapper ─────────────────────────────────────────────────────

export interface AddCardModalProps {
  open:        boolean;
  onClose:     () => void;
  onSuccess:   (paymentMethodId: string) => void;
  title?:       string;
  description?: string;
  submitLabel?: string;
}

export function AddCardModal({ open, onClose, onSuccess, title, description, submitLabel }: AddCardModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <AddCardForm
          onSuccess={onSuccess}
          onClose={onClose}
          title={title}
          description={description}
          submitLabel={submitLabel}
        />
      </DialogContent>
    </Dialog>
  );
}
