/**
 * /onboarding — profession selection step shown after a new student registers.
 * Server component: redirects if already authenticated and onboarding complete.
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OnboardingClient from "./OnboardingClient";

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

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // Only students go through onboarding
  if (session.role !== "STUDENT") {
    redirect(session.role === "INSTRUCTOR" ? "/instructor" : "/admin");
  }

  const professions = await getProfessions();

  return (
    <OnboardingClient
      userName={session.name.split(" ")[0]}
      professions={professions}
    />
  );
}
