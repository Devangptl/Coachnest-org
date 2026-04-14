"use client";

/**
 * usePurchasedFeatures
 * Client hook for student purchase-based access.
 * Reads from GET /api/subscriptions/status which returns
 * { accessModel: "purchase", purchasedFeatureSlugs, ownedFeatures, ... } for students.
 *
 * For instructor / admin sessions the hook still works but returns empty features
 * (they always have implicit access via role — use hasFeatureAccess server-side for those).
 */

import { useState, useEffect, useCallback, useRef } from "react";

export interface OwnedFeature {
  slug:        string;
  name:        string;
  purchasedAt: string;
}

export interface PurchaseState {
  isLoading:             boolean;
  error:                 string | null;
  accessModel:           "purchase" | "subscription" | null;
  purchasedFeatureSlugs: string[];
  ownedFeatures:         OwnedFeature[];
  purchasedCourseCount:  number;
  hasCommunityAccess:    boolean;
}

// Module-level cache shared across all hook instances
let _cache: PurchaseState | null = null;
let _cacheTs = 0;
const CACHE_TTL = 60_000; // 1 minute

const DEFAULT: PurchaseState = {
  isLoading:             true,
  error:                 null,
  accessModel:           null,
  purchasedFeatureSlugs: [],
  ownedFeatures:         [],
  purchasedCourseCount:  0,
  hasCommunityAccess:    false,
};

export function usePurchasedFeatures() {
  const [state, setState] = useState<PurchaseState>(
    _cache ? { ..._cache, isLoading: false } : DEFAULT
  );
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async (bust = false) => {
    const now = Date.now();
    if (!bust && _cache && now - _cacheTs < CACHE_TTL) {
      setState({ ..._cache, isLoading: false });
      return;
    }

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setState((s) => ({ ...s, isLoading: true, error: null }));

    try {
      const res = await globalThis.fetch("/api/subscriptions/status", { signal: ctrl.signal });
      if (!res.ok) throw new Error("Failed to load access info");

      const data = await res.json();

      // Handle both student (purchase) and instructor/admin (subscription) responses
      const slugs: string[] = data.purchasedFeatureSlugs ?? [];
      const features: OwnedFeature[] = data.ownedFeatures ?? [];

      const next: PurchaseState = {
        isLoading:             false,
        error:                 null,
        accessModel:           data.accessModel ?? "purchase",
        purchasedFeatureSlugs: slugs,
        ownedFeatures:         features,
        purchasedCourseCount:  data.purchasedCourseCount ?? 0,
        hasCommunityAccess:    slugs.includes("community"),
      };

      _cache   = next;
      _cacheTs = Date.now();
      setState(next);
    } catch (err: unknown) {
      if ((err as Error).name === "AbortError") return;
      setState((s) => ({ ...s, isLoading: false, error: "Could not load access info" }));
    }
  }, []);

  useEffect(() => {
    load();
    return () => { abortRef.current?.abort(); };
  }, [load]);

  const refresh = useCallback(() => {
    _cache   = null;
    _cacheTs = 0;
    load(true);
  }, [load]);

  return { ...state, refresh };
}
