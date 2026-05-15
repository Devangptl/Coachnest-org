/**
 * Instructor: Class details with sidebar tabs.
 */
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import ClassDetailShell from "./ClassDetailShell";

export default async function InstructorClassDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const { tab } = await searchParams;

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

  return <ClassDetailShell cls={cls} initialTab={tab ?? "overview"} />;
}
