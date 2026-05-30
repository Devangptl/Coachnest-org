"use client";

/**
 * CartDrawer — slide-in shopping cart.
 * Desktop: right-side drawer.
 * Mobile:  bottom sheet (mirrors SearchModal UX).
 * Open via the global "coachnest:cart-open" event, the CartIcon button,
 * or by importing useCartDrawer().
 */

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart, X, Trash2, BookOpen, ArrowRight,
  ShieldCheck, Receipt, Loader2,
} from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { cn } from "@/lib/utils";

const CART_OPEN_EVENT = "coachnest:cart-open";

export function openCartDrawer() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CART_OPEN_EVENT));
  }
}

interface Props { open: boolean; onClose: () => void; }

export default function CartDrawer({ open, onClose }: Props) {
  const router = useRouter();
  const { cart, loading, refresh, remove } = useCart();
  const [isMobile, setIsMobile] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  // Mobile detection (matches SearchModal breakpoint).
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Refresh cart whenever it opens.
  useEffect(() => { if (open) refresh(); }, [open, refresh]);

  // Body scroll lock.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // ESC to close.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleRemove = useCallback(async (bookId: string) => {
    setRemoving(bookId);
    await remove(bookId);
    setRemoving(null);
  }, [remove]);

  function handleCheckout() {
    onClose();
    router.push("/checkout/books");
  }

  const items = cart.items;
  const baseTotal = items.reduce(
    (s, i) => s + (i.book.price ? Number(i.book.price) : 0), 0,
  );
  const subtotal = cart.subtotal;
  const itemDiscount = baseTotal - subtotal;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* ── Backdrop ─────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* ── Wrapper ──────────────────────────────────────────── */}
          <div
            className={cn(
              "fixed inset-0 z-[201] flex pointer-events-none",
              "items-end justify-center",
              "sm:items-stretch sm:justify-end",
            )}
          >
            <motion.div
              initial={
                isMobile
                  ? { opacity: 0, y: 48 }
                  : { opacity: 0, x: 48 }
              }
              animate={
                isMobile
                  ? { opacity: 1, y: 0 }
                  : { opacity: 1, x: 0 }
              }
              exit={
                isMobile
                  ? { opacity: 0, y: 48 }
                  : { opacity: 0, x: 48 }
              }
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "pointer-events-auto flex flex-col w-full",
                "sm:max-w-[440px] sm:h-full",
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className={cn(
                  "relative overflow-hidden border border-border shadow-[0_8px_32px_rgba(0,0,0,0.6)] flex flex-col",
                  "rounded-t-2xl h-[87dvh]",
                  "sm:rounded-none sm:rounded-l-2xl sm:h-full sm:border-r-0",
                )}
                style={{ background: "hsl(var(--card))" }}
              >
                {/* Drag handle — mobile only */}
                <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
                  <div className="w-10 h-1 bg-white/[0.18] rounded-full" />
                </div>

                {/* Orange top glow line */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/70 to-transparent" />
                <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-orange-500/[0.04] to-transparent pointer-events-none" />

                {/* ── Header ───────────────────────────────────── */}
                <div className="relative flex items-center gap-3 px-4 sm:px-5 py-3.5 flex-shrink-0">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                    <ShoppingCart className="w-4 h-4 text-[#d97757]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-[15px] font-semibold text-foreground leading-tight">
                      Your Cart
                    </h2>
                    <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                      {loading
                        ? "Loading…"
                        : cart.count === 0
                          ? "Empty"
                          : `${cart.count} item${cart.count === 1 ? "" : "s"}`}
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    aria-label="Close cart"
                    className="w-8 h-8 rounded-md bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="h-px bg-white/[0.06] flex-shrink-0" />

                {/* ── Scrollable items ─────────────────────────── */}
                <div className="overflow-y-auto overscroll-contain flex-1 min-h-0">
                  {loading && items.length === 0 ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="w-5 h-5 text-muted-foreground/40 animate-spin" />
                    </div>
                  ) : items.length === 0 ? (
                    <div className="flex flex-col items-center text-center px-6 py-14">
                      <div className="w-14 h-14 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-3">
                        <BookOpen className="h-6 w-6 text-orange-500/70" />
                      </div>
                      <h3 className="text-base font-semibold text-foreground mb-1">
                        Your cart is empty
                      </h3>
                      <p className="mb-5 text-sm text-muted-foreground">
                        Browse the catalog and add some titles to get started.
                      </p>
                      <Link
                        href="/books"
                        onClick={onClose}
                        className="btn-primary !py-2 !px-4 !text-sm"
                      >
                        Browse Books <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  ) : (
                    <ul className="px-3 sm:px-4 py-3 space-y-2">
                      {items.map((item) => {
                        const price = item.book.price ? Number(item.book.price) : 0;
                        const discount = item.book.discountPrice ? Number(item.book.discountPrice) : null;
                        const finalPrice = discount ?? price;
                        const hasDiscount = discount != null && discount < price;
                        const isRemoving = removing === item.bookId;
                        return (
                          <motion.li
                            key={item.bookId}
                            layout
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: isRemoving ? 0.5 : 1, y: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.18 }}
                            className="group flex items-start gap-3 rounded-lg border border-border bg-card/40 p-2.5 transition-colors hover:border-orange-500/30"
                          >
                            <Link
                              href={`/books/${item.book.slug}`}
                              onClick={onClose}
                              className="flex-shrink-0"
                            >
                              <div className="h-20 w-[56px] overflow-hidden rounded-md border border-border bg-secondary/60">
                                {item.book.coverImage ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={item.book.coverImage}
                                    alt={item.book.title}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-muted-foreground/30">
                                    <BookOpen className="h-5 w-5" />
                                  </div>
                                )}
                              </div>
                            </Link>

                            <div className="min-w-0 flex-1">
                              <Link
                                href={`/books/${item.book.slug}`}
                                onClick={onClose}
                                className="block text-[13px] font-semibold text-foreground hover:text-orange-500 transition-colors line-clamp-2 leading-snug"
                              >
                                {item.book.title}
                              </Link>
                              <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
                                by {item.book.author}
                              </p>
                              <div className="mt-1.5 flex items-baseline gap-1.5 flex-wrap">
                                <span className="text-sm font-bold text-foreground">
                                  ₹{finalPrice.toLocaleString("en-IN")}
                                </span>
                                {hasDiscount && (
                                  <>
                                    <span className="text-[11px] text-muted-foreground line-through">
                                      ₹{price.toLocaleString("en-IN")}
                                    </span>
                                    <span className="rounded bg-orange-500/15 border border-orange-500/25 px-1 py-px text-[9px] font-bold text-orange-600 dark:text-orange-300">
                                      -{Math.round((1 - discount! / price) * 100)}%
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={() => handleRemove(item.bookId)}
                              disabled={isRemoving}
                              aria-label="Remove from cart"
                              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                            >
                              {isRemoving
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Trash2 className="h-3.5 w-3.5" />}
                            </button>
                          </motion.li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* ── Footer summary ─────────────────────────── */}
                {items.length > 0 && (
                  <div
                    className="border-t border-white/[0.06] bg-white/[0.01] flex-shrink-0 px-4 sm:px-5 pt-3"
                    style={{ paddingBottom: "max(0.875rem, env(safe-area-inset-bottom))" }}
                  >
                    <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 flex items-center gap-1.5">
                      <Receipt className="h-3 w-3" /> Order Summary
                    </div>
                    <div className="space-y-1.5 text-sm">
                      <Row
                        label={`Items (${items.length})`}
                        value={`₹${baseTotal.toLocaleString("en-IN")}`}
                      />
                      {itemDiscount > 0 && (
                        <Row
                          label="Discounts"
                          value={`−₹${itemDiscount.toLocaleString("en-IN")}`}
                          positive
                        />
                      )}
                      <div className="flex items-baseline justify-between pt-2 border-t border-white/[0.06]">
                        <span className="text-sm text-muted-foreground">Subtotal</span>
                        <span className="text-lg font-bold text-foreground">
                          ₹{subtotal.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={handleCheckout}
                      className="btn-primary mt-3 !w-full !py-2.5 !text-sm justify-center"
                    >
                      Proceed to Checkout <ArrowRight className="h-4 w-4" />
                    </button>

                    <p className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/70">
                      <ShieldCheck className="h-3 w-3 text-green-500/80" />
                      Secure payment · Lifetime download
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

function Row({
  label, value, positive = false,
}: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground text-[13px]">{label}</span>
      <span className={cn(
        "text-[13px] font-medium",
        positive ? "text-green-500" : "text-foreground",
      )}>
        {value}
      </span>
    </div>
  );
}

/** Hook for components that want to listen for cart-open events. */
export function useCartOpenListener(handler: () => void) {
  useEffect(() => {
    window.addEventListener(CART_OPEN_EVENT, handler);
    return () => window.removeEventListener(CART_OPEN_EVENT, handler);
  }, [handler]);
}
