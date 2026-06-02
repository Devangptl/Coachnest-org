/**
 * Instructor → Edit Course.
 * Renders the shared full-width CourseForm and the lessons manager,
 * scoped to instructor-owned courses.
 */
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye, Lock } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CourseForm from "@/components/admin/CourseForm";
import LessonsManager from "@/app/admin/courses/[id]/edit/LessonsManager";
import CollaboratorsManager from "./CollaboratorsManager";
import { getCollaboratorPermission } from "@/services/collaboration.service";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function InstructorEditCoursePage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  // Allow access to the course owner OR any accepted collaborator.
  const collabPermission = await getCollaboratorPermission(id, session.userId);
  if (!collabPermission) notFound();

  const [course, categories, tagSuggestions] = await Promise.all([
    prisma.course.findFirst({
      where: { id },
      include: {
        sections: {
          orderBy: { order: "asc" },
          include: { lessons: { orderBy: { order: "asc" } } },
        },
        lessons: {
          where: { sectionId: null },
          orderBy: { order: "asc" },
        },
        tags: { include: { tag: { select: { name: true } } } },
      },
    }),
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

  if (!course) notFound();

  const tagNames = course.tags.map((ct) => ct.tag.name);
  const isAdmin = session.role === "ADMIN";
  const canEdit = collabPermission.canEditContent;

  // VIEWER collaborators only see a read-only summary — no editor form,
  // no lessons manager, no collaborator management. They still get a link
  // to the public course page so they can preview as students see it.
  if (!canEdit) {
    return (
      <div>
        <Link
          href="/instructor/courses"
          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Courses
        </Link>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground truncate">{course.title}</h1>
          <p className="text-muted-foreground text-sm mt-1 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" /> Read-only access ({collabPermission.role.replace(/_/g, " ").toLowerCase()})
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <p className="text-sm text-muted-foreground">
            You have <strong className="text-foreground">{collabPermission.role.replace(/_/g, " ")}</strong> access
            on this course. You can review its content but can&apos;t make changes. Ask the course owner if you
            need a higher role.
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-3">{course.title}</h2>
          <p className="text-sm text-muted-foreground mb-4 whitespace-pre-wrap">{course.description}</p>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Status: <span className="text-foreground">{course.status}</span></p>
            <p>Level: <span className="text-foreground">{course.level}</span></p>
            <p>Language: <span className="text-foreground">{course.language}</span></p>
            <p>Lessons: <span className="text-foreground">{course.sections.reduce((s, sec) => s + sec.lessons.length, 0) + course.lessons.length}</span></p>
          </div>
          <Link
            href={`/courses/${course.id}`}
            className="mt-5 inline-flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300"
          >
            <Eye className="w-4 h-4" /> Preview public page
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/instructor/courses"
        className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to My Courses
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground truncate">{course.title}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Edit course details and manage lessons.
        </p>
      </div>

      <CourseForm
        mode="edit"
        initial={{
          id: course.id,
          title: course.title,
          shortDesc: course.shortDesc,
          description: course.description,
          thumbnail: course.thumbnail,
          price: course.price ? course.price.toString() : null,
          discountPrice: course.discountPrice ? course.discountPrice.toString() : null,
          isFree: course.isFree,
          level: course.level,
          language: course.language,
          status: course.status,
          categoryId: course.categoryId,
          instructorRevenuePercent: course.instructorRevenuePercent,
          tagNames,
        }}
        categories={categories}
        suggestedTags={tagSuggestions.map((t) => t.name)}
        onCancelHref="/instructor/courses"
        apiBasePath="/api/instructor/courses"
        redirectAfterCreateBase="/instructor/courses"
        canEditRevenuePercent={isAdmin}
        statusOptions={
          isAdmin
            ? [
                { value: "DRAFT", label: "Draft" },
                { value: "PUBLISHED", label: "Published" },
                { value: "PENDING_REVIEW", label: "Pending Review" },
                { value: "ARCHIVED", label: "Archived" },
              ]
            : [
                { value: "DRAFT", label: "Draft" },
                { value: "PUBLISHED", label: "Published" },
              ]
        }
      />

      <div className="mt-10">
        <h2 className="text-lg font-semibold text-foreground mb-5">Course Content</h2>
        <LessonsManager
          courseId={course.id}
          sections={course.sections}
          ungroupedLessons={course.lessons}
        />
      </div>

      <div className="mt-12 pt-10 border-t border-border">
        <CollaboratorsManager courseId={course.id} />
      </div>
    </div>
  );
}
