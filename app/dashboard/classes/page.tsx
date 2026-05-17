/**
 * Student: My Classes (enrolled + pending requests).
 *
 * The static header paints instantly; the enrolled-classes list streams in
 * behind a Suspense boundary so the page never blocks on the DB query.
 */
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Skeleton } from "@/components/ui/Skeleton";
import ClassesBrowser from "./ClassesBrowser";

export default async function StudentClassesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

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

      <Suspense fallback={<MyClassesSkeleton />}>
        <EnrolledClasses userId={session.userId} />
      </Suspense>
    </div>
  );
}

async function EnrolledClasses({ userId }: { userId: string }) {
  const enrollments = await prisma.classEnrollment.findMany({
    where: {
      userId,
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

  const items = enrollments.map((e) => ({
    id: e.id,
    status: e.status,
    progressPct: e.progressPct,
    name: e.class.name,
    slug: e.class.slug,
    thumbnail: e.class.thumbnail,
    instructorName: e.class.instructor.name,
    courses: e.class._count.courses,
    students: e.class._count.enrollments,
  }));

  return <ClassesBrowser items={items} />;
}

function MyClassesSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton h="h-10" className="w-full max-w-sm rounded-lg" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass p-4 rounded-xl animate-pulse">
            <Skeleton className="h-32 w-full rounded-lg mb-3" />
            <Skeleton h="h-5" w="w-4/5" />
            <Skeleton h="h-3" w="w-1/2" className="mt-2" />
            <div className="flex gap-3 mt-3">
              <Skeleton h="h-3" w="w-10" />
              <Skeleton h="h-3" w="w-10" />
            </div>
            <Skeleton h="h-1.5" className="w-full mt-3 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
