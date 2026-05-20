/**
 * Admin Quizzes Page — Manage quizzes and view student performance (paginated)
 */
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import GlassCard from "@/components/GlassCard";
import { TableSkeleton } from "@/components/ui/Skeleton";
import Pagination from "@/components/ui/Pagination";
import { getQuizzesList, getQuizStats } from "@/services/quiz.service";
import Link from "next/link";
import { HelpCircle, PlusCircle, BarChart3, Users } from "lucide-react";
import QuizTable from "./QuizTable";

type SearchParams = { page?: string; pageSize?: string };

async function QuizzesSection({ sp }: { sp: SearchParams }) {
  const { data: quizzes, total, page, pageSize } = await getQuizzesList({
    page: sp.page ? Number(sp.page) : undefined,
    pageSize: sp.pageSize ? Number(sp.pageSize) : undefined,
  });

  if (total === 0) {
    return (
      <GlassCard padding="md">
        <div className="text-center py-12 text-muted-foreground/70">
          <HelpCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
          <p className="mb-4">No quizzes created yet.</p>
          <Link href="/admin/quizzes/new" className="text-[#d97757] hover:text-orange-300">
            Create your first quiz
          </Link>
        </div>
      </GlassCard>
    );
  }

  // Group the current page's quizzes by course.
  const grouped: Record<string, { courseTitle: string; quizzes: typeof quizzes }> = {};
  for (const quiz of quizzes) {
    if (!grouped[quiz.courseId]) {
      grouped[quiz.courseId] = { courseTitle: quiz.courseTitle, quizzes: [] };
    }
    grouped[quiz.courseId].quizzes.push(quiz);
  }

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([courseId, group]) => (
        <GlassCard key={courseId} padding="sm">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-foreground font-semibold">{group.courseTitle}</h2>
            <span className="text-muted-foreground/70 text-xs">{group.quizzes.length} quiz(zes)</span>
          </div>

          {/* Header Row */}
          <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs text-muted-foreground/70 font-semibold uppercase tracking-wider border-b border-border/50">
            <div className="col-span-3">Quiz / Lesson</div>
            <div className="col-span-1">Questions</div>
            <div className="col-span-1">Pass Mark</div>
            <div className="col-span-1">Attempts</div>
            <div className="col-span-1">Avg Score</div>
            <div className="col-span-1">Pass Rate</div>
            <div className="col-span-4 text-right">Actions</div>
          </div>

          <QuizTable quizzes={group.quizzes} />
        </GlassCard>
      ))}

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <Pagination page={page} pageSize={pageSize} total={total} />
      </div>
    </div>
  );
}

export default async function AdminQuizzesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const sp = await searchParams;
  const { totalQuizzes, totalAttempts, avgPassRate } = await getQuizStats();

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Quizzes & Assessments</h1>
          <p className="text-muted-foreground mt-1">
            Manage quizzes and track student performance across courses.
          </p>
        </div>
        <Link href="/admin/quizzes/new" className="btn-primary flex items-center gap-2 text-sm">
          <PlusCircle className="w-4 h-4" /> New Quiz
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {[
          { label: "Total Quizzes", value: totalQuizzes, icon: HelpCircle, color: "text-blue-400" },
          { label: "Total Attempts", value: totalAttempts, icon: Users, color: "text-[#d97757]" },
          { label: "Avg Pass Rate", value: `${avgPassRate}%`, icon: BarChart3, color: "text-emerald-400" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <GlassCard key={stat.label} className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-md bg-secondary flex items-center justify-center">
                <Icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div>
                <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                <div className="text-muted-foreground text-sm">{stat.label}</div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Grouped Quiz Table */}
      <Suspense
        key={`${sp.page ?? "1"}|${sp.pageSize ?? ""}`}
        fallback={<TableSkeleton rows={10} />}
      >
        <QuizzesSection sp={sp} />
      </Suspense>
    </div>
  );
}
