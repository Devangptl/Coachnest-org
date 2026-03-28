/**
 * Admin → All Courses — improved table UI.
 */
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import GlassCard from "@/components/GlassCard";
import DeleteCourseButton from "./DeleteCourseButton";
import { PlusCircle, BookOpen, Edit2, Eye } from "lucide-react";
import { formatDate } from "@/lib/utils";

async function getCourses() {
  return prisma.course.findMany({
    include: { _count: { select: { lessons: true, enrollments: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export default async function AdminCoursesPage() {
  const courses = await getCourses();

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">All Courses</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {courses.length} course{courses.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Link
          href="/admin/courses/new"
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <PlusCircle className="w-4 h-4" /> New Course
        </Link>
      </div>

      {courses.length === 0 ? (
        <GlassCard className="text-center py-16">
          <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">No courses yet.</p>
          <Link
            href="/admin/courses/new"
            className="btn-primary inline-flex items-center gap-2 text-sm"
          >
            <PlusCircle className="w-4 h-4" /> Create First Course
          </Link>
        </GlassCard>
      ) : (
        <GlassCard padding="sm">
          {/* Table head */}
          <div className="grid grid-cols-12 gap-3 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 border-b border-border">
            <div className="col-span-5">Course</div>
            <div className="col-span-1 text-center">Lessons</div>
            <div className="col-span-2 text-center">Enrolled</div>
            <div className="col-span-1 text-center">Price</div>
            <div className="col-span-1 text-center">Status</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          <div className="divide-y divide-border/50">
            {courses.map((course) => (
              <div
                key={course.id}
                className="grid grid-cols-12 gap-3 px-4 py-3.5 items-center hover:bg-secondary/50 transition-colors group"
              >
                {/* Course info */}
                <div className="col-span-5 flex items-center gap-3 min-w-0">
                  {course.thumbnail ? (
                    <img
                      src={course.thumbnail}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-border"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 border border-border">
                      <BookOpen className="w-4 h-4 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate leading-tight">
                      {course.title}
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                      {formatDate(course.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Lessons */}
                <div className="col-span-1 text-center">
                  <span className="text-sm font-medium text-foreground">
                    {course._count.lessons}
                  </span>
                </div>

                {/* Enrollments */}
                <div className="col-span-2 text-center">
                  <span className="text-sm font-medium text-foreground">
                    {course._count.enrollments}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">students</span>
                </div>

                {/* Price */}
                <div className="col-span-1 text-center">
                  <span className="text-sm font-semibold text-foreground">
                    {!course.price
                      ? <span className="text-emerald-400 text-xs font-medium">Free</span>
                      : `₹${Number(course.price).toLocaleString("en-IN")}`}
                  </span>
                </div>

                {/* Status */}
                <div className="col-span-1 flex justify-center">
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                      course.status === "PUBLISHED"
                        ? "bg-emerald-500/10 border-emerald-400/25 text-emerald-400"
                        : "bg-amber-500/10 border-amber-400/25 text-amber-400"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${course.status === "PUBLISHED" ? "bg-emerald-400" : "bg-amber-400"}`} />
                    {course.status === "PUBLISHED" ? "Live" : "Draft"}
                  </span>
                </div>

                {/* Actions */}
                <div className="col-span-2 flex items-center justify-end gap-1">
                  <Link
                    href={`/admin/courses/${course.id}/edit`}
                    title="Edit"
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Link>
                  <Link
                    href={`/courses/${course.id}`}
                    title="View"
                    className="p-2 rounded-lg text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                  <DeleteCourseButton courseId={course.id} />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
