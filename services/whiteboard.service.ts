/**
 * Whiteboard service layer — pure functions over Prisma.
 *
 * Authorization is the caller's responsibility (resolve the role via
 * lib/whiteboard/permissions and gate before calling mutating functions).
 * Structural changes broadcast a realtime event so other open sessions refresh;
 * high-frequency drawing/cursor sync happens client→client and never lands here.
 */
import "server-only";
import { prisma } from "@/lib/prisma";
import { emit } from "@/lib/realtime/emit";
import { channels, events } from "@/lib/realtime/channels";
import { reconcileElements } from "@/lib/whiteboard/reconcile";
import { Prisma } from "@/lib/generated/prisma/client";
import type {
  CreateWhiteboardInput,
  SyncElementsInput,
  UpdateWhiteboardInput,
} from "@/lib/validation/whiteboard";
import type {
  SyncableElement,
  WhiteboardRole,
  WhiteboardScope,
} from "@/types/whiteboard";

const SCOPE_TITLES: Record<WhiteboardScope, string> = {
  LIVE_CLASS: "Class whiteboard",
  COURSE: "Course whiteboard",
  LESSON: "Lesson whiteboard",
  ASSIGNMENT: "Assignment whiteboard",
  STUDENT_NOTE: "My notes",
  GROUP_PROJECT: "Group whiteboard",
  STANDALONE: "Untitled whiteboard",
};

const accessSelect = {
  ownerId: true,
  scope: true,
  defaultRole: true,
  classId: true,
  courseId: true,
  lessonId: true,
  assignmentId: true,
  studyGroupId: true,
  collaborators: { select: { userId: true, role: true } },
} satisfies Prisma.WhiteboardSelect;

/** Lightweight fetch used purely for permission resolution. */
export function getWhiteboardAccess(id: string) {
  return prisma.whiteboard.findUnique({ where: { id }, select: accessSelect });
}

/** Full board payload for the editor (pages ordered, collaborators with user). */
export function getWhiteboardForUser(id: string) {
  return prisma.whiteboard.findUnique({
    where: { id },
    include: {
      pages: { orderBy: { order: "asc" } },
      collaborators: {
        include: { user: { select: { id: true, name: true, avatar: true } } },
        orderBy: { createdAt: "asc" },
      },
      assets: true,
    },
  });
}

export async function createWhiteboard(ownerId: string, input: CreateWhiteboardInput) {
  return prisma.whiteboard.create({
    data: {
      ownerId,
      title: input.title ?? SCOPE_TITLES[input.scope],
      scope: input.scope,
      defaultRole: input.defaultRole,
      classId: input.classId ?? null,
      courseId: input.courseId ?? null,
      lessonId: input.lessonId ?? null,
      assignmentId: input.assignmentId ?? null,
      studyGroupId: input.studyGroupId ?? null,
      pages: { create: { title: "Page 1", order: 0 } },
    },
    include: { pages: true },
  });
}

export function listWhiteboardsForUser(userId: string) {
  return prisma.whiteboard.findMany({
    where: {
      OR: [{ ownerId: userId }, { collaborators: { some: { userId } } }],
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      scope: true,
      updatedAt: true,
      ownerId: true,
      owner: { select: { name: true } },
      _count: { select: { pages: true, collaborators: true } },
    },
  });
}

export function updateWhiteboard(id: string, input: UpdateWhiteboardInput) {
  return prisma.whiteboard.update({ where: { id }, data: input });
}

export function deleteWhiteboard(id: string) {
  return prisma.whiteboard.delete({ where: { id } });
}

/**
 * Find the board attached to an LMS context, creating it (with a first page)
 * if it doesn't exist yet. Used by the per-surface launchers.
 */
export async function getOrCreateContextWhiteboard(opts: {
  scope: WhiteboardScope;
  ownerId: string;
  classId?: string | null;
  courseId?: string | null;
  lessonId?: string | null;
  assignmentId?: string | null;
  studyGroupId?: string | null;
  defaultRole?: WhiteboardRole;
  title?: string;
  // For per-user boards (e.g. personal lesson notes), scope the lookup to the
  // owner so each user gets their own board on the same context.
  matchOwner?: boolean;
}) {
  const where: Prisma.WhiteboardWhereInput = { scope: opts.scope };
  if (opts.matchOwner) where.ownerId = opts.ownerId;
  if (opts.classId) where.classId = opts.classId;
  if (opts.courseId) where.courseId = opts.courseId;
  if (opts.lessonId) where.lessonId = opts.lessonId;
  if (opts.assignmentId) where.assignmentId = opts.assignmentId;
  if (opts.studyGroupId) where.studyGroupId = opts.studyGroupId;

  const existing = await prisma.whiteboard.findFirst({
    where,
    select: { id: true },
  });
  if (existing) return existing;

  return prisma.whiteboard.create({
    data: {
      ownerId: opts.ownerId,
      title: opts.title ?? SCOPE_TITLES[opts.scope],
      scope: opts.scope,
      defaultRole: opts.defaultRole ?? "EDITOR",
      classId: opts.classId ?? null,
      courseId: opts.courseId ?? null,
      lessonId: opts.lessonId ?? null,
      assignmentId: opts.assignmentId ?? null,
      studyGroupId: opts.studyGroupId ?? null,
      pages: { create: { title: "Page 1", order: 0 } },
    },
    select: { id: true },
  });
}

// ─── Pages ────────────────────────────────────────────────────────────────────

export async function createPage(whiteboardId: string, title?: string) {
  const last = await prisma.whiteboardPage.findFirst({
    where: { whiteboardId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const order = (last?.order ?? -1) + 1;
  const page = await prisma.whiteboardPage.create({
    data: { whiteboardId, title: title ?? `Page ${order + 1}`, order },
  });
  await notifyPageChange(whiteboardId);
  return page;
}

export async function updatePage(
  pageId: string,
  data: { title?: string; appState?: Prisma.InputJsonValue },
) {
  return prisma.whiteboardPage.update({ where: { id: pageId }, data });
}

export async function deletePage(whiteboardId: string, pageId: string) {
  const count = await prisma.whiteboardPage.count({ where: { whiteboardId } });
  if (count <= 1) throw new Error("A whiteboard must have at least one page");
  await prisma.whiteboardPage.delete({ where: { id: pageId } });
  await notifyPageChange(whiteboardId);
}

export async function duplicatePage(whiteboardId: string, pageId: string) {
  const source = await prisma.whiteboardPage.findUnique({
    where: { id: pageId },
    include: { elements: true },
  });
  if (!source || source.whiteboardId !== whiteboardId) {
    throw new Error("Page not found");
  }
  const last = await prisma.whiteboardPage.findFirst({
    where: { whiteboardId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const order = (last?.order ?? -1) + 1;

  const page = await prisma.whiteboardPage.create({
    data: {
      whiteboardId,
      title: `${source.title} (copy)`,
      order,
      appState: (source.appState as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      // elementId is unique per page, so cloned rows can keep their original ids.
      elements: {
        create: source.elements
          .filter((e) => !e.isDeleted)
          .map((e) => ({
            elementId: e.elementId,
            type: e.type,
            data: e.data as Prisma.InputJsonValue,
            version: e.version,
          })),
      },
    },
  });
  await notifyPageChange(whiteboardId);
  return page;
}

export async function reorderPages(whiteboardId: string, pageIds: string[]) {
  await prisma.$transaction(
    pageIds.map((id, idx) =>
      prisma.whiteboardPage.updateMany({
        where: { id, whiteboardId },
        data: { order: idx },
      }),
    ),
  );
  await notifyPageChange(whiteboardId);
}

async function notifyPageChange(whiteboardId: string) {
  await emit(channels.whiteboard(whiteboardId), events.whiteboardPageChanged, {
    whiteboardId,
  });
}

// ─── Elements ───────────────────────────────────────────────────────────────

/** Non-deleted element bodies for hydrating a page. */
export async function getPageElements(pageId: string): Promise<SyncableElement[]> {
  const rows = await prisma.whiteboardElement.findMany({
    where: { pageId, isDeleted: false },
    select: { data: true },
  });
  return rows.map((r) => r.data as unknown as SyncableElement);
}

/**
 * Persist a batch of changed elements, reconciling by version so a slower
 * client cannot clobber a newer server-side state. Returns any elements where
 * the stored version is newer than what the client sent, so the caller can
 * adopt the authoritative copy.
 */
export async function syncElements(
  pageId: string,
  userId: string,
  input: SyncElementsInput,
): Promise<{ applied: number; reconciled: SyncableElement[] }> {
  const ids = input.elements.map((e) => e.elementId);
  const existing = await prisma.whiteboardElement.findMany({
    where: { pageId, elementId: { in: ids } },
    select: { elementId: true, version: true, data: true },
  });
  const existingMap = new Map(existing.map((e) => [e.elementId, e]));

  const reconciled: SyncableElement[] = [];
  const writes: Prisma.PrismaPromise<unknown>[] = [];

  for (const el of input.elements) {
    const prev = existingMap.get(el.elementId);
    const merged = reconcileElements(
      prev ? [prev.data as unknown as SyncableElement] : [],
      [el.data],
    )[0];

    // Server already holds a strictly newer copy — tell the client to adopt it.
    if (prev && merged !== el.data) {
      reconciled.push(merged);
      continue;
    }

    writes.push(
      prisma.whiteboardElement.upsert({
        where: { pageId_elementId: { pageId, elementId: el.elementId } },
        create: {
          pageId,
          elementId: el.elementId,
          type: el.type,
          data: el.data as unknown as Prisma.InputJsonValue,
          version: el.version,
          isDeleted: el.isDeleted,
          updatedById: userId,
        },
        update: {
          type: el.type,
          data: el.data as unknown as Prisma.InputJsonValue,
          version: el.version,
          isDeleted: el.isDeleted,
          updatedById: userId,
        },
      }),
    );
  }

  if (writes.length) await prisma.$transaction(writes);
  await prisma.whiteboardPage.update({
    where: { id: pageId },
    data: { updatedAt: new Date() },
  });

  return { applied: writes.length, reconciled };
}

// ─── Assets ─────────────────────────────────────────────────────────────────

export function listAssets(whiteboardId: string) {
  return prisma.whiteboardAsset.findMany({ where: { whiteboardId } });
}

export function addAsset(data: {
  whiteboardId: string;
  uploadedById: string;
  fileId: string;
  url: string;
  publicId: string;
  filename: string;
  mimeType: string;
  bytes: number;
  width?: number;
  height?: number;
}) {
  return prisma.whiteboardAsset.upsert({
    where: {
      whiteboardId_fileId: { whiteboardId: data.whiteboardId, fileId: data.fileId },
    },
    create: data,
    update: {},
  });
}

// ─── Collaborators ────────────────────────────────────────────────────────────

export function listCollaborators(whiteboardId: string) {
  return prisma.whiteboardCollaborator.findMany({
    where: { whiteboardId },
    include: { user: { select: { id: true, name: true, avatar: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function addCollaborator(
  whiteboardId: string,
  invitedById: string,
  userId: string,
  role: WhiteboardRole,
) {
  const collab = await prisma.whiteboardCollaborator.upsert({
    where: { whiteboardId_userId: { whiteboardId, userId } },
    create: { whiteboardId, userId, role, invitedById },
    update: { role },
    include: { user: { select: { id: true, name: true, avatar: true } } },
  });
  await notifyCollaboratorChange(whiteboardId);
  return collab;
}

export async function updateCollaboratorRole(
  whiteboardId: string,
  userId: string,
  role: WhiteboardRole,
) {
  const collab = await prisma.whiteboardCollaborator.update({
    where: { whiteboardId_userId: { whiteboardId, userId } },
    data: { role },
    include: { user: { select: { id: true, name: true, avatar: true } } },
  });
  await notifyCollaboratorChange(whiteboardId);
  return collab;
}

export async function removeCollaborator(whiteboardId: string, userId: string) {
  await prisma.whiteboardCollaborator.deleteMany({ where: { whiteboardId, userId } });
  await notifyCollaboratorChange(whiteboardId);
}

async function notifyCollaboratorChange(whiteboardId: string) {
  await emit(
    channels.whiteboard(whiteboardId),
    events.whiteboardCollaboratorChanged,
    { whiteboardId },
  );
}
