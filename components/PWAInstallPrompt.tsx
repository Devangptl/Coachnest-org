"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X, Share } from "lucide-react";
import { cn } from "@/lib/utils";

const DISMISSED_KEY = "pwa-install-dismissed-until";
const DISMISS_DAYS = 7;
const SHOW_DELAY_MS = 30_000;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Capture the event at module scope so it's never missed due to React mount timing.
// The browser fires `beforeinstallprompt` very early; registering here runs as soon
// as this chunk is parsed, before any component mounts.
let _deferredPrompt: BeforeInstallPromptEvent | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    _deferredPrompt = e as BeforeInstallPromptEvent;
  });
}

export default function PWAInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Already installed as PWA — don't show
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true
    ) {
      return;
    }

    // Check if dismissed recently
    const dismissedUntil = localStorage.getItem(DISMISSED_KEY);
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) return;

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as { MSStream?: unknown }).MSStream;
    setIsIOS(ios);

    // Pick up any event that fired before this component mounted
    if (_deferredPrompt) {
      setInstallEvent(_deferredPrompt);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      _deferredPrompt = e as BeforeInstallPromptEvent;
      setInstallEvent(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // iOS: show the manual instructions after the delay
    let iosTimer: ReturnType<typeof setTimeout> | undefined;
    if (ios) {
      iosTimer = setTimeout(() => setShow(true), SHOW_DELAY_MS);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      if (iosTimer !== undefined) clearTimeout(iosTimer);
    };
  }, []);

  // Show Android prompt after delay once we have the install event
  useEffect(() => {
    if (!installEvent) return;
    const timer = setTimeout(() => setShow(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [installEvent]);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(DISMISSED_KEY, String(Date.now() + DISMISS_DAYS * 86_400_000));
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === "accepted") {
      _deferredPrompt = null;
      setInstallEvent(null);
      setShow(false);
    }
  };

  if (!show) return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-20 md:bottom-4 md:left-auto md:right-4 md:max-w-sm",
        "bg-card border-t border-border md:border md:rounded-xl",
        "p-4 shadow-xl shadow-black/40 flex items-center gap-3"
      )}
      style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
    >
      <Image
        src="/icons/icon-72x72.png"
        alt="Coachnest"
        width={40}
        height={40}
        className="rounded-lg shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-tight">
          Install Coachnest
        </p>
        {isIOS ? (
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            Tap <Share className="w-3 h-3 inline text-[#d97757]" /> then &ldquo;Add to Home Screen&rdquo;
          </p>
        ) : (
          <button
            onClick={install}
            className="text-xs font-medium text-[#d97757] mt-0.5 hover:underline"
          >
            Add to home screen
          </button>
        )}
      </div>
      <button
        onClick={dismiss}
        className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        aria-label="Dismiss install prompt"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
