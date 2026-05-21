"use client";

/**
 * LinkPreviewCard — modern rich preview that appears beneath an editor when
 * a user pastes or types a URL. Mirrors the platform's card aesthetic
 * (bordered, rounded, subtle hover) and supports a compact horizontal
 * layout. Fetches metadata from /api/community/link-preview the first time
 * it sees a URL and keeps an in-memory cache so repeated mentions don't
 * re-hit the network.
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ExternalLink, ImageOff, Link2, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PreviewData {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  favicon: string | null;
}

type Cached = { ok: true; data: PreviewData } | { ok: false };
const cache = new Map<string, Promise<Cached> | Cached>();

async function loadPreview(url: string): Promise<Cached> {
  const hit = cache.get(url);
  if (hit) return hit instanceof Promise ? hit : hit;
  const p = (async (): Promise<Cached> => {
    try {
      const res = await fetch(
        `/api/community/link-preview?url=${encodeURIComponent(url)}`,
      );
      if (!res.ok) return { ok: false };
      const data = (await res.json()) as PreviewData;
      const settled: Cached = { ok: true, data };
      cache.set(url, settled);
      return settled;
    } catch {
      const settled: Cached = { ok: false };
      cache.set(url, settled);
      return settled;
    }
  })();
  cache.set(url, p);
  return p;
}

function hostnameOf(u: string): string {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
}

interface Props {
  url: string;
  onDismiss?: () => void;
  className?: string;
  /** Compact horizontal layout — good for inline previews under inputs. */
  compact?: boolean;
}

export default function LinkPreviewCard({
  url,
  onDismiss,
  className,
  compact = true,
}: Props) {
  const [state, setState] = useState<Cached | null>(null);
  const [imgFailed, setImgFailed] = useState(false);
  const activeUrl = useRef(url);

  useEffect(() => {
    activeUrl.current = url;
    setState(null);
    setImgFailed(false);
    let cancelled = false;
    loadPreview(url).then((r) => {
      if (cancelled || activeUrl.current !== url) return;
      setState(r);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  // Skeleton state
  if (state === null) {
    return (
      <div
        className={cn(
          "group relative overflow-hidden rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm",
          compact ? "flex items-stretch" : "flex flex-col",
          className,
        )}
        aria-busy="true"
      >
        <div
          className={cn(
            "shrink-0 bg-secondary/60 animate-pulse",
            compact ? "w-24 sm:w-32" : "h-40 w-full",
          )}
        />
        <div className="flex-1 min-w-0 px-3.5 py-3 space-y-2">
          <div className="h-2.5 w-24 bg-secondary/70 rounded animate-pulse" />
          <div className="h-3.5 w-3/4 bg-secondary/70 rounded animate-pulse" />
          <div className="h-2.5 w-full bg-secondary/60 rounded animate-pulse" />
          <div className="h-2.5 w-2/3 bg-secondary/60 rounded animate-pulse" />
        </div>
        <div className="absolute top-2 right-2 flex items-center gap-1.5 text-[10px] text-muted-foreground/70">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span className="hidden sm:inline">Loading preview…</span>
        </div>
      </div>
    );
  }

  if (!state.ok) {
    return (
      <FallbackCard url={url} onDismiss={onDismiss} className={className} />
    );
  }

  const { data } = state;
  const host = hostnameOf(data.url);
  const showImage = !!data.image && !imgFailed;

  return (
    <Link
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group relative block overflow-hidden rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm",
        "transition-all duration-200 hover:border-[#d97757]/40 hover:bg-card hover:shadow-lg hover:shadow-black/20",
        compact ? "flex items-stretch" : "flex flex-col",
        className,
      )}
    >
      {/* Thumbnail */}
      <div
        className={cn(
          "relative shrink-0 overflow-hidden bg-gradient-to-br from-secondary/80 to-secondary/30",
          compact
            ? "w-24 sm:w-32 self-stretch border-r border-border/40"
            : "w-full aspect-[1.91/1] border-b border-border/40",
        )}
      >
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.image!}
            alt=""
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/40">
            {data.image && imgFailed ? (
              <ImageOff className="w-6 h-6" />
            ) : (
              <Link2 className="w-7 h-7" />
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0 px-3.5 py-3 pr-9">
        {/* Site name + favicon */}
        <div className="flex items-center gap-1.5 mb-1 text-[11px] text-muted-foreground/80">
          {data.favicon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.favicon}
              alt=""
              width={12}
              height={12}
              className="w-3 h-3 rounded-sm opacity-80"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          <span className="truncate font-medium uppercase tracking-wider text-[10px]">
            {data.siteName ?? host}
          </span>
          <ExternalLink className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100 group-hover:text-[#d97757] transition-colors flex-shrink-0" />
        </div>

        {/* Title */}
        <p
          className={cn(
            "font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-[#d97757] transition-colors",
            compact ? "text-sm" : "text-[15px]",
          )}
        >
          {data.title ?? host}
        </p>

        {/* Description */}
        {data.description && (
          <p
            className={cn(
              "mt-1 text-muted-foreground/85 leading-relaxed",
              compact
                ? "text-[12px] line-clamp-2"
                : "text-[13px] line-clamp-3",
            )}
          >
            {data.description}
          </p>
        )}

        {/* URL host pill */}
        <div className="mt-1.5 text-[10px] text-muted-foreground/55 truncate">
          {host}
        </div>
      </div>

      {/* Dismiss */}
      {onDismiss && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDismiss();
          }}
          aria-label="Remove preview"
          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-secondary/80 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Accent strip */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-[#d97757]/0 via-[#d97757]/40 to-[#d97757]/0 opacity-0 group-hover:opacity-100 transition-opacity"
      />
    </Link>
  );
}

function FallbackCard({
  url,
  onDismiss,
  className,
}: {
  url: string;
  onDismiss?: () => void;
  className?: string;
}) {
  const host = hostnameOf(url);
  return (
    <Link
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group relative flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm px-3.5 py-2.5 transition-colors hover:border-[#d97757]/40 hover:bg-card",
        className,
      )}
    >
      <div className="w-9 h-9 rounded-lg bg-secondary/70 flex items-center justify-center text-muted-foreground/70 flex-shrink-0">
        <Link2 className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate group-hover:text-[#d97757] transition-colors">
          {host}
        </p>
        <p className="text-[11px] text-muted-foreground/70 truncate">
          Preview unavailable — open link
        </p>
      </div>
      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-[#d97757] transition-colors flex-shrink-0" />
      {onDismiss && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDismiss();
          }}
          aria-label="Remove preview"
          className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-secondary/80 transition-colors flex-shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </Link>
  );
}
