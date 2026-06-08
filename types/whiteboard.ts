/**
 * Shared whiteboard types — usable from both server and client code.
 *
 * Excalidraw element shapes are intentionally kept loose (`Record<string, unknown>`
 * plus the reconciliation fields we rely on) so server code does not need to import
 * the heavy `@excalidraw/excalidraw` package, which is browser-only.
 */

export type WhiteboardRole = "OWNER" | "EDITOR" | "VIEWER";

export type WhiteboardScope =
  | "LIVE_CLASS"
  | "COURSE"
  | "LESSON"
  | "ASSIGNMENT"
  | "STUDENT_NOTE"
  | "GROUP_PROJECT"
  | "STANDALONE";

/** Minimal shape of an Excalidraw element needed for reconciliation. */
export interface SyncableElement {
  id: string;
  type: string;
  version: number;
  versionNonce?: number;
  isDeleted?: boolean;
  [key: string]: unknown;
}

/** Payload the client sends to the elements sync endpoint. */
export interface ElementSyncInput {
  elementId: string;
  type: string;
  data: SyncableElement;
  version: number;
  isDeleted: boolean;
}

export interface WhiteboardPageDTO {
  id: string;
  title: string;
  order: number;
  appState: Record<string, unknown> | null;
}

export interface WhiteboardCollaboratorDTO {
  id: string;
  userId: string;
  role: WhiteboardRole;
  user: { id: string; name: string; avatar: string | null };
}

export interface WhiteboardAssetDTO {
  id: string;
  fileId: string;
  url: string;
  mimeType: string;
  filename: string;
  width: number | null;
  height: number | null;
}

export interface WhiteboardDTO {
  id: string;
  title: string;
  scope: WhiteboardScope;
  defaultRole: WhiteboardRole;
  ownerId: string;
  classId: string | null;
  courseId: string | null;
  lessonId: string | null;
  assignmentId: string | null;
  studyGroupId: string | null;
  pages: WhiteboardPageDTO[];
  collaborators: WhiteboardCollaboratorDTO[];
}

/** Realtime cursor/presence payload. */
export interface PointerPayload {
  userId: string;
  name: string;
  color: string;
  pageId: string;
  x: number;
  y: number;
  button?: "up" | "down";
}

/** Realtime scene-broadcast payload (incremental). */
export interface ScenePayload {
  userId: string;
  pageId: string;
  elements: SyncableElement[];
}

/** Excalidraw BinaryFile-compatible shape (subset we read/write). */
export interface BinaryFileLike {
  id: string;
  dataURL: string;
  mimeType: string;
  created?: number;
}

/**
 * Minimal surface of Excalidraw's imperative API we depend on. Declaring it
 * locally avoids importing the package's version-specific deep type paths.
 */
export interface ExcalidrawAPI {
  updateScene: (scene: {
    elements?: readonly SyncableElement[];
    collaborators?: Map<string, unknown>;
    appState?: Record<string, unknown>;
  }) => void;
  getSceneElements: () => readonly SyncableElement[];
  getSceneElementsIncludingDeleted: () => readonly SyncableElement[];
  getAppState: () => Record<string, unknown>;
  getFiles: () => Record<string, BinaryFileLike>;
  addFiles: (files: BinaryFileLike[]) => void;
  scrollToContent: (target?: unknown, opts?: unknown) => void;
}
