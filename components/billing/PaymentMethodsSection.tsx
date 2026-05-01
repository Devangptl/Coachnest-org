"use client";

/**
 * PaymentMethodsSection — displays saved cards with set-default and remove actions.
 * Renders inside the billing page; manages its own fetch/state for the PM list.
 *
 * Must be a child of <StripeProvider> (so AddCardModal can use useStripe/useElements).
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  CreditCard, Plus, Trash2, ShieldCheck, Loader2, Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AddCardModal } from "@/components/billing/AddCardModal";
import { useConfirm } from "@/components/ui/UIDialogProvider";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PaymentMethod {
  id:        string;
  brand:     string;
  last4:     string;
  expMonth:  number;
  expYear:   number;
  isDefault: boolean;
}

const CARD_LOGOS: Record<string, string> = {
  visa:       "VISA",
  mastercard: "MC",
  amex:       "AMEX",
  rupay:      "RuPay",
  discover:   "DISC",
  unionpay:   "UP",
};

const CARD_GRADIENT: Record<string, string> = {
  visa:       "from-blue-900 to-blue-800",
  mastercard: "from-red-900 to-orange-900",
  amex:       "from-green-900 to-teal-900",
  rupay:      "from-orange-900 to-red-900",
  default:    "from-slate-800 to-slate-700",
};

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  /** Called after a card is added/removed so parent can refresh data */
  onUpdate?: () => void;
}

export function PaymentMethodsSection({ onUpdate }: Props) {
  const [methods,    setMethods]    = useState<PaymentMethod[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showAdd,    setShowAdd]    = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [settingId,  setSettingId]  = useState<string | null>(null);
  const confirm = useConfirm();

  const load = useCallback(async () => {
    try {
      const res  = await fetch("/api/billing/payment-methods");
      const data = await res.json();
      setMethods(data.paymentMethods ?? []);
    } catch {
      toast.error("Could not load payment methods");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleRemove(id: string) {
    if (!await confirm("Remove this card?", { title: "Remove Card", confirmText: "Remove" })) return;
    setRemovingId(id);
    try {
      const res  = await fetch(`/api/billing/payment-methods/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to remove card");
      toast.success("Card removed");
      setMethods((prev) => prev.filter((m) => m.id !== id));
      onUpdate?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not remove card");
    } finally {
      setRemovingId(null);
    }
  }

  async function handleSetDefault(id: string) {
    setSettingId(id);
    try {
      const res  = await fetch(`/api/billing/payment-methods/${id}`, { method: "PATCH" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update default");
      toast.success("Default card updated");
      setMethods((prev) => prev.map((m) => ({ ...m, isDefault: m.id === id })));
      onUpdate?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not set default card");
    } finally {
      setSettingId(null);
    }
  }

  function handleCardAdded() {
    setShowAdd(false);
    load();
    onUpdate?.();
  }

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-20 bg-secondary/40 rounded-md" />
        <div className="h-20 bg-secondary/40 rounded-md" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {methods.map((m) => {
            const gradient = CARD_GRADIENT[m.brand] ?? CARD_GRADIENT.default;
            const logo     = CARD_LOGOS[m.brand] ?? m.brand.toUpperCase();
            const isExpired = new Date(m.expYear, m.expMonth - 1) < new Date();

            return (
              <motion.div
                key={m.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "flex items-center gap-4 rounded-md border p-4 transition-colors",
                  m.isDefault
                    ? "border-[#d97757]/30 bg-orange-500/5"
                    : "border-border bg-secondary/20 hover:bg-secondary/30"
                )}
              >
                {/* Card art */}
                <div className={cn(
                  "relative w-16 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-md",
                  gradient
                )}>
                  <span className="text-white font-black text-[9px] tracking-widest uppercase">
                    {logo}
                  </span>
                  <div className="absolute bottom-1 right-1.5 w-3.5 h-2.5 rounded-sm bg-yellow-400/80" />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    •••• •••• •••• {m.last4}
                  </p>
                  <p className={cn(
                    "text-xs mt-0.5",
                    isExpired ? "text-red-400" : "text-muted-foreground"
                  )}>
                    {isExpired ? "Expired" : "Expires"}{" "}
                    {String(m.expMonth).padStart(2, "0")} / {m.expYear}
                  </p>
                </div>

                {/* Badges + actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {m.isDefault && (
                    <span className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
                      <ShieldCheck className="w-3 h-3" /> Default
                    </span>
                  )}

                  {!m.isDefault && (
                    <button
                      onClick={() => handleSetDefault(m.id)}
                      disabled={settingId === m.id}
                      title="Set as default"
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-[#d97757] border border-border hover:border-[#d97757]/30 rounded-lg px-2.5 py-1 transition-all disabled:opacity-50"
                    >
                      {settingId === m.id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Star className="w-3 h-3" />}
                      Set default
                    </button>
                  )}

                  <button
                    onClick={() => handleRemove(m.id)}
                    disabled={removingId === m.id}
                    title="Remove card"
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
                  >
                    {removingId === m.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {methods.length === 0 && (
          <div className="flex items-center gap-3 rounded-md border border-dashed border-border p-5 text-muted-foreground">
            <CreditCard className="w-8 h-8 opacity-30 flex-shrink-0" />
            <div>
              <p className="text-sm">No payment methods saved.</p>
              <p className="text-xs opacity-60 mt-0.5">
                Add a card to enable subscriptions and payments.
              </p>
            </div>
          </div>
        )}

        {/* Add card button */}
        <button
          onClick={() => setShowAdd(true)}
          className="w-full flex items-center justify-center gap-2 rounded-md border border-dashed border-border hover:border-[#d97757]/40 hover:bg-orange-500/5 py-3 text-sm font-medium text-muted-foreground hover:text-[#d97757] transition-all"
        >
          <Plus className="w-4 h-4" />
          Add new card
        </button>
      </div>

      <AddCardModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSuccess={handleCardAdded}
      />
    </>
  );
}
