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
 * Persistence strategy (so closing/reopening the tab resumes the timer):
 *   • localStorage — written every tick, read on mount → instant resume.
 *   • Database     — synced every DB_SYNC_INTERVAL seconds, on tab-hide via
 *                    sendBeacon, and on completion. The DB value is fetched on
 *                    mount and merged (max) with localStorage so progress
 *                    survives across devices / a cleared browser.
 *
 * onComplete() is called exactly once when both conditions are met.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { fetchSavedWatchedSecs, syncWatchedSecsToServer } from "@/lib/lessonProgressSync";

export const SCROLL_THRESHOLD = 90;  // %
export const TIME_THRESHOLD   = 60;  // seconds

const DB_SYNC_INTERVAL = 15;         // seconds between background DB writes
const STORAGE_PREFIX = "lh:readProgress:";
const storageKey = (lessonId: string) => `${STORAGE_PREFIX}${lessonId}`;

interface PersistedProgress { activeSecs: number; scrollPct: number }

function loadPersisted(lessonId: string): PersistedProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(lessonId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedProgress>;
    return {
      activeSecs: Math.max(0, Number(parsed.activeSecs) || 0),
      scrollPct:  Math.min(100, Math.max(0, Number(parsed.scrollPct) || 0)),
    };
  } catch {
    return null;
  }
}

function savePersisted(lessonId: string, data: PersistedProgress) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(lessonId), JSON.stringify(data));
  } catch {
    // Storage quota or disabled — silently ignore.
  }
}

function clearPersisted(lessonId: string) {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(storageKey(lessonId)); } catch {}
}

interface Options {
  lessonId:         string;
  isEnrolled:       boolean;
  alreadyCompleted: boolean;
  onComplete:       () => void;
}

export function useReadingProgress({ lessonId, isEnrolled, alreadyCompleted, onComplete }: Options) {
  // Hydrate from localStorage on first render so resumes are instant.
  const initial = useRef<PersistedProgress | null>(null);
  if (initial.current === null) {
    initial.current = (!alreadyCompleted && loadPersisted(lessonId)) || { activeSecs: 0, scrollPct: 0 };
  }

  const [scrollPct,  setScrollPct]  = useState(initial.current.scrollPct);
  const [activeSecs, setActiveSecs] = useState(initial.current.activeSecs);

  const completedRef = useRef(alreadyCompleted);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; });

  // If the lesson is already completed (e.g. server flips it), drop any saved progress.
  useEffect(() => {
    if (alreadyCompleted) {
      completedRef.current = true;
      clearPersisted(lessonId);
    }
  }, [alreadyCompleted, lessonId]);

  // ── Active time tracker ───────────────────────────────────────────────────
  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const startTimer = useCallback(() => {
    if (timerRef.current || completedRef.current) return;
    timerRef.current = setInterval(() => {
      setActiveSecs((s) => {
        const next = s + 1;
        // Persist every tick so a tab close at second 30 resumes at 30.
        savePersisted(lessonId, { activeSecs: next, scrollPct: scrollPctRef.current });
        return next;
      });
    }, 1000);
  }, [lessonId]);

  // Mirror latest values in refs so the timer tick / scroll handler can persist
  // them without re-binding on every change.
  const scrollPctRef  = useRef(scrollPct);
  const activeSecsRef = useRef(activeSecs);
  useEffect(() => { scrollPctRef.current  = scrollPct;  }, [scrollPct]);
  useEffect(() => { activeSecsRef.current = activeSecs; }, [activeSecs]);

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
      setScrollPct((prev) => {
        const next = Math.max(prev, pct);
        if (next !== prev) {
          savePersisted(lessonId, { activeSecs: activeSecsRef.current, scrollPct: next });
        }
        return next;
      });
    };

    window.addEventListener("scroll", measure, { passive: true });
    measure(); // Capture initial position (short articles may already be 100%)

    return () => window.removeEventListener("scroll", measure);
  }, [isEnrolled, alreadyCompleted, lessonId]);

  // ── Hydrate from DB on mount ──────────────────────────────────────────────
  // localStorage gives us an instant resume; the DB read catches the case where
  // the user is on a new device or cleared their browser data.
  useEffect(() => {
    if (!isEnrolled || alreadyCompleted) return;
    let cancelled = false;
    fetchSavedWatchedSecs(lessonId).then((data) => {
      if (cancelled || !data) return;
      if (data.watchedSecs > activeSecsRef.current) {
        setActiveSecs(data.watchedSecs);
        savePersisted(lessonId, { activeSecs: data.watchedSecs, scrollPct: scrollPctRef.current });
      }
    });
    return () => { cancelled = true; };
  }, [lessonId, isEnrolled, alreadyCompleted]);

  // ── Periodic DB sync + flush on tab hide ──────────────────────────────────
  useEffect(() => {
    if (!isEnrolled || alreadyCompleted) return;

    const lastSyncedRef = { current: activeSecsRef.current };

    const syncIfDirty = (beacon = false) => {
      const current = activeSecsRef.current;
      if (current > lastSyncedRef.current) {
        syncWatchedSecsToServer(lessonId, current, { beacon });
        lastSyncedRef.current = current;
      }
    };

    const interval = setInterval(() => syncIfDirty(false), DB_SYNC_INTERVAL * 1000);
    const onHide = () => { if (document.hidden) syncIfDirty(true); };
    const onPageHide = () => syncIfDirty(true);

    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
      syncIfDirty(true);
    };
  }, [lessonId, isEnrolled, alreadyCompleted]);

  // ── Completion gate ───────────────────────────────────────────────────────
  useEffect(() => {
    if (completedRef.current) return;
    if (scrollPct >= SCROLL_THRESHOLD && activeSecs >= TIME_THRESHOLD) {
      completedRef.current = true;
      stopTimer();
      // Final DB sync of the exact second count before clearing local state.
      syncWatchedSecsToServer(lessonId, activeSecs);
      clearPersisted(lessonId);
      onCompleteRef.current();
    }
  }, [scrollPct, activeSecs, stopTimer, lessonId]);

  return {
    scrollPct,
    activeSecs,
    scrollDone: scrollPct  >= SCROLL_THRESHOLD,
    timeDone:   activeSecs >= TIME_THRESHOLD,
  };
}
