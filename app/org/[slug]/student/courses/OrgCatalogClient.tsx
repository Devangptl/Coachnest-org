"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { BookOpen, Loader2, Check, Play } from "lucide-react";

interface CatalogCourse {
  id: string;
  title: string;
  shortDesc: string | null;
  thumbnail: string | null;
  level: string;
  instructor: string;
  lessons: number;
}

interface Props {
  slug: string;
  courses: CatalogCourse[];
  enrolledIds: string[];
}

export default function OrgCatalogClient({ slug, courses, enrolledIds }: Props) {
  const router = useRouter();
  const [enrolled, setEnrolled] = useState<Set<string>>(new Set(enrolledIds));
  const [enrolling, setEnrolling] = useState<string | null>(null);

  async function handleEnroll(courseId: string) {
    setEnrolling(courseId);
    try {
      const res = await fetch(`/api/org/${slug}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEnrolled((s) => new Set(s).add(courseId));
      toast.success("Enrolled! Start learning whenever you're ready.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to enroll");
    } finally {
      setEnrolling(null);
    }
  }

  if (courses.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl px-5 py-14 text-center">
        <BookOpen className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          No published courses yet. Check back soon!
        </p>
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {courses.map((c) => {
        const isEnrolled = enrolled.has(c.id);
        return (
          <div
            key={c.id}
            className="bg-card border border-border rounded-xl overflow-hidden flex flex-col"
          >
            {c.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.thumbnail} alt="" className="w-full h-32 object-cover" />
            ) : (
              <div className="w-full h-32 bg-secondary flex items-center justify-center">
                <BookOpen className="w-7 h-7 text-muted-foreground/40" />
              </div>
            )}
            <div className="p-4 flex flex-col flex-1">
              <p className="text-sm font-semibold text-foreground line-clamp-2">{c.title}</p>
              {c.shortDesc && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.shortDesc}</p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {c.instructor} · {c.lessons} lessons · {c.level}
              </p>
              <div className="mt-auto pt-4">
                {isEnrolled ? (
                  <Link href={`/courses/${c.id}`} className="btn-secondary w-full">
                    <Play className="w-4 h-4" /> Continue Learning
                  </Link>
                ) : (
                  <button
                    onClick={() => handleEnroll(c.id)}
                    disabled={enrolling === c.id}
                    className="btn-primary w-full"
                  >
                    {enrolling === c.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Enroll Free
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
