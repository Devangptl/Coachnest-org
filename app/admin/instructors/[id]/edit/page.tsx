/**
 * Admin → Edit Instructor — server wrapper that loads initial data, renders the form.
 */
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getInstructorDetails } from "@/services/instructor.service";
import EditInstructorForm from "./EditInstructorForm";

export const dynamic = "force-dynamic";

export default async function EditInstructorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const { id } = await params;
  const instructor = await getInstructorDetails(id);
  if (!instructor) notFound();

  return (
    <div>
      <Link
        href={`/admin/instructors/${instructor.id}`}
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Profile
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Edit Instructor</h1>
        <p className="text-muted-foreground mt-1">
          Update {instructor.name}&apos;s profile. Email cannot be changed here.
        </p>
      </div>

      <EditInstructorForm
        instructor={{
          id: instructor.id,
          name: instructor.name,
          email: instructor.email,
          headline: instructor.headline,
          bio: instructor.bio,
          website: instructor.website,
          avatar: instructor.avatar,
        }}
      />
    </div>
  );
}
