"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  XCircle,
  RotateCw,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface QuizQuestion {
  text: string;
  options: QuizOption[];
}

interface Props {
  lessonId: string;
}

export default function AiQuizGenerator({ lessonId }: Props) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [questionCount, setQuestionCount] = useState(5);

  async function generateQuiz() {
    setLoading(true);
    setError(null);
    setQuestions([]);
    setCurrentQ(0);
    setAnswers({});
    setShowResults(false);

    try {
      const res = await fetch("/api/ai-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, questionCount }),
      });

      if (!res.ok) {
        const text = await res.text();
        let msg = "Failed to generate quiz";
        try {
          const data = JSON.parse(text);
          msg = data.error || msg;
        } catch {
          if (text.includes("429") || text.includes("RESOURCE_EXHAUSTED")) {
            msg = "AI service rate limit reached. Please wait a minute and try again.";
          }
        }
        throw new Error(msg);
      }

      const data = await res.json();
      setQuestions(data.questions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function selectAnswer(questionIndex: number, optionId: string) {
    if (showResults) return;
    setAnswers((prev) => ({ ...prev, [questionIndex]: optionId }));
  }

  function submitQuiz() {
    setShowResults(true);
  }

  const score = showResults
    ? questions.reduce((acc, q, i) => {
        const selected = answers[i];
        const correct = q.options.find((o) => o.isCorrect)?.id;
        return acc + (selected === correct ? 1 : 0);
      }, 0)
    : 0;

  const allAnswered =
    questions.length > 0 &&
    Object.keys(answers).length === questions.length;

  // Initial state — generate button
  if (questions.length === 0 && !loading) {
    return (
      <div className="rounded-lg border border-border bg-secondary p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-400/20">
            <Sparkles className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              AI Quiz Generator
            </h3>
            <p className="text-xs text-muted-foreground">
              Test your understanding with AI-generated questions
            </p>
          </div>
        </div>

        {error && (
          <p className="mb-3 text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <select
            value={questionCount}
            onChange={(e) => setQuestionCount(Number(e.target.value))}
            className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400/50"
          >
            {[3, 5, 7, 10].map((n) => (
              <option key={n} value={n} className="bg-gray-900">
                {n} questions
              </option>
            ))}
          </select>
          <button
            onClick={generateQuiz}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            <Sparkles className="h-4 w-4" />
            Generate Quiz
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-secondary p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          Generating quiz questions from lesson content...
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">This may take a few seconds</p>
      </div>
    );
  }

  // Results state
  if (showResults) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="rounded-lg border border-border bg-secondary p-6">
        <div className="text-center mb-6">
          <div
            className={cn(
              "inline-flex h-16 w-16 items-center justify-center rounded-full mb-3",
              percentage >= 70
                ? "bg-green-500/20 text-green-400"
                : "bg-red-500/20 text-red-400"
            )}
          >
            {percentage >= 70 ? (
              <CheckCircle2 className="h-8 w-8" />
            ) : (
              <XCircle className="h-8 w-8" />
            )}
          </div>
          <h3 className="text-lg font-bold text-white">
            {score} / {questions.length} correct
          </h3>
          <p className="text-sm text-muted-foreground">{percentage}% score</p>
        </div>

        <div className="space-y-4 mb-6">
          {questions.map((q, i) => {
            const selected = answers[i];
            const correct = q.options.find((o) => o.isCorrect)?.id;
            const isCorrect = selected === correct;

            return (
              <div
                key={i}
                className={cn(
                  "rounded-xl border p-4",
                  isCorrect
                    ? "border-green-500/30 bg-green-500/5"
                    : "border-red-500/30 bg-red-500/5"
                )}
              >
                <p className="text-sm font-medium text-white mb-2">
                  {i + 1}. {q.text}
                </p>
                <div className="space-y-1.5">
                  {q.options.map((opt) => (
                    <div
                      key={opt.id}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs",
                        opt.isCorrect
                          ? "text-green-400 bg-green-500/10"
                          : opt.id === selected && !opt.isCorrect
                          ? "text-red-400 bg-red-500/10"
                          : "text-muted-foreground"
                      )}
                    >
                      {opt.isCorrect ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      ) : opt.id === selected ? (
                        <XCircle className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <div className="h-3.5 w-3.5 shrink-0" />
                      )}
                      {opt.text}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={generateQuiz}
          className="flex items-center gap-2 mx-auto rounded-xl bg-secondary px-4 py-2 text-sm font-medium text-white hover:bg-white/15 transition-colors"
        >
          <RotateCw className="h-4 w-4" />
          Generate New Quiz
        </button>
      </div>
    );
  }

  // Quiz in progress
  const q = questions[currentQ];
  return (
    <div className="rounded-lg border border-border bg-secondary p-6">
      {/* Progress */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-muted-foreground">
          Question {currentQ + 1} of {questions.length}
        </span>
        <span className="text-xs text-muted-foreground">
          {Object.keys(answers).length} answered
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary mb-6">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all"
          style={{
            width: `${((currentQ + 1) / questions.length) * 100}%`,
          }}
        />
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQ}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <p className="text-base font-medium text-white mb-4">{q.text}</p>
          <div className="space-y-2">
            {q.options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => selectAnswer(currentQ, opt.id)}
                className={cn(
                  "w-full text-left rounded-xl border px-4 py-3 text-sm transition-all",
                  answers[currentQ] === opt.id
                    ? "border-amber-400/50 bg-amber-500/10 text-white"
                    : "border-border bg-secondary text-muted-foreground hover:border-border hover:bg-secondary"
                )}
              >
                <span className="font-semibold mr-2 text-muted-foreground">
                  {opt.id.toUpperCase()}.
                </span>
                {opt.text}
              </button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={() => setCurrentQ((p) => Math.max(0, p - 1))}
          disabled={currentQ === 0}
          className="text-sm text-muted-foreground hover:text-white disabled:opacity-30 transition-colors"
        >
          Previous
        </button>

        {currentQ < questions.length - 1 ? (
          <button
            onClick={() => setCurrentQ((p) => p + 1)}
            className="flex items-center gap-1 text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={submitQuiz}
            disabled={!allAnswered}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-semibold transition-all",
              allAnswered
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90"
                : "bg-secondary text-white/30"
            )}
          >
            Submit Quiz
          </button>
        )}
      </div>
    </div>
  );
}
