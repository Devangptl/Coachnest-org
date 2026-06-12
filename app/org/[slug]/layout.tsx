/**
 * Org workspace root layout — resolves the organization from the URL slug
 * (404 for unknown slugs). Portal-specific role guards live in the
 * admin/instructor/student layouts below this one.
 */
import { notFound } from "next/navigation";
import { getOrgBySlug } from "@/lib/org-auth";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const org = await getOrgBySlug(slug);
  if (!org) notFound();

  return <>{children}</>;
}
