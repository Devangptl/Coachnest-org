import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listWhiteboardsForUser } from "@/services/whiteboard.service";
import WhiteboardHub from "./WhiteboardHub";
import type { WhiteboardListItemDTO } from "@/types/whiteboard";

export const dynamic = "force-dynamic";

export const metadata = { title: "Whiteboards | Coachnest" };

export default async function WhiteboardsPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/whiteboards");

  const boards = await listWhiteboardsForUser(session.userId);
  const items: WhiteboardListItemDTO[] = boards.map((b) => ({
    id: b.id,
    title: b.title,
    scope: b.scope,
    updatedAt: b.updatedAt.toISOString(),
    ownerId: b.ownerId,
    ownerName: b.owner.name,
    pageCount: b._count.pages,
    collaboratorCount: b._count.collaborators,
  }));

  return <WhiteboardHub initialBoards={items} currentUserId={session.userId} />;
}
