/**
 * Dashboard → Collaboration Invitations.
 * Server component fetches pending invites matching the user's email and
 * renders an interactive list that lets them accept or decline each one.
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getMyPendingInvites } from "@/services/collaboration.service";
import InvitationsList from "./InvitationsList";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ token?: string }> };

export default async function InvitationsPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { token } = await searchParams;
  const invites = await getMyPendingInvites(session.email);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Collaboration Invitations</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Other instructors have invited you to co-teach their courses.
        </p>
      </div>
      <InvitationsList initialInvites={invites} highlightToken={token} />
    </div>
  );
}
