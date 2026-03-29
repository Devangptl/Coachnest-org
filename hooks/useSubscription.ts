"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { PlanAccess } from "@/services/subscription.service";

interface SubscriptionState {
  planAccess: PlanAccess | null;
  isLoading: boolean;
  error: string | null;
}

const DEFAULT_ACCESS: PlanAccess = {
  isActive: false,
  isPaid: false,
  plan: "FREE",
  status: null,
  endDate: null,
  cancelledAt: null,
  trialEndsAt: null,
  enrollmentLimit: null,
  enrolledCount: 0,
  limitReached: false,
  canAccessPaidCourses: false,
  canAccessProCourses: false,
  hasCertificates: false,
  hasOfflineDownloads: false,
  hasAiRecommendations: false,
  hasInstructorQA: false,
  hasTeamManagement: false,
};

// Module-level cache so multiple component instances share one fetch
let cachedAccess: PlanAccess | null = null;
let cacheTs = 0;
const CACHE_TTL = 60_000; // 1 minute

export function useSubscription() {
  const [state, setState] = useState<SubscriptionState>({
    planAccess: cachedAccess,
    isLoading: !cachedAccess,
    error: null,
  });

  const abortRef = useRef<AbortController | null>(null);

  const fetch_ = useCallback(async (bust = false) => {
    const now = Date.now();
    if (!bust && cachedAccess && now - cacheTs < CACHE_TTL) {
      setState({ planAccess: cachedAccess, isLoading: false, error: null });
      return;
    }

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setState((s) => ({ ...s, isLoading: true, error: null }));

    try {
      const res = await globalThis.fetch("/api/subscriptions/status", { signal: ctrl.signal });
      if (!res.ok) throw new Error("Failed to fetch subscription");
      const data = await res.json();
      const access: PlanAccess = data.planAccess ?? DEFAULT_ACCESS;
      cachedAccess = access;
      cacheTs = Date.now();
      setState({ planAccess: access, isLoading: false, error: null });
    } catch (err: unknown) {
      if ((err as Error).name === "AbortError") return;
      setState({ planAccess: DEFAULT_ACCESS, isLoading: false, error: "Could not load plan info" });
    }
  }, []);

  useEffect(() => {
    fetch_();
    return () => { abortRef.current?.abort(); };
  }, [fetch_]);

  const refresh = useCallback(() => fetch_(true), [fetch_]);

  const planAccess = state.planAccess ?? DEFAULT_ACCESS;

  return {
    planAccess,
    isLoading: state.isLoading,
    error: state.error,
    refresh,
    // Convenience shortcuts
    plan: planAccess.plan,
    isActive: planAccess.isActive,
    isPaid: planAccess.isPaid,
    canAccessPaidCourses: planAccess.canAccessPaidCourses,
    canAccessProCourses: planAccess.canAccessProCourses,
    hasCertificates: planAccess.hasCertificates,
    hasOfflineDownloads: planAccess.hasOfflineDownloads,
    hasAiRecommendations: planAccess.hasAiRecommendations,
    hasInstructorQA: planAccess.hasInstructorQA,
    hasTeamManagement: planAccess.hasTeamManagement,
  };
}
