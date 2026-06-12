/**
 * Route guard helpers — resolve the caller's effective role on a board and
 * verify a page belongs to it. Keeps the API handlers thin and consistent.
 */
import "server-only";
import { getSession, type SessionPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWhiteboardAccess } from "@/services/whiteboard.service";
import { resolveWhiteboardRole } from "@/lib/whiteboard/permissions";
import type { WhiteboardRole } from "@/types/whiteboard";

export interface BoardGuard {
  session: SessionPayload | null;
  role: WhiteboardRole | null;
}

export async function getBoardRole(whiteboardId: string): Promise<BoardGuard> {
  const session = await getSession();
  if (!session) return { session: null, role: null };
  const access = await getWhiteboardAccess(whiteboardId);
  if (!access) return { session, role: null };
  const role = await resolveWhiteboardRole(session, access);
  return { session, role };
}

export async function pageBelongsToBoard(
  whiteboardId: string,
  pageId: string,
): Promise<boolean> {
  const page = await prisma.whiteboardPage.findUnique({
    where: { id: pageId },
    select: { whiteboardId: true },
  });
  return page?.whiteboardId === whiteboardId;
}
