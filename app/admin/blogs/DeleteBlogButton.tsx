"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { useConfirm } from "@/components/ui/UIDialogProvider";

export default function DeleteBlogButton({ blogId }: { blogId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const confirm = useConfirm();

  async function handleDelete() {
    if (!await confirm("Delete this blog post? This cannot be undone.", { title: "Delete Blog Post", confirmText: "Delete" })) return;
    setLoading(true);

    try {
      await fetch(`/api/blogs/${blogId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-xs text-red-400/70 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10 inline-flex items-center gap-1"
    >
      {loading ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <Trash2 className="w-3 h-3" />
      )}
      <span className="hidden md:inline">Delete</span>
    </button>
  );
}
