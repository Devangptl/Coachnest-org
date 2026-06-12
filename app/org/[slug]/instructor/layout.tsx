/**
 * Org instructor portal layout — ORG_ADMIN and ORG_INSTRUCTOR (plus platform
 * SUPER_ADMIN). Blocked entirely while the org subscription is inactive.
 */
import { redirect } from "next/navigation";
import { requireOrgRole, OrgAuthError } from "@/lib/org-auth";
import OrgSidebar from "@/components/org/OrgSidebar";

export default async function OrgInstructorLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let ctx;
  try {
    ctx = await requireOrgRole(slug, ["ORG_ADMIN", "ORG_INSTRUCTOR"]);
  } catch (err) {
    if (err instanceof OrgAuthError && err.status === 401) redirect(`/org/${slug}/login`);
    if (err instanceof OrgAuthError && err.message.includes("subscription")) {
      redirect(`/org/${slug}/expired`);
    }
    redirect(`/org/${slug}/login?error=not_member`);
  }

  return (
    <div className="py-4">
      <div className="flex flex-col md:flex-row md:gap-4 md:min-h-[calc(100vh-4rem)]">
        <OrgSidebar
          portal="instructor"
          org={{ name: ctx.org.name, slug: ctx.org.slug, logo: ctx.org.logo }}
          user={{
            userId: ctx.session.userId,
            name: ctx.session.name,
            email: ctx.session.email,
            avatar: ctx.session.avatar,
          }}
          roleLabel="Instructor"
        />
        <div className="flex-1 min-w-0 animate-fade-in mt-3 md:mt-0">{children}</div>
      </div>
    </div>
  );
}
