"use client";

/**
 * LessonProvider — shared context for lesson access state.
 * Fetched ONCE per course visit and shared between sidebar + content.
 * Avoids duplicate API calls and re-fetching on lesson navigation.
 */
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";

interface LessonContextType {
  isEnrolled: boolean;
  loading: boolean;
  completedCount: number;
  isCompleted: (lessonId: string) => boolean;
  markComplete: (lessonId: string, value: boolean) => Promise<void>;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
}

const LessonContext = createContext<LessonContextType>({
  isEnrolled: false,
  loading: true,
  completedCount: 0,
  isCompleted: () => false,
  markComplete: async () => {},
  mobileSidebarOpen: false,
  setMobileSidebarOpen: () => {},
});

export function useLessonContext() {
  return useContext(LessonContext);
}

interface Props {
  courseId: string;
  children: React.ReactNode;
}

export function LessonProvider({ courseId, children }: Props) {
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [serverCompleted, setServerCompleted] = useState<Set<string>>(new Set());
  const [localOverrides, setLocalOverrides] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Fetch once per course — not per lesson
  useEffect(() => {
    fetch(`/api/me/course-access/${courseId}`)
      .then((r) => r.json())
      .then((data) => {
        setIsEnrolled(data.isEnrolled ?? false);
        setServerCompleted(new Set(data.completedLessonIds ?? []));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [courseId]);

  const completedCount = useMemo(() => {
    const ids = new Set(serverCompleted);
    for (const [lessonId, done] of Object.entries(localOverrides)) {
      if (done) ids.add(lessonId);
      else ids.delete(lessonId);
    }
    return ids.size;
  }, [serverCompleted, localOverrides]);

  const isCompleted = useCallback(
    (lessonId: string) => {
      if (lessonId in localOverrides) return localOverrides[lessonId];
      return serverCompleted.has(lessonId);
    },
    [serverCompleted, localOverrides]
  );

  const markComplete = useCallback(
    async (lessonId: string, value: boolean) => {
      // Optimistic update
      setLocalOverrides((prev) => ({ ...prev, [lessonId]: value }));
      try {
        await fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lessonId, completed: value }),
        });
      } catch {
        // Revert on error
        setLocalOverrides((prev) => ({ ...prev, [lessonId]: !value }));
      }
    },
    []
  );

  return (
    <LessonContext.Provider
      value={{ isEnrolled, loading, completedCount, isCompleted, markComplete, mobileSidebarOpen, setMobileSidebarOpen }}
    >
      {children}
    </LessonContext.Provider>
  );
}
