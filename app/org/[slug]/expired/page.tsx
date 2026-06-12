/**
 * Shown to org instructors/students when the organization's subscription is
 * not active. Org admins are redirected to billing instead (portal layouts).
 */
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { getOrgBySlug } from "@/lib/org-auth";
import { notFound } from "next/navigation";

export default async function OrgExpiredPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const org = await getOrgBySlug(slug);
  if (!org) notFound();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-5">
        <AlertTriangle className="w-7 h-7 text-amber-500" />
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-2">
        {org.name}&apos;s subscription is inactive
      </h1>
      <p className="text-muted-foreground text-sm max-w-md leading-relaxed">
        Access to this workspace is paused until the subscription is renewed.
        Your courses and progress are safe. Please contact your organization
        admin to restore access.
      </p>
      <Link href={`/org/${slug}/login`} className="btn-secondary mt-6">
        Back to login
      </Link>
    </div>
  );
}
