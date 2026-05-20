"use client";

import { useState } from "react";
import { BookOpen, ChevronRight } from "lucide-react";
import CourseReaderPanel from "./CourseReaderPanel";

type CourseItem = {
  courseId: string;
  title: string;
  thumbnail: string | null;
  totalLessons: number;
  isRequired: boolean;
};

export default function ClassCourseList({
  courses,
  classId,
  enableChat,
  isMember,
}: {
  courses: CourseItem[];
  classId: string;
  enableChat: boolean;
  isMember: boolean;
}) {
  const [open, setOpen] = useState<CourseItem | null>(null);

  return (
    <div className="glass p-5 rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">What you&apos;ll learn</h2>
        {isMember && courses.length > 0 && (
          <span className="text-xs text-muted-foreground">Click a course to read</span>
        )}
      </div>

      {courses.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          The instructor hasn&apos;t added any courses yet.
        </p>
      ) : (
        <div className="space-y-2">
          {courses.map((cc, i) => {
            const inner = (
              <>
                <span className="text-sm font-bold text-amber-400 w-6">{i + 1}</span>
                {cc.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cc.thumbnail} alt="" className="w-12 h-12 rounded object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded bg-secondary flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{cc.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {cc.totalLessons} lessons · {cc.isRequired ? "Required" : "Optional"}
                  </div>
                </div>
              </>
            );

            return isMember ? (
              <button
                key={cc.courseId}
                onClick={() => setOpen(cc)}
                className="w-full flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg border-b border-border last:border-0 text-left hover:bg-secondary transition-colors group"
              >
                {inner}
                <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </button>
            ) : (
              <div
                key={cc.courseId}
                className="flex items-center gap-3 py-2 border-b border-border last:border-0"
              >
                {inner}
              </div>
            );
          })}
        </div>
      )}

      {open && (
        <CourseReaderPanel
          classId={classId}
          enableChat={enableChat}
          course={{ courseId: open.courseId, title: open.title }}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}
