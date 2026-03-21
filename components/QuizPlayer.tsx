"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/Button";
import { CheckCircle, XCircle, Clock, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface Option   { id: string; text: string }
interface Question { id: string; text: string; options: Option[]; points: number }
interface FeedbackItem {
  questionText:   string;
  isCorrect:      boolean;
  correctOption:  string;
  selectedOption: string;
  options:        Option[];
}
interface Quiz {
  id:        string;
  title:     string;
  passMark:  number;
  timeLimit: number | null;
  questions: Question[];
}

interface Props {
  quiz:        Quiz;
  onComplete?: (score: number, passed: boolean) => void;
}

export default function QuizPlayer({ quiz, onComplete }: Props) {
  const [currentIdx,  setCurrentIdx]  = useState(0);
  const [answers,     setAnswers]     = useState<Record<string, string>>({});
  const [submitted,   setSubmitted]   = useState(false);
  const [result,      setResult]      = useState<{ score: number; passed: boolean; feedback: FeedbackItem[] } | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [timeLeft,    setTimeLeft]    = useState(quiz.timeLimit ? quiz.timeLimit * 60 : null);

  const q = quiz.questions[currentIdx];

  // Countdown timer
  const handleTimeUp = useCallback(async () => {
    if (!submitted) await submitQuiz();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted]);

  useEffect(() => {
    if (timeLeft === null || submitted) return;
    if (timeLeft === 0) { handleTimeUp(); return; }
    const id = setTimeout(() => setTimeLeft((t) => (t ?? 1) - 1), 1000);
    return () => clearTimeout(id);
  }, [timeLeft, submitted, handleTimeUp]);

  function selectOption(optionId: string) {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [q.id]: optionId }));
  }

  async function submitQuiz() {
    if (submitted || loading) return;
    setLoading(true);
    try {
      const elapsed = quiz.timeLimit ? quiz.timeLimit * 60 - (timeLeft ?? 0) : undefined;
      const res  = await fetch(`/api/quizzes/${quiz.id}/attempt`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ answers, timeTaken: elapsed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      setSubmitted(true);
      onComplete?.(data.score, data.passed);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setLoading(false);
    }
  }

  const allAnswered = quiz.questions.every((q) => q.id in answers);
  const mins = Math.floor((timeLeft ?? 0) / 60);
  const secs = (timeLeft ?? 0) % 60;

  if (submitted && result) {
    return <QuizResult quiz={quiz} result={result} />;
  }

  return (
    <div className="glass p-6 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold">{quiz.title}</h3>
          <p className="text-white/40 text-sm">
            Question {currentIdx + 1} of {quiz.questions.length}
          </p>
        </div>
        {timeLeft !== null && (
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium",
            timeLeft < 60 ? "bg-red-500/20 text-red-300 border border-red-400/30"
                          : "bg-white/10 text-white/70 border border-white/20"
          )}>
            <Clock className="w-3.5 h-3.5" />
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full transition-all"
          style={{ width: `${((currentIdx + 1) / quiz.questions.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={q.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{    opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          <p className="text-white font-medium leading-relaxed">{q.text}</p>
          <div className="space-y-2">
            {q.options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => selectOption(opt.id)}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-xl border text-sm transition-all",
                  answers[q.id] === opt.id
                    ? "bg-purple-500/20 border-purple-400/60 text-white"
                    : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20"
                )}
              >
                {opt.text}
              </button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
          disabled={currentIdx === 0}
        >
          Previous
        </Button>
        <span className="text-white/30 text-xs">
          {Object.keys(answers).length} / {quiz.questions.length} answered
        </span>
        {currentIdx < quiz.questions.length - 1 ? (
          <Button
            size="sm"
            onClick={() => setCurrentIdx((i) => i + 1)}
            disabled={!answers[q.id]}
          >
            Next
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={submitQuiz}
            loading={loading}
            disabled={!allAnswered}
          >
            Submit
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Result screen ─────────────────────────────────────────────────────────────

function QuizResult({
  quiz,
  result,
}: {
  quiz:   Quiz;
  result: { score: number; passed: boolean; feedback: FeedbackItem[] };
}) {
  return (
    <div className="glass p-6 space-y-6 max-w-2xl mx-auto animate-fade-in">
      {/* Score banner */}
      <div className={cn(
        "rounded-2xl p-6 text-center border",
        result.passed
          ? "bg-emerald-500/10 border-emerald-400/30"
          : "bg-red-500/10 border-red-400/30"
      )}>
        {result.passed
          ? <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-3" />
          : <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />}
        <p className="text-5xl font-bold text-white mb-1">{result.score}%</p>
        <p className={cn("text-lg font-semibold", result.passed ? "text-emerald-300" : "text-red-300")}>
          {result.passed ? "Passed!" : "Not passed"}
        </p>
        <p className="text-white/40 text-sm mt-1">
          Pass mark: {quiz.passMark}% &nbsp;·&nbsp; Your score: {result.score}%
        </p>
      </div>

      {/* Per-question feedback */}
      <div className="space-y-3">
        {result.feedback.map((fb, i) => (
          <div key={i} className={cn(
            "glass p-4 border",
            fb.isCorrect ? "border-emerald-400/20" : "border-red-400/20"
          )}>
            <div className="flex items-start gap-2 mb-2">
              {fb.isCorrect
                ? <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                : <XCircle    className="w-4 h-4 text-red-400    flex-shrink-0 mt-0.5" />}
              <p className="text-white/80 text-sm font-medium">{fb.questionText}</p>
            </div>
            {!fb.isCorrect && fb.correctOption && (
              <p className="text-emerald-400 text-xs ml-6">
                Correct answer: {fb.options.find((o) => o.id === fb.correctOption)?.text}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
