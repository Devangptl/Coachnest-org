"use client";

import { useState } from "react";
import { ChevronDown, NotebookPen, PencilRuler, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import WhiteboardLauncher from "./WhiteboardLauncher";

type Mode = "personal" | "shared";

/**
 * Lesson-attached whiteboard with a "My notes" (private per-student) /
 * "Class board" (shared, instructor-owned) toggle. Collapsed by default and
 * lazy-mounted so the heavy canvas only loads when the learner opens it.
 */
export default function LessonWhiteboard({ lessonId }: { lessonId: string }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("personal");

  return (
    <div className="mt-5 sm:mt-6 rounded-md border border-border overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-4 py-3 bg-card hover:bg-secondary/60 transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-orange-500/15 border border-[#d97757]/20 flex items-center justify-center">
          <PencilRuler className="w-4 h-4 text-[#d97757]" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold">Whiteboard</p>
          <p className="text-[11px] text-muted-foreground">
            Sketch ideas privately or work together on the class board.
          </p>
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="border-t border-border p-3 sm:p-4 space-y-3">
          <div className="inline-flex rounded-lg border border-border bg-secondary p-0.5 text-xs">
            <ModeBtn active={mode === "personal"} onClick={() => setMode("personal")} icon={NotebookPen} label="My notes" />
            <ModeBtn active={mode === "shared"} onClick={() => setMode("shared")} icon={Users} label="Class board" />
          </div>

          {/* key forces a fresh resolve/embed when switching modes */}
          <WhiteboardLauncher
            key={mode}
            resolveUrl={`/api/lessons/${lessonId}/whiteboard?mode=${mode}`}
            heightClass="h-[55vh] sm:h-[65vh] min-h-[380px]"
          />
        </div>
      )}
    </div>
  );
}

function ModeBtn({
  active,
  onClick,
  icon: Icon,
  label,
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
        "flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors",
        active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );
}
