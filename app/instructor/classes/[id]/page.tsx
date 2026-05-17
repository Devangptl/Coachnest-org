/**
 * Instructor: Class details with sidebar tabs.
 *
 * A layout skeleton paints immediately while the class data streams in
 * behind a Suspense boundary.
 */
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Skeleton } from "@/components/ui/Skeleton";
import ClassDetailShell from "./ClassDetailShell";

export default async function InstructorClassDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;

  return (
    <div className="px-4 max-w-7xl mx-auto">
      <Suspense fallback={<InstructorClassSkeleton />}>
        <ClassDetail id={id} tab={tab ?? "overview"} />
      </Suspense>
    </div>
  );
}

async function ClassDetail({ id, tab }: { id: string; tab: string }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const cls = await prisma.class.findUnique({
    where: { id },
    include: {
      instructor: { select: { id: true, name: true, avatar: true } },
      courses: {
        orderBy: { order: "asc" },
        include: {
          course: { select: { id: true, title: true, slug: true, thumbnail: true, totalLessons: true } },
        },
      },
      _count: {
        select: {
          enrollments: { where: { status: "APPROVED" } },
          liveSessions: true,
        },
      },
    },
  });
  if (!cls) notFound();
  if (cls.instructorId !== session.userId && session.role !== "ADMIN") redirect("/instructor/classes");

  return <ClassDetailShell cls={cls} initialTab={tab} />;
}

function InstructorClassSkeleton() {
  return (
    <div className="animate-pulse">
      <Skeleton className="w-full h-40 rounded-xl mb-4" />
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div className="space-y-2">
          <div className="flex gap-2">
            <Skeleton h="h-5" w="w-20" className="rounded-full" />
            <Skeleton h="h-5" w="w-20" className="rounded-full" />
          </div>
          <Skeleton h="h-8" w="w-64" />
          <Skeleton h="h-3" w="w-72" />
        </div>
        <div className="flex gap-2">
          <Skeleton h="h-9" w="w-32" className="rounded-lg" />
          <Skeleton h="h-9" w="w-24" className="rounded-lg" />
        </div>
      </div>
      <div className="flex flex-col lg:flex-row gap-4">
        <aside className="lg:w-56 shrink-0 space-y-1">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} h="h-9" className="w-full rounded-lg" />
          ))}
        </aside>
        <main className="flex-1 space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} h="h-24" className="rounded-lg" />
            ))}
          </div>
          <Skeleton h="h-40" className="w-full rounded-xl" />
        </main>
      </div>
    </div>
  );
}
