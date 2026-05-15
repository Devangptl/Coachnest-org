/**
 * Student: My Classes (enrolled + pending requests)
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { GraduationCap, Clock, Users, BookOpen } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export default async function StudentClassesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const enrollments = await prisma.classEnrollment.findMany({
    where: {
      userId: session.userId,
      status: { in: ["APPROVED", "PENDING", "WAITLISTED"] },
    },
    include: {
      class: {
        include: {
          instructor: { select: { id: true, name: true, avatar: true } },
          _count: { select: { courses: true, enrollments: { where: { status: "APPROVED" } } } },
        },
      },
    },
    orderBy: { requestedAt: "desc" },
  });

  const approved = enrollments.filter((e) => e.status === "APPROVED");
  const pending = enrollments.filter((e) => e.status !== "APPROVED");

  return (
    <div className="px-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-amber-400" />
            My Classes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cohort-based classes you&apos;ve joined.
          </p>
        </div>
        <Link href="/classes" className="text-sm text-amber-400 hover:underline">
          Browse classes →
        </Link>
      </div>

      {pending.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Pending ({pending.length})
          </h2>
          <div className="space-y-2">
            {pending.map((e) => (
              <div key={e.id} className="glass p-3 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{e.class.name}</div>
                  <div className="text-xs text-muted-foreground">{e.status} · {e.class.instructor.name}</div>
                </div>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-400/30">
                  {e.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {approved.length === 0 ? (
        <div className="glass p-12 rounded-xl text-center">
          <GraduationCap className="w-16 h-16 text-amber-400/30 mx-auto mb-3" />
          <h2 className="text-lg font-semibold mb-1">No classes yet</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Browse available classes to join your first cohort.
          </p>
          <Link href="/classes" className="inline-block btn-primary px-4 py-2 rounded-lg text-sm">
            Browse classes
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {approved.map((e) => (
            <Link
              key={e.id}
              href={`/classes/${e.class.slug}`}
              className="glass p-4 rounded-xl hover:border-amber-400/30 transition-all"
            >
              {e.class.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={e.class.thumbnail} alt="" className="w-full h-32 object-cover rounded-lg mb-3" />
              ) : (
                <div className="w-full h-32 rounded-lg mb-3 bg-gradient-to-br from-amber-500/15 to-orange-500/15 flex items-center justify-center">
                  <GraduationCap className="w-10 h-10 text-amber-400/60" />
                </div>
              )}
              <h3 className="font-semibold truncate">{e.class.name}</h3>
              <div className="text-xs text-muted-foreground mt-1 mb-2">by {e.class.instructor.name}</div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {e.class._count.courses}</span>
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {e.class._count.enrollments}</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-1.5 mt-3">
                <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: `${e.progressPct}%` }} />
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">{e.progressPct}% complete</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
