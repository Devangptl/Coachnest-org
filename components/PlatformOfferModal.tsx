"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Sparkles, X, ArrowRight, Clock, BadgeCheck } from "lucide-react";
import type { PublicPlatformOffer } from "@/services/platform-offer.service";

/**
 * PlatformOfferModal — promotional offer modal shown to landing-page
 * visitors when a platform-wide offer is active.
 *
 * Behavior:
 *   - Auto-opens 1.2 s after mount (lets the page paint first).
 *   - Dismissal is stored in sessionStorage keyed by offer ID, so the
 *     modal does not reappear within the same browsing session or after
 *     a checkout round-trip.
 *   - Closes on Esc, overlay click, the X, or "Maybe later".
 */
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

  // Live countdown — only show when the offer ends within the next 72 hours
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
  const discountSuffix = offer.discountType === "PERCENTAGE" ? "OFF" : "OFF";

  const endsLine = offer.endsAt
    ? `Ends ${new Date(offer.endsAt).toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
      })}`
    : "Limited-time offer";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => (v ? setOpen(true) : dismiss())}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="
            fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm
            data-[state=open]:animate-in data-[state=open]:fade-in-0
            data-[state=closed]:animate-out data-[state=closed]:fade-out-0
          "
        />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="
            fixed left-1/2 top-1/2 z-[61] -translate-x-1/2 -translate-y-1/2
            w-[calc(100%-1.5rem)] max-w-md
            rounded-2xl overflow-hidden shadow-2xl
            bg-card border border-border
            data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95
            data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95
          "
        >
          {/* ── Coloured hero — uses the admin-defined banner colour ───────── */}
          <div
            className="relative px-6 pt-10 pb-7 text-center overflow-hidden"
            style={{
              backgroundColor: offer.bannerBgColor,
              color:           offer.bannerTextColor,
              backgroundImage: `linear-gradient(135deg, ${offer.bannerBgColor} 0%, ${tintColor(offer.bannerBgColor, -18)} 100%)`,
            }}
          >
            {/* Decorative blurred orbs */}
            <span
              aria-hidden
              className="pointer-events-none absolute -top-10 -left-8 w-32 h-32 rounded-full opacity-25 blur-2xl"
              style={{ backgroundColor: offer.bannerTextColor }}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute -bottom-10 -right-6 w-36 h-36 rounded-full opacity-15 blur-2xl"
              style={{ backgroundColor: offer.bannerTextColor }}
            />

            <span
              className="relative inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-widest uppercase mb-4 px-2.5 py-1 rounded-full"
              style={{
                backgroundColor: `${offer.bannerTextColor}26`,
                border:          `1px solid ${offer.bannerTextColor}40`,
              }}
            >
              <Sparkles className="w-3 h-3" /> Limited Offer
            </span>

            <div className="relative flex items-baseline justify-center gap-2 leading-none">
              <span className="text-6xl sm:text-7xl font-black tracking-tight drop-shadow-sm">
                {discountLabel}
              </span>
              <span className="text-2xl font-bold opacity-90 tracking-tight">{discountSuffix}</span>
            </div>

            <p className="relative mt-3 text-sm font-medium opacity-95 line-clamp-1">
              {scopeLabel(offer.scope)}
            </p>
          </div>

          {/* ── Body ───────────────────────────────────────────────────────── */}
          <div className="px-6 pt-6 pb-5 text-center">
            <DialogPrimitive.Title className="text-xl font-bold text-foreground leading-tight">
              {offer.title}
            </DialogPrimitive.Title>

            {offer.description && (
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {offer.description}
              </p>
            )}

            {/* Validity / countdown pill */}
            <div className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/60 border border-border rounded-full px-3 py-1.5">
              <Clock className="w-3.5 h-3.5 text-[#d97757]" />
              {countdown ? (
                <span className="font-mono font-semibold text-foreground">{countdown}</span>
              ) : (
                <span>{endsLine}</span>
              )}
            </div>

            {offer.minCartValue && offer.minCartValue > 0 ? (
              <p className="mt-3 text-[11px] text-muted-foreground/80">
                * On orders above ₹{offer.minCartValue.toLocaleString("en-IN")}
                {offer.maxDiscount ? ` · Up to ₹${offer.maxDiscount.toLocaleString("en-IN")} off` : ""}
              </p>
            ) : offer.maxDiscount ? (
              <p className="mt-3 text-[11px] text-muted-foreground/80">
                * Up to ₹{offer.maxDiscount.toLocaleString("en-IN")} off
              </p>
            ) : null}

            {/* CTAs */}
            <div className="mt-6 flex flex-col gap-2.5">
              <Link
                href={offer.bannerCtaUrl || "/courses"}
                onClick={dismiss}
                className="
                  inline-flex items-center justify-center gap-2 w-full
                  rounded-lg px-5 py-3 text-sm font-bold
                  bg-[#d97757] text-white hover:bg-[#c4684a]
                  transition-colors shadow-sm
                "
              >
                {offer.bannerCtaText || "Explore Courses"}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                type="button"
                onClick={dismiss}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Maybe later
              </button>
            </div>

            {/* Trust line */}
            <div className="mt-5 pt-4 border-t border-border/70 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/80">
              <BadgeCheck className="w-3.5 h-3.5 text-emerald-500" />
              Discount auto-applies at checkout — no code needed
            </div>
          </div>

          {/* Close (X) */}
          <DialogPrimitive.Close
            onClick={dismiss}
            aria-label="Close offer"
            className="
              absolute right-3 top-3 rounded-full p-1.5
              text-white/85 hover:text-white hover:bg-black/20
              transition-colors
            "
          >
            <X className="w-4 h-4" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scopeLabel(scope: "ALL" | "COURSES" | "BOOKS"): string {
  if (scope === "COURSES") return "On all courses sitewide";
  if (scope === "BOOKS")   return "On all books sitewide";
  return "On all courses & books";
}

/**
 * Slightly darken or lighten a `#rrggbb` hex by a percentage so the modal
 * hero gets a subtle linear-gradient effect derived from the admin's
 * chosen banner colour. Negative percent = darker.
 */
function tintColor(hex: string, percent: number): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
  const num = parseInt(hex.slice(1), 16);
  const adjust = (c: number) => {
    const v = Math.round(c * (1 + percent / 100));
    return Math.max(0, Math.min(255, v));
  };
  const r = adjust((num >> 16) & 0xff);
  const g = adjust((num >>  8) & 0xff);
  const b = adjust( num        & 0xff);
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}
