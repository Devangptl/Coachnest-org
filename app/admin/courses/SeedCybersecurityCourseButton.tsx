"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { useConfirm } from "@/components/ui/UIDialogProvider";

export default function SeedCybersecurityCourseButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const confirm = useConfirm();

  const handleSeed = async () => {
    if (
      !(await confirm(
        "This creates the full 'Complete Cybersecurity Bootcamp' course (10 chapters, 60 lessons, 10 quizzes). If it already exists, its curriculum is rebuilt — existing enrollments are kept.",
        {
          title: "Seed the Cybersecurity course?",
          confirmText: "Seed Course",
          variant: "info",
        }
      ))
    )
      return;

    setLoading(true);
    const tid = toast.loading("Seeding Cybersecurity course…");

    try {
      const res = await fetch("/api/admin/courses/seed-cybersecurity", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to seed the course.", { id: tid });
        return;
      }

      toast.success(data.message, { id: tid, duration: 6000 });
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
      title="Seed the full Cybersecurity course (rebuilds curriculum if it exists)"
      className="flex items-center gap-2 text-sm px-3 py-2 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <ShieldCheck className="w-4 h-4" />
      {loading ? "Seeding…" : "Seed Cybersecurity Course"}
    </button>
  );
}
