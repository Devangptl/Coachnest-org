import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import InstructorOnboardingClient from "./InstructorOnboardingClient";

async function getCategories() {
  return prisma.category.findMany({
    orderBy: { name: "asc" },
    select:  { id: true, slug: true, name: true, icon: true, color: true },
  });
}

export default async function InstructorOnboardingPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "INSTRUCTOR") {
    redirect(session.role === "STUDENT" ? "/onboarding" : "/admin");
  }

  const profile = await prisma.user.findUnique({
    where:  { id: session.userId },
    select: { hasCompletedInstructorOnboarding: true, instructorStatus: true },
  });

  if (!profile) redirect("/login");

  // Already onboarded — send to the right place
  if (profile.hasCompletedInstructorOnboarding) {
    redirect(profile.instructorStatus === "APPROVED" ? "/instructor" : "/instructor/pending");
  }

  const categories = await getCategories();

  return (
    <InstructorOnboardingClient
      userName={session.name.split(" ")[0]}
      categories={categories}
    />
  );
}
