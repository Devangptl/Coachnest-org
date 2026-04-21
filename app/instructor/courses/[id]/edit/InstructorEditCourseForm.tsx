"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import GlassCard from "@/components/GlassCard";
import ImagePickerField from "@/components/ImagePickerField";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail: string | null;
  status: string;
  price: { toString(): string } | number | string | null;
  isFree: boolean;
  level: string;
}

export default function InstructorEditCourseForm({ course }: { course: Course }) {
  const router = useRouter();
  const [title,       setTitle]       = useState(course.title);
  const [description, setDescription] = useState(course.description);
  const [thumbnail,   setThumbnail]   = useState(course.thumbnail ?? "");
  const [status,      setStatus]      = useState(course.status);
  const [price,       setPrice]       = useState(course.price?.toString() ?? "");
  const [isFree,      setIsFree]      = useState(course.isFree);
  const [level,       setLevel]       = useState(course.level);
  const [loading,     setLoading]     = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/instructor/courses/${course.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, thumbnail: thumbnail || undefined, status, price: isFree ? null : price ? parseFloat(price) : null, isFree, level }),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error ?? "Update failed."); return; }
      toast.success("Course saved!");
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <GlassCard>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label">Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="input-glass" required />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input-glass resize-none" rows={4} required />
        </div>
        <ImagePickerField
          label="Thumbnail"
          folder="courses"
          value={thumbnail}
          onChange={setThumbnail}
        />
        <div>
          <label className="label">Level</label>
          <select value={level} onChange={(e) => setLevel(e.target.value)} className="input-glass">
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-secondary border border-border rounded-md px-4 py-3">
            <div>
              <p className="text-foreground text-sm font-medium">Free course</p>
              <p className="text-muted-foreground/70 text-xs mt-0.5">No payment required to enroll</p>
            </div>
            <button type="button" onClick={() => setIsFree(!isFree)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isFree ? "bg-emerald-500" : "bg-white/20"}`}>
              <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${isFree ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
          {!isFree && (
            <div>
              <label className="label">Price (INR)</label>
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="input-glass" placeholder="999" min="0" step="1" />
            </div>
          )}
        </div>
        <div>
          <label className="label">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-glass">
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
          </select>
        </div>
        <Button type="submit" loading={loading}>Save Changes</Button>
      </form>
    </GlassCard>
  );
}
