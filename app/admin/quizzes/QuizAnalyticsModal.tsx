"use client";

import { useEffect, useState } from "react";
import GlassCard from "@/components/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { X, Loader2, BarChart3, Target, Clock, Users } from "lucide-react";

export default function QuizAnalyticsModal({
  quiz,
  onClose,
}: {
  quiz: any;
  onClose: () => void;
}) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/quizzes/${quiz.id}/analytics`)
      .then((res) => res.json())
      .then((data) => setAnalytics(data.data))
      .catch(() => setAnalytics(null))
      .finally(() => setLoading(false));
  }, [quiz.id]);

  const getDifficultyVariant = (difficulty: number) => {
    if (difficulty >= 70) return "red";
    if (difficulty >= 40) return "amber";
    return "green";
  };

  const getDifficultyLabel = (difficulty: number) => {
    if (difficulty >= 70) return "Hard";
    if (difficulty >= 40) return "Medium";
    return "Easy";
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-card rounded-lg max-w-3xl w-full mx-4 max-h-[85vh] overflow-y-auto border border-border">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-foreground">Quiz Analytics</h2>
            <p className="text-muted-foreground text-sm">{quiz.title} &middot; {quiz.courseTitle}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
            </div>
          ) : !analytics || analytics.totalAttempts === 0 ? (
            <div className="text-center py-12 text-muted-foreground/70">
              No analytics data available. Quizzes need attempts first.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Stat Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: "Attempts", value: analytics.totalAttempts, icon: Users, color: "text-blue-400" },
                  { label: "Avg Score", value: `${analytics.avgScore}%`, icon: BarChart3, color: "text-orange-400" },
                  { label: "Pass Rate", value: `${analytics.passRate}%`, icon: Target, color: "text-emerald-400" },
                  { label: "Avg Time", value: `${Math.round(analytics.avgTimeTaken / 60)}m`, icon: Clock, color: "text-amber-400" },
                ].map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <GlassCard key={stat.label} className="flex items-center gap-3 !p-4">
                      <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                        <Icon className={`w-5 h-5 ${stat.color}`} />
                      </div>
                      <div>
                        <div className="text-xl font-bold text-foreground">{stat.value}</div>
                        <div className="text-muted-foreground text-xs">{stat.label}</div>
                      </div>
                    </GlassCard>
                  );
                })}
              </div>

              {/* Score Distribution */}
              <GlassCard padding="md">
                <h3 className="text-foreground font-semibold mb-4">Score Distribution</h3>
                <div className="space-y-2">
                  {analytics.scoreDistribution.map((bucket: any) => {
                    const maxCount = Math.max(...analytics.scoreDistribution.map((b: any) => b.count), 1);
                    const width = (bucket.count / maxCount) * 100;
                    return (
                      <div key={bucket.range} className="flex items-center gap-3">
                        <span className="text-muted-foreground text-xs w-16 text-right">{bucket.range}</span>
                        <div className="flex-1 bg-secondary rounded-full h-6 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-orange-600 to-orange-500 rounded-full flex items-center justify-end pr-2 transition-all"
                            style={{ width: `${Math.max(width, 5)}%` }}
                          >
                            <span className="text-[#fff] text-xs font-semibold">{bucket.count}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </GlassCard>

              {/* Per-Question Analytics */}
              {analytics.questionAnalytics && analytics.questionAnalytics.length > 0 && (
                <GlassCard padding="md">
                  <h3 className="text-foreground font-semibold mb-4">Question Difficulty</h3>
                  <div className="space-y-2">
                    {analytics.questionAnalytics.map((q: any, idx: number) => (
                      <div
                        key={q.id}
                        className="flex items-center justify-between p-3 bg-secondary rounded-xl"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground text-sm truncate">
                            Q{idx + 1}: {q.text}
                          </p>
                          <p className="text-muted-foreground/70 text-xs mt-0.5">
                            {q.correctCount}/{q.attempts} correct ({q.correctPercentage}%)
                          </p>
                        </div>
                        <Badge variant={getDifficultyVariant(q.difficulty)}>
                          {getDifficultyLabel(q.difficulty)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
