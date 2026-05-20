"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  X, BookOpen, MessageCircle, PlayCircle, FileText, HelpCircle,
  Clock, ChevronRight, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import VideoLessonPlayer from "@/components/VideoLessonPlayer";
import ClassChatPanel from "./ClassChatPanel";
import toast from "react-hot-toast";

type Lesson = {
  id: string;
  title: string;
  type: "TEXT" | "VIDEO" | "QUIZ";
  content: string | null;
  duration: number | null;
  isFree: boolean;
};

const typeIcon = { VIDEO: PlayCircle, TEXT: FileText, QUIZ: HelpCircle } as const;

export default function CourseReaderPanel({
  classId,
  enableChat,
  course,
  onClose,
}: {
  classId: string;
  enableChat: boolean;
  course: { courseId: string; title: string };
  onClose: () => void;
}) {
  const [view, setView] = useState<"course" | "chat">("course");
  const [lessons, setLessons] = useState<Lesson[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState(false);

  // Close on Escape + lock background scroll while open
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setLessons(null);
    setError(false);
    setActiveId(null);
    fetch(`/api/courses/${course.courseId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (cancelled) return;
        const ls: Lesson[] = d.course?.lessons ?? [];
        setLessons(ls);
        setActiveId(ls[0]?.id ?? null);
      })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [course.courseId]);

  const active = lessons?.find((l) => l.id === activeId) ?? null;
  const activeIndex = lessons?.findIndex((l) => l.id === activeId) ?? -1;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${course.title} reader`}
        className="relative h-full w-full sm:max-w-3xl bg-background border-l border-border flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <BookOpen className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Reading</div>
            <h2 className="font-semibold text-sm truncate">{course.title}</h2>
          </div>
          <Link
            href={`/courses/${course.courseId}`}
            className="text-xs text-amber-400 hover:underline hidden sm:flex items-center gap-1"
          >
            Open full course <ExternalLink className="w-3 h-3" />
          </Link>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        {enableChat && (
          <div className="flex border-b border-border px-2">
            <TabBtn active={view === "course"} onClick={() => setView("course")} icon={BookOpen} label="Course" />
            <TabBtn active={view === "chat"} onClick={() => setView("chat")} icon={MessageCircle} label="Live chat" />
          </div>
        )}

        {/* Body */}
        {view === "chat" && enableChat ? (
          <div className="flex-1 min-h-0 p-4">
            <ClassChatPanel classId={classId} heightClass="h-full" />
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col md:flex-row">
            {/* Lesson list */}
            <aside className="md:w-60 shrink-0 border-b md:border-b-0 md:border-r border-border overflow-x-auto md:overflow-y-auto">
              {error ? (
                <p className="p-4 text-sm text-muted-foreground">Couldn&apos;t load lessons.</p>
              ) : !lessons ? (
                <div className="p-3 space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="skeleton h-9 rounded-lg" />
                  ))}
                </div>
              ) : lessons.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No lessons yet.</p>
              ) : (
                <nav className="flex md:flex-col gap-1 p-2">
                  {lessons.map((l, i) => {
                    const Icon = typeIcon[l.type] ?? FileText;
                    const isActive = l.id === activeId;
                    return (
                      <button
                        key={l.id}
                        onClick={() => setActiveId(l.id)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm whitespace-nowrap md:whitespace-normal transition-all shrink-0 md:shrink",
                          isActive
                            ? "bg-amber-500/10 text-foreground border border-amber-400/20"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent",
                        )}
                      >
                        <Icon className="w-4 h-4 shrink-0 text-amber-400/70" />
                        <span className="flex-1 min-w-0 md:truncate">
                          <span className="text-[10px] text-muted-foreground/60 mr-1">{i + 1}.</span>
                          {l.title}
                        </span>
                      </button>
                    );
                  })}
                </nav>
              )}
            </aside>

            {/* Lesson content */}
            <main className="flex-1 min-w-0 overflow-y-auto">
              {!active ? (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  {error ? "Something went wrong." : lessons && lessons.length === 0 ? "Nothing to read here yet." : "Select a lesson"}
                </div>
              ) : (
                <article className="p-4 sm:p-6">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <span>Lesson {activeIndex + 1} of {lessons?.length}</span>
                    {active.duration ? (
                      <span className="flex items-center gap-1">
                        <span className="text-muted-foreground/40">·</span>
                        <Clock className="w-3 h-3" /> {active.duration} min
                      </span>
                    ) : null}
                  </div>
                  <h3 className="text-xl font-bold mb-4">{active.title}</h3>

                  {active.type === "QUIZ" ? (
                    <div className="glass rounded-xl p-6 text-center">
                      <HelpCircle className="w-10 h-10 text-amber-400/50 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground mb-4">
                        This is a quiz. Open the full course to take it.
                      </p>
                      <Link
                        href={`/courses/${course.courseId}/lessons/${active.id}`}
                        className="inline-flex items-center gap-1.5 btn-primary px-4 py-2 rounded-lg text-sm"
                      >
                        Go to quiz <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  ) : active.type === "VIDEO" && active.content ? (
                    <div className="rounded-xl overflow-hidden border border-border">
                      <VideoLessonPlayer url={active.content} alreadyCompleted onComplete={() => {}} />
                    </div>
                  ) : active.content ? (
                    <div
                      className="select-none"
                      onCopy={(e) => {
                        e.preventDefault();
                        toast("Content is protected.", { duration: 2000 });
                      }}
                      onContextMenu={(e) => e.preventDefault()}
                    >
                      <MarkdownRenderer content={active.content} />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No content added yet.</p>
                  )}
                </article>
              )}
            </main>
          </div>
        )}
      </div>
    </div>
  );
}

function TabBtn({
  active, onClick, icon: Icon, label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
        active
          ? "text-amber-400 border-amber-400"
          : "text-muted-foreground border-transparent hover:text-foreground",
      )}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}
