/**
 * Admin → All Courses — table view with edit/delete actions.
 */
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import GlassCard from "@/components/GlassCard";
import DeleteCourseButton from "./DeleteCourseButton";
import { PlusCircle, BookOpen } from "lucide-react";
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Courses</h1>
          <p className="text-white/50 mt-1">
            {courses.length} course{courses.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Link href="/admin/courses/new" className="btn-primary flex items-center gap-2 text-sm">
          <PlusCircle className="w-4 h-4" /> New Course
        </Link>
      </div>

      {courses.length === 0 ? (
        <GlassCard className="text-center py-16">
          <BookOpen className="w-12 h-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/50 mb-4">No courses yet.</p>
          <Link href="/admin/courses/new" className="btn-primary inline-flex items-center gap-2 text-sm">
            <PlusCircle className="w-4 h-4" /> Create First Course
          </Link>
        </GlassCard>
      ) : (
        <GlassCard padding="sm">
          {/* Table header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-2 text-white/40 text-xs font-semibold uppercase tracking-wider border-b border-white/10">
            <div className="col-span-5">Course</div>
            <div className="col-span-2 text-center">Lessons</div>
            <div className="col-span-2 text-center">Enrolled</div>
            <div className="col-span-1 text-center">Status</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          <div className="divide-y divide-white/5">
            {courses.map((course) => (
              <div
                key={course.id}
                className="grid grid-cols-12 gap-4 px-4 py-4 items-center hover:bg-white/5 transition-colors"
              >
                {/* Title + date */}
                <div className="col-span-5 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {course.title}
                  </p>
                  <p className="text-white/40 text-xs mt-0.5">
                    {formatDate(course.createdAt)}
                  </p>
                </div>

                {/* Lesson count */}
                <div className="col-span-2 text-center text-white/70 text-sm">
                  {course._count.lessons}
                </div>

                {/* Enrollment count */}
                <div className="col-span-2 text-center text-white/70 text-sm">
                  {course._count.enrollments}
                </div>

                {/* Status badge */}
                <div className="col-span-1 flex justify-center">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border ${
                      course.status === "PUBLISHED"
                        ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-400"
                        : "bg-yellow-500/20 border-yellow-400/30 text-yellow-400"
                    }`}
                  >
                    {course.status === "PUBLISHED" ? "Live" : "Draft"}
                  </span>
                </div>

                {/* Actions */}
                <div className="col-span-2 flex justify-end gap-2">
                  <Link
                    href={`/admin/courses/${course.id}/edit`}
                    className="text-xs text-white/50 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/10"
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/courses/${course.id}`}
                    className="text-xs text-purple-400 hover:text-purple-300 transition-colors px-2 py-1 rounded-lg hover:bg-purple-500/10"
                  >
                    View
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
