/**
 * Admin → New Course form.
 * Supports all new fields: price, level, category, etc.
 */
"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import GlassCard from "@/components/GlassCard";
import ImagePickerField from "@/components/ImagePickerField";
import { Button } from "@/components/ui/Button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function NewCoursePage() {
  const router = useRouter();
  const [title, setTitle]             = useState("");
  const [description, setDescription] = useState("");
  const [thumbnail, setThumbnail]     = useState("");
  const [price, setPrice]             = useState("");
  const [isFree, setIsFree]           = useState(false);
  const [level, setLevel]             = useState("beginner");
  const [published, setPublished]     = useState(false);
  const [loading, setLoading]         = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/courses", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          thumbnail: thumbnail || undefined,
          published,
          price: isFree ? null : price ? parseFloat(price) : null,
          isFree,
          level,
        }),
      });

      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to create course."); return; }

      toast.success("Course created!");
      router.push(`/admin/courses/${data.course.id}/edit`);
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <Link
        href="/admin/courses"
        className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Courses
      </Link>

      <h1 className="text-3xl font-bold text-foreground mb-8">Create New Course</h1>

      <GlassCard>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="label">Course Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-glass"
              placeholder="e.g. React for Beginners"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="label">Description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-glass resize-none"
              rows={4}
              placeholder="What will students learn in this course?"
              required
            />
          </div>

          {/* Thumbnail — pick from media library */}
          <ImagePickerField
            label="Thumbnail"
            folder="courses"
            value={thumbnail}
            onChange={setThumbnail}
          />

          {/* Level */}
          <div>
            <label className="label">Level</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="input-glass"
            >
              <option value="beginner"    >Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced"    >Advanced</option>
            </select>
          </div>

          {/* Pricing */}
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-secondary border border-border rounded-md px-4 py-3">
              <div>
                <p className="text-foreground text-sm font-medium">Free course</p>
                <p className="text-muted-foreground/70 text-xs mt-0.5">No payment required to enroll</p>
              </div>
              <button
                type="button"
                onClick={() => setIsFree(!isFree)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isFree ? "bg-emerald-500" : "bg-white/20"}`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${isFree ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>

            {!isFree && (
              <div>
                <label className="label">Price (INR)</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="input-glass"
                  placeholder="999"
                  min="0"
                  step="1"
                />
              </div>
            )}
          </div>

          {/* Publish toggle */}
          <div className="flex items-center justify-between bg-secondary border border-border rounded-md px-4 py-3">
            <div>
              <p className="text-foreground text-sm font-medium">Publish immediately</p>
              <p className="text-muted-foreground/70 text-xs mt-0.5">Students can see and enroll in published courses.</p>
            </div>
            <button
              type="button"
              onClick={() => setPublished(!published)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${published ? "bg-orange-600" : "bg-white/20"}`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${published ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={loading}>
              Create Course
            </Button>
            <Link href="/admin/courses" className="btn-ghost border border-border">
              Cancel
            </Link>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}
