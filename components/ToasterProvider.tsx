"use client";

import {
  Toaster,
  toast,
  resolveValue,
  type Toast,
} from "react-hot-toast";
import {
  CheckCircle2,
  XCircle,
  Info,
  Loader2,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "loading" | "blank";

const ICONS: Record<ToastVariant, LucideIcon> = {
  success: CheckCircle2,
  error: XCircle,
  loading: Loader2,
  blank: Info,
};

const ACCENTS: Record<
  ToastVariant,
  { iconWrap: string; icon: string; bar: string }
> = {
  success: {
    iconWrap: "bg-emerald-500/15 ring-1 ring-inset ring-emerald-500/25",
    icon: "text-emerald-600 dark:text-emerald-400",
    bar: "bg-emerald-500/70",
  },
  error: {
    iconWrap: "bg-rose-500/15 ring-1 ring-inset ring-rose-500/25",
    icon: "text-rose-600 dark:text-rose-400",
    bar: "bg-rose-500/70",
  },
  loading: {
    iconWrap: "bg-brand-500/15 ring-1 ring-inset ring-brand-500/25",
    icon: "text-brand-600 dark:text-brand-400",
    bar: "bg-brand-500/70",
  },
  blank: {
    iconWrap: "bg-brand-500/15 ring-1 ring-inset ring-brand-500/25",
    icon: "text-brand-600 dark:text-brand-400",
    bar: "bg-brand-500/70",
  },
};

function variantOf(t: Toast): ToastVariant {
  if (t.type === "success" || t.type === "error" || t.type === "loading") {
    return t.type;
  }
  return "blank";
}

function ToastCard({ t }: { t: Toast }) {
  const variant = variantOf(t);
  const Icon = ICONS[variant];
  const accent = ACCENTS[variant];
  const showProgress = variant !== "loading" && t.duration !== Infinity;

  return (
    <div
      className={cn(
        "pointer-events-auto relative flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-xl border px-4 py-3 shadow-lg",
        "bg-white/95 border-[#ddd5c9] text-[#1c1411]",
        "dark:bg-[#1c1c1c]/85 dark:border-white/10 dark:text-[#f0f0f0] dark:shadow-2xl dark:backdrop-blur-xl"
      )}
      role={variant === "error" ? "alert" : "status"}
      style={{
        animation: t.visible
          ? "toast-enter 0.35s cubic-bezier(0.21, 1.02, 0.73, 1) both"
          : "toast-exit 0.3s cubic-bezier(0.06, 0.71, 0.55, 1) forwards",
      }}
    >
      <span
        className={cn(
          "mt-px flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          accent.iconWrap
        )}
      >
        {t.icon ? (
          <span className="text-base leading-none">{t.icon}</span>
        ) : (
          <Icon
            className={cn(
              "h-[18px] w-[18px]",
              accent.icon,
              variant === "loading" && "animate-spin"
            )}
            strokeWidth={2.25}
          />
        )}
      </span>

      <div className="flex-1 self-center text-sm font-medium leading-snug">
        {resolveValue(t.message, t)}
      </div>

      {variant !== "loading" && (
        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={() => toast.dismiss(t.id)}
          className={cn(
            "-mr-1 mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors",
            "text-[#776b5f] hover:bg-black/5 hover:text-[#1c1411]",
            "dark:text-white/45 dark:hover:bg-white/10 dark:hover:text-white"
          )}
        >
          <X className="h-4 w-4" strokeWidth={2.25} />
        </button>
      )}

      {showProgress && (
        <span
          aria-hidden
          className={cn(
            "absolute bottom-0 left-0 h-[3px] w-full origin-left rounded-full",
            accent.bar
          )}
          style={{
            animation: `toast-progress ${t.duration ?? 4000}ms linear forwards`,
          }}
        />
      )}
    </div>
  );
}

export function ToasterProvider() {
  return (
    <Toaster
      position="bottom-right"
      gutter={12}
      toastOptions={{
        duration: 4000,
        style: {
          background: "transparent",
          boxShadow: "none",
          padding: 0,
          margin: 0,
          maxWidth: "100%",
        },
      }}
    >
      {(t) => <ToastCard t={t} />}
    </Toaster>
  );
}
