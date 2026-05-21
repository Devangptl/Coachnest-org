"use client";

/**
 * useLinkPreview — extracts the first plausible http(s) URL from a text
 * buffer (debounced) and exposes it as the "active" preview URL. Users
 * can dismiss a URL; dismissed URLs stay suppressed until the text
 * changes enough that they no longer appear (i.e. the user removed
 * them), so re-typing the same URL never re-shows a dismissed card.
 */
import { useEffect, useMemo, useRef, useState } from "react";

// Permissive http(s) URL detector. Excludes trailing punctuation that's
// almost certainly not part of the URL (.,;:!?)) and stops at whitespace.
const URL_RE = /\bhttps?:\/\/[^\s<>"'`]+/gi;

function stripTrailingPunct(u: string): string {
  return u.replace(/[).,;:!?"'`\]]+$/g, "");
}

function extractUrls(text: string): string[] {
  if (!text) return [];
  const out = new Set<string>();
  for (const match of text.match(URL_RE) ?? []) {
    const cleaned = stripTrailingPunct(match);
    try {
      // Validate by constructing — drop anything that doesn't parse.
      const u = new URL(cleaned);
      if (u.protocol === "http:" || u.protocol === "https:") out.add(u.toString());
    } catch {
      /* ignore */
    }
  }
  return [...out];
}

interface Options {
  /** How long to wait after the last keystroke before resolving the URL. */
  debounceMs?: number;
}

export function useLinkPreview(text: string, opts: Options = {}) {
  const { debounceMs = 350 } = opts;
  const [debounced, setDebounced] = useState(text);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const dismissedRef = useRef(dismissed);
  dismissedRef.current = dismissed;

  useEffect(() => {
    const t = setTimeout(() => setDebounced(text), debounceMs);
    return () => clearTimeout(t);
  }, [text, debounceMs]);

  // Prune dismissed entries that are no longer in the text — keeps the
  // set small and means an old dismissal won't re-suppress a different
  // future paste of the same URL.
  const urls = useMemo(() => extractUrls(debounced), [debounced]);
  useEffect(() => {
    if (dismissedRef.current.size === 0) return;
    const present = new Set(urls);
    let changed = false;
    const next = new Set<string>();
    for (const d of dismissedRef.current) {
      if (present.has(d)) next.add(d);
      else changed = true;
    }
    if (changed) setDismissed(next);
  }, [urls]);

  const activeUrl = useMemo(
    () => urls.find((u) => !dismissed.has(u)) ?? null,
    [urls, dismissed],
  );

  function dismiss(url: string) {
    setDismissed((s) => {
      if (s.has(url)) return s;
      const next = new Set(s);
      next.add(url);
      return next;
    });
  }

  function reset() {
    setDismissed(new Set());
  }

  return { activeUrl, dismiss, reset };
}
