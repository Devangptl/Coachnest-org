"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Eye, BarChart3, Trash2, Pencil, Copy, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import QuizAttemptsModal from "./QuizAttemptsModal";
import QuizAnalyticsModal from "./QuizAnalyticsModal";
import QuizPreviewModal from "./QuizPreviewModal";

export default function QuizTable({ quizzes }: { quizzes: any[] }) {
  const router = useRouter();
  const [selectedQuiz, setSelectedQuiz] = useState<any>(null);
  const [modalType, setModalType] = useState<"attempts" | "analytics" | "preview" | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState<string | null>(null);

  const getPassRateVariant = (rate: number) => {
    if (rate >= 80) return "green" as const;
    if (rate >= 50) return "amber" as const;
    return "red" as const;
  };

  const handleDelete = async (quizId: string) => {
    if (!confirm("Delete this quiz and all its questions/attempts? This cannot be undone.")) return;
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

  const handleDuplicate = async (quiz: any) => {
    setDuplicating(quiz.id);
    try {
      // Fetch full quiz details with questions
      const detailRes = await fetch(`/api/admin/quizzes/${quiz.id}`);
      if (!detailRes.ok) throw new Error("Failed to load quiz");
      const { data: fullQuiz } = await detailRes.json();

      // We can't create on same lesson (unique constraint), so inform admin
      toast.error("Cannot duplicate: quiz is linked to a lesson (1:1). Create a new quiz on another lesson instead.");
    } catch {
      toast.error("Error duplicating quiz.");
    } finally {
      setDuplicating(null);
    }
  };

  return (
    <>
      <div className="divide-y divide-white/5">
        {quizzes.map((quiz) => (
          <div
            key={quiz.id}
            className="grid grid-cols-12 gap-4 items-center px-4 py-3 hover:bg-white/5 transition-colors"
          >
            {/* Quiz / Lesson Name */}
            <div className="col-span-3 min-w-0">
              <p className="text-white text-sm font-medium truncate">{quiz.title}</p>
              {quiz.timeLimit && (
                <p className="text-white/30 text-[10px]">{quiz.timeLimit}min time limit</p>
              )}
            </div>

            {/* Questions */}
            <div className="col-span-1 text-sm text-white/70">{quiz.questionCount}</div>

            {/* Pass Mark */}
            <div className="col-span-1 text-sm text-white/70">{quiz.passMark}%</div>

            {/* Attempts */}
            <div className="col-span-1 text-sm text-white/70">{quiz.attemptCount}</div>

            {/* Avg Score */}
            <div className="col-span-1 text-sm text-white font-semibold">
              {quiz.attemptCount > 0 ? `${quiz.avgScore}%` : "—"}
            </div>

            {/* Pass Rate */}
            <div className="col-span-1">
              {quiz.attemptCount > 0 ? (
                <Badge variant={getPassRateVariant(quiz.passRate)}>{quiz.passRate}%</Badge>
              ) : (
                <span className="text-white/30 text-sm">—</span>
              )}
            </div>

            {/* Actions */}
            <div className="col-span-4 flex items-center justify-end gap-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  setSelectedQuiz(quiz);
                  setModalType("preview");
                }}
                title="Preview Quiz"
              >
                <Eye className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  setSelectedQuiz(quiz);
                  setModalType("attempts");
                }}
                title="View Attempts"
              >
                <BarChart3 className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  setSelectedQuiz(quiz);
                  setModalType("analytics");
                }}
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
