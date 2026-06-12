"use client";

/**
 * useFeatureCatalog
 * Client hook for the public add-on catalog (GET /api/features).
 * Used by purchase gates to show live names, descriptions and prices
 * instead of hardcoded copy — admins set these in /admin/add-ons.
 */

import { useState, useEffect } from "react";

export interface CatalogFeature {
  id:          string;
  name:        string;
  slug:        string;
  description: string | null;
  price:       number;
  hasAccess:   boolean;
}

interface CatalogState {
  isLoading: boolean;
  features:  CatalogFeature[];
}

// Module-level cache shared across all hook instances
let _cache: CatalogFeature[] | null = null;
let _cacheTs = 0;
let _inflight: Promise<CatalogFeature[]> | null = null;
const CACHE_TTL = 60_000; // 1 minute

async function fetchCatalog(): Promise<CatalogFeature[]> {
  const res = await fetch("/api/features");
  if (!res.ok) throw new Error("Failed to load add-on catalog");
  const data = await res.json();
  const features: CatalogFeature[] = (data.features ?? []).map(
    (f: CatalogFeature & { price: string | number }) => ({ ...f, price: Number(f.price) })
  );
  _cache   = features;
  _cacheTs = Date.now();
  return features;
}

export function useFeatureCatalog() {
  const [state, setState] = useState<CatalogState>(
    _cache ? { isLoading: false, features: _cache } : { isLoading: true, features: [] }
  );

  useEffect(() => {
    if (_cache && Date.now() - _cacheTs < CACHE_TTL) {
      setState({ isLoading: false, features: _cache });
      return;
    }

    let cancelled = false;
    _inflight ??= fetchCatalog().finally(() => { _inflight = null; });
    _inflight
      .then((features) => { if (!cancelled) setState({ isLoading: false, features }); })
      .catch(() => { if (!cancelled) setState((s) => ({ ...s, isLoading: false })); });

    return () => { cancelled = true; };
  }, []);

  return state;
}

/** Convenience: a single feature from the catalog (or null while loading / if missing). */
export function useFeatureInfo(slug: string): CatalogFeature | null {
  const { features } = useFeatureCatalog();
  return features.find((f) => f.slug === slug) ?? null;
}
