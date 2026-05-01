/**
 * DeleteCourseButton — Client Component.
 * Shows a confirmation dialog before calling the DELETE API.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { useConfirm } from "@/components/ui/UIDialogProvider";

export default function DeleteCourseButton({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const confirm = useConfirm();

  async function handleDelete() {
    if (!await confirm("Delete this course? This cannot be undone.", { title: "Delete Course", confirmText: "Delete" })) return;
    setLoading(true);

    try {
      await fetch(`/api/courses/${courseId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      title="Delete"
      className="p-2 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Trash2 className="w-4 h-4" />
      )}
    </button>
  );
}
