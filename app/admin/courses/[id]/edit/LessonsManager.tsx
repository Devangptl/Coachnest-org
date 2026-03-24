/**
 * LessonsManager — Client Component.
 * Lists existing lessons with inline add/edit/delete functionality.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import GlassCard from "@/components/GlassCard";
import MarkdownEditor from "@/components/MarkdownEditor";
import {
  PlusCircle,
  Trash2,
  PlayCircle,
  FileText,
  Loader2,
  GripVertical,
  Pencil,
  X,
  Save,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import toast from "react-hot-toast";

interface Lesson {
  id: string;
  title: string;
  type: "TEXT" | "VIDEO" | "QUIZ";
  content: string | null;
  order: number;
  duration: number | null;
  isFree: boolean;
}

interface Props {
  courseId: string;
  lessons: Lesson[];
}

const emptyForm = {
  title: "",
  type: "TEXT" as "TEXT" | "VIDEO",
  content: "",
  duration: "",
  isFree: false,
};

export default function LessonsManager({ courseId, lessons: initial }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // ── Add lesson ─────────────────────────────────────────────────────────────

  async function handleAddLesson() {
    if (!form.title) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          title: form.title,
          type: form.type,
          content: form.content,
          duration: form.type === "VIDEO" ? Number(form.duration) || null : null,
          isFree: form.isFree,
        }),
      });

      if (!res.ok) throw new Error();
      toast.success("Lesson added!");
      setForm(emptyForm);
      setShowForm(false);
      router.refresh();
    } catch {
      toast.error("Failed to add lesson");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Delete lesson ──────────────────────────────────────────────────────────

  async function handleDelete(lessonId: string) {
    if (!confirm("Delete this lesson?")) return;
    setDeletingId(lessonId);

    try {
      const res = await fetch(`/api/lessons/${lessonId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Lesson deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete lesson");
    } finally {
      setDeletingId(null);
    }
  }

  // ── Edit lesson ────────────────────────────────────────────────────────────

  function startEditing(lesson: Lesson) {
    setEditingId(lesson.id);
    setEditForm({
      title: lesson.title,
      type: lesson.type === "QUIZ" ? "TEXT" : lesson.type,
      content: lesson.content ?? "",
      duration: lesson.duration?.toString() ?? "",
      isFree: lesson.isFree,
    });
    // Close add form if open
    setShowForm(false);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditForm(emptyForm);
  }

  async function handleSaveEdit() {
    if (!editingId || !editForm.title) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/lessons/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editForm.title,
          type: editForm.type,
          content: editForm.content,
          duration: editForm.type === "VIDEO" ? Number(editForm.duration) || null : null,
          isFree: editForm.isFree,
        }),
      });

      if (!res.ok) throw new Error();
      toast.success("Lesson updated!");
      setEditingId(null);
      setEditForm(emptyForm);
      router.refresh();
    } catch {
      toast.error("Failed to update lesson");
    } finally {
      setSaving(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* Existing lessons */}
      {initial.map((lesson) => {
        const isEditing = editingId === lesson.id;
        const Icon = lesson.type === "VIDEO" ? PlayCircle : FileText;

        if (isEditing) {
          return (
            <GlassCard key={lesson.id} className="space-y-4">
              {/* Edit header */}
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                  <Pencil className="w-3.5 h-3.5 text-purple-400" />
                  Edit Lesson
                </h3>
                <button
                  onClick={cancelEditing}
                  className="text-white/30 hover:text-white/60 transition-colors p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Title */}
              <div>
                <label className="label">Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="input-glass"
                  placeholder="Lesson title"
                />
              </div>

              {/* Type selector */}
              <div>
                <label className="label">Type</label>
                <div className="flex gap-2">
                  {(["TEXT", "VIDEO"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, type: t })}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm transition-all ${
                        editForm.type === t
                          ? "bg-violet-500/20 border-violet-400/40 text-white"
                          : "bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      {t === "VIDEO" ? (
                        <PlayCircle className="w-4 h-4" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                      {t === "VIDEO" ? "Video" : "Text"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div>
                <label className="label">
                  {editForm.type === "VIDEO" ? "Video URL (embed URL)" : "Content"}
                </label>
                {editForm.type === "VIDEO" ? (
                  <input
                    type="url"
                    value={editForm.content}
                    onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                    className="input-glass"
                    placeholder="https://www.youtube.com/embed/..."
                  />
                ) : (
                  <MarkdownEditor
                    value={editForm.content}
                    onChange={(content) => setEditForm({ ...editForm, content })}
                    rows={10}
                  />
                )}
              </div>

              {/* Duration (video only) */}
              {editForm.type === "VIDEO" && (
                <div>
                  <label className="label">Duration (minutes)</label>
                  <input
                    type="number"
                    value={editForm.duration}
                    onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })}
                    className="input-glass"
                    placeholder="e.g. 15"
                    min={1}
                  />
                </div>
              )}

              {/* Free preview toggle */}
              <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <div>
                  <p className="text-white text-sm font-medium">Free preview</p>
                  <p className="text-white/40 text-xs mt-0.5">Allow non-enrolled users to view this lesson</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, isFree: !editForm.isFree })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editForm.isFree ? "bg-emerald-500" : "bg-white/20"}`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${editForm.isFree ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSaveEdit}
                  disabled={saving || !editForm.title}
                  className="btn-primary flex items-center gap-2 text-sm"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="btn-ghost text-sm border border-white/20"
                >
                  Cancel
                </button>
              </div>
            </GlassCard>
          );
        }

        // Normal lesson row
        return (
          <GlassCard
            key={lesson.id}
            padding="sm"
            className="flex items-center gap-3 px-4 py-3 group"
          >
            <GripVertical className="w-4 h-4 text-white/20 cursor-grab flex-shrink-0" />
            <Icon
              className={`w-4 h-4 flex-shrink-0 ${
                lesson.type === "VIDEO" ? "text-purple-400" : "text-blue-400"
              }`}
            />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {lesson.title}
              </p>
              <p className="text-white/40 text-xs">
                {lesson.type === "VIDEO"
                  ? lesson.duration
                    ? `Video · ${lesson.duration} min`
                    : "Video"
                  : "Text lesson"}
                {lesson.isFree && (
                  <span className="ml-2 text-emerald-400 font-medium">· Free preview</span>
                )}
              </p>
            </div>

            {/* Edit + Delete buttons */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => startEditing(lesson)}
                className="text-purple-400/60 hover:text-purple-400 transition-colors p-1.5 rounded-lg hover:bg-purple-500/10 flex-shrink-0"
                title="Edit lesson"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDelete(lesson.id)}
                disabled={deletingId === lesson.id}
                className="text-red-400/60 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10 flex-shrink-0"
                title="Delete lesson"
              >
                {deletingId === lesson.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </GlassCard>
        );
      })}

      {initial.length === 0 && !showForm && (
        <GlassCard className="text-center py-10 text-white/40">
          No lessons yet. Add your first lesson below.
        </GlassCard>
      )}

      {/* Add lesson form */}
      {showForm && (
        <GlassCard className="space-y-4">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
            New Lesson
          </h3>

          <div>
            <label className="label">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input-glass"
              placeholder="Lesson title"
            />
          </div>

          {/* Type selector */}
          <div>
            <label className="label">Type</label>
            <div className="flex gap-2">
              {(["TEXT", "VIDEO"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm({ ...form, type: t })}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm transition-all ${
                    form.type === t
                      ? "bg-violet-500/20 border-violet-400/40 text-white"
                      : "bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {t === "VIDEO" ? (
                    <PlayCircle className="w-4 h-4" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  {t === "VIDEO" ? "Video" : "Text"}
                </button>
              ))}
            </div>
          </div>

          {/* Content field */}
          <div>
            <label className="label">
              {form.type === "VIDEO" ? "Video URL (embed URL)" : "Content"}
            </label>
            {form.type === "VIDEO" ? (
              <input
                type="url"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="input-glass"
                placeholder="https://www.youtube.com/embed/..."
              />
            ) : (
              <MarkdownEditor
                value={form.content}
                onChange={(content) => setForm({ ...form, content })}
                rows={10}
              />
            )}
          </div>

          {/* Duration (video only) */}
          {form.type === "VIDEO" && (
            <div>
              <label className="label">Duration (minutes)</label>
              <input
                type="number"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                className="input-glass"
                placeholder="e.g. 15"
                min={1}
              />
            </div>
          )}

          {/* Free preview toggle */}
          <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3">
            <div>
              <p className="text-white text-sm font-medium">Free preview</p>
              <p className="text-white/40 text-xs mt-0.5">Allow non-enrolled users to view this lesson</p>
            </div>
            <button
              type="button"
              onClick={() => setForm({ ...form, isFree: !form.isFree })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isFree ? "bg-emerald-500" : "bg-white/20"}`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${form.isFree ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleAddLesson}
              disabled={submitting || !form.title}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              Add Lesson
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="btn-ghost text-sm border border-white/20"
            >
              Cancel
            </button>
          </div>
        </GlassCard>
      )}

      {/* Add lesson trigger */}
      {!showForm && !editingId && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-white/20 text-white/50 hover:text-white hover:border-white/40 hover:bg-white/5 transition-all text-sm"
        >
          <PlusCircle className="w-4 h-4" /> Add Lesson
        </button>
      )}
    </div>
  );
}
