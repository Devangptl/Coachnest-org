"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useConfirm } from "@/components/ui/UIDialogProvider";

export default function DeleteInstructorCourseButton({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const confirm = useConfirm();

  async function handleDelete() {
    if (!await confirm("Delete this course? This action cannot be undone.", { title: "Delete Course", confirmText: "Delete" })) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/instructor/courses/${courseId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Course deleted.");
        router.refresh();
      } else {
        const data = await res.json();
        toast.error(data.error ?? "Delete failed.");
      }
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      title="Delete"
      className="p-2 rounded-lg text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
    </button>
  );
}
