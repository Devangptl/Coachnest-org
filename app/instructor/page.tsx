/**
 * Instructor Dashboard — overview of courses, students, and ratings.
 */
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { BookOpen, Users, Star, PlusCircle, Eye, Edit2 } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import Avatar from "@/components/Avatar";
import { formatDate } from "@/lib/utils";
import InstructorAlerts from "./InstructorAlerts";
import { instructorScopedCourseWhere } from "@/services/collaboration.service";

async function getStats(userId: string) {
  const courseScope = instructorScopedCourseWhere(userId);

  const [courses, totalStudents, reviews, profile] = await Promise.all([
    prisma.course.findMany({
      where:   courseScope,
      include: {
        _count: { select: { enrollments: true, lessons: true } },
        reviews: { select: { rating: true } },
        collaborators: {
          where: { userId },
          select: { role: true, acceptedAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.enrollment.count({ where: { course: courseScope } }),
    prisma.review.findMany({
      where:  { course: courseScope },
      select: { rating: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        avatar: true,
        headline: true,
        bio: true,
        instructorStatus: true,
      },
    }),
  ]);

  const totalCourses = await prisma.course.count({ where: courseScope });
  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  return { courses, totalStudents, totalCourses, avgRating, profile };
}

export default async function InstructorDashboard() {
  const session = await getSession();
  const userId = session!.userId;
  const { courses, totalStudents, totalCourses, avgRating, profile } = await getStats(userId);

  const stats = [
    { label: "Total Courses",  value: totalCourses,                       icon: BookOpen, color: "text-blue-400",  bg: "bg-blue-500/10"  },
    { label: "Total Students", value: totalStudents,                      icon: Users,    color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Avg Rating",     value: avgRating ? avgRating.toFixed(1) : "—", icon: Star, color: "text-amber-400", bg: "bg-amber-500/10"  },
  ];

  const isProfileIncomplete = !profile?.headline || !profile?.bio;

  return (
    <div className="space-y-6">
      {/* Alerts — shown once per user, dismissed via localStorage */}
      <InstructorAlerts
        isProfileIncomplete={isProfileIncomplete}
        isApproved={profile?.instructorStatus === "APPROVED"}
        userId={session!.userId}
      />

      {/* Profile summary */}
      <GlassCard className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 text-center sm:text-left">
        <Avatar
          name={session!.name}
          avatar={profile?.avatar}
          seed={session!.userId}
          size="w-14 h-14"
          className="flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground truncate">{session!.name}</p>
          {profile?.headline ? (
            <p className="text-muted-foreground text-sm truncate">{profile.headline}</p>
          ) : (
            <p className="text-muted-foreground/50 text-sm italic">No headline set</p>
          )}
        </div>
        <Link href="/instructor/profile" className="flex-shrink-0 text-xs text-orange-500 hover:text-orange-400 transition-colors font-medium">
          Edit Profile →
        </Link>
      </GlassCard>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Welcome back, {session!.name.split(" ")[0]}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Here&apos;s how your courses are doing</p>
        </div>
        <Link href="/instructor/courses/new" className="btn-primary flex items-center gap-2 text-sm flex-shrink-0">
          <PlusCircle className="w-4 h-4" /> New Course
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <GlassCard key={s.label} className="flex flex-col items-center text-center gap-2 sm:flex-row sm:text-left sm:gap-3 md:gap-4">
              <div className={`w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-md ${s.bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 ${s.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-base sm:text-xl md:text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-muted-foreground text-[10px] sm:text-xs md:text-sm leading-tight">{s.label}</p>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Recent courses */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Recent Courses</h2>
          <Link href="/instructor/courses" className="text-amber-400 hover:text-amber-300 text-sm transition-colors">
            View all →
          </Link>
        </div>

        {courses.length === 0 ? (
          <GlassCard className="text-center py-14">
            <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">You haven&apos;t created any courses yet.</p>
            <Link href="/instructor/courses/new" className="btn-primary inline-flex items-center gap-2 text-sm">
              <PlusCircle className="w-4 h-4" /> Create Your First Course
            </Link>
          </GlassCard>
        ) : (
          <GlassCard padding="sm">
            <div className="divide-y divide-border/50">
              {courses.map((course) => (
                <div key={course.id} className="flex items-center gap-4 px-4 py-3.5  transition-colors">
                  {course.thumbnail ? (
                    <img src={course.thumbnail} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-border" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 border border-border">
                      <BookOpen className="w-5 h-5 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{course.title}</p>
                      {course.createdById !== userId && course.collaborators[0] && (
                        <span className="badge-amber flex-shrink-0">
                          {course.collaborators[0].role.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                      {course._count.lessons} lessons · {course._count.enrollments} students · {formatDate(course.createdAt)}
                    </p>
                  </div>
                  <span className={`hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                    course.status === "PUBLISHED"
                      ? "bg-emerald-500/10 border-emerald-400/25 text-emerald-400"
                      : "bg-amber-500/10 border-amber-400/25 text-amber-400"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${course.status === "PUBLISHED" ? "bg-emerald-400" : "bg-amber-400"}`} />
                    {course.status === "PUBLISHED" ? "Live" : "Draft"}
                  </span>
                  <div className="flex items-center gap-1">
                    <Link href={`/instructor/courses/${course.id}/edit`} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </Link>
                    <Link href={`/courses/${course.id}`} className="p-2 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors">
                      <Eye className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
