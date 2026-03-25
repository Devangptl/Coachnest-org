"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { X, Loader2 } from "lucide-react";

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

  useEffect(() => {
    fetch(`/api/admin/quizzes/${quiz.id}/attempts`)
      .then((res) => res.json())
      .then((data) => setAttempts(data.data || []))
      .catch(() => setAttempts([]))
      .finally(() => setLoading(false));
  }, [quiz.id]);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl max-w-3xl w-full mx-4 max-h-[85vh] overflow-y-auto border border-white/10">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-slate-900 to-slate-800 border-b border-white/10 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-white">Quiz Attempts</h2>
            <p className="text-white/50 text-sm">{quiz.title} &middot; {quiz.courseTitle}</p>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
            </div>
          ) : attempts.length === 0 ? (
            <div className="text-center py-12 text-white/40">
              No attempts yet for this quiz.
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 px-3 py-2 text-xs text-white/40 font-semibold uppercase tracking-wider border-b border-white/10 mb-1">
                <div className="col-span-3">Student</div>
                <div className="col-span-2">Score</div>
                <div className="col-span-2">Result</div>
                <div className="col-span-2">Time</div>
                <div className="col-span-3">Date</div>
              </div>

              <div className="divide-y divide-white/5">
                {attempts.map((attempt) => (
                  <div
                    key={attempt.id}
                    className="grid grid-cols-12 gap-4 items-center px-3 py-3 hover:bg-white/5 transition-colors rounded"
                  >
                    <div className="col-span-3 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {attempt.studentName}
                      </p>
                      <p className="text-white/40 text-xs truncate">{attempt.studentEmail}</p>
                    </div>
                    <div className="col-span-2 text-white font-semibold text-sm">
                      {attempt.score}%
                    </div>
                    <div className="col-span-2">
                      <Badge variant={attempt.passed ? "green" : "red"}>
                        {attempt.passed ? "Passed" : "Failed"}
                      </Badge>
                    </div>
                    <div className="col-span-2 text-sm text-white/70">
                      {formatDuration(attempt.timeTaken)}
                    </div>
                    <div className="col-span-3 text-xs text-white/50">
                      {formatDate(attempt.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
