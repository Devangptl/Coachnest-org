"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { X, Loader2, ChevronDown, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

function formatDuration(seconds: number | null) {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export default function QuizAttemptsModal({
  quiz,
  onClose,
}: {
  quiz: any;
  onClose: () => void;
}) {
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [quizDetail, setQuizDetail] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/quizzes/${quiz.id}/attempts`).then((r) => r.json()),
      fetch(`/api/admin/quizzes/${quiz.id}`).then((r) => r.json()),
    ])
      .then(([attemptsData, quizData]) => {
        setAttempts(attemptsData.data || []);
        setQuizDetail(quizData.data || null);
      })
      .catch(() => { setAttempts([]); setQuizDetail(null); })
      .finally(() => setLoading(false));
  }, [quiz.id]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-card rounded-lg w-full mx-4 max-h-[85vh] overflow-y-auto border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-foreground">Quiz Attempts</h2>
            <p className="text-muted-foreground text-sm">
              {quiz.title} &middot; {quiz.courseTitle}
              {attempts.length > 0 && <span className="ml-2">· {attempts.length} attempt{attempts.length !== 1 ? "s" : ""}</span>}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-[#d97757] animate-spin" />
            </div>
          ) : attempts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground/70">
              No attempts yet for this quiz.
            </div>
          ) : (
            <>
              {/* Summary stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {(() => {
                  const avgScore = Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length);
                  const passCount = attempts.filter((a) => a.passed).length;
                  const passRate = Math.round((passCount / attempts.length) * 100);
                  const avgTime = Math.round(attempts.reduce((s, a) => s + (a.timeTaken || 0), 0) / attempts.length);
                  return [
                    { label: "Total", value: attempts.length },
                    { label: "Avg Score", value: `${avgScore}%` },
                    { label: "Pass Rate", value: `${passRate}%` },
                    { label: "Avg Time", value: avgTime > 0 ? formatDuration(avgTime) : "—" },
                  ].map((s) => (
                    <div key={s.label} className="bg-secondary border border-border rounded-md p-3 text-center">
                      <p className="text-lg font-bold text-foreground">{s.value}</p>
                      <p className="text-muted-foreground/70 text-xs">{s.label}</p>
                    </div>
                  ));
                })()}
              </div>

              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 px-3 py-2 text-xs text-muted-foreground/70 font-semibold uppercase tracking-wider border-b border-border mb-1">
                <div className="col-span-3">Student</div>
                <div className="col-span-2">Score</div>
                <div className="col-span-2">Result</div>
                <div className="col-span-2">Time</div>
                <div className="col-span-3">Date</div>
              </div>

              <div className="divide-y divide-border/50">
                {attempts.map((attempt) => {
                  const isExpanded = expandedId === attempt.id;
                  const answers = attempt.answers as Record<string, string> || {};
                  const questions = quizDetail?.questions || [];

                  return (
                    <div key={attempt.id}>
                      <button
                        onClick={() => toggleExpand(attempt.id)}
                        className="grid grid-cols-12 gap-4 items-center px-3 py-3 hover:bg-secondary transition-colors rounded w-full text-left"
                      >
                        <div className="col-span-3 min-w-0">
                          <p className="text-foreground text-sm font-medium truncate">
                            {attempt.studentName}
                          </p>
                          <p className="text-muted-foreground/70 text-xs truncate">{attempt.studentEmail}</p>
                        </div>
                        <div className="col-span-2 text-foreground font-semibold text-sm">
                          {attempt.score}%
                        </div>
                        <div className="col-span-2">
                          <Badge variant={attempt.passed ? "green" : "red"}>
                            {attempt.passed ? "Passed" : "Failed"}
                          </Badge>
                        </div>
                        <div className="col-span-2 text-sm text-muted-foreground">
                          {formatDuration(attempt.timeTaken)}
                        </div>
                        <div className="col-span-3 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{formatDate(attempt.createdAt)}</span>
                          <ChevronDown className={cn(
                            "w-4 h-4 text-muted-foreground/50 transition-transform",
                            isExpanded && "rotate-180"
                          )} />
                        </div>
                      </button>

                      {/* Expanded: per-question answer breakdown */}
                      {isExpanded && questions.length > 0 && (
                        <div className="px-3 pb-4 pt-1">
                          <div className="bg-secondary/30 border border-border/50 rounded-md p-3 space-y-2">
                            <p className="text-muted-foreground/70 text-xs font-semibold uppercase tracking-wider mb-2">
                              Answer Breakdown
                            </p>
                            {questions.map((q: any, qIdx: number) => {
                              const opts = (q.options || []) as Array<{ id: string; text: string; isCorrect?: boolean }>;
                              const correctOpt = opts.find((o) => o.isCorrect);
                              const selectedId = answers[q.id];
                              const selectedOpt = opts.find((o) => o.id === selectedId);
                              const isCorrect = correctOpt && selectedId === correctOpt.id;

                              return (
                                <div key={q.id} className={cn(
                                  "flex items-start gap-2.5 p-2.5 rounded-lg",
                                  isCorrect ? "bg-emerald-500/5" : "bg-red-500/5"
                                )}>
                                  <span className={cn(
                                    "w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5",
                                    isCorrect ? "bg-emerald-500/20" : "bg-red-500/20"
                                  )}>
                                    {isCorrect
                                      ? <CheckCircle className="w-3 h-3 text-emerald-400" />
                                      : <XCircle className="w-3 h-3 text-red-400" />}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-muted-foreground text-xs">
                                      <span className="text-muted-foreground/50">Q{qIdx + 1}.</span> {q.text}
                                    </p>
                                    {!isCorrect && (
                                      <div className="mt-1 space-y-0.5">
                                        <p className="text-red-400/70 text-[11px]">
                                          Answered: {selectedOpt?.text || "—"}
                                        </p>
                                        <p className="text-emerald-400/70 text-[11px]">
                                          Correct: {correctOpt?.text || "—"}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
