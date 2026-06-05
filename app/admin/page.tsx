/**
 * Admin overview / dashboard — shows platform-wide stats.
 */
import { prisma } from "@/lib/prisma";
import GlassCard from "@/components/GlassCard";
import Link from "next/link";
import { BookOpen, Users, GraduationCap, TrendingUp, ArrowRight, PlusCircle, Award } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { getSession } from "@/lib/auth";

async function getStats() {
  const [totalCourses, totalStudents, totalEnrollments, totalCertificates, recentCourses] =
    await Promise.all([
      prisma.course.count(),
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.enrollment.count(),
      prisma.certificate.count(),
      prisma.course.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { lessons: true, enrollments: true } } },
      }),
    ]);

  return { totalCourses, totalStudents, totalEnrollments, totalCertificates, recentCourses };
}

export default async function AdminOverviewPage() {
  const session = await getSession();
  const { totalCourses, totalStudents, totalEnrollments, totalCertificates, recentCourses } =
    await getStats();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Admin Overview
        </h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {session?.name}. Here&apos;s what&apos;s happening.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-10">
        {[
          { label: "Total Courses", value: totalCourses, icon: BookOpen, color: "text-[#d97757]" },
          { label: "Students", value: totalStudents, icon: Users, color: "text-blue-400" },
          { label: "Enrollments", value: totalEnrollments, icon: GraduationCap, color: "text-emerald-400" },
          { label: "Certificates", value: totalCertificates, icon: Award, color: "text-amber-400" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <GlassCard key={stat.label} className="flex flex-col items-center text-center gap-2 sm:flex-row sm:text-left sm:gap-3 md:gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
                <Icon className={`w-5 h-5 md:w-6 md:h-6 ${stat.color}`} />
              </div>
              <div className="min-w-0">
                <div className="text-xl md:text-3xl font-bold text-foreground">{stat.value}</div>
                <div className="text-muted-foreground text-[10px] sm:text-xs md:text-sm leading-tight">{stat.label}</div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3 mb-10">
        <Link href="/admin/courses/new" className="btn-primary flex items-center gap-2 text-sm">
          <PlusCircle className="w-4 h-4" /> New Course
        </Link>
        <Link href="/admin/courses" className="btn-ghost flex items-center gap-2 text-sm border border-border">
          View All Courses <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Recent courses table */}
      <GlassCard padding="sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-foreground font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#d97757]" />
            Recent Courses
          </h2>
          <Link href="/admin/courses" className="text-[#d97757] text-sm hover:text-orange-300">
            View all
          </Link>
        </div>

        <div className="divide-y divide-border/50">
          {recentCourses.map((course) => (
            <div
              key={course.id}
              className="flex items-center justify-between px-4 py-3 hover:bg-secondary transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-foreground text-sm font-medium truncate">
                  {course.title}
                </p>
                <p className="text-muted-foreground/70 text-xs mt-0.5">
                  {formatDate(course.createdAt)} ·{" "}
                  {course._count.lessons} lessons ·{" "}
                  {course._count.enrollments} enrolled
                </p>
              </div>

              <div className="flex items-center gap-3 ml-4">
                <span
                  className={`text-xs px-2.5 py-1 rounded-full border ${
                    course.status === "PUBLISHED"
                      ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-400"
                      : "bg-yellow-500/20 border-yellow-400/30 text-yellow-400"
                  }`}
                >
                  {course.status === "PUBLISHED" ? "Live" : "Draft"}
                </span>
                <Link
                  href={`/admin/courses/${course.id}/edit`}
                  className="text-muted-foreground/70 hover:text-foreground text-xs transition-colors"
                >
                  Edit
                </Link>
              </div>
            </div>
          ))}

          {recentCourses.length === 0 && (
            <div className="text-center py-8 text-muted-foreground/70">
              No courses yet.{" "}
              <Link href="/admin/courses/new" className="text-[#d97757] hover:text-orange-300">
                Create one
              </Link>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
