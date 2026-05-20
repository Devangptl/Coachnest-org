"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DatabaseZap } from "lucide-react";
import toast from "react-hot-toast";
import { useConfirm } from "@/components/ui/UIDialogProvider";

export default function SeedEmailTemplatesButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const confirm = useConfirm();

  const handleSeed = async () => {
    if (!await confirm(
      "Existing templates will be overwritten with the default content.",
      { title: "Seed 24 default email templates?", confirmText: "Seed Templates", variant: "info" }
    )) return;

    setLoading(true);
    const tid = toast.loading("Seeding email templates…");

    try {
      const res = await fetch("/api/admin/email-templates/seed", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to seed templates.", { id: tid });
        return;
      }

      toast.success(data.message, { id: tid, duration: 5000 });
      router.refresh();
    } catch {
      toast.error("Something went wrong.", { id: tid });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleSeed}
      disabled={loading}
      title="Seed all 24 default email templates (overwrites existing)"
      className="flex items-center gap-2 text-sm px-3 py-2 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <DatabaseZap className="w-4 h-4" />
      {loading ? "Seeding…" : "Seed Templates"}
    </button>
  );
}
