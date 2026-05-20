/**
 * Public browse — list all published, public classes.
 */
import Link from "next/link";
import { GraduationCap, Users, BookOpen } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function BrowseClassesPage() {
  const classes = await prisma.class.findMany({
    where: { status: "PUBLISHED", visibility: "PUBLIC" },
    include: {
      instructor: { select: { id: true, name: true, avatar: true } },
      _count: { select: { courses: true, enrollments: { where: { status: "APPROVED" } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  return (
    <div className="px-4 max-w-7xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
        <GraduationCap className="w-7 h-7 text-amber-400" /> Browse Classes
      </h1>
      <p className="text-sm text-muted-foreground mb-8">
        Cohort-based learning — join a batch and learn together.
      </p>

      {classes.length === 0 ? (
        <div className="glass p-12 rounded-xl text-center">
          <p className="text-muted-foreground">No public classes yet.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((cls) => (
            <Link
              key={cls.id}
              href={`/classes/${cls.slug}`}
              className="glass p-4 rounded-xl hover:border-amber-400/30 transition-all"
            >
              {cls.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cls.thumbnail} alt="" className="w-full h-36 object-cover rounded-lg mb-3" />
              ) : (
                <div className="w-full h-36 rounded-lg mb-3 bg-gradient-to-br from-amber-500/15 to-orange-500/15 flex items-center justify-center">
                  <GraduationCap className="w-12 h-12 text-amber-400/60" />
                </div>
              )}
              <h2 className="font-semibold text-lg leading-snug mb-1">{cls.name}</h2>
              <div className="text-xs text-muted-foreground mb-2">by {cls.instructor.name}</div>
              {cls.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{cls.description}</p>
              )}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {cls._count.courses} courses</span>
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {cls._count.enrollments} students</span>
                {cls.joinMode !== "OPEN" && (
                  <span className="ml-auto text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">
                    {cls.joinMode.replace("_", " ")}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
