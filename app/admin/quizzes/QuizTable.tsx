"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Eye, BarChart3, Trash2, Pencil, Clock, HelpCircle, Target, Users, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { useConfirm } from "@/components/ui/UIDialogProvider";
import QuizAttemptsModal from "./QuizAttemptsModal";
import QuizAnalyticsModal from "./QuizAnalyticsModal";
import QuizPreviewModal from "./QuizPreviewModal";

export default function QuizTable({ quizzes }: { quizzes: any[] }) {
  const router = useRouter();
  const [selectedQuiz, setSelectedQuiz] = useState<any>(null);
  const [modalType, setModalType] = useState<"attempts" | "analytics" | "preview" | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const confirm = useConfirm();

  const getPassRateVariant = (rate: number) => {
    if (rate >= 80) return "green" as const;
    if (rate >= 50) return "amber" as const;
    return "red" as const;
  };

  const handleDelete = async (quizId: string) => {
    if (!await confirm("Delete this quiz and all its questions/attempts? This cannot be undone.", { title: "Delete Quiz", confirmText: "Delete" })) return;
    setDeleteLoading(quizId);
    try {
      const res = await fetch(`/api/admin/quizzes/${quizId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Quiz deleted.");
      router.refresh();
    } catch {
      toast.error("Error deleting quiz.");
    } finally {
      setDeleteLoading(null);
    }
  };

  return (
    <>
      <div className="divide-y divide-border/50">
        {quizzes.map((quiz) => (
          <div
            key={quiz.id}
            className="px-4 py-3.5 hover:bg-secondary/30 transition-colors"
          >
            {/* Row 1: title + time limit | pass rate */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-foreground text-sm font-medium truncate">{quiz.title}</p>
                {quiz.timeLimit && (
                  <p className="flex items-center gap-1 text-[11px] text-muted-foreground/60 mt-0.5">
                    <Clock className="w-3 h-3" /> {quiz.timeLimit}min limit
                  </p>
                )}
              </div>
              <div className="flex-shrink-0">
                {quiz.attemptCount > 0 ? (
                  <Badge variant={getPassRateVariant(quiz.passRate)}>{quiz.passRate}% pass</Badge>
                ) : (
                  <span className="text-xs text-muted-foreground/50">No attempts</span>
                )}
              </div>
            </div>

            {/* Row 2: stats chips */}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <HelpCircle className="w-3 h-3" /> {quiz.questionCount} questions
              </span>
              <span className="flex items-center gap-1">
                <Target className="w-3 h-3" /> {quiz.passMark}% pass mark
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" /> {quiz.attemptCount} attempts
              </span>
              {quiz.attemptCount > 0 && (
                <span className="flex items-center gap-1 text-foreground font-semibold">
                  <TrendingUp className="w-3 h-3 text-emerald-400" /> {quiz.avgScore}% avg
                </span>
              )}
            </div>

            {/* Row 3: actions */}
            <div className="mt-2 flex items-center gap-1">
              <Link href={`/admin/quizzes/${quiz.id}/edit`}>
                <Button size="icon" variant="ghost" title="Edit Quiz">
                  <Pencil className="w-4 h-4" />
                </Button>
              </Link>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => { setSelectedQuiz(quiz); setModalType("preview"); }}
                title="Preview Quiz"
              >
                <Eye className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => { setSelectedQuiz(quiz); setModalType("attempts"); }}
                title="View Attempts"
              >
                <BarChart3 className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => { setSelectedQuiz(quiz); setModalType("analytics"); }}
                title="Analytics"
              >
                <BarChart3 className="w-4 h-4 text-emerald-400" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                loading={deleteLoading === quiz.id}
                onClick={() => handleDelete(quiz.id)}
                title="Delete"
              >
                <Trash2 className="w-4 h-4 text-red-400/60" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {selectedQuiz && modalType === "preview" && (
        <QuizPreviewModal quiz={selectedQuiz} onClose={() => setModalType(null)} />
      )}
      {selectedQuiz && modalType === "attempts" && (
        <QuizAttemptsModal quiz={selectedQuiz} onClose={() => setModalType(null)} />
      )}
      {selectedQuiz && modalType === "analytics" && (
        <QuizAnalyticsModal quiz={selectedQuiz} onClose={() => setModalType(null)} />
      )}
    </>
  );
}
