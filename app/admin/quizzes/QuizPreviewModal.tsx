"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { X, Loader2, CheckCircle, HelpCircle, Clock } from "lucide-react";

const LABELS = ["A", "B", "C", "D", "E", "F", "G", "H"];

export default function QuizPreviewModal({
  quiz,
  onClose,
}: {
  quiz: any;
  onClose: () => void;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/quizzes/${quiz.id}`)
      .then((res) => res.json())
      .then((d) => setData(d.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [quiz.id]);

  return (
    <div className="fixed inset-0 z-50 bg-card flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg max-w-3xl w-full mx-4 max-h-[85vh] overflow-y-auto border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-slate-900 to-slate-800 border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-white">Quiz Preview</h2>
            <p className="text-muted-foreground text-sm">{quiz.title} &middot; {quiz.courseTitle}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
            </div>
          ) : !data ? (
            <div className="text-center py-12 text-muted-foreground/70">Failed to load quiz data.</div>
          ) : (
            <div className="space-y-6">
              {/* Quiz info */}
              <div className="flex items-center gap-4">
                <Badge variant="purple">{data.questionCount} questions</Badge>
                <Badge variant="amber">Pass: {data.passMark}%</Badge>
                {data.timeLimit && (
                  <Badge variant="blue">
                    <Clock className="w-3 h-3 mr-1" />{data.timeLimit}min
                  </Badge>
                )}
              </div>

              {/* Questions preview */}
              <div className="space-y-4">
                {data.questions?.map((q: any, qIdx: number) => {
                  const opts = (q.options || []) as Array<{ id: string; text: string; isCorrect?: boolean }>;
                  return (
                    <div key={q.id} className="bg-secondary border border-border rounded-xl p-4">
                      <div className="flex items-start justify-between mb-3">
                        <p className="text-white text-sm font-medium">
                          <span className="text-muted-foreground/70 mr-1.5">Q{qIdx + 1}.</span>
                          {q.text}
                        </p>
                        <span className="text-white/30 text-xs flex-shrink-0 ml-2">{q.points} pt{q.points > 1 ? "s" : ""}</span>
                      </div>
                      <div className="space-y-1.5 ml-1">
                        {opts.map((opt, oIdx) => (
                          <div
                            key={opt.id || oIdx}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm ${
                              opt.isCorrect
                                ? "bg-emerald-500/10 border border-emerald-400/20"
                                : "bg-white/[0.02]"
                            }`}
                          >
                            <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                              opt.isCorrect
                                ? "bg-emerald-500 text-white"
                                : "bg-secondary text-muted-foreground/70"
                            }`}>
                              {opt.isCorrect ? <CheckCircle className="w-3 h-3" /> : LABELS[oIdx]}
                            </span>
                            <span className={opt.isCorrect ? "text-emerald-300" : "text-muted-foreground"}>
                              {opt.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
