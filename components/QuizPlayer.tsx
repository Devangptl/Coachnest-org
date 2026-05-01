"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/Button";
import {
  CheckCircle,
  XCircle,
  Clock,
  Trophy,
  HelpCircle,
  RotateCcw,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Flag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface Option { id: string; text: string }
interface Question { id: string; text: string; options: Option[]; points: number }
interface FeedbackItem {
  questionText: string;
  isCorrect: boolean;
  correctOption: string;
  selectedOption: string;
  options: Option[];
}
interface PreviousAttempt {
  id: string;
  score: number;
  passed: boolean;
  timeTaken: number | null;
  createdAt: string;
}
interface Quiz {
  id: string;
  title: string;
  passMark: number;
  timeLimit: number | null;
  questions: Question[];
  previousAttempts?: PreviousAttempt[];
  bestScore?: number | null;
  hasPassed?: boolean;
}

interface Props {
  quiz: Quiz;
  onComplete?: (score: number, passed: boolean) => void;
}

type Phase = "start" | "quiz" | "confirm" | "result";

const OPTION_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H"];

export default function QuizPlayer({ quiz, onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>("start");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<{ score: number; passed: boolean; feedback: FeedbackItem[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const q = quiz.questions[currentIdx];
  const totalPoints = useMemo(() => quiz.questions.reduce((s, q) => s + q.points, 0), [quiz.questions]);
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === quiz.questions.length;
  const unansweredCount = quiz.questions.length - answeredCount;

  // ── Timer ───────────────────────────────────────────────────────────────────
  const handleTimeUp = useCallback(async () => {
    if (phase === "quiz" || phase === "confirm") {
      await doSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (timeLeft === null || phase === "result" || phase === "start") return;
    if (timeLeft === 0) { handleTimeUp(); return; }
    const id = setTimeout(() => setTimeLeft((t) => (t ?? 1) - 1), 1000);
    return () => clearTimeout(id);
  }, [timeLeft, phase, handleTimeUp]);

  const mins = Math.floor((timeLeft ?? 0) / 60);
  const secs = (timeLeft ?? 0) % 60;

  // ── Actions ─────────────────────────────────────────────────────────────────

  function startQuiz() {
    setPhase("quiz");
    setCurrentIdx(0);
    setAnswers({});
    setFlagged(new Set());
    setResult(null);
    if (quiz.timeLimit) setTimeLeft(quiz.timeLimit * 60);
  }

  function selectOption(optionId: string) {
    if (phase !== "quiz") return;
    setAnswers((prev) => ({ ...prev, [q.id]: optionId }));
  }

  function toggleFlag() {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(q.id)) next.delete(q.id);
      else next.add(q.id);
      return next;
    });
  }

  function goToQuestion(idx: number) {
    setCurrentIdx(idx);
  }

  function trySubmit() {
    setPhase("confirm");
  }

  async function doSubmit() {
    if (loading) return;
    setLoading(true);
    try {
      const elapsed = quiz.timeLimit && timeLeft !== null ? quiz.timeLimit * 60 - timeLeft : undefined;
      const res = await fetch(`/api/quizzes/${quiz.id}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, timeTaken: elapsed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      setPhase("result");
      onComplete?.(data.score, data.passed);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit");
      setPhase("quiz");
    } finally {
      setLoading(false);
    }
  }

  // ── Start Screen ────────────────────────────────────────────────────────────
  if (phase === "start") {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="glass p-8 space-y-6 text-center">
          <div className="w-16 h-16 rounded-lg bg-amber-500/15 border border-amber-400/20 flex items-center justify-center mx-auto">
            <HelpCircle className="w-8 h-8 text-amber-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">{quiz.title}</h2>
            <p className="text-muted-foreground text-sm">Test your knowledge with this quiz</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-secondary border border-border rounded-md p-3">
              <p className="text-2xl font-bold text-white">{quiz.questions.length}</p>
              <p className="text-muted-foreground/70 text-xs">Questions</p>
            </div>
            <div className="bg-secondary border border-border rounded-md p-3">
              <p className="text-2xl font-bold text-white">{quiz.passMark}%</p>
              <p className="text-muted-foreground/70 text-xs">Pass Mark</p>
            </div>
            <div className="bg-secondary border border-border rounded-md p-3">
              <p className="text-2xl font-bold text-white">
                {quiz.timeLimit ? `${quiz.timeLimit}m` : "\u221E"}
              </p>
              <p className="text-muted-foreground/70 text-xs">Time Limit</p>
            </div>
          </div>

          {/* Previous attempts */}
          {quiz.previousAttempts && quiz.previousAttempts.length > 0 && (
            <div className={cn(
              "border rounded-md p-4 text-left",
              quiz.hasPassed
                ? "bg-emerald-500/5 border-emerald-400/20"
                : "bg-secondary border-border"
            )}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-muted-foreground text-sm font-medium">Previous Attempts</p>
                {quiz.hasPassed && (
                  <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Passed
                  </span>
                )}
              </div>
              <div className="space-y-1.5">
                {quiz.previousAttempts.slice(0, 3).map((a, i) => (
                  <div key={a.id} className="flex items-center gap-3 text-xs">
                    <span className="text-white/30 w-4">#{quiz.previousAttempts!.length - i}</span>
                    <span className={cn(
                      "font-semibold w-10",
                      a.passed ? "text-emerald-400" : "text-red-400"
                    )}>
                      {a.score}%
                    </span>
                    <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", a.passed ? "bg-emerald-500" : "bg-red-500")}
                        style={{ width: `${a.score}%` }}
                      />
                    </div>
                    {a.timeTaken && (
                      <span className="text-white/20 flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {Math.floor(a.timeTaken / 60)}m {a.timeTaken % 60}s
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {quiz.bestScore !== null && quiz.bestScore !== undefined && (
                <p className="text-muted-foreground/70 text-xs mt-2">
                  Best score: <span className="text-white font-semibold">{quiz.bestScore}%</span>
                  {" · "}{quiz.previousAttempts.length} attempt{quiz.previousAttempts.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          )}

          <div className="bg-secondary border border-border rounded-md p-4 text-left space-y-2">
            <p className="text-muted-foreground text-sm font-medium">Instructions:</p>
            <ul className="text-muted-foreground text-xs space-y-1">
              <li>- Select one answer per question</li>
              <li>- You can navigate between questions freely</li>
              <li>- Flag questions to review before submitting</li>
              <li>- You can skip questions and come back later</li>
              {quiz.timeLimit && (
                <li className="text-amber-400/70">- Quiz auto-submits when time runs out</li>
              )}
            </ul>
          </div>

          <Button onClick={startQuiz} className="w-full">
            {quiz.previousAttempts && quiz.previousAttempts.length > 0
              ? quiz.hasPassed ? "Retake Quiz" : "Try Again"
              : "Start Quiz"}
          </Button>
        </div>
      </div>
    );
  }

  // ── Confirm Submit Dialog ───────────────────────────────────────────────────
  if (phase === "confirm") {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="glass p-8 space-y-6 text-center">
          <div className="w-16 h-16 rounded-lg bg-amber-500/15 border border-amber-400/20 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-amber-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white mb-2">Submit Quiz?</h3>
            <p className="text-muted-foreground text-sm">
              {allAnswered
                ? `You've answered all ${quiz.questions.length} questions.`
                : `You have ${unansweredCount} unanswered question${unansweredCount > 1 ? "s" : ""}. Unanswered questions will be marked incorrect.`}
            </p>
            {flagged.size > 0 && (
              <p className="text-amber-400/70 text-sm mt-2">
                {flagged.size} question{flagged.size > 1 ? "s" : ""} flagged for review.
              </p>
            )}
          </div>

          {!allAnswered && (
            <div className="flex flex-wrap gap-1.5 justify-center">
              {quiz.questions.map((question, idx) => {
                const isAnswered = question.id in answers;
                const isFlagged = flagged.has(question.id);
                if (isAnswered && !isFlagged) return null;
                return (
                  <button
                    key={question.id}
                    onClick={() => { setPhase("quiz"); setCurrentIdx(idx); }}
                    className={cn(
                      "w-8 h-8 rounded-lg text-xs font-semibold border transition-all",
                      !isAnswered
                        ? "bg-red-500/15 border-red-400/30 text-red-400 hover:bg-red-500/25"
                        : "bg-amber-500/15 border-amber-400/30 text-amber-400 hover:bg-amber-500/25"
                    )}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setPhase("quiz")}
              className="flex-1"
            >
              Go Back
            </Button>
            <Button
              onClick={doSubmit}
              loading={loading}
              className="flex-1"
            >
              Submit Quiz
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Result Screen ───────────────────────────────────────────────────────────
  if (phase === "result" && result) {
    return (
      <QuizResult
        quiz={quiz}
        result={result}
        onRetry={startQuiz}
      />
    );
  }

  // ── Quiz Phase ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header with timer */}
      <div className="glass px-5 py-3 flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold text-sm">{quiz.title}</h3>
          <p className="text-muted-foreground/70 text-xs">
            Question {currentIdx + 1} of {quiz.questions.length}
            {q.points > 1 && <span className="ml-2 text-[#d97757]">({q.points} pts)</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white/30 text-xs">
            {answeredCount}/{quiz.questions.length}
          </span>
          {timeLeft !== null && (
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-mono font-medium",
              timeLeft < 60
                ? "bg-red-500/20 text-red-300 border border-red-400/30 animate-pulse"
                : timeLeft < 300
                ? "bg-amber-500/15 text-amber-300 border border-amber-400/20"
                : "bg-secondary text-muted-foreground border border-border"
            )}>
              <Clock className="w-3.5 h-3.5" />
              {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-orange-600 to-orange-500 rounded-full transition-all duration-300"
          style={{ width: `${(answeredCount / quiz.questions.length) * 100}%` }}
        />
      </div>

      {/* Question dots navigation */}
      <div className="glass px-4 py-3">
        <div className="flex flex-wrap gap-1.5 justify-center">
          {quiz.questions.map((question, idx) => {
            const isActive = idx === currentIdx;
            const isAnswered = question.id in answers;
            const isFlagged = flagged.has(question.id);
            return (
              <button
                key={question.id}
                onClick={() => goToQuestion(idx)}
                className={cn(
                  "w-8 h-8 rounded-lg text-xs font-semibold border transition-all relative",
                  isActive
                    ? "bg-orange-500/20 border-[#d97757]/25 text-white ring-1 ring-[#d97757]/30"
                    : isAnswered
                    ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-400"
                    : "bg-secondary border-border text-muted-foreground/70 hover:bg-secondary hover:border-border"
                )}
              >
                {idx + 1}
                {isFlagged && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border border-slate-900" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Question content */}
      <div className="glass p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={q.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.15 }}
            className="space-y-5"
          >
            <p className="text-white font-medium leading-relaxed text-base">{q.text}</p>
            <div className="space-y-2">
              {q.options.map((opt, idx) => {
                const isSelected = answers[q.id] === opt.id;
                const label = OPTION_LABELS[idx] || String(idx + 1);
                return (
                  <button
                    key={opt.id}
                    onClick={() => selectOption(opt.id)}
                    className={cn(
                      "w-full text-left px-4 py-3.5 rounded-md border text-sm transition-all flex items-center gap-3 group",
                      isSelected
                        ? "bg-orange-500/15 border-[#d97757]/25 text-white"
                        : "bg-white/[0.03] border-border text-muted-foreground hover:bg-white/[0.06] hover:border-border"
                    )}
                  >
                    <span className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 border transition-all",
                      isSelected
                        ? "bg-orange-500 border-[#d97757] text-white"
                        : "bg-secondary border-border text-muted-foreground group-hover:border-white/30"
                    )}>
                      {label}
                    </span>
                    <span className="flex-1">{opt.text}</span>
                    {isSelected && (
                      <CheckCircle className="w-4 h-4 text-[#d97757] flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom navigation */}
      <div className="glass px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
            disabled={currentIdx === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Prev
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFlag}
            className={cn(
              flagged.has(q.id) && "text-amber-400 border-amber-400/30 bg-amber-500/10"
            )}
          >
            <Flag className="w-3.5 h-3.5 mr-1" />
            {flagged.has(q.id) ? "Flagged" : "Flag"}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {currentIdx < quiz.questions.length - 1 ? (
            <Button size="sm" onClick={() => setCurrentIdx((i) => i + 1)}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button size="sm" onClick={trySubmit}>
              Finish & Review
            </Button>
          )}
          {answeredCount >= Math.ceil(quiz.questions.length * 0.5) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={trySubmit}
              className="text-muted-foreground/70"
            >
              Submit
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Result Screen ────────────────────────────────────────────────────────────

function QuizResult({
  quiz,
  result,
  onRetry,
}: {
  quiz: Quiz;
  result: { score: number; passed: boolean; feedback: FeedbackItem[] };
  onRetry: () => void;
}) {
  const [showReview, setShowReview] = useState(false);
  const correctCount = result.feedback.filter((f) => f.isCorrect).length;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Score banner */}
      <div className={cn(
        "glass rounded-lg p-8 text-center border",
        result.passed
          ? "border-emerald-400/30"
          : "border-red-400/30"
      )}>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
        >
          {result.passed
            ? <Trophy className="w-16 h-16 text-amber-400 mx-auto mb-4" />
            : <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />}
        </motion.div>

        <motion.p
          className="text-6xl font-bold text-white mb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {result.score}%
        </motion.p>
        <p className={cn("text-xl font-semibold", result.passed ? "text-emerald-300" : "text-red-300")}>
          {result.passed ? "Congratulations! You passed!" : "Not quite there yet"}
        </p>
        <p className="text-muted-foreground/70 text-sm mt-2">
          {correctCount} of {result.feedback.length} correct &nbsp;·&nbsp; Pass mark: {quiz.passMark}%
        </p>

        {/* Score breakdown bar */}
        <div className="mt-4 mx-auto max-w-xs">
          <div className="h-3 bg-secondary rounded-full overflow-hidden relative">
            {/* Pass mark indicator */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white/40 z-10"
              style={{ left: `${quiz.passMark}%` }}
            />
            <motion.div
              className={cn(
                "h-full rounded-full",
                result.passed
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                  : "bg-gradient-to-r from-red-500 to-red-400"
              )}
              initial={{ width: 0 }}
              animate={{ width: `${result.score}%` }}
              transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-white/20 text-[10px]">0%</span>
            <span className="text-white/30 text-[10px]">{quiz.passMark}% pass</span>
            <span className="text-white/20 text-[10px]">100%</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {!result.passed && (
          <Button variant="primary" onClick={onRetry} className="flex-1 flex items-center justify-center gap-2">
            <RotateCcw className="w-4 h-4" /> Retry Quiz
          </Button>
        )}
        <Button
          variant={result.passed ? "primary" : "secondary"}
          onClick={() => setShowReview(!showReview)}
          className="flex-1"
        >
          {showReview ? "Hide Review" : "Review Answers"}
        </Button>
      </div>

      {/* Per-question review */}
      <AnimatePresence>
        {showReview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 overflow-hidden"
          >
            {result.feedback.map((fb, i) => {
              const selectedOpt = fb.options.find((o) => o.id === fb.selectedOption);
              const correctOpt = fb.options.find((o) => o.id === fb.correctOption);
              return (
                <div key={i} className={cn(
                  "glass p-4 border",
                  fb.isCorrect ? "border-emerald-400/20" : "border-red-400/20"
                )}>
                  <div className="flex items-start gap-2.5 mb-3">
                    <span className={cn(
                      "w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5",
                      fb.isCorrect ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                    )}>
                      {fb.isCorrect ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    </span>
                    <p className="text-white/90 text-sm font-medium leading-relaxed">
                      <span className="text-muted-foreground/70 mr-1.5">Q{i + 1}.</span>
                      {fb.questionText}
                    </p>
                  </div>

                  <div className="ml-8 space-y-1.5">
                    {fb.selectedOption && !fb.isCorrect && (
                      <p className="text-red-400/80 text-xs flex items-center gap-1.5">
                        <XCircle className="w-3 h-3" />
                        Your answer: {selectedOpt?.text || "—"}
                      </p>
                    )}
                    {!fb.isCorrect && correctOpt && (
                      <p className="text-emerald-400/80 text-xs flex items-center gap-1.5">
                        <CheckCircle className="w-3 h-3" />
                        Correct answer: {correctOpt.text}
                      </p>
                    )}
                    {!fb.selectedOption && (
                      <p className="text-white/30 text-xs italic">Not answered</p>
                    )}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
