"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Trash2, MoreHorizontal } from "lucide-react";
import toast from "react-hot-toast";
import { useConfirm } from "@/components/ui/UIDialogProvider";

export default function EmailTemplateActions({ templateId }: { templateId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const confirm = useConfirm();

  const handleDelete = async () => {
    if (!await confirm("Delete this template? This cannot be undone.", { title: "Delete Template", confirmText: "Delete" })) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/email-templates/${templateId}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error || "Failed to delete template.");
        return;
      }
      toast.success("Template deleted.");
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setDeleting(false);
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 w-36 bg-card border border-border rounded-lg shadow-xl py-1 text-sm">
            <Link
              href={`/admin/email-templates/${templateId}`}
              className="flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              onClick={() => setOpen(false)}
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
