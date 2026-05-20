import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import EditEmailTemplateForm from "./EditEmailTemplateForm";

type Props = { params: Promise<{ id: string }> };

export default async function EditEmailTemplatePage({ params }: Props) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const { id } = await params;
  const template = await prisma.emailTemplate.findUnique({ where: { id } });
  if (!template) notFound();

  return <EditEmailTemplateForm template={template} />;
}
