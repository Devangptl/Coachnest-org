/**
 * Instructor: Create Class wizard
 */
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import CreateClassWizard from "./CreateClassWizard";

export default async function NewClassPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "STUDENT") redirect("/dashboard");

  const courses = await prisma.course.findMany({
    where: { createdById: session.userId },
    select: {
      id: true,
      title: true,
      thumbnail: true,
      totalLessons: true,
      totalDuration: true,
      status: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return <CreateClassWizard availableCourses={courses} />;
}
