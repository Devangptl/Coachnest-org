/**
 * LessonsManager — chapter-based lesson management.
 * Supports creating sections (chapters) with drag-reorderable lessons inside each.
 * Falls back gracefully when no sections exist (ungrouped flat list).
 */
"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Reorder, useDragControls } from "framer-motion";
import GlassCard from "@/components/GlassCard";
import MarkdownEditor from "@/components/MarkdownEditor";
import {
  PlusCircle, Trash2, PlayCircle, FileText, HelpCircle,
  Loader2, GripVertical, Pencil, X, Save, Check,
  ChevronDown, CloudUpload, CloudOff, BookOpen,
} from "lucide-react";
import toast from "react-hot-toast";
import { useConfirm } from "@/components/ui/UIDialogProvider";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Lesson {
  id: string;
  title: string;
  type: "TEXT" | "VIDEO" | "QUIZ";
  content: string | null;
  order: number;
  duration: number | null;
  isFree: boolean;
}

interface SectionData {
  id: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

interface Props {
  courseId: string;
  sections: SectionData[];
  ungroupedLessons: Lesson[];
}

interface QuizOption   { text: string; correct: boolean }
interface QuizQuestion { text: string; options: QuizOption[]; points: number }

const emptyForm = {
  title: "", type: "TEXT" as "TEXT" | "VIDEO" | "QUIZ",
  content: "", duration: "", isFree: false,
};

const emptyQuizForm = {
  quizTitle: "", passMark: 70, timeLimit: "",
  questions: [] as QuizQuestion[],
};

const typeIcons   = { VIDEO: PlayCircle, TEXT: FileText, QUIZ: HelpCircle };
const typeColors  = { VIDEO: "text-[#d97757]", TEXT: "text-blue-400", QUIZ: "text-amber-400" };
const typeLabels  = { VIDEO: "Video", TEXT: "Text lesson", QUIZ: "Quiz" };

// ── Main component ────────────────────────────────────────────────────────────

export default function LessonsManager({
  courseId,
  sections: initialSections,
  ungroupedLessons: initialUngrouped,
}: Props) {
  const router  = useRouter();
  const confirm = useConfirm();

  // ── Section state ──────────────────────────────────────────────────────────
  const [sections, setSections]             = useState<SectionData[]>(initialSections);
  const [ungroupedLessons, setUngroupedLessons] = useState<Lesson[]>(initialUngrouped);
  const sectionsRef                         = useRef<SectionData[]>(initialSections);
  const sectionLessonsRef                   = useRef<Record<string, Lesson[]>>({});
  const ungroupedRef                        = useRef<Lesson[]>(initialUngrouped);

  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [reorderSavingFor, setReorderSavingFor]   = useState<string | null>(null);

  // Section CRUD state
  const [showAddSection,    setShowAddSection]    = useState(false);
  const [newSectionTitle,   setNewSectionTitle]   = useState("");
  const [savingSection,     setSavingSection]     = useState(false);
  const [editingSectionId,  setEditingSectionId]  = useState<string | null>(null);
  const [editSectionTitle,  setEditSectionTitle]  = useState("");
  const [deletingSectionId, setDeletingSectionId] = useState<string | null>(null);

  // ── Lesson add/edit state (shared across sections) ─────────────────────────
  const [addingToSectionId, setAddingToSectionId] = useState<string | null>(null);
  const addingToSectionIdRef = useRef<string | null>(null);

  const [editingId,    setEditingId]    = useState<string | null>(null);
  const [editForm,     setEditForm]     = useState(emptyForm);
  const [editQuizForm, setEditQuizForm] = useState(emptyQuizForm);
  const [editQuizId,   setEditQuizId]   = useState<string | null>(null);
  const [saving,       setSaving]       = useState(false);
  const [loadingQuiz,  setLoadingQuiz]  = useState(false);
  const [deletingId,   setDeletingId]   = useState<string | null>(null);

  // Edit autosave
  const [autosaveStatus, setAutosaveStatus] =
    useState<"idle" | "pending" | "saving" | "saved" | "error">("idle");
  const lastSavedRef    = useRef<typeof emptyForm | null>(null);
  const autosaveTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveAbort   = useRef<AbortController | null>(null);
  const savedHideTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // New-lesson form + autosave
  const [form,    setForm]    = useState(emptyForm);
  const [quizForm, setQuizForm] = useState(emptyQuizForm);
  const [submitting,         setSubmitting]         = useState(false);
  const [draftLessonId,      setDraftLessonId]      = useState<string | null>(null);
  const [formAutosaveStatus, setFormAutosaveStatus] =
    useState<"idle" | "pending" | "saving" | "saved" | "error">("idle");
  const lastFormSaved   = useRef<typeof emptyForm | null>(null);
  const formAutosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formAutosaveAbort = useRef<AbortController | null>(null);
  const formSavedHide   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Sync when parent data changes (router.refresh) ─────────────────────────
  useEffect(() => {
    setSections(initialSections);
    sectionsRef.current = initialSections;
    for (const s of initialSections) sectionLessonsRef.current[s.id] = s.lessons;
    setUngroupedLessons(initialUngrouped);
    ungroupedRef.current = initialUngrouped;
  }, [initialSections, initialUngrouped]);

  // ── Cancel helpers ─────────────────────────────────────────────────────────
  function cancelAutosave() {
    if (autosaveTimer.current)  { clearTimeout(autosaveTimer.current);  autosaveTimer.current = null; }
    if (autosaveAbort.current)  { autosaveAbort.current.abort();        autosaveAbort.current = null; }
    if (savedHideTimer.current) { clearTimeout(savedHideTimer.current); savedHideTimer.current = null; }
  }
  function cancelFormAutosave() {
    if (formAutosaveTimer.current) { clearTimeout(formAutosaveTimer.current); formAutosaveTimer.current = null; }
    if (formAutosaveAbort.current) { formAutosaveAbort.current.abort();       formAutosaveAbort.current = null; }
    if (formSavedHide.current)     { clearTimeout(formSavedHide.current);     formSavedHide.current = null; }
  }
  useEffect(() => () => cancelAutosave(),     []);
  useEffect(() => () => cancelFormAutosave(), []);

  // ── Edit autosave (TEXT/VIDEO) ─────────────────────────────────────────────
  useEffect(() => {
    if (!editingId || editForm.type === "QUIZ" || !editForm.title.trim() || !lastSavedRef.current) return;
    const last = lastSavedRef.current;
    const unchanged =
      editForm.title === last.title && editForm.type === last.type &&
      editForm.content === last.content && editForm.duration === last.duration &&
      editForm.isFree === last.isFree;
    if (unchanged) return;

    if (savedHideTimer.current) { clearTimeout(savedHideTimer.current); savedHideTimer.current = null; }
    setAutosaveStatus("pending");
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);

    autosaveTimer.current = setTimeout(async () => {
      if (autosaveAbort.current) autosaveAbort.current.abort();
      const ctrl = new AbortController();
      autosaveAbort.current = ctrl;
      const snap = { ...editForm };
      setAutosaveStatus("saving");
      try {
        const res = await fetch(`/api/lessons/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: snap.title, type: snap.type,
            content: snap.type === "QUIZ" ? null : snap.content,
            duration: snap.type === "VIDEO" ? Number(snap.duration) || null : null,
            isFree: snap.isFree,
          }),
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error();
        lastSavedRef.current = snap;
        setAutosaveStatus("saved");
        savedHideTimer.current = setTimeout(() => setAutosaveStatus("idle"), 2000);
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") return;
        setAutosaveStatus("error");
      }
    }, 1200);
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); };
  }, [editForm, editingId]);

  // ── New-lesson autosave (TEXT/VIDEO) ──────────────────────────────────────
  useEffect(() => {
    if (!addingToSectionId || form.type === "QUIZ" || !form.title.trim()) return;
    const last = lastFormSaved.current;
    const unchanged = last &&
      form.title === last.title && form.type === last.type &&
      form.content === last.content && form.duration === last.duration &&
      form.isFree === last.isFree;
    if (unchanged) return;

    if (formSavedHide.current) { clearTimeout(formSavedHide.current); formSavedHide.current = null; }
    setFormAutosaveStatus("pending");
    if (formAutosaveTimer.current) clearTimeout(formAutosaveTimer.current);

    formAutosaveTimer.current = setTimeout(async () => {
      if (formAutosaveAbort.current) formAutosaveAbort.current.abort();
      const ctrl = new AbortController();
      formAutosaveAbort.current = ctrl;
      const snap = { ...form };
      const sectionId = addingToSectionIdRef.current;
      setFormAutosaveStatus("saving");
      try {
        const payload = {
          title: snap.title, type: snap.type,
          content: snap.type === "QUIZ" ? null : snap.content,
          duration: snap.type === "VIDEO" ? Number(snap.duration) || null : null,
          isFree: snap.isFree,
        };
        let res: Response;
        if (draftLessonId) {
          res = await fetch(`/api/lessons/${draftLessonId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: ctrl.signal,
          });
        } else {
          res = await fetch("/api/lessons", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              courseId,
              sectionId: sectionId === "ungrouped" ? null : sectionId,
              ...payload,
            }),
            signal: ctrl.signal,
          });
          if (res.ok) {
            const { lesson } = await res.json();
            setDraftLessonId(lesson.id);
            router.refresh();
          }
        }
        if (!res.ok) throw new Error();
        lastFormSaved.current = snap;
        setFormAutosaveStatus("saved");
        formSavedHide.current = setTimeout(() => setFormAutosaveStatus("idle"), 2000);
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") return;
        setFormAutosaveStatus("error");
      }
    }, 1200);
    return () => { if (formAutosaveTimer.current) clearTimeout(formAutosaveTimer.current); };
  }, [form, addingToSectionId, draftLessonId, courseId, router]);

  // ── Quiz builder helpers ───────────────────────────────────────────────────
  function addQuestion(setQF: typeof setQuizForm) {
    setQF((p) => ({ ...p, questions: [...p.questions, { text: "", options: [{ text: "", correct: true }, { text: "", correct: false }], points: 1 }] }));
  }
  function removeQuestion(setQF: typeof setQuizForm, idx: number) {
    setQF((p) => ({ ...p, questions: p.questions.filter((_, i) => i !== idx) }));
  }
  function updateQuestion(setQF: typeof setQuizForm, idx: number, field: string, value: unknown) {
    setQF((p) => { const qs = [...p.questions]; qs[idx] = { ...qs[idx], [field]: value }; return { ...p, questions: qs }; });
  }
  function addOption(setQF: typeof setQuizForm, qi: number) {
    setQF((p) => { const qs = [...p.questions]; qs[qi] = { ...qs[qi], options: [...qs[qi].options, { text: "", correct: false }] }; return { ...p, questions: qs }; });
  }
  function removeOption(setQF: typeof setQuizForm, qi: number, oi: number) {
    setQF((p) => { const qs = [...p.questions]; qs[qi] = { ...qs[qi], options: qs[qi].options.filter((_, i) => i !== oi) }; return { ...p, questions: qs }; });
  }
  function updateOption(setQF: typeof setQuizForm, qi: number, oi: number, field: string, value: unknown) {
    setQF((p) => {
      const qs = [...p.questions];
      const opts = [...qs[qi].options];
      if (field === "correct" && value === true) opts.forEach((o, i) => { opts[i] = { ...o, correct: i === oi }; });
      else opts[oi] = { ...opts[oi], [field]: value };
      qs[qi] = { ...qs[qi], options: opts };
      return { ...p, questions: qs };
    });
  }
  const helpers = { addQuestion, removeQuestion, updateQuestion, addOption, removeOption, updateOption };

  function validateQuiz(qf: typeof quizForm) {
    if (!qf.quizTitle.trim()) { toast.error("Quiz title is required."); return false; }
    if (qf.questions.length === 0) { toast.error("Add at least one question."); return false; }
    for (let i = 0; i < qf.questions.length; i++) {
      const q = qf.questions[i];
      if (!q.text.trim()) { toast.error(`Question ${i + 1} text is empty.`); return false; }
      if (q.options.length < 2) { toast.error(`Q${i + 1} needs at least 2 options.`); return false; }
      if (!q.options.some((o) => o.correct)) { toast.error(`Q${i + 1} needs a correct answer.`); return false; }
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j].text.trim()) { toast.error(`Q${i + 1} option ${j + 1} is empty.`); return false; }
      }
    }
    return true;
  }

  // ── Section CRUD ───────────────────────────────────────────────────────────
  async function handleAddSection() {
    if (!newSectionTitle.trim()) return;
    setSavingSection(true);
    try {
      const res = await fetch("/api/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, title: newSectionTitle.trim() }),
      });
      if (!res.ok) throw new Error();
      setNewSectionTitle("");
      setShowAddSection(false);
      router.refresh();
    } catch {
      toast.error("Failed to add chapter");
    } finally {
      setSavingSection(false);
    }
  }

  async function handleSaveSectionTitle(sectionId: string) {
    if (!editSectionTitle.trim()) return;
    setSavingSection(true);
    try {
      const res = await fetch(`/api/sections/${sectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editSectionTitle.trim() }),
      });
      if (!res.ok) throw new Error();
      setSections((prev) => prev.map((s) => s.id === sectionId ? { ...s, title: editSectionTitle.trim() } : s));
      setEditingSectionId(null);
    } catch {
      toast.error("Failed to update chapter");
    } finally {
      setSavingSection(false);
    }
  }

  async function handleDeleteSection(sectionId: string) {
    const ok = await confirm(
      "Lessons in this chapter will become ungrouped (not deleted).",
      { title: "Delete Chapter?", confirmText: "Delete" }
    );
    if (!ok) return;
    setDeletingSectionId(sectionId);
    try {
      const res = await fetch(`/api/sections/${sectionId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Chapter deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete chapter");
    } finally {
      setDeletingSectionId(null);
    }
  }

  async function handleReorderSections(reordered: SectionData[]) {
    setSections(reordered);
    sectionsRef.current = reordered;
    try {
      await fetch(`/api/instructor/courses/${courseId}/reorder-sections`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: reordered.map((s, i) => ({ id: s.id, order: i + 1 })) }),
      });
    } catch {
      toast.error("Failed to save chapter order");
    }
  }

  // ── Lesson form open/close ─────────────────────────────────────────────────
  function openAddLessonForm(sectionId: string) {
    cancelFormAutosave();
    cancelAutosave();
    setEditingId(null);
    setAddingToSectionId(sectionId);
    addingToSectionIdRef.current = sectionId;
    setForm(emptyForm);
    setQuizForm(emptyQuizForm);
    setDraftLessonId(null);
    lastFormSaved.current = null;
    setFormAutosaveStatus("idle");
  }

  function closeNewLessonForm() {
    cancelFormAutosave();
    setAddingToSectionId(null);
    addingToSectionIdRef.current = null;
    setForm(emptyForm);
    setQuizForm(emptyQuizForm);
    setDraftLessonId(null);
    lastFormSaved.current = null;
    setFormAutosaveStatus("idle");
  }

  // ── Add lesson ─────────────────────────────────────────────────────────────
  async function handleAddLesson() {
    if (!form.title) return;
    const sectionId = addingToSectionIdRef.current;
    const resolvedSectionId = sectionId === "ungrouped" ? null : sectionId;

    if (form.type !== "QUIZ" && draftLessonId) {
      cancelFormAutosave();
      const last = lastFormSaved.current;
      const dirty = !last || form.title !== last.title || form.type !== last.type ||
        form.content !== last.content || form.duration !== last.duration || form.isFree !== last.isFree;

      if (dirty) {
        setSubmitting(true);
        try {
          const res = await fetch(`/api/lessons/${draftLessonId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: form.title, type: form.type, content: form.content,
              duration: form.type === "VIDEO" ? Number(form.duration) || null : null,
              isFree: form.isFree,
            }),
          });
          if (!res.ok) throw new Error();
        } catch {
          toast.error("Failed to save lesson");
          setSubmitting(false);
          return;
        }
        setSubmitting(false);
      }
      toast.success("Lesson added!");
      closeNewLessonForm();
      router.refresh();
      return;
    }

    if (form.type === "QUIZ" && !validateQuiz(quizForm)) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId, sectionId: resolvedSectionId,
          title: form.title, type: form.type,
          content: form.type === "QUIZ" ? null : form.content,
          duration: form.type === "VIDEO" ? Number(form.duration) || null : null,
          isFree: form.isFree,
        }),
      });
      if (!res.ok) throw new Error();
      const { lesson } = await res.json();

      if (form.type === "QUIZ") {
        const quizRes = await fetch("/api/admin/quizzes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lessonId: lesson.id,
            title: quizForm.quizTitle, passMark: quizForm.passMark,
            timeLimit: quizForm.timeLimit ? Number(quizForm.timeLimit) : undefined,
            questions: quizForm.questions.map((q, i) => ({ ...q, order: i + 1 })),
          }),
        });
        if (!quizRes.ok) {
          await fetch(`/api/lessons/${lesson.id}`, { method: "DELETE" });
          throw new Error("Quiz creation failed");
        }
      }

      toast.success("Lesson added!");
      closeNewLessonForm();
      router.refresh();
    } catch {
      toast.error("Failed to add lesson");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Delete lesson ──────────────────────────────────────────────────────────
  async function handleDelete(lessonId: string) {
    if (!await confirm("Delete this lesson?", { title: "Delete Lesson", confirmText: "Delete" })) return;
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

  // ── Reorder lessons within a section ──────────────────────────────────────
  async function handleReorderEnd(sectionId: string) {
    const lessons = sectionId === "ungrouped"
      ? ungroupedRef.current
      : (sectionLessonsRef.current[sectionId] ?? []);
    setReorderSavingFor(sectionId);
    try {
      await fetch(`/api/instructor/courses/${courseId}/reorder-lessons`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: lessons.map((l, i) => ({ id: l.id, order: i + 1 })) }),
      });
    } catch {
      toast.error("Failed to save lesson order");
      router.refresh();
    } finally {
      setReorderSavingFor(null);
    }
  }

  // ── Edit lesson ────────────────────────────────────────────────────────────
  async function startEditing(lesson: Lesson) {
    cancelAutosave();
    closeNewLessonForm();
    const init = {
      title: lesson.title, type: lesson.type,
      content: lesson.content ?? "", duration: lesson.duration?.toString() ?? "",
      isFree: lesson.isFree,
    };
    setEditingId(lesson.id);
    setEditForm(init);
    lastSavedRef.current = init;
    setAutosaveStatus("idle");

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
            quizTitle: quiz.title, passMark: quiz.passMark,
            timeLimit: quiz.timeLimit?.toString() ?? "",
            questions: quiz.questions.map((q: { text: string; options: { text: string; isCorrect?: boolean }[]; points: number }) => ({
              text: q.text,
              options: q.options.map((o) => ({ text: o.text, correct: o.isCorrect ?? false })),
              points: q.points,
            })),
          });
        }
      } catch { /* quiz may not exist yet */ }
      finally { setLoadingQuiz(false); }
    }
  }

  function cancelEditing() {
    cancelAutosave();
    setEditingId(null);
    setEditForm(emptyForm);
    setEditQuizForm(emptyQuizForm);
    setEditQuizId(null);
    lastSavedRef.current = null;
    setAutosaveStatus("idle");
    router.refresh();
  }

  async function handleSaveEdit() {
    if (!editingId || !editForm.title) return;
    if (editForm.type === "QUIZ" && !validateQuiz(editQuizForm)) return;
    cancelAutosave();
    setSaving(true);
    try {
      const res = await fetch(`/api/lessons/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editForm.title, type: editForm.type,
          content: editForm.type === "QUIZ" ? null : editForm.content,
          duration: editForm.type === "VIDEO" ? Number(editForm.duration) || null : null,
          isFree: editForm.isFree,
        }),
      });
      if (!res.ok) throw new Error();

      if (editForm.type === "QUIZ") {
        const quizPayload = {
          title: editQuizForm.quizTitle, passMark: editQuizForm.passMark,
          timeLimit: editQuizForm.timeLimit ? Number(editQuizForm.timeLimit) : null,
          questions: editQuizForm.questions.map((q, i) => ({ ...q, order: i + 1 })),
        };
        if (editQuizId) {
          const r = await fetch(`/api/admin/quizzes/${editQuizId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(quizPayload) });
          if (!r.ok) throw new Error("Failed to update quiz");
        } else {
          const r = await fetch("/api/admin/quizzes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lessonId: editingId, ...quizPayload }) });
          if (!r.ok) throw new Error("Failed to create quiz");
        }
      }

      toast.success("Lesson updated!");
      cancelEditing();
    } catch {
      toast.error("Failed to update lesson");
    } finally {
      setSaving(false);
    }
  }

  // ── Lesson row renderer ────────────────────────────────────────────────────
  function renderLessonRows(lessons: Lesson[], sectionId: string) {
    return lessons.map((lesson) => {
      if (editingId === lesson.id) {
        return (
          <Reorder.Item key={lesson.id} value={lesson} as="div" dragListener={false}>
            <GlassCard className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-foreground font-semibold text-sm flex items-center gap-2">
                  <Pencil className="w-3.5 h-3.5 text-[#d97757]" /> Edit Lesson
                </h3>
                <div className="flex items-center gap-3">
                  {editForm.type !== "QUIZ" && <AutosaveIndicator status={autosaveStatus} />}
                  <button onClick={cancelEditing} className="text-muted-foreground/40 hover:text-muted-foreground p-1"><X className="w-4 h-4" /></button>
                </div>
              </div>
              <LessonFormFields form={editForm} setForm={setEditForm} quizForm={editQuizForm} setQuizForm={setEditQuizForm} loadingQuiz={loadingQuiz} helpers={helpers} />
              <div className="flex gap-2 pt-1">
                <button onClick={handleSaveEdit} disabled={saving || !editForm.title} className="btn-primary flex items-center gap-2 text-sm">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Changes
                </button>
                <button onClick={cancelEditing} className="btn-ghost text-sm border border-border">Cancel</button>
              </div>
            </GlassCard>
          </Reorder.Item>
        );
      }

      return (
        <DraggableLessonRow
          key={lesson.id}
          lesson={lesson}
          deletingId={deletingId}
          onEdit={() => { void startEditing(lesson); }}
          onDelete={() => { void handleDelete(lesson.id); }}
          onDragEnd={() => { void handleReorderEnd(sectionId); }}
        />
      );
    });
  }

  // ── Add lesson form renderer ───────────────────────────────────────────────
  function renderAddLessonForm(sectionId: string) {
    if (addingToSectionId !== sectionId) return null;
    return (
      <GlassCard className="space-y-4 mt-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-foreground font-semibold text-sm flex items-center gap-2">
            <PlusCircle className="w-3.5 h-3.5 text-emerald-400" /> New Lesson
          </h3>
          {form.type !== "QUIZ" && <AutosaveIndicator status={formAutosaveStatus} />}
        </div>
        <LessonFormFields form={form} setForm={setForm} quizForm={quizForm} setQuizForm={setQuizForm} loadingQuiz={false} helpers={helpers} />
        <div className="flex gap-2 pt-1">
          <button onClick={handleAddLesson} disabled={submitting || !form.title} className="btn-primary flex items-center gap-2 text-sm">
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {form.type !== "QUIZ" && draftLessonId ? "Done" : "Add Lesson"}
          </button>
          <button onClick={closeNewLessonForm} className="btn-ghost text-sm border border-border">
            {form.type !== "QUIZ" && draftLessonId ? "Close" : "Cancel"}
          </button>
        </div>
      </GlassCard>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Add Chapter button / form ── */}
      {showAddSection ? (
        <GlassCard className="space-y-3">
          <h3 className="text-foreground font-semibold text-sm flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5 text-[#d97757]" /> New Chapter
          </h3>
          <input
            type="text"
            value={newSectionTitle}
            onChange={(e) => setNewSectionTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAddSection(); if (e.key === "Escape") { setShowAddSection(false); setNewSectionTitle(""); } }}
            className="input-glass"
            placeholder="Chapter title e.g. Introduction"
            autoFocus
          />
          <div className="flex gap-2">
            <button onClick={handleAddSection} disabled={savingSection || !newSectionTitle.trim()} className="btn-primary flex items-center gap-2 text-sm">
              {savingSection ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Add Chapter
            </button>
            <button onClick={() => { setShowAddSection(false); setNewSectionTitle(""); }} className="btn-ghost text-sm border border-border">Cancel</button>
          </div>
        </GlassCard>
      ) : (
        <button
          onClick={() => setShowAddSection(true)}
          className="flex items-center gap-2 text-sm text-[#d97757] hover:text-orange-300 font-medium transition-colors"
        >
          <BookOpen className="w-4 h-4" /> + Add Chapter
        </button>
      )}

      {/* ── Sections (chapters) ── */}
      {sections.length > 0 && (
        <Reorder.Group
          axis="y"
          values={sections}
          onReorder={handleReorderSections}
          as="div"
          className="space-y-3"
        >
          {sections.map((section, sIdx) => {
            const isCollapsed  = collapsedSections.has(section.id);
            const isEditingTitle = editingSectionId === section.id;
            const isDeleting   = deletingSectionId === section.id;
            const reordering   = reorderSavingFor === section.id;

            return (
              <SectionBlock
                key={section.id}
                section={section}
                sIdx={sIdx}
                totalSections={sections.length}
                isCollapsed={isCollapsed}
                isEditingTitle={isEditingTitle}
                editSectionTitle={editSectionTitle}
                setEditSectionTitle={setEditSectionTitle}
                isDeleting={isDeleting}
                savingSection={savingSection}
                reordering={reordering}
                onToggleCollapse={() =>
                  setCollapsedSections((prev) => {
                    const next = new Set(prev);
                    if (next.has(section.id)) next.delete(section.id); else next.add(section.id);
                    return next;
                  })
                }
                onStartEditTitle={() => { setEditingSectionId(section.id); setEditSectionTitle(section.title); }}
                onSaveTitle={() => handleSaveSectionTitle(section.id)}
                onCancelEditTitle={() => setEditingSectionId(null)}
                onDelete={() => handleDeleteSection(section.id)}
                onLessonsReorder={(reordered) => {
                  setSections((prev) => prev.map((s) => s.id === section.id ? { ...s, lessons: reordered } : s));
                  sectionLessonsRef.current[section.id] = reordered;
                }}
              >
                {/* Lesson rows */}
                {!isCollapsed && (
                  <>
                    <Reorder.Group
                      axis="y"
                      values={section.lessons}
                      onReorder={(reordered) => {
                        setSections((prev) => prev.map((s) => s.id === section.id ? { ...s, lessons: reordered } : s));
                        sectionLessonsRef.current[section.id] = reordered;
                      }}
                      as="div"
                      className="space-y-2"
                    >
                      {renderLessonRows(section.lessons, section.id)}
                    </Reorder.Group>

                    {section.lessons.length === 0 && addingToSectionId !== section.id && (
                      <p className="text-muted-foreground/50 text-xs text-center py-4">No lessons yet — add one below.</p>
                    )}

                    {/* Inline add lesson form */}
                    {renderAddLessonForm(section.id)}

                    {/* Add lesson button */}
                    {addingToSectionId !== section.id && !editingId && (
                      <button
                        onClick={() => openAddLessonForm(section.id)}
                        className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-md border border-dashed border-border/60 text-muted-foreground hover:text-foreground hover:border-white/30 hover:bg-secondary/40 transition-all text-sm"
                      >
                        <PlusCircle className="w-3.5 h-3.5" /> Add Lesson
                      </button>
                    )}

                    {reordering && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Saving order…
                      </p>
                    )}
                  </>
                )}
              </SectionBlock>
            );
          })}
        </Reorder.Group>
      )}

      {/* ── Ungrouped lessons (no section) ── */}
      {(ungroupedLessons.length > 0 || addingToSectionId === "ungrouped") && (
        <div className="space-y-2">
          {sections.length > 0 && (
            <p className="text-xs text-muted-foreground/50 font-semibold uppercase tracking-wider px-1 pt-2">
              Ungrouped Lessons
            </p>
          )}
          <Reorder.Group
            axis="y"
            values={ungroupedLessons}
            onReorder={(reordered) => { setUngroupedLessons(reordered); ungroupedRef.current = reordered; }}
            as="div"
            className="space-y-2"
          >
            {renderLessonRows(ungroupedLessons, "ungrouped")}
          </Reorder.Group>

          {renderAddLessonForm("ungrouped")}

          {addingToSectionId !== "ungrouped" && !editingId && (
            <button
              onClick={() => openAddLessonForm("ungrouped")}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-md border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-white/40 hover:bg-secondary transition-all text-sm"
            >
              <PlusCircle className="w-4 h-4" /> Add Lesson {sections.length > 0 ? "(ungrouped)" : ""}
            </button>
          )}
        </div>
      )}

      {/* ── Empty state (no sections, no lessons) ── */}
      {sections.length === 0 && ungroupedLessons.length === 0 && addingToSectionId === null && (
        <GlassCard className="text-center py-10 space-y-3">
          <BookOpen className="w-10 h-10 text-muted-foreground/20 mx-auto" />
          <p className="text-muted-foreground/70">No chapters or lessons yet.</p>
          <p className="text-muted-foreground/40 text-xs">Add a chapter to organise lessons, or add a lesson directly.</p>
          <div className="flex items-center justify-center gap-3 pt-1">
            <button onClick={() => setShowAddSection(true)} className="btn-primary text-sm flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" /> Add Chapter
            </button>
            <button onClick={() => openAddLessonForm("ungrouped")} className="btn-ghost text-sm border border-border">
              Add Lesson
            </button>
          </div>
        </GlassCard>
      )}

      {/* ── Add lesson button when no chapters (flat mode) ── */}
      {sections.length === 0 && (ungroupedLessons.length > 0 || addingToSectionId !== null) && addingToSectionId !== "ungrouped" && !editingId && (
        <button
          onClick={() => openAddLessonForm("ungrouped")}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-md border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-white/40 hover:bg-secondary transition-all text-sm"
        >
          <PlusCircle className="w-4 h-4" /> Add Lesson
        </button>
      )}
    </div>
  );
}

// ── SectionBlock ───────────────────────────────────────────────────────────────

interface SectionBlockProps {
  section: SectionData;
  sIdx: number;
  totalSections: number;
  isCollapsed: boolean;
  isEditingTitle: boolean;
  editSectionTitle: string;
  setEditSectionTitle: (v: string) => void;
  isDeleting: boolean;
  savingSection: boolean;
  reordering: boolean;
  onToggleCollapse: () => void;
  onStartEditTitle: () => void;
  onSaveTitle: () => void;
  onCancelEditTitle: () => void;
  onDelete: () => void;
  onLessonsReorder: (lessons: Lesson[]) => void;
  children?: React.ReactNode;
}

function SectionBlock({
  section, sIdx, isCollapsed, isEditingTitle, editSectionTitle, setEditSectionTitle,
  isDeleting, savingSection, onToggleCollapse, onStartEditTitle, onSaveTitle,
  onCancelEditTitle, onDelete, children,
}: SectionBlockProps) {
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={section}
      as="div"
      dragControls={controls}
      dragListener={false}
      whileDrag={{ scale: 1.01, boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}
    >
      <div className="rounded-xl border border-border bg-card/60 overflow-hidden">
        {/* Chapter header */}
        <div className="flex items-center gap-2 px-3 py-3 bg-secondary/40 border-b border-border/60">
          {/* Drag handle */}
          <GripVertical
            className="w-4 h-4 text-muted-foreground/30 hover:text-muted-foreground/70 cursor-grab active:cursor-grabbing flex-shrink-0 transition-colors"
            onPointerDown={(e) => controls.start(e)}
          />

          {/* Chapter number badge */}
          <div className="flex-shrink-0 w-6 h-6 rounded-md bg-[#d97757]/15 border border-[#d97757]/20 flex items-center justify-center text-[10px] font-bold text-[#d97757]">
            {sIdx + 1}
          </div>

          {/* Title / edit input */}
          {isEditingTitle ? (
            <input
              type="text"
              value={editSectionTitle}
              onChange={(e) => setEditSectionTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") onSaveTitle(); if (e.key === "Escape") onCancelEditTitle(); }}
              className="flex-1 bg-background border border-border rounded-md px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#d97757]/50"
              autoFocus
            />
          ) : (
            <p className="flex-1 text-sm font-semibold text-foreground truncate">{section.title}</p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {isEditingTitle ? (
              <>
                <button onClick={onSaveTitle} disabled={savingSection} className="p-1.5 text-emerald-400 hover:text-emerald-300 transition-colors" title="Save">
                  {savingSection ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                </button>
                <button onClick={onCancelEditTitle} className="p-1.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors" title="Cancel">
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <>
                <span className="text-[10px] text-muted-foreground/40 mr-1">
                  {section.lessons.length} lesson{section.lessons.length !== 1 ? "s" : ""}
                </span>
                <button onClick={onStartEditTitle} className="p-1.5 text-muted-foreground/40 hover:text-[#d97757] transition-colors" title="Edit title">
                  <Pencil className="w-3 h-3" />
                </button>
                <button onClick={onDelete} disabled={isDeleting} className="p-1.5 text-muted-foreground/40 hover:text-red-400 transition-colors" title="Delete chapter">
                  {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                </button>
                <button onClick={onToggleCollapse} className="p-1.5 text-muted-foreground/40 hover:text-muted-foreground transition-colors" title={isCollapsed ? "Expand" : "Collapse"}>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""}`} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Lessons area */}
        {!isCollapsed && (
          <div className="p-3 space-y-2">
            {children}
          </div>
        )}
      </div>
    </Reorder.Item>
  );
}

// ── LessonFormFields ──────────────────────────────────────────────────────────

function LessonFormFields({
  form, setForm, quizForm, setQuizForm, loadingQuiz, helpers,
}: {
  form: typeof emptyForm;
  setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>;
  quizForm: typeof emptyQuizForm;
  setQuizForm: React.Dispatch<React.SetStateAction<typeof emptyQuizForm>>;
  loadingQuiz: boolean;
  helpers: {
    addQuestion: (s: typeof setQuizForm) => void;
    removeQuestion: (s: typeof setQuizForm, idx: number) => void;
    updateQuestion: (s: typeof setQuizForm, idx: number, field: string, value: unknown) => void;
    addOption: (s: typeof setQuizForm, qi: number) => void;
    removeOption: (s: typeof setQuizForm, qi: number, oi: number) => void;
    updateOption: (s: typeof setQuizForm, qi: number, oi: number, field: string, value: unknown) => void;
  };
}) {
  return (
    <>
      <div>
        <label className="label">Title</label>
        <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-glass" placeholder="Lesson title" />
      </div>

      <div>
        <label className="label">Type</label>
        <div className="flex gap-2">
          {(["TEXT", "VIDEO", "QUIZ"] as const).map((t) => {
            const Icon = typeIcons[t];
            return (
              <button key={t} type="button" onClick={() => setForm({ ...form, type: t })}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md border text-sm transition-all ${
                  form.type === t
                    ? t === "QUIZ" ? "bg-amber-500/20 border-amber-400/40 text-foreground" : "bg-orange-500/15 border-[#d97757]/25 text-foreground"
                    : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {t === "VIDEO" ? "Video" : t === "TEXT" ? "Text" : "Quiz"}
              </button>
            );
          })}
        </div>
      </div>

      {form.type !== "QUIZ" && (
        <div>
          <label className="label">{form.type === "VIDEO" ? "Video URL (embed)" : "Content"}</label>
          {form.type === "VIDEO" ? (
            <input type="url" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="input-glass" placeholder="https://www.youtube.com/embed/..." />
          ) : (
            <MarkdownEditor value={form.content} onChange={(content) => setForm({ ...form, content })} rows={10} />
          )}
        </div>
      )}

      {form.type === "VIDEO" && (
        <div>
          <label className="label">Duration (minutes)</label>
          <input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} className="input-glass" placeholder="e.g. 15" min={1} />
        </div>
      )}

      {form.type === "QUIZ" && (
        <QuizBuilderInline quizForm={quizForm} setQuizForm={setQuizForm} loading={loadingQuiz} helpers={helpers} />
      )}

      <div className="flex items-center justify-between bg-secondary border border-border rounded-md px-4 py-3">
        <div>
          <p className="text-foreground text-sm font-medium">Free preview</p>
          <p className="text-muted-foreground/70 text-xs mt-0.5">Allow non-enrolled users to view</p>
        </div>
        <button type="button" onClick={() => setForm({ ...form, isFree: !form.isFree })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isFree ? "bg-emerald-500" : "bg-white/20"}`}
        >
          <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${form.isFree ? "translate-x-6" : "translate-x-1"}`} />
        </button>
      </div>
    </>
  );
}

// ── QuizBuilderInline ─────────────────────────────────────────────────────────

function QuizBuilderInline({
  quizForm, setQuizForm, loading, helpers,
}: {
  quizForm: typeof emptyQuizForm;
  setQuizForm: React.Dispatch<React.SetStateAction<typeof emptyQuizForm>>;
  loading: boolean;
  helpers: {
    addQuestion: (s: React.Dispatch<React.SetStateAction<typeof emptyQuizForm>>) => void;
    removeQuestion: (s: React.Dispatch<React.SetStateAction<typeof emptyQuizForm>>, idx: number) => void;
    updateQuestion: (s: React.Dispatch<React.SetStateAction<typeof emptyQuizForm>>, idx: number, field: string, value: unknown) => void;
    addOption: (s: React.Dispatch<React.SetStateAction<typeof emptyQuizForm>>, qi: number) => void;
    removeOption: (s: React.Dispatch<React.SetStateAction<typeof emptyQuizForm>>, qi: number, oi: number) => void;
    updateOption: (s: React.Dispatch<React.SetStateAction<typeof emptyQuizForm>>, qi: number, oi: number, field: string, value: unknown) => void;
  };
}) {
  if (loading) return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="w-5 h-5 text-[#d97757] animate-spin" />
      <span className="text-muted-foreground/70 text-sm ml-2">Loading quiz…</span>
    </div>
  );

  return (
    <div className="space-y-4 border border-amber-400/20 rounded-md p-4 bg-amber-500/5">
      <div className="flex items-center gap-2 mb-1">
        <HelpCircle className="w-4 h-4 text-amber-400" />
        <span className="text-amber-400 text-sm font-semibold">Quiz Configuration</span>
      </div>

      <div>
        <label className="label">Quiz Title</label>
        <input type="text" value={quizForm.quizTitle} onChange={(e) => setQuizForm({ ...quizForm, quizTitle: e.target.value })} className="input-glass" placeholder="e.g. Module 1 Assessment" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Pass Mark (%)</label>
          <input type="number" value={quizForm.passMark} onChange={(e) => setQuizForm({ ...quizForm, passMark: Number(e.target.value) })} className="input-glass" min={0} max={100} />
        </div>
        <div>
          <label className="label">Time Limit (min, optional)</label>
          <input type="number" value={quizForm.timeLimit} onChange={(e) => setQuizForm({ ...quizForm, timeLimit: e.target.value })} className="input-glass" placeholder="e.g. 15" min={0} />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Questions ({quizForm.questions.length})</p>
          <button type="button" onClick={() => helpers.addQuestion(setQuizForm)} className="flex items-center gap-1 text-amber-400 text-xs hover:text-amber-300 transition-colors">
            <PlusCircle className="w-3.5 h-3.5" /> Add Question
          </button>
        </div>

        {quizForm.questions.map((q, qi) => (
          <div key={qi} className="bg-secondary border border-border rounded-md p-3 space-y-3">
            <div className="flex items-start justify-between">
              <span className="text-muted-foreground text-xs font-semibold">Q{qi + 1}</span>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <label className="text-muted-foreground/70 text-[10px]">Pts:</label>
                  <input type="number" className="input-glass w-14 text-center text-xs py-1" value={q.points}
                    onChange={(e) => helpers.updateQuestion(setQuizForm, qi, "points", Number(e.target.value))} min={1} max={10} />
                </div>
                <button type="button" onClick={() => helpers.removeQuestion(setQuizForm, qi)} className="text-red-400/60 hover:text-red-400 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <textarea className="input-glass w-full h-14 text-sm" placeholder="Enter your question…" value={q.text}
              onChange={(e) => helpers.updateQuestion(setQuizForm, qi, "text", e.target.value)} />
            <div className="space-y-1.5">
              <p className="text-muted-foreground/50 text-[10px] font-semibold uppercase">Options (click circle = correct)</p>
              {q.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <button type="button" onClick={() => helpers.updateOption(setQuizForm, qi, oi, "correct", true)}
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all flex-shrink-0 ${opt.correct ? "bg-emerald-500 border-emerald-400" : "bg-secondary border-border hover:border-white/40"}`}
                    title={opt.correct ? "Correct" : "Mark correct"}>
                    {opt.correct && <Check className="w-2.5 h-2.5 text-white" />}
                  </button>
                  <input type="text" className="input-glass flex-1 text-sm py-1.5" placeholder={`Option ${oi + 1}`} value={opt.text}
                    onChange={(e) => helpers.updateOption(setQuizForm, qi, oi, "text", e.target.value)} />
                  {q.options.length > 2 && (
                    <button type="button" onClick={() => helpers.removeOption(setQuizForm, qi, oi)} className="text-muted-foreground/30 hover:text-red-400 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => helpers.addOption(setQuizForm, qi)} className="text-[#d97757] text-xs hover:text-orange-300 transition-colors">
                + Add option
              </button>
            </div>
          </div>
        ))}

        {quizForm.questions.length === 0 && (
          <div className="text-center py-6 text-muted-foreground/50 text-sm">
            <p className="mb-2">No questions yet.</p>
            <button type="button" onClick={() => helpers.addQuestion(setQuizForm)} className="text-amber-400 hover:text-amber-300 text-xs flex items-center gap-1 mx-auto">
              <PlusCircle className="w-3.5 h-3.5" /> Add First Question
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── AutosaveIndicator ─────────────────────────────────────────────────────────

function AutosaveIndicator({ status }: { status: "idle" | "pending" | "saving" | "saved" | "error" }) {
  if (status === "idle")    return null;
  if (status === "pending") return <span className="flex items-center gap-1.5 text-muted-foreground/70 text-xs"><span className="w-1.5 h-1.5 rounded-full bg-amber-400/80" />Unsaved</span>;
  if (status === "saving")  return <span className="flex items-center gap-1.5 text-muted-foreground text-xs"><Loader2 className="w-3 h-3 animate-spin" />Saving…</span>;
  if (status === "saved")   return <span className="flex items-center gap-1.5 text-emerald-400 text-xs"><CloudUpload className="w-3 h-3" />Saved</span>;
  return <span className="flex items-center gap-1.5 text-red-400 text-xs"><CloudOff className="w-3 h-3" />Failed</span>;
}

// ── DraggableLessonRow ────────────────────────────────────────────────────────

function DraggableLessonRow({
  lesson, deletingId, onEdit, onDelete, onDragEnd,
}: {
  lesson: Lesson;
  deletingId: string | null;
  onEdit: () => void;
  onDelete: () => void;
  onDragEnd: () => void;
}) {
  const controls = useDragControls();
  const Icon      = typeIcons[lesson.type]  ?? FileText;
  const color     = typeColors[lesson.type] ?? "text-blue-400";
  const label     = typeLabels[lesson.type] ?? "Lesson";

  return (
    <Reorder.Item
      value={lesson}
      as="div"
      dragControls={controls}
      dragListener={false}
      onDragEnd={onDragEnd}
      whileDrag={{ scale: 1.01, boxShadow: "0 4px 20px rgba(0,0,0,0.25)" }}
      className="rounded-xl"
    >
      <GlassCard padding="sm" className="flex items-center gap-3 px-4 py-3 group">
        <GripVertical
          className="w-4 h-4 text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing flex-shrink-0 transition-colors"
          onPointerDown={(e) => controls.start(e)}
        />
        <Icon className={`w-4 h-4 flex-shrink-0 ${color}`} />
        <div className="flex-1 min-w-0">
          <p className="text-foreground text-sm font-medium truncate">{lesson.title}</p>
          <p className="text-muted-foreground/70 text-xs">
            {lesson.type === "VIDEO" ? (lesson.duration ? `Video · ${lesson.duration} min` : "Video") : label}
            {lesson.isFree && <span className="ml-2 text-emerald-400 font-medium">· Free preview</span>}
          </p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="text-[#d97757]/60 hover:text-[#d97757] transition-colors p-1.5 rounded-lg hover:bg-orange-500/10" title="Edit">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} disabled={deletingId === lesson.id} className="text-red-400/60 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10" title="Delete">
            {deletingId === lesson.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </GlassCard>
    </Reorder.Item>
  );
}
