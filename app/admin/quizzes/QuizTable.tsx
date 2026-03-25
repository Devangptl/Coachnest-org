"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Eye, BarChart3, Trash2, Pencil } from "lucide-react";
import toast from "react-hot-toast";
import QuizAttemptsModal from "./QuizAttemptsModal";
import QuizAnalyticsModal from "./QuizAnalyticsModal";

export default function QuizTable({ quizzes }: { quizzes: any[] }) {
  const [selectedQuiz, setSelectedQuiz] = useState<any>(null);
  const [modalType, setModalType] = useState<"attempts" | "analytics" | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const getPassRateVariant = (rate: number) => {
    if (rate >= 80) return "green";
    if (rate >= 50) return "amber";
    return "red";
  };

  const handleDelete = async (quizId: string) => {
    if (!confirm("Delete this quiz and all its questions/attempts? This cannot be undone.")) return;
    setDeleteLoading(quizId);
    try {
      const res = await fetch(`/api/admin/quizzes/${quizId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Quiz deleted.");
      window.location.reload();
    } catch {
      toast.error("Error deleting quiz.");
    } finally {
      setDeleteLoading(null);
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
            </div>

            {/* Questions */}
            <div className="col-span-1 text-sm text-white/70">{quiz.questionCount}</div>

            {/* Pass Mark */}
            <div className="col-span-1 text-sm text-white/70">{quiz.passMark}%</div>

            {/* Attempts */}
            <div className="col-span-1 text-sm text-white/70">{quiz.attemptCount}</div>

            {/* Avg Score */}
            <div className="col-span-1 text-sm text-white font-semibold">{quiz.avgScore}%</div>

            {/* Pass Rate */}
            <div className="col-span-1">
              <Badge variant={getPassRateVariant(quiz.passRate)}>{quiz.passRate}%</Badge>
            </div>

            {/* Actions */}
            <div className="col-span-4 flex items-center justify-end gap-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  setSelectedQuiz(quiz);
                  setModalType("attempts");
                }}
                title="View Attempts"
              >
                <Eye className="w-4 h-4" />
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
                <BarChart3 className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                loading={deleteLoading === quiz.id}
                onClick={() => handleDelete(quiz.id)}
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {selectedQuiz && modalType === "attempts" && (
        <QuizAttemptsModal quiz={selectedQuiz} onClose={() => setModalType(null)} />
      )}
      {selectedQuiz && modalType === "analytics" && (
        <QuizAnalyticsModal quiz={selectedQuiz} onClose={() => setModalType(null)} />
      )}
    </>
  );
}
