"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { ArrowLeft, PlusCircle, Trash2, GripVertical, Check, HelpCircle, X } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface Option {
  text: string;
  correct: boolean;
}

interface Question {
  text: string;
  options: Option[];
  points: number;
}

interface LessonOption {
  id: string;
  title: string;
  type: string;
  courseId: string;
  courseTitle: string;
  hasQuiz: boolean;
}

export default function NewQuizPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [lessons, setLessons] = useState<LessonOption[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(true);

  const [lessonId, setLessonId] = useState("");
  const [title, setTitle] = useState("");
  const [passMark, setPassMark] = useState(70);
  const [timeLimit, setTimeLimit] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);

  // Fetch lessons without quizzes
  useEffect(() => {
    fetch("/api/lessons?noQuiz=true")
      .then((res) => res.json())
      .then((data) => setLessons(data.data || []))
      .catch(() => setLessons([]))
      .finally(() => setLessonsLoading(false));
  }, []);

  // Group lessons by course for the dropdown
  const grouped = lessons.reduce<Record<string, { courseTitle: string; lessons: LessonOption[] }>>((acc, l) => {
    if (!acc[l.courseId]) acc[l.courseId] = { courseTitle: l.courseTitle, lessons: [] };
    acc[l.courseId].lessons.push(l);
    return acc;
  }, {});

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        text: "",
        options: [
          { text: "", correct: true },
          { text: "", correct: false },
        ],
        points: 1,
      },
    ]);
  };

  const removeQuestion = (idx: number) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const updateQuestion = (idx: number, field: string, value: any) => {
    const updated = [...questions];
    (updated[idx] as any)[field] = value;
    setQuestions(updated);
  };

  const addOption = (qIdx: number) => {
    const updated = [...questions];
    updated[qIdx].options.push({ text: "", correct: false });
    setQuestions(updated);
  };

  const removeOption = (qIdx: number, oIdx: number) => {
    const updated = [...questions];
    updated[qIdx].options = updated[qIdx].options.filter((_, i) => i !== oIdx);
    setQuestions(updated);
  };

  const updateOption = (qIdx: number, oIdx: number, field: string, value: any) => {
    const updated = [...questions];
    if (field === "correct" && value === true) {
      updated[qIdx].options.forEach((o, i) => {
        o.correct = i === oIdx;
      });
    } else {
      (updated[qIdx].options[oIdx] as any)[field] = value;
    }
    setQuestions(updated);
  };

  const handleSubmit = async () => {
    if (!lessonId) return toast.error("Please select a lesson.");
    if (!title) return toast.error("Please enter a quiz title.");
    if (questions.length === 0) return toast.error("Add at least one question.");

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) return toast.error(`Question ${i + 1} text is empty.`);
      if (q.options.length < 2) return toast.error(`Question ${i + 1} needs at least 2 options.`);
      if (!q.options.some((o) => o.correct))
        return toast.error(`Question ${i + 1} needs a correct answer.`);
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j].text.trim())
          return toast.error(`Question ${i + 1}, option ${j + 1} is empty.`);
      }
    }

    setLoading(true);
    try {
      // 1. Update the lesson type to QUIZ
      await fetch(`/api/lessons/${lessonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "QUIZ", content: null }),
      });

      // 2. Create the quiz
      const res = await fetch("/api/admin/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId,
          title,
          passMark,
          timeLimit: timeLimit ? Number(timeLimit) : undefined,
          questions: questions.map((q, idx) => ({
            text: q.text,
            options: q.options,
            points: q.points,
            order: idx + 1,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) return toast.error(data.error || "Failed to create quiz.");

      toast.success("Quiz created successfully!");
      router.push("/admin/quizzes");
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/admin/quizzes"
          className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Quizzes
        </Link>
        <h1 className="text-3xl font-bold text-foreground">Create Quiz</h1>
        <p className="text-muted-foreground mt-1">Build a new quiz with questions and options.</p>
      </div>

      <div className="max-w-3xl space-y-6">
        {/* Quiz Info */}
        <GlassCard padding="md">
          <h3 className="text-foreground font-semibold mb-4">Quiz Details</h3>
          <div className="space-y-4">
            <div>
              <label className="label">Lesson</label>
              {lessonsLoading ? (
                <div className="input-glass w-full flex items-center text-muted-foreground/50 text-sm">Loading lessons...</div>
              ) : lessons.length === 0 ? (
                <div className="bg-amber-500/10 border border-amber-400/20 rounded-md px-4 py-3 text-amber-400 text-sm">
                  <HelpCircle className="w-4 h-4 inline mr-2" />
                  All lessons already have quizzes. Create a new lesson with QUIZ type from the course editor instead.
                </div>
              ) : (
                <Select
                  value={lessonId}
                  onValueChange={setLessonId}
                  placeholder="Select a lesson…"
                  groups={Object.entries(grouped).map(([, group]) => ({
                    label: group.courseTitle,
                    options: group.lessons.map((l) => ({
                      value: l.id,
                      label: `${l.title} (${l.type})`,
                    })),
                  }))}
                />
              )}
              {lessonId && (
                <p className="text-muted-foreground/50 text-xs mt-1">
                  The lesson type will be automatically changed to QUIZ when you create this quiz.
                </p>
              )}
            </div>
            <div>
              <label className="label">Quiz Title</label>
              <input
                type="text"
                className="input-glass w-full"
                placeholder="e.g. Module 1 Assessment"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Pass Mark (%)</label>
                <input
                  type="number"
                  className="input-glass w-full"
                  value={passMark}
                  onChange={(e) => setPassMark(Number(e.target.value))}
                  min={0}
                  max={100}
                />
              </div>
              <div>
                <label className="label">Time Limit (minutes, optional)</label>
                <input
                  type="number"
                  className="input-glass w-full"
                  placeholder="e.g. 15"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(e.target.value)}
                  min={0}
                />
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Questions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-foreground font-semibold">
              Questions ({questions.length})
            </h3>
            <Button variant="ghost" size="sm" onClick={addQuestion} className="flex items-center gap-1">
              <PlusCircle className="w-4 h-4" /> Add Question
            </Button>
          </div>

          {questions.map((q, qIdx) => (
            <GlassCard key={qIdx} padding="md">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-muted-foreground/30" />
                  <span className="text-foreground font-semibold text-sm">
                    Question {qIdx + 1}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <label className="text-muted-foreground text-xs">Points:</label>
                    <input
                      type="number"
                      className="input-glass w-16 text-center text-sm"
                      value={q.points}
                      onChange={(e) => updateQuestion(qIdx, "points", Number(e.target.value))}
                      min={1}
                      max={10}
                    />
                  </div>
                  <button
                    onClick={() => removeQuestion(qIdx)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <textarea
                  className="input-glass w-full h-16"
                  placeholder="Enter your question..."
                  value={q.text}
                  onChange={(e) => updateQuestion(qIdx, "text", e.target.value)}
                />

                <div className="space-y-2">
                  <p className="text-muted-foreground/70 text-xs font-semibold uppercase">
                    Options (click circle to mark correct)
                  </p>
                  {q.options.map((opt, oIdx) => (
                    <div key={oIdx} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateOption(qIdx, oIdx, "correct", true)}
                        className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all flex-shrink-0 ${
                          opt.correct
                            ? "bg-emerald-500 border-emerald-400"
                            : "bg-secondary border-border hover:border-white/40"
                        }`}
                        title={opt.correct ? "Correct answer" : "Mark as correct"}
                      >
                        {opt.correct && <Check className="w-3 h-3 text-[#fff]" />}
                      </button>
                      <input
                        type="text"
                        className="input-glass flex-1"
                        placeholder={`Option ${oIdx + 1}`}
                        value={opt.text}
                        onChange={(e) => updateOption(qIdx, oIdx, "text", e.target.value)}
                      />
                      {q.options.length > 2 && (
                        <button
                          onClick={() => removeOption(qIdx, oIdx)}
                          className="text-muted-foreground/40 hover:text-red-400 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addOption(qIdx)}
                    className="text-[#d97757] text-xs hover:text-orange-300 transition-colors"
                  >
                    + Add option
                  </button>
                </div>
              </div>
            </GlassCard>
          ))}

          {questions.length === 0 && (
            <GlassCard padding="md">
              <div className="text-center py-6 text-muted-foreground/70">
                <p className="mb-2">No questions added yet.</p>
                <Button variant="primary" size="sm" onClick={addQuestion}>
                  <PlusCircle className="w-4 h-4 mr-1" /> Add First Question
                </Button>
              </div>
            </GlassCard>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-4">
          <Button
            variant="primary"
            loading={loading}
            onClick={handleSubmit}
            disabled={!lessonId || !title || questions.length === 0}
            className="flex-1"
          >
            Create Quiz ({questions.length} questions)
          </Button>
          <Link href="/admin/quizzes">
            <Button variant="ghost">Cancel</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
