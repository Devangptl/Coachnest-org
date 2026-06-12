/**
 * Org workspace login — resolves the org server-side for branding, then
 * renders the client form. Members are routed to their portal by org role;
 * non-members are rejected even with valid platform credentials.
 */
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getOrgBySlug } from "@/lib/org-auth";
import OrgLoginClient from "./OrgLoginClient";

export default async function OrgLoginPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const org = await getOrgBySlug(slug);
  if (!org) notFound();

  return (
    <Suspense>
      <OrgLoginClient org={{ name: org.name, slug: org.slug, logo: org.logo }} />
    </Suspense>
  );
}
