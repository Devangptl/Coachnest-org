/**
 * Org instructor → New Course. Reuses the shared CourseForm; the org API
 * route forces organizationId + free access server-side.
 */
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireOrgRole } from "@/lib/org-auth";
import CourseForm from "@/components/admin/CourseForm";

export const dynamic = "force-dynamic";

export default async function OrgNewCoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await requireOrgRole(slug, ["ORG_ADMIN", "ORG_INSTRUCTOR"]);

  const categories = await prisma.category.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <Link
        href={`/org/${slug}/instructor/courses`}
        className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to My Courses
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Create New Course</h1>
        <p className="text-muted-foreground mt-1">
          Org courses are included in your members&apos; access — no pricing needed.
        </p>
      </div>

      <CourseForm
        mode="create"
        categories={categories}
        onCancelHref={`/org/${slug}/instructor/courses`}
        apiBasePath={`/api/org/${slug}/courses`}
        redirectAfterCreateBase={`/org/${slug}/instructor/courses`}
        canEditRevenuePercent={false}
      />
    </div>
  );
}
