/**
 * Instructor → My Courses
 */
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import GlassCard from "@/components/GlassCard";
import { PlusCircle, BookOpen, Edit2, Eye, FileUp } from "lucide-react";
import { instructorScopedCourseWhere } from "@/services/collaboration.service";
import { formatDate } from "@/lib/utils";
import DeleteInstructorCourseButton from "./DeleteInstructorCourseButton";

async function getCourses(userId: string) {
  return prisma.course.findMany({
    where: instructorScopedCourseWhere(userId),
    include: {
      _count: { select: { lessons: true, enrollments: true } },
      collaborators: {
        where: { userId },
        select: { role: true, acceptedAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export default async function InstructorCoursesPage() {
  const session  = await getSession();
  const courses  = await getCourses(session!.userId);
  const userId   = session!.userId;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Courses</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {courses.length} course{courses.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/instructor/courses/import" className="btn-secondary flex items-center gap-2 text-sm">
            <FileUp className="w-4 h-4" /> Import from PDF
          </Link>
          <Link href="/instructor/courses/new" className="btn-primary flex items-center gap-2 text-sm">
            <PlusCircle className="w-4 h-4" /> New Course
          </Link>
        </div>
      </div>

      {courses.length === 0 ? (
        <GlassCard className="text-center py-16">
          <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">No courses yet.</p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/instructor/courses/new" className="btn-primary inline-flex items-center gap-2 text-sm">
              <PlusCircle className="w-4 h-4" /> Create First Course
            </Link>
            <Link href="/instructor/courses/import" className="btn-secondary inline-flex items-center gap-2 text-sm">
              <FileUp className="w-4 h-4" /> Import from PDF
            </Link>
          </div>
        </GlassCard>
      ) : (
        <GlassCard padding="sm">
          <div className="overflow-x-auto">
          <div className="min-w-[560px]">
          <div className="grid grid-cols-12 gap-3 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 border-b border-border">
            <div className="col-span-5">Course</div>
            <div className="col-span-1 text-center">Lessons</div>
            <div className="col-span-2 text-center">Students</div>
            <div className="col-span-1 text-center">Price</div>
            <div className="col-span-1 text-center">Status</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>
          <div className="divide-y divide-border/50">
            {courses.map((course) => (
              <div key={course.id} className="grid grid-cols-12 gap-3 px-4 py-3.5 items-center  transition-colors">
                <div className="col-span-5 flex items-center gap-3 min-w-0">
                  {course.thumbnail ? (
                    <img src={course.thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-border" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 border border-border">
                      <BookOpen className="w-4 h-4 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{course.title}</p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5 flex items-center gap-1.5">
                      {formatDate(course.createdAt)}
                      {course.createdById !== userId && course.collaborators[0] && (
                        <span className="badge-amber">
                          {course.collaborators[0].role.replace(/_/g, " ")}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="col-span-1 text-center text-sm font-medium text-foreground">{course._count.lessons}</div>
                <div className="col-span-2 text-center">
                  <span className="text-sm font-medium text-foreground">{course._count.enrollments}</span>
                  <span className="text-xs text-muted-foreground ml-1">students</span>
                </div>
                <div className="col-span-1 text-center text-sm font-semibold">
                  {!course.price
                    ? <span className="text-emerald-400 text-xs font-medium">Free</span>
                    : `₹${Number(course.price).toLocaleString("en-IN")}`}
                </div>
                <div className="col-span-1 flex justify-center">
                  <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                    course.status === "PUBLISHED"
                      ? "bg-emerald-500/10 border-emerald-400/25 text-emerald-400"
                      : "bg-amber-500/10 border-amber-400/25 text-amber-400"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${course.status === "PUBLISHED" ? "bg-emerald-400" : "bg-amber-400"}`} />
                    {course.status === "PUBLISHED" ? "Live" : "Draft"}
                  </span>
                </div>
                <div className="col-span-2 flex items-center justify-end gap-1">
                  <Link href={`/instructor/courses/${course.id}/edit`} title="Edit" className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </Link>
                  <Link href={`/courses/${course.id}`} title="Preview" className="p-2 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors">
                    <Eye className="w-4 h-4" />
                  </Link>
                  {course.createdById === userId && (
                    <DeleteInstructorCourseButton courseId={course.id} />
                  )}
                </div>
              </div>
            ))}
          </div>
          </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
