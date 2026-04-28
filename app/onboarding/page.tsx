/**
 * /onboarding — shown after a new student registers.
 * Server component: redirects if already authenticated and onboarding complete.
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OnboardingClient from "./OnboardingClient";
import { InstructorData } from "@/components/InstructorPicker";

async function getProfessions() {
  return prisma.profession.findMany({
    where:   { isActive: true },
    orderBy: { order: "asc" },
    select: {
      id: true, slug: true, name: true,
      description: true, icon: true, color: true,
    },
  });
}

async function getPopularInstructors(): Promise<InstructorData[]> {
  const raw = await prisma.user.findMany({
    where: { role: "INSTRUCTOR" },
    select: {
      id:       true,
      name:     true,
      avatar:   true,
      headline: true,
      courses: {
        where:  { status: "PUBLISHED" },
        select: { _count: { select: { enrollments: true } } },
      },
      _count: {
        select: { courses: { where: { status: "PUBLISHED" } } },
      },
    },
    take: 20,
  });

  return raw
    .map((i) => ({
      id:           i.id,
      name:         i.name,
      avatar:       i.avatar,
      headline:     i.headline,
      courseCount:  i._count.courses,
      studentCount: i.courses.reduce((sum, c) => sum + c._count.enrollments, 0),
    }))
    .sort((a, b) => b.studentCount - a.studentCount)
    .slice(0, 5);
}

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // Only students go through onboarding
  if (session.role !== "STUDENT") {
    redirect(session.role === "INSTRUCTOR" ? "/instructor" : "/admin");
  }

  const [professions, popularInstructors] = await Promise.all([
    getProfessions(),
    getPopularInstructors(),
  ]);

  return (
    <OnboardingClient
      userName={session.name.split(" ")[0]}
      professions={professions}
      popularInstructors={popularInstructors}
    />
  );
}
