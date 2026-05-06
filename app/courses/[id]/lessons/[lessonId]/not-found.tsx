import Link from "next/link";
import { FileX } from "lucide-react";

export default function LessonNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 py-20 text-center">
      <div className="w-20 h-20 rounded-md bg-secondary border border-border flex items-center justify-center mb-6">
        <FileX className="w-10 h-10 text-muted-foreground/25" />
      </div>
      <h2 className="text-2xl font-bold text-foreground mb-3">Lesson Not Found</h2>
      <p className="text-muted-foreground/70 max-w-sm leading-relaxed mb-6">
        This lesson doesn&apos;t exist or may have been removed.
      </p>
      <Link
        href=".."
        className="btn-primary px-6 py-3 font-semibold"
      >
        Back to Course
      </Link>
    </div>
  );
}
