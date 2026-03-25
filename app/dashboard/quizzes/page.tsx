/**
 * Dashboard — Quiz History page
 * Shows all quiz attempts by the current user grouped by quiz.
 */
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import GlassCard from "@/components/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import {
  HelpCircle,
  Trophy,
  Target,
  BarChart3,
  Clock,
  ArrowRight,
  CheckCircle2,
  XCircle,
} from "lucide-react";

async function getUserQuizHistory(userId: string) {
  const attempts = await prisma.quizAttempt.findMany({
    where: { userId },
    include: {
      quiz: {
        include: {
          lesson: {
            select: {
              id: true,
              title: true,
              course: { select: { id: true, title: true, thumbnail: true } },
            },
          },
          questions: { select: { id: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Group by quiz
  const quizMap = new Map<string, {
    quizId: string;
    quizTitle: string;
    lessonTitle: string;
    courseId: string;
    courseTitle: string;
    courseThumbnail: string | null;
    questionCount: number;
    passMark: number;
    attempts: Array<{
      id: string;
      score: number;
      passed: boolean;
      timeTaken: number | null;
      createdAt: Date;
    }>;
  }>();

  for (const a of attempts) {
    if (!quizMap.has(a.quizId)) {
      quizMap.set(a.quizId, {
        quizId: a.quizId,
        quizTitle: a.quiz.title,
        lessonTitle: a.quiz.lesson.title,
        courseId: a.quiz.lesson.course.id,
        courseTitle: a.quiz.lesson.course.title,
        courseThumbnail: a.quiz.lesson.course.thumbnail,
        questionCount: a.quiz.questions.length,
        passMark: a.quiz.passMark,
        attempts: [],
      });
    }
    quizMap.get(a.quizId)!.attempts.push({
      id: a.id,
      score: a.score,
      passed: a.passed,
      timeTaken: a.timeTaken,
      createdAt: a.createdAt,
    });
  }

  return Array.from(quizMap.values()).map((q) => ({
    ...q,
    attemptCount: q.attempts.length,
    bestScore: Math.max(...q.attempts.map((a) => a.score)),
    hasPassed: q.attempts.some((a) => a.passed),
    lastAttempt: q.attempts[0],
  }));
}

function formatDuration(seconds: number | null) {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export default async function QuizHistoryPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const quizHistory = await getUserQuizHistory(session.userId);

  const totalAttempts = quizHistory.reduce((s, q) => s + q.attemptCount, 0);
  const passedQuizzes = quizHistory.filter((q) => q.hasPassed).length;
  const avgBestScore =
    quizHistory.length > 0
      ? Math.round(quizHistory.reduce((s, q) => s + q.bestScore, 0) / quizHistory.length)
      : 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Quiz History</h1>
        <p className="text-white/50 mt-1">
          Track your quiz performance and review past attempts.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Quizzes Taken", value: quizHistory.length, icon: HelpCircle, color: "text-blue-400" },
          { label: "Total Attempts", value: totalAttempts, icon: Target, color: "text-violet-400" },
          { label: "Passed", value: passedQuizzes, icon: Trophy, color: "text-emerald-400" },
          { label: "Avg Best Score", value: `${avgBestScore}%`, icon: BarChart3, color: "text-amber-400" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <GlassCard key={stat.label} className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                <Icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-white/50 text-sm">{stat.label}</div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Quiz list */}
      {quizHistory.length > 0 ? (
        <div className="space-y-4">
          {quizHistory.map((quiz) => (
            <GlassCard key={quiz.quizId} className="space-y-4">
              {/* Quiz header */}
              <div className="flex items-start gap-4">
                {quiz.courseThumbnail ? (
                  <img
                    src={quiz.courseThumbnail}
                    alt=""
                    className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                    <HelpCircle className="w-6 h-6 text-white/20" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{quiz.lessonTitle}</p>
                  <p className="text-white/40 text-xs truncate">{quiz.courseTitle}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-white/30 text-xs">{quiz.questionCount} questions</span>
                    <span className="text-white/30 text-xs">Pass: {quiz.passMark}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {/* Best score badge */}
                  <div className="text-right">
                    <p className={`text-lg font-bold ${quiz.hasPassed ? "text-emerald-400" : "text-red-400"}`}>
                      {quiz.bestScore}%
                    </p>
                    <p className="text-white/30 text-[10px]">Best Score</p>
                  </div>
                  <Badge variant={quiz.hasPassed ? "green" : "red"}>
                    {quiz.hasPassed ? "Passed" : "Not Passed"}
                  </Badge>
                  <Link
                    href={`/courses/${quiz.courseId}`}
                    className="text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Attempt history */}
              <div className="border-t border-white/[0.06] pt-3">
                <p className="text-white/30 text-xs font-semibold uppercase tracking-wider mb-2">
                  Attempts ({quiz.attemptCount})
                </p>
                <div className="space-y-1.5">
                  {quiz.attempts.slice(0, 5).map((attempt, idx) => (
                    <div
                      key={attempt.id}
                      className="flex items-center gap-3 px-3 py-2 bg-white/[0.02] rounded-lg"
                    >
                      <span className="text-white/20 text-xs w-5">#{quiz.attemptCount - idx}</span>
                      {attempt.passed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                      )}
                      <span className="text-white text-sm font-semibold w-12">{attempt.score}%</span>
                      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${attempt.passed ? "bg-emerald-500" : "bg-red-500"}`}
                          style={{ width: `${attempt.score}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-1 text-white/30 text-xs flex-shrink-0">
                        <Clock className="w-3 h-3" />
                        {formatDuration(attempt.timeTaken)}
                      </div>
                      <span className="text-white/20 text-xs flex-shrink-0">
                        {formatDate(attempt.createdAt)}
                      </span>
                    </div>
                  ))}
                  {quiz.attemptCount > 5 && (
                    <p className="text-white/20 text-xs text-center">
                      +{quiz.attemptCount - 5} more attempt{quiz.attemptCount - 5 > 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      ) : (
        <GlassCard padding="lg">
          <div className="text-center py-12 text-white/40">
            <HelpCircle className="w-12 h-12 mx-auto mb-4 text-white/20" />
            <p className="mb-2">No quiz attempts yet.</p>
            <p className="text-white/30 text-sm">
              Start a course and take quizzes to see your history here.
            </p>
            <Link href="/courses" className="text-purple-400 hover:text-purple-300 text-sm mt-3 inline-block">
              Browse Courses
            </Link>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
