"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, PlusCircle, Trash2, GripVertical, Check, Loader2, X } from "lucide-react";
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

export default function EditQuizPage() {
  const router = useRouter();
  const params = useParams();
  const quizId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quizInfo, setQuizInfo] = useState<any>(null);

  const [title, setTitle] = useState("");
  const [passMark, setPassMark] = useState(70);
  const [timeLimit, setTimeLimit] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);

  // Load existing quiz data
  useEffect(() => {
    fetch(`/api/admin/quizzes/${quizId}`)
      .then((res) => res.json())
      .then(({ data }) => {
        if (!data) { toast.error("Quiz not found"); router.push("/admin/quizzes"); return; }
        setQuizInfo(data);
        setTitle(data.title || data.lessonTitle || "");
        setPassMark(data.passMark);
        setTimeLimit(data.timeLimit?.toString() || "");
        setQuestions(
          (data.questions || []).map((q: any) => {
            const opts = (q.options || []) as Array<{ id: string; text: string; isCorrect?: boolean }>;
            return {
              text: q.text,
              options: opts.map((o) => ({ text: o.text, correct: o.isCorrect ?? false })),
              points: q.points,
            };
          })
        );
      })
      .catch(() => toast.error("Failed to load quiz"))
      .finally(() => setLoading(false));
  }, [quizId, router]);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      { text: "", options: [{ text: "", correct: true }, { text: "", correct: false }], points: 1 },
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
      updated[qIdx].options.forEach((o, i) => { o.correct = i === oIdx; });
    } else {
      (updated[qIdx].options[oIdx] as any)[field] = value;
    }
    setQuestions(updated);
  };

  const handleSave = async () => {
    if (!title) return toast.error("Quiz title is required.");
    if (questions.length === 0) return toast.error("Add at least one question.");

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) return toast.error(`Question ${i + 1} text is empty.`);
      if (q.options.length < 2) return toast.error(`Question ${i + 1} needs at least 2 options.`);
      if (!q.options.some((o) => o.correct))
        return toast.error(`Question ${i + 1} needs a correct answer.`);
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j].text.trim())
          return toast.error(`Q${i + 1} option ${j + 1} is empty.`);
      }
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/quizzes/${quizId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          passMark,
          timeLimit: timeLimit ? Number(timeLimit) : null,
          questions: questions.map((q, idx) => ({
            text: q.text,
            options: q.options,
            points: q.points,
            order: idx + 1,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) return toast.error(data.error || "Failed to update quiz.");

      toast.success("Quiz updated successfully!");
      router.push("/admin/quizzes");
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-[#d97757] animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/admin/quizzes"
          className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Quizzes
        </Link>
        <h1 className="text-3xl font-bold text-foreground">Edit Quiz</h1>
        <p className="text-muted-foreground mt-1">
          {quizInfo?.courseTitle && <span>{quizInfo.courseTitle} &middot; </span>}
          {quizInfo?.title || ""}
          {quizInfo?.attemptCount > 0 && (
            <span className="text-amber-400 ml-2">({quizInfo.attemptCount} existing attempts)</span>
          )}
        </p>
      </div>

      <div className="max-w-3xl space-y-6">
        {/* Quiz Info */}
        <GlassCard padding="md">
          <h3 className="text-foreground font-semibold mb-4">Quiz Details</h3>
          <div className="space-y-4">
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
                  placeholder="No limit"
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
                <p className="mb-2">No questions. All questions were removed.</p>
                <Button variant="primary" size="sm" onClick={addQuestion}>
                  <PlusCircle className="w-4 h-4 mr-1" /> Add Question
                </Button>
              </div>
            </GlassCard>
          )}
        </div>

        {/* Save */}
        <div className="flex gap-3 pt-4">
          <Button
            variant="primary"
            loading={saving}
            onClick={handleSave}
            disabled={!title || questions.length === 0}
            className="flex-1"
          >
            Save Changes ({questions.length} questions)
          </Button>
          <Link href="/admin/quizzes">
            <Button variant="ghost">Cancel</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
