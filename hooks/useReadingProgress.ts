"use client";

/**
 * useReadingProgress — tracks scroll depth + active reading time for text lessons.
 *
 * Completion criteria:
 *   • Scroll depth  >= SCROLL_THRESHOLD (90 %)
 *   • Active time   >= TIME_THRESHOLD   (60 s)
 *
 * "Active time" pauses automatically when:
 *   • The browser tab is hidden (visibilitychange)
 *   • The window loses focus (blur / focus)
 *
 * onComplete() is called exactly once when both conditions are met.
 */

import { useEffect, useRef, useState, useCallback } from "react";

export const SCROLL_THRESHOLD = 90;  // %
export const TIME_THRESHOLD   = 60;  // seconds

interface Options {
  isEnrolled:       boolean;
  alreadyCompleted: boolean;
  onComplete:       () => void;
}

export function useReadingProgress({ isEnrolled, alreadyCompleted, onComplete }: Options) {
  const [scrollPct,  setScrollPct]  = useState(0);
  const [activeSecs, setActiveSecs] = useState(0);

  const completedRef = useRef(alreadyCompleted);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; });

  // ── Active time tracker ───────────────────────────────────────────────────
  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const startTimer = useCallback(() => {
    if (timerRef.current || completedRef.current) return;
    timerRef.current = setInterval(() => {
      setActiveSecs((s) => s + 1);
    }, 1000);
  }, []);

  useEffect(() => {
    if (!isEnrolled || alreadyCompleted) return;

    if (!document.hidden) startTimer();

    const onViz   = () => (document.hidden ? stopTimer() : startTimer());
    const onBlur  = () => stopTimer();
    const onFocus = () => startTimer();

    document.addEventListener("visibilitychange", onViz);
    window.addEventListener("blur",  onBlur);
    window.addEventListener("focus", onFocus);

    return () => {
      stopTimer();
      document.removeEventListener("visibilitychange", onViz);
      window.removeEventListener("blur",  onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, [isEnrolled, alreadyCompleted, startTimer, stopTimer]);

  // ── Scroll depth tracker ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isEnrolled || alreadyCompleted) return;

    const measure = () => {
      const el  = document.documentElement;
      const pct =
        el.scrollHeight <= el.clientHeight
          ? 100
          : Math.min(100, Math.round(((el.scrollTop + el.clientHeight) / el.scrollHeight) * 100));
      setScrollPct((prev) => Math.max(prev, pct));
    };

    window.addEventListener("scroll", measure, { passive: true });
    measure(); // Capture initial position (short articles may already be 100%)

    return () => window.removeEventListener("scroll", measure);
  }, [isEnrolled, alreadyCompleted]);

  // ── Completion gate ───────────────────────────────────────────────────────
  useEffect(() => {
    if (completedRef.current) return;
    if (scrollPct >= SCROLL_THRESHOLD && activeSecs >= TIME_THRESHOLD) {
      completedRef.current = true;
      stopTimer();
      onCompleteRef.current();
    }
  }, [scrollPct, activeSecs, stopTimer]);

  return {
    scrollPct,
    activeSecs,
    scrollDone: scrollPct  >= SCROLL_THRESHOLD,
    timeDone:   activeSecs >= TIME_THRESHOLD,
  };
}
