/**
 * Instructor → Edit Course — reuses the same EditCourseForm and LessonsManager
 * from the admin panel but scoped to instructor-owned courses.
 */
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import InstructorEditCourseForm from "./InstructorEditCourseForm";
import LessonsManager from "@/app/admin/courses/[id]/edit/LessonsManager";

type Props = { params: Promise<{ id: string }> };

export default async function InstructorEditCoursePage({ params }: Props) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const course = await prisma.course.findFirst({
    where:   { id, createdById: session.userId },
    include: { lessons: { orderBy: { order: "asc" } } },
  });

  if (!course) notFound();

  return (
    <div className="space-y-8 max-w-3xl">
      <Link href="/instructor/courses" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to My Courses
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-foreground truncate">{course.title}</h1>
        <p className="text-muted-foreground text-sm mt-1">Edit course details and manage lessons</p>
      </div>

      {/* Course metadata form */}
      <InstructorEditCourseForm course={course} />

      {/* Lessons manager */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Course Lessons</h2>
        <LessonsManager courseId={course.id} lessons={course.lessons} />
      </div>
    </div>
  );
}
