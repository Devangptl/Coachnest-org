"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useConfirm } from "@/components/ui/UIDialogProvider";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/Button";
import { UserMinus } from "lucide-react";

interface Instructor {
  id: string;
  name: string;
  email: string;
  headline: string | null;
  bio: string | null;
  website: string | null;
  avatar: string | null;
}

export default function EditInstructorForm({ instructor }: { instructor: Instructor }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [demoting, setDemoting] = useState(false);
  const confirm = useConfirm();
  const [form, setForm] = useState({
    name: instructor.name,
    headline: instructor.headline ?? "",
    bio: instructor.bio ?? "",
    website: instructor.website ?? "",
    avatar: instructor.avatar ?? "",
  });

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error("Name is required.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/instructors/${instructor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          headline: form.headline.trim() || null,
          bio: form.bio.trim() || null,
          website: form.website.trim() || null,
          avatar: form.avatar.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Failed to save.");
        return;
      }
      toast.success("Instructor updated.");
      router.push(`/admin/instructors/${instructor.id}`);
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const handleDemote = async () => {
    if (
      !await confirm(
        `Demote ${instructor.name} to a Student? They will lose instructor access. This will fail if they still own any courses.`,
        { title: "Demote Instructor", confirmText: "Demote" }
      )
    ) {
      return;
    }
    setDemoting(true);
    try {
      const res = await fetch(`/api/admin/instructors/${instructor.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "STUDENT" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Failed to change role.");
        return;
      }
      toast.success("Instructor demoted to Student.");
      router.push("/admin/instructors");
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setDemoting(false);
    }
  };

  const inputCls =
    "w-full bg-secondary border border-border rounded-md px-4 py-2.5 text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-[#d97757]/25 transition-all";

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <GlassCard padding="md">
        <h3 className="text-foreground font-semibold mb-4">Profile</h3>
        <div className="space-y-3">
          <div>
            <label className="text-muted-foreground text-sm font-medium mb-1.5 block">
              Full Name *
            </label>
            <input
              className={inputCls}
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-muted-foreground text-sm font-medium mb-1.5 block">
              Email
            </label>
            <input
              className={`${inputCls} opacity-60 cursor-not-allowed`}
              value={instructor.email}
              disabled
              readOnly
            />
          </div>
          <div>
            <label className="text-muted-foreground text-sm font-medium mb-1.5 block">
              Headline
            </label>
            <input
              className={inputCls}
              value={form.headline}
              onChange={(e) => update("headline", e.target.value)}
              placeholder="Senior Full-Stack Engineer"
            />
          </div>
          <div>
            <label className="text-muted-foreground text-sm font-medium mb-1.5 block">
              Website
            </label>
            <input
              type="url"
              className={inputCls}
              value={form.website}
              onChange={(e) => update("website", e.target.value)}
              placeholder="https://example.com"
            />
          </div>
          <div>
            <label className="text-muted-foreground text-sm font-medium mb-1.5 block">
              Avatar URL
            </label>
            <input
              type="url"
              className={inputCls}
              value={form.avatar}
              onChange={(e) => update("avatar", e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="text-muted-foreground text-sm font-medium mb-1.5 block">
              Bio
            </label>
            <textarea
              rows={4}
              className={`${inputCls} resize-none`}
              value={form.bio}
              onChange={(e) => update("bio", e.target.value)}
            />
          </div>
        </div>
      </GlassCard>

      <div className="flex gap-3">
        <Button type="submit" variant="primary" loading={saving}>
          Save Changes
        </Button>
        <Link href={`/admin/instructors/${instructor.id}`}>
          <Button type="button" variant="ghost">
            Cancel
          </Button>
        </Link>
      </div>

      {/* Danger zone */}
      <GlassCard padding="md" className="border-red-400/30">
        <h3 className="text-foreground font-semibold mb-1 flex items-center gap-2">
          <UserMinus className="w-4 h-4 text-red-400" /> Danger Zone
        </h3>
        <p className="text-muted-foreground text-sm mb-4">
          Demote this user to a Student. They will lose access to the instructor
          portal. This cannot be done while they still own courses.
        </p>
        <Button
          type="button"
          variant="danger"
          loading={demoting}
          onClick={handleDemote}
        >
          Demote to Student
        </Button>
      </GlassCard>
    </form>
  );
}
