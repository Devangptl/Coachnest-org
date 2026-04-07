/**
 * Instructor → Analytics
 */
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import GlassCard from "@/components/GlassCard";
import { BookOpen, Users, Star, TrendingUp } from "lucide-react";

async function getAnalytics(userId: string) {
  const [courses, totalStudents, reviews] = await Promise.all([
    prisma.course.findMany({
      where:   { createdById: userId },
      include: { _count: { select: { enrollments: true, lessons: true, reviews: true } }, reviews: { select: { rating: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.enrollment.count({ where: { course: { createdById: userId } } }),
    prisma.review.findMany({ where: { course: { createdById: userId } }, select: { rating: true } }),
  ]);

  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  return { courses, totalStudents, avgRating };
}

export default async function InstructorAnalyticsPage() {
  const session = await getSession();
  const { courses, totalStudents, avgRating } = await getAnalytics(session!.userId);

  const stats = [
    { label: "Total Courses",    value: courses.length,                     icon: BookOpen, color: "text-blue-400",   bg: "bg-blue-500/10"   },
    { label: "Published",        value: courses.filter(c => c.status === "PUBLISHED").length, icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Total Students",   value: totalStudents,                      icon: Users,    color: "text-purple-400", bg: "bg-purple-500/10" },
    { label: "Avg Rating",       value: avgRating ? `${avgRating.toFixed(1)} ★` : "—", icon: Star, color: "text-amber-400", bg: "bg-amber-500/10" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Performance overview of your courses</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <GlassCard key={s.label} className="flex flex-col gap-3">
              <div className={`w-10 h-10 rounded-md ${s.bg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-muted-foreground text-sm">{s.label}</p>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Per-course breakdown */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Course Breakdown</h2>
        {courses.length === 0 ? (
          <GlassCard className="text-center py-12">
            <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No courses yet. Create your first course to see analytics.</p>
          </GlassCard>
        ) : (
          <GlassCard padding="sm">
            <div className="grid grid-cols-12 gap-3 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 border-b border-border">
              <div className="col-span-5">Course</div>
              <div className="col-span-2 text-center">Students</div>
              <div className="col-span-2 text-center">Lessons</div>
              <div className="col-span-2 text-center">Reviews</div>
              <div className="col-span-1 text-center">Rating</div>
            </div>
            <div className="divide-y divide-border/50">
              {courses.map((course) => {
                const courseAvg = course.reviews.length
                  ? course.reviews.reduce((s, r) => s + r.rating, 0) / course.reviews.length
                  : null;
                return (
                  <div key={course.id} className="grid grid-cols-12 gap-3 px-4 py-3.5 items-center  transition-colors">
                    <div className="col-span-5 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{course.title}</p>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border mt-0.5 ${
                        course.status === "PUBLISHED"
                          ? "bg-emerald-500/10 border-emerald-400/25 text-emerald-400"
                          : "bg-amber-500/10 border-amber-400/25 text-amber-400"
                      }`}>
                        {course.status === "PUBLISHED" ? "Live" : "Draft"}
                      </span>
                    </div>
                    <div className="col-span-2 text-center text-sm font-semibold text-foreground">{course._count.enrollments}</div>
                    <div className="col-span-2 text-center text-sm text-muted-foreground">{course._count.lessons}</div>
                    <div className="col-span-2 text-center text-sm text-muted-foreground">{course._count.reviews}</div>
                    <div className="col-span-1 text-center text-sm font-medium text-amber-400">
                      {courseAvg ? courseAvg.toFixed(1) : "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
