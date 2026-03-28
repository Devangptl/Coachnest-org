/**
 * LessonsManager — Client Component.
 * Lists existing lessons with inline add/edit/delete functionality.
 * Supports TEXT, VIDEO, and QUIZ lesson types with inline quiz builder.
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
  HelpCircle,
  Loader2,
  GripVertical,
  Pencil,
  X,
  Save,
  Check,
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

interface QuizOption {
  text: string;
  correct: boolean;
}

interface QuizQuestion {
  text: string;
  options: QuizOption[];
  points: number;
}

interface Props {
  courseId: string;
  lessons: Lesson[];
}

const emptyForm = {
  title: "",
  type: "TEXT" as "TEXT" | "VIDEO" | "QUIZ",
  content: "",
  duration: "",
  isFree: false,
};

const emptyQuizForm = {
  quizTitle: "",
  passMark: 70,
  timeLimit: "",
  questions: [] as QuizQuestion[],
};

const lessonTypeIcons = {
  VIDEO: PlayCircle,
  TEXT: FileText,
  QUIZ: HelpCircle,
};

const lessonTypeColors = {
  VIDEO: "text-orange-400",
  TEXT: "text-blue-400",
  QUIZ: "text-amber-400",
};

const lessonTypeLabels = {
  VIDEO: "Video",
  TEXT: "Text lesson",
  QUIZ: "Quiz",
};

export default function LessonsManager({ courseId, lessons: initial }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [quizForm, setQuizForm] = useState(emptyQuizForm);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editQuizForm, setEditQuizForm] = useState(emptyQuizForm);
  const [editQuizId, setEditQuizId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingQuiz, setLoadingQuiz] = useState(false);

  // ── Quiz builder helpers ──────────────────────────────────────────────────

  function addQuestion(setQF: typeof setQuizForm) {
    setQF((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        { text: "", options: [{ text: "", correct: true }, { text: "", correct: false }], points: 1 },
      ],
    }));
  }

  function removeQuestion(setQF: typeof setQuizForm, idx: number) {
    setQF((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== idx),
    }));
  }

  function updateQuestion(setQF: typeof setQuizForm, idx: number, field: string, value: any) {
    setQF((prev) => {
      const questions = [...prev.questions];
      (questions[idx] as any)[field] = value;
      return { ...prev, questions };
    });
  }

  function addOption(setQF: typeof setQuizForm, qIdx: number) {
    setQF((prev) => {
      const questions = [...prev.questions];
      questions[qIdx] = { ...questions[qIdx], options: [...questions[qIdx].options, { text: "", correct: false }] };
      return { ...prev, questions };
    });
  }

  function removeOption(setQF: typeof setQuizForm, qIdx: number, oIdx: number) {
    setQF((prev) => {
      const questions = [...prev.questions];
      questions[qIdx] = { ...questions[qIdx], options: questions[qIdx].options.filter((_, i) => i !== oIdx) };
      return { ...prev, questions };
    });
  }

  function updateOption(setQF: typeof setQuizForm, qIdx: number, oIdx: number, field: string, value: any) {
    setQF((prev) => {
      const questions = [...prev.questions];
      const opts = [...questions[qIdx].options];
      if (field === "correct" && value === true) {
        opts.forEach((o, i) => { opts[i] = { ...o, correct: i === oIdx }; });
      } else {
        opts[oIdx] = { ...opts[oIdx], [field]: value };
      }
      questions[qIdx] = { ...questions[qIdx], options: opts };
      return { ...prev, questions };
    });
  }

  function validateQuiz(qf: typeof quizForm): boolean {
    if (!qf.quizTitle.trim()) { toast.error("Quiz title is required."); return false; }
    if (qf.questions.length === 0) { toast.error("Add at least one question."); return false; }
    for (let i = 0; i < qf.questions.length; i++) {
      const q = qf.questions[i];
      if (!q.text.trim()) { toast.error(`Question ${i + 1} text is empty.`); return false; }
      if (q.options.length < 2) { toast.error(`Question ${i + 1} needs at least 2 options.`); return false; }
      if (!q.options.some((o) => o.correct)) { toast.error(`Question ${i + 1} needs a correct answer.`); return false; }
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j].text.trim()) { toast.error(`Q${i + 1} option ${j + 1} is empty.`); return false; }
      }
    }
    return true;
  }

  // ── Add lesson ────────────────────────────────────────────────────────────

  async function handleAddLesson() {
    if (!form.title) return;

    if (form.type === "QUIZ" && !validateQuiz(quizForm)) return;

    setSubmitting(true);
    try {
      // 1. Create the lesson
      const res = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          title: form.title,
          type: form.type,
          content: form.type === "QUIZ" ? null : form.content,
          duration: form.type === "VIDEO" ? Number(form.duration) || null : null,
          isFree: form.isFree,
        }),
      });

      if (!res.ok) throw new Error();
      const { lesson } = await res.json();

      // 2. If QUIZ, also create the quiz
      if (form.type === "QUIZ") {
        const quizRes = await fetch("/api/admin/quizzes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lessonId: lesson.id,
            title: quizForm.quizTitle,
            passMark: quizForm.passMark,
            timeLimit: quizForm.timeLimit ? Number(quizForm.timeLimit) : undefined,
            questions: quizForm.questions.map((q, idx) => ({
              text: q.text,
              options: q.options,
              points: q.points,
              order: idx + 1,
            })),
          }),
        });
        if (!quizRes.ok) {
          // Cleanup: delete the lesson if quiz creation fails
          await fetch(`/api/lessons/${lesson.id}`, { method: "DELETE" });
          throw new Error("Failed to create quiz");
        }
      }

      toast.success("Lesson added!");
      setForm(emptyForm);
      setQuizForm(emptyQuizForm);
      setShowForm(false);
      router.refresh();
    } catch {
      toast.error("Failed to add lesson");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Delete lesson ─────────────────────────────────────────────────────────

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

  // ── Edit lesson ───────────────────────────────────────────────────────────

  async function startEditing(lesson: Lesson) {
    setEditingId(lesson.id);
    setEditForm({
      title: lesson.title,
      type: lesson.type,
      content: lesson.content ?? "",
      duration: lesson.duration?.toString() ?? "",
      isFree: lesson.isFree,
    });
    setShowForm(false);

    // If QUIZ type, load existing quiz data
    if (lesson.type === "QUIZ") {
      setLoadingQuiz(true);
      setEditQuizForm(emptyQuizForm);
      setEditQuizId(null);
      try {
        const res = await fetch(`/api/admin/lessons/${lesson.id}/quiz`);
        if (res.ok) {
          const { data: quiz } = await res.json();
          setEditQuizId(quiz.id);
          setEditQuizForm({
            quizTitle: quiz.title,
            passMark: quiz.passMark,
            timeLimit: quiz.timeLimit?.toString() ?? "",
            questions: quiz.questions.map((q: any) => ({
              text: q.text,
              options: q.options.map((o: any) => ({ text: o.text, correct: o.isCorrect ?? false })),
              points: q.points,
            })),
          });
        }
      } catch {
        // Quiz may not exist yet
      } finally {
        setLoadingQuiz(false);
      }
    }
  }

  function cancelEditing() {
    setEditingId(null);
    setEditForm(emptyForm);
    setEditQuizForm(emptyQuizForm);
    setEditQuizId(null);
  }

  async function handleSaveEdit() {
    if (!editingId || !editForm.title) return;

    if (editForm.type === "QUIZ" && !validateQuiz(editQuizForm)) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/lessons/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editForm.title,
          type: editForm.type,
          content: editForm.type === "QUIZ" ? null : editForm.content,
          duration: editForm.type === "VIDEO" ? Number(editForm.duration) || null : null,
          isFree: editForm.isFree,
        }),
      });

      if (!res.ok) throw new Error();

      // If QUIZ, update or create the quiz
      if (editForm.type === "QUIZ") {
        if (editQuizId) {
          // Update existing quiz
          const quizRes = await fetch(`/api/admin/quizzes/${editQuizId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: editQuizForm.quizTitle,
              passMark: editQuizForm.passMark,
              timeLimit: editQuizForm.timeLimit ? Number(editQuizForm.timeLimit) : null,
              questions: editQuizForm.questions.map((q, idx) => ({
                text: q.text,
                options: q.options,
                points: q.points,
                order: idx + 1,
              })),
            }),
          });
          if (!quizRes.ok) throw new Error("Failed to update quiz");
        } else {
          // Create new quiz for this lesson
          const quizRes = await fetch("/api/admin/quizzes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lessonId: editingId,
              title: editQuizForm.quizTitle,
              passMark: editQuizForm.passMark,
              timeLimit: editQuizForm.timeLimit ? Number(editQuizForm.timeLimit) : undefined,
              questions: editQuizForm.questions.map((q, idx) => ({
                text: q.text,
                options: q.options,
                points: q.points,
                order: idx + 1,
              })),
            }),
          });
          if (!quizRes.ok) throw new Error("Failed to create quiz");
        }
      }

      toast.success("Lesson updated!");
      cancelEditing();
      router.refresh();
    } catch {
      toast.error("Failed to update lesson");
    } finally {
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* Existing lessons */}
      {initial.map((lesson) => {
        const isEditing = editingId === lesson.id;
        const Icon = lessonTypeIcons[lesson.type] ?? FileText;
        const iconColor = lessonTypeColors[lesson.type] ?? "text-blue-400";
        const typeLabel = lessonTypeLabels[lesson.type] ?? "Lesson";

        if (isEditing) {
          return (
            <GlassCard key={lesson.id} className="space-y-4">
              {/* Edit header */}
              <div className="flex items-center justify-between">
                <h3 className="text-foreground font-semibold text-sm flex items-center gap-2">
                  <Pencil className="w-3.5 h-3.5 text-orange-400" />
                  Edit Lesson
                </h3>
                <button
                  onClick={cancelEditing}
                  className="text-muted-foreground/40 hover:text-muted-foreground transition-colors p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <LessonFormFields
                form={editForm}
                setForm={setEditForm}
                quizForm={editQuizForm}
                setQuizForm={setEditQuizForm}
                loadingQuiz={loadingQuiz}
                helpers={{ addQuestion, removeQuestion, updateQuestion, addOption, removeOption, updateOption }}
              />

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSaveEdit}
                  disabled={saving || !editForm.title}
                  className="btn-primary flex items-center gap-2 text-sm"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="btn-ghost text-sm border border-border"
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
            <GripVertical className="w-4 h-4 text-muted-foreground/30 cursor-grab flex-shrink-0" />
            <Icon className={`w-4 h-4 flex-shrink-0 ${iconColor}`} />
            <div className="flex-1 min-w-0">
              <p className="text-foreground text-sm font-medium truncate">
                {lesson.title}
              </p>
              <p className="text-muted-foreground/70 text-xs">
                {lesson.type === "VIDEO"
                  ? lesson.duration
                    ? `Video · ${lesson.duration} min`
                    : "Video"
                  : typeLabel}
                {lesson.isFree && (
                  <span className="ml-2 text-emerald-400 font-medium">· Free preview</span>
                )}
              </p>
            </div>

            {/* Edit + Delete buttons */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => startEditing(lesson)}
                className="text-orange-400/60 hover:text-orange-400 transition-colors p-1.5 rounded-lg hover:bg-orange-500/10 flex-shrink-0"
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
        <GlassCard className="text-center py-10 text-muted-foreground/70">
          No lessons yet. Add your first lesson below.
        </GlassCard>
      )}

      {/* Add lesson form */}
      {showForm && (
        <GlassCard className="space-y-4">
          <h3 className="text-foreground font-semibold text-sm flex items-center gap-2">
            <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
            New Lesson
          </h3>

          <LessonFormFields
            form={form}
            setForm={setForm}
            quizForm={quizForm}
            setQuizForm={setQuizForm}
            loadingQuiz={false}
            helpers={{ addQuestion, removeQuestion, updateQuestion, addOption, removeOption, updateOption }}
          />

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleAddLesson}
              disabled={submitting || !form.title}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Add Lesson
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setQuizForm(emptyQuizForm); }}
              className="btn-ghost text-sm border border-border"
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
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-white/40 hover:bg-secondary transition-all text-sm"
        >
          <PlusCircle className="w-4 h-4" /> Add Lesson
        </button>
      )}
    </div>
  );
}

// ── Shared form fields component ──────────────────────────────────────────────

function LessonFormFields({
  form,
  setForm,
  quizForm,
  setQuizForm,
  loadingQuiz,
  helpers,
}: {
  form: typeof emptyForm;
  setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>;
  quizForm: typeof emptyQuizForm;
  setQuizForm: React.Dispatch<React.SetStateAction<typeof emptyQuizForm>>;
  loadingQuiz: boolean;
  helpers: {
    addQuestion: (s: typeof setQuizForm) => void;
    removeQuestion: (s: typeof setQuizForm, idx: number) => void;
    updateQuestion: (s: typeof setQuizForm, idx: number, field: string, value: any) => void;
    addOption: (s: typeof setQuizForm, qIdx: number) => void;
    removeOption: (s: typeof setQuizForm, qIdx: number, oIdx: number) => void;
    updateOption: (s: typeof setQuizForm, qIdx: number, oIdx: number, field: string, value: any) => void;
  };
}) {
  return (
    <>
      {/* Title */}
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
          {(["TEXT", "VIDEO", "QUIZ"] as const).map((t) => {
            const Icon = lessonTypeIcons[t];
            return (
              <button
                key={t}
                type="button"
                onClick={() => setForm({ ...form, type: t })}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm transition-all ${
                  form.type === t
                    ? t === "QUIZ"
                      ? "bg-amber-500/20 border-amber-400/40 text-foreground"
                      : "bg-orange-500/15 border-orange-400/25 text-foreground"
                    : "bg-secondary border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <Icon className="w-4 h-4" />
                {t === "VIDEO" ? "Video" : t === "TEXT" ? "Text" : "Quiz"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content — for TEXT and VIDEO */}
      {form.type !== "QUIZ" && (
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
      )}

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

      {/* Quiz builder */}
      {form.type === "QUIZ" && (
        <QuizBuilderInline
          quizForm={quizForm}
          setQuizForm={setQuizForm}
          loading={loadingQuiz}
          helpers={helpers}
        />
      )}

      {/* Free preview toggle */}
      <div className="flex items-center justify-between bg-secondary border border-border rounded-xl px-4 py-3">
        <div>
          <p className="text-foreground text-sm font-medium">Free preview</p>
          <p className="text-muted-foreground/70 text-xs mt-0.5">Allow non-enrolled users to view this lesson</p>
        </div>
        <button
          type="button"
          onClick={() => setForm({ ...form, isFree: !form.isFree })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isFree ? "bg-emerald-500" : "bg-white/20"}`}
        >
          <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${form.isFree ? "translate-x-6" : "translate-x-1"}`} />
        </button>
      </div>
    </>
  );
}

// ── Inline Quiz Builder ───────────────────────────────────────────────────────

function QuizBuilderInline({
  quizForm,
  setQuizForm,
  loading,
  helpers,
}: {
  quizForm: typeof emptyQuizForm;
  setQuizForm: React.Dispatch<React.SetStateAction<typeof emptyQuizForm>>;
  loading: boolean;
  helpers: {
    addQuestion: (s: typeof setQuizForm) => void;
    removeQuestion: (s: typeof setQuizForm, idx: number) => void;
    updateQuestion: (s: typeof setQuizForm, idx: number, field: string, value: any) => void;
    addOption: (s: typeof setQuizForm, qIdx: number) => void;
    removeOption: (s: typeof setQuizForm, qIdx: number, oIdx: number) => void;
    updateOption: (s: typeof setQuizForm, qIdx: number, oIdx: number, field: string, value: any) => void;
  };
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
        <span className="text-muted-foreground/70 text-sm ml-2">Loading quiz data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 border border-amber-400/20 rounded-xl p-4 bg-amber-500/5">
      <div className="flex items-center gap-2 mb-1">
        <HelpCircle className="w-4 h-4 text-amber-400" />
        <span className="text-amber-400 text-sm font-semibold">Quiz Configuration</span>
      </div>

      {/* Quiz title */}
      <div>
        <label className="label">Quiz Title</label>
        <input
          type="text"
          value={quizForm.quizTitle}
          onChange={(e) => setQuizForm({ ...quizForm, quizTitle: e.target.value })}
          className="input-glass"
          placeholder="e.g. Module 1 Assessment"
        />
      </div>

      {/* Pass mark & time limit */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Pass Mark (%)</label>
          <input
            type="number"
            value={quizForm.passMark}
            onChange={(e) => setQuizForm({ ...quizForm, passMark: Number(e.target.value) })}
            className="input-glass"
            min={0}
            max={100}
          />
        </div>
        <div>
          <label className="label">Time Limit (min, optional)</label>
          <input
            type="number"
            value={quizForm.timeLimit}
            onChange={(e) => setQuizForm({ ...quizForm, timeLimit: e.target.value })}
            className="input-glass"
            placeholder="e.g. 15"
            min={0}
          />
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            Questions ({quizForm.questions.length})
          </p>
          <button
            type="button"
            onClick={() => helpers.addQuestion(setQuizForm)}
            className="flex items-center gap-1 text-amber-400 text-xs hover:text-amber-300 transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" /> Add Question
          </button>
        </div>

        {quizForm.questions.map((q, qIdx) => (
          <div key={qIdx} className="bg-secondary border border-border rounded-xl p-3 space-y-3">
            <div className="flex items-start justify-between">
              <span className="text-muted-foreground text-xs font-semibold">Q{qIdx + 1}</span>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <label className="text-muted-foreground/70 text-[10px]">Pts:</label>
                  <input
                    type="number"
                    className="input-glass w-14 text-center text-xs py-1"
                    value={q.points}
                    onChange={(e) => helpers.updateQuestion(setQuizForm, qIdx, "points", Number(e.target.value))}
                    min={1}
                    max={10}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => helpers.removeQuestion(setQuizForm, qIdx)}
                  className="text-red-400/60 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <textarea
              className="input-glass w-full h-14 text-sm"
              placeholder="Enter your question..."
              value={q.text}
              onChange={(e) => helpers.updateQuestion(setQuizForm, qIdx, "text", e.target.value)}
            />

            <div className="space-y-1.5">
              <p className="text-muted-foreground/50 text-[10px] font-semibold uppercase">Options (click circle to mark correct)</p>
              {q.options.map((opt, oIdx) => (
                <div key={oIdx} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => helpers.updateOption(setQuizForm, qIdx, oIdx, "correct", true)}
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all flex-shrink-0 ${
                      opt.correct
                        ? "bg-emerald-500 border-emerald-400"
                        : "bg-secondary border-border hover:border-white/40"
                    }`}
                    title={opt.correct ? "Correct answer" : "Mark as correct"}
                  >
                    {opt.correct && <Check className="w-2.5 h-2.5 text-[#fff]" />}
                  </button>
                  <input
                    type="text"
                    className="input-glass flex-1 text-sm py-1.5"
                    placeholder={`Option ${oIdx + 1}`}
                    value={opt.text}
                    onChange={(e) => helpers.updateOption(setQuizForm, qIdx, oIdx, "text", e.target.value)}
                  />
                  {q.options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => helpers.removeOption(setQuizForm, qIdx, oIdx)}
                      className="text-muted-foreground/30 hover:text-red-400 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => helpers.addOption(setQuizForm, qIdx)}
                className="text-orange-400 text-xs hover:text-orange-300 transition-colors"
              >
                + Add option
              </button>
            </div>
          </div>
        ))}

        {quizForm.questions.length === 0 && (
          <div className="text-center py-6 text-muted-foreground/50 text-sm">
            <p className="mb-2">No questions added yet.</p>
            <button
              type="button"
              onClick={() => helpers.addQuestion(setQuizForm)}
              className="text-amber-400 hover:text-amber-300 transition-colors text-xs flex items-center gap-1 mx-auto"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Add First Question
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
