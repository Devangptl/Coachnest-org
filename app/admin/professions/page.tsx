/**
 * /admin/professions — manage predefined professions shown in onboarding.
 * Server Component: fetches list from DB, passes to client table.
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ProfessionsClient from "./ProfessionsClient";

async function getProfessions() {
  return prisma.profession.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { users: true } } },
  });
}

export default async function AdminProfessionsPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/admin");

  const professions = await getProfessions();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Professions</h1>
        <p className="text-muted-foreground/70 text-sm mt-1">
          Manage the professions displayed during student onboarding.
          Students use these to personalise their course recommendations.
        </p>
      </div>

      <ProfessionsClient initialProfessions={professions} />
    </div>
  );
}
