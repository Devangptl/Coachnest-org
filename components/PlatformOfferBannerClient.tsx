"use client";

import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";

/**
 * Wraps the offer banner with a session-scoped dismiss button. We hide the
 * banner once the user dismisses it for this offer ID — visiting again with
 * a fresh session (or a new offer) re-renders it.
 */
export default function PlatformOfferBannerClient({
  offerId,
  children,
}: {
  offerId: string;
  children: ReactNode;
}) {
  const storageKey = `platform-offer-dismissed:${offerId}`;
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && sessionStorage.getItem(storageKey) === "1") {
        setDismissed(true);
      }
    } catch {
      /* sessionStorage unavailable — keep banner visible */
    }
  }, [storageKey]);

  if (dismissed) return null;

  return (
    <div className="relative z-20 w-full">
      {children}
      <button
        type="button"
        onClick={() => {
          try { sessionStorage.setItem(storageKey, "1"); } catch { /* noop */ }
          setDismissed(true);
        }}
        aria-label="Dismiss offer"
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-black/10 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
