"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Sparkles, X, ArrowRight, Clock, BadgeCheck } from "lucide-react";
import type { PublicPlatformOffer } from "@/services/platform-offer.service";

export default function PlatformOfferModal({ offer }: { offer: PublicPlatformOffer }) {
  const storageKey = `platform-offer-modal-dismissed:${offer.id}`;
  const [open, setOpen] = useState(false);
  const [countdown, setCountdown] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && sessionStorage.getItem(storageKey) === "1") {
        return;
      }
    } catch {
      /* sessionStorage unavailable */
    }
    const t = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(t);
  }, [storageKey]);

  useEffect(() => {
    if (!offer.endsAt) return;
    const end = new Date(offer.endsAt).getTime();
    if (Number.isNaN(end)) return;

    function tick() {
      const ms = end - Date.now();
      if (ms <= 0) { setCountdown("Ending now"); return; }
      const hours72 = 72 * 60 * 60 * 1000;
      if (ms > hours72) { setCountdown(null); return; }
      const h = Math.floor(ms / 3_600_000);
      const m = Math.floor((ms % 3_600_000) / 60_000);
      const s = Math.floor((ms % 60_000) / 1_000);
      setCountdown(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [offer.endsAt]);

  function dismiss() {
    try { sessionStorage.setItem(storageKey, "1"); } catch { /* noop */ }
    setOpen(false);
  }

  const discountLabel =
    offer.discountType === "PERCENTAGE"
      ? `${offer.discountValue}%`
      : `₹${offer.discountValue.toLocaleString("en-IN")}`;

  const endsLine = offer.endsAt
    ? `Ends ${new Date(offer.endsAt).toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
      })}`
    : null;

  const hasValidity = countdown !== null || endsLine !== null;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => (v ? setOpen(true) : dismiss())}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="
            fixed inset-0 z-[60] bg-black/55 backdrop-blur-sm
            data-[state=open]:animate-in data-[state=open]:fade-in-0
            data-[state=closed]:animate-out data-[state=closed]:fade-out-0
          "
        />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="
            fixed left-1/2 top-1/2 z-[61] -translate-x-1/2 -translate-y-1/2
            w-[calc(100%-2rem)] max-w-[420px]
            rounded-xl overflow-hidden shadow-2xl
            bg-card border border-border
            data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95
            data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95
          "
        >
          {/* Brand accent stripe */}
          <div className="h-[3px] w-full" style={{ backgroundColor: offer.bannerBgColor }} />

          {/* Header row */}
          <div className="flex items-center justify-between px-5 pt-3.5 pb-0">
            <span
              className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: `${offer.bannerBgColor}18`,
                color: offer.bannerBgColor,
                border: `1px solid ${offer.bannerBgColor}35`,
              }}
            >
              <Sparkles className="w-2.5 h-2.5" /> Limited Offer
            </span>
            <DialogPrimitive.Close
              onClick={dismiss}
              aria-label="Close offer"
              className="rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </DialogPrimitive.Close>
          </div>

          {/* Two-column content */}
          <div className="flex items-start gap-4 px-5 pt-3.5 pb-4">
            {/* Discount badge */}
            <div
              className="flex-shrink-0 flex flex-col items-center justify-center rounded-lg w-[76px] h-[76px]"
              style={{ backgroundColor: offer.bannerBgColor, color: offer.bannerTextColor }}
            >
              <span className="text-[22px] font-black leading-none tracking-tight">{discountLabel}</span>
              <span className="text-[9px] font-bold tracking-[0.15em] mt-1 uppercase opacity-90">OFF</span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 pt-0.5">
              <DialogPrimitive.Title className="text-sm font-bold text-foreground leading-snug">
                {offer.title}
              </DialogPrimitive.Title>
              {offer.description && (
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {offer.description}
                </p>
              )}
              <p className="mt-1.5 text-[11px] text-muted-foreground/60">{scopeLabel(offer.scope)}</p>
              {offer.maxDiscount && !offer.minCartValue && (
                <p className="mt-1 text-[10px] text-muted-foreground/50">
                  Up to ₹{offer.maxDiscount.toLocaleString("en-IN")} off
                </p>
              )}
            </div>
          </div>

          {/* Validity bar */}
          {hasValidity && (
            <div className="mx-5 mb-4 flex items-center gap-2 text-xs border border-border rounded-lg px-3 py-2 bg-secondary/40">
              <Clock className="w-3 h-3 flex-shrink-0" style={{ color: offer.bannerBgColor }} />
              <span className="text-muted-foreground">
                {countdown ? (
                  <>
                    Ends in{" "}
                    <span className="font-mono font-semibold text-foreground">{countdown}</span>
                  </>
                ) : (
                  endsLine
                )}
              </span>
              {offer.minCartValue && offer.minCartValue > 0 && (
                <span className="ml-auto text-[10px] text-muted-foreground/50 whitespace-nowrap">
                  Min. ₹{offer.minCartValue.toLocaleString("en-IN")}
                  {offer.maxDiscount ? ` · Up to ₹${offer.maxDiscount.toLocaleString("en-IN")} off` : ""}
                </span>
              )}
            </div>
          )}

          {/* CTA row */}
          <div className="px-5 pb-4 flex items-center gap-2">
            <Link
              href={offer.bannerCtaUrl || "/courses"}
              onClick={dismiss}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 active:opacity-80 shadow-sm"
              style={{ backgroundColor: offer.bannerBgColor, color: offer.bannerTextColor }}
            >
              {offer.bannerCtaText || "Explore Courses"}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <button
              type="button"
              onClick={dismiss}
              className="px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
            >
              Maybe later
            </button>
          </div>

          {/* Trust line */}
          <div className="px-5 pb-4 flex items-center gap-1.5 text-[10px] text-muted-foreground/55">
            <BadgeCheck className="w-3 h-3 text-emerald-500 flex-shrink-0" />
            Auto-applies at checkout — no code needed
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function scopeLabel(scope: "ALL" | "COURSES" | "BOOKS"): string {
  if (scope === "COURSES") return "On all courses sitewide";
  if (scope === "BOOKS")   return "On all books sitewide";
  return "On all courses & books";
}
