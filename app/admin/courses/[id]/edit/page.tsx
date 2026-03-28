/**
 * Admin → Edit Course page.
 * Allows editing course details and managing its lessons.
 */
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import EditCourseForm from "./EditCourseForm";
import LessonsManager from "./LessonsManager";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type Props = { params: Promise<{ id: string }> };

async function getCourse(id: string) {
  return prisma.course.findUnique({
    where: { id },
    include: { lessons: { orderBy: { order: "asc" } } },
  });
}

export default async function EditCoursePage({ params }: Props) {
  const { id } = await params;
  const course = await getCourse(id);
  if (!course) notFound();

  return (
    <div className="max-w-3xl">
      <Link
        href="/admin/courses"
        className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Courses
      </Link>

      <h1 className="text-3xl font-bold text-foreground mb-2">Edit Course</h1>
      <p className="text-muted-foreground/70 text-sm mb-8">{course.title}</p>

      {/* Course details form */}
      <EditCourseForm course={course} />

      {/* Lessons manager */}
      <div className="mt-10">
        <h2 className="text-xl font-semibold text-foreground mb-5">Lessons</h2>
        <LessonsManager
          courseId={course.id}
          lessons={course.lessons}
        />
      </div>
    </div>
  );
}
