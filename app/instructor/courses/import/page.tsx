import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import GlassCard from "@/components/GlassCard";
import CourseImportUploader from "@/components/CourseImportUploader";
import { ArrowLeft, FileUp } from "lucide-react";

export default async function ImportCoursePage() {
  const session = await getSession();
  if (!session || (session.role !== "INSTRUCTOR" && session.role !== "ADMIN")) {
    redirect("/login");
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back nav */}
      <Link
        href="/instructor/courses"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> My Courses
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <FileUp className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Import Course from PDF</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Download the template, fill it in, and upload — your course and lessons are created instantly.
          </p>
        </div>
      </div>

      <GlassCard>
        <CourseImportUploader />
      </GlassCard>
    </div>
  );
}
