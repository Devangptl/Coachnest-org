"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowDown, ArrowUp, X, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/UIDialogProvider";

export default function CoursesTab({ cls }: { cls: any }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const confirm = useConfirm();

  async function reorder(index: number, dir: -1 | 1) {
    const next = [...cls.courses];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setBusy(true);
    try {
      await fetch(`/api/classes/${cls.id}/courses`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courses: next.map((c: any, i: number) => ({ classCourseId: c.id, order: i })),
        }),
      });
      router.refresh();
    } catch {
      toast.error("Failed to reorder");
    } finally {
      setBusy(false);
    }
  }

  async function remove(classCourseId: string) {
    const ok = await confirm("Remove this course from the class? Student progress in this course will not be affected.", {
      title: "Remove course",
      confirmText: "Remove",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/classes/${cls.id}/courses/${classCourseId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("Course removed");
      router.refresh();
    } catch {
      toast.error("Failed to remove");
    } finally {
      setBusy(false);
    }
  }

  if (cls.courses.length === 0) {
    return (
      <>
        <div className="glass p-10 rounded-xl text-center">
          <BookOpen className="w-12 h-12 text-amber-400/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No courses in this class yet.</p>
        </div>
      </>
    );
  }

  return (
    <>
    <div className="space-y-2">
      {cls.courses.map((cc: any, i: number) => (
        <div key={cc.id} className="glass p-3 rounded-lg flex items-center gap-3">
          <span className="text-sm font-bold text-amber-400 w-6 text-center">{i + 1}</span>
          {cc.course.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cc.course.thumbnail} alt="" className="w-12 h-12 rounded object-cover" />
          ) : (
            <div className="w-12 h-12 rounded bg-secondary flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{cc.course.title}</div>
            <div className="text-xs text-muted-foreground">
              {cc.course.totalLessons} lessons · {cc.isRequired ? "Required" : "Optional"}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" disabled={busy || i === 0} onClick={() => reorder(i, -1)}>
              <ArrowUp className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" disabled={busy || i === cls.courses.length - 1} onClick={() => reorder(i, 1)}>
              <ArrowDown className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" disabled={busy} onClick={() => remove(cc.id)}>
              <X className="w-4 h-4 text-red-400" />
            </Button>
          </div>
        </div>
      ))}
    </div>
    </>
  );
}
