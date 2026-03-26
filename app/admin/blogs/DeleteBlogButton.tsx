"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";

export default function DeleteBlogButton({ blogId }: { blogId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this blog post? This cannot be undone.")) return;
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
      className="text-xs text-red-400/70 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10 flex items-center gap-1"
    >
      {loading ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <Trash2 className="w-3 h-3" />
      )}
      Delete
    </button>
  );
}
