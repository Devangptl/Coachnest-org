/**
 * Instructor → My Students
 * Shows all enrolled students with per-course progress.
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getInstructorStudentsWithProgress } from "@/services/analytics.service";
import GlassCard from "@/components/GlassCard";
import Avatar from "@/components/Avatar";
import { Users, CheckCircle, Clock, BookOpen } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function InstructorStudentsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const students = await getInstructorStudentsWithProgress(session.userId);

  // Group by course for the summary row
  const courseMap: Record<string, { title: string; count: number; completed: number }> = {};
  for (const s of students) {
    if (!courseMap[s.courseId]) {
      courseMap[s.courseId] = { title: s.courseTitle, count: 0, completed: 0 };
    }
    courseMap[s.courseId].count++;
    if (s.progress === 100) courseMap[s.courseId].completed++;
  }
  const courses = Object.values(courseMap);
  const totalCompleted = students.filter((s) => s.progress === 100).length;
  const avgProgress =
    students.length > 0
      ? Math.round(students.reduce((sum, s) => sum + s.progress, 0) / students.length)
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Students</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {students.length} enrollment{students.length !== 1 ? "s" : ""} across your courses
        </p>
      </div>

      {students.length === 0 ? (
        <GlassCard className="text-center py-16">
          <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No students enrolled yet. Publish your courses to attract learners!</p>
        </GlassCard>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Enrollments", value: students.length, icon: Users, color: "bg-violet-500/15 text-violet-400" },
              { label: "Completed", value: totalCompleted, icon: CheckCircle, color: "bg-emerald-500/15 text-emerald-400" },
              { label: "In Progress", value: students.filter((s) => s.progress > 0 && s.progress < 100).length, icon: Clock, color: "bg-blue-500/15 text-blue-400" },
              { label: "Avg Progress", value: `${avgProgress}%`, icon: BookOpen, color: "bg-amber-500/15 text-amber-400" },
            ].map(({ label, value, icon: Icon, color }) => (
              <GlassCard key={label} className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{value}</p>
                  <p className="text-muted-foreground text-xs">{label}</p>
                </div>
              </GlassCard>
            ))}
          </div>

          {/* Per-course summary */}
          {courses.length > 1 && (
            <GlassCard padding="sm">
              <div className="px-4 py-2.5 border-b border-border">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">Course Summary</p>
              </div>
              <div className="divide-y divide-border/50">
                {courses.map((c) => (
                  <div key={c.title} className="px-4 py-3 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{c.title}</p>
                      <p className="text-xs text-muted-foreground/60 mt-0.5">
                        {c.count} student{c.count !== 1 ? "s" : ""} · {c.completed} completed
                      </p>
                    </div>
                    <div className="w-28 flex-shrink-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground/60">Completion</span>
                        <span className="text-xs font-semibold text-emerald-400">
                          {c.count > 0 ? Math.round((c.completed / c.count) * 100) : 0}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                          style={{ width: `${c.count > 0 ? (c.completed / c.count) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Student table with progress */}
          <GlassCard padding="sm">
            <div className="grid grid-cols-12 gap-3 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 border-b border-border">
              <div className="col-span-4">Student</div>
              <div className="col-span-3">Course</div>
              <div className="col-span-3">Progress</div>
              <div className="col-span-2 text-right">Enrolled</div>
            </div>
            <div className="divide-y divide-border/50">
              {students.map((s) => (
                <div
                  key={`${s.userId}-${s.courseId}`}
                  className="grid grid-cols-12 gap-3 px-4 py-3.5 items-center"
                >
                  {/* Student */}
                  <div className="col-span-4 flex items-center gap-2.5 min-w-0">
                    <Avatar
                      name={s.userName}
                      avatar={s.userAvatar}
                      seed={s.userId}
                      size="w-8 h-8"
                      className="flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{s.userName}</p>
                      <p className="text-xs text-muted-foreground/60 truncate">{s.userEmail}</p>
                    </div>
                  </div>

                  {/* Course */}
                  <div className="col-span-3 min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{s.courseTitle}</p>
                  </div>

                  {/* Progress bar */}
                  <div className="col-span-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            s.progress === 100
                              ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                              : s.progress > 0
                              ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                              : "bg-secondary"
                          }`}
                          style={{ width: `${s.progress}%` }}
                        />
                      </div>
                      <span
                        className={`text-xs font-semibold w-8 flex-shrink-0 text-right ${
                          s.progress === 100
                            ? "text-emerald-400"
                            : s.progress > 0
                            ? "text-amber-400"
                            : "text-muted-foreground/40"
                        }`}
                      >
                        {s.progress}%
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground/40 mt-0.5">
                      {s.doneLessons}/{s.totalLessons} lessons
                    </p>
                  </div>

                  {/* Enrolled date */}
                  <div className="col-span-2 text-right">
                    <p className="text-xs text-muted-foreground/60">{formatDate(new Date(s.enrolledAt))}</p>
                    {s.completedAt && (
                      <p className="text-[10px] text-emerald-400/70 mt-0.5">
                        ✓ Done {formatDate(new Date(s.completedAt))}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </>
      )}
    </div>
  );
}
