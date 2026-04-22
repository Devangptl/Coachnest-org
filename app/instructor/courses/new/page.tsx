/**
 * Instructor → New Course. Loads categories + tag suggestions server-side,
 * then renders the shared full-width CourseForm.
 */
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CourseForm from "@/components/admin/CourseForm";

export const dynamic = "force-dynamic";

export default async function NewInstructorCoursePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [categories, tags] = await Promise.all([
    prisma.category.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.tag.findMany({
      select: { name: true },
      orderBy: { name: "asc" },
      take: 30,
    }),
  ]);

  return (
    <div>
      <Link
        href="/instructor/courses"
        className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to My Courses
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Create New Course</h1>
        <p className="text-muted-foreground mt-1">
          Fill in the course details. You can manage lessons after creating it.
        </p>
      </div>

      <CourseForm
        mode="create"
        categories={categories}
        suggestedTags={tags.map((t) => t.name)}
        onCancelHref="/instructor/courses"
        apiBasePath="/api/instructor/courses"
        redirectAfterCreateBase="/instructor/courses"
        canEditRevenuePercent={session.role === "ADMIN"}
      />
    </div>
  );
}
