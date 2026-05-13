/**
 * Instructor: My Classes
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { GraduationCap, PlusCircle, Users, BookOpen } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Button } from "@/components/ui/Button";

export default async function InstructorClassesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const classes = await prisma.class.findMany({
    where: { instructorId: session.userId },
    include: {
      _count: {
        select: {
          enrollments: { where: { status: "APPROVED" } },
          courses: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="px-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-amber-400" />
            My Classes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cohort-based learning experiences combining multiple courses.
          </p>
        </div>
        <Link href="/instructor/classes/new">
          <Button>
            <PlusCircle className="w-4 h-4" /> New Class
          </Button>
        </Link>
      </div>

      {classes.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((cls) => (
            <Link
              key={cls.id}
              href={`/instructor/classes/${cls.id}`}
              className="glass p-4 rounded-xl hover:border-amber-400/30 transition-all group"
            >
              {cls.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cls.thumbnail}
                  alt={cls.name}
                  className="w-full h-32 object-cover rounded-lg mb-3"
                />
              ) : (
                <div className="w-full h-32 rounded-lg mb-3 bg-gradient-to-br from-amber-500/15 to-orange-500/15 flex items-center justify-center">
                  <GraduationCap className="w-10 h-10 text-amber-400/60" />
                </div>
              )}

              <div className="flex items-center justify-between gap-2 mb-1">
                <h3 className="font-semibold truncate group-hover:text-amber-400 transition-colors">
                  {cls.name}
                </h3>
                <StatusBadge status={cls.status} />
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3 h-3" /> {cls._count.courses} courses
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" /> {cls._count.enrollments} students
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: "DRAFT" | "PUBLISHED" | "ARCHIVED" }) {
  const styles = {
    DRAFT: "bg-amber-500/15 text-amber-400 border-amber-400/30",
    PUBLISHED: "bg-emerald-500/15 text-emerald-400 border-emerald-400/30",
    ARCHIVED: "bg-zinc-500/15 text-zinc-400 border-zinc-400/30",
  } as const;
  return (
    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${styles[status]}`}>
      {status}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="glass p-12 text-center rounded-xl">
      <GraduationCap className="w-16 h-16 text-amber-400/30 mx-auto mb-4" />
      <h2 className="text-lg font-semibold mb-1">No classes yet</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Create your first cohort-based class to teach multiple courses together.
      </p>
      <Link href="/instructor/classes/new">
        <Button>
          <PlusCircle className="w-4 h-4" /> Create your first class
        </Button>
      </Link>
    </div>
  );
}
