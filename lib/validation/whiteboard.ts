import { z } from "zod";

export const whiteboardScopeEnum = z.enum([
  "LIVE_CLASS",
  "COURSE",
  "LESSON",
  "ASSIGNMENT",
  "STUDENT_NOTE",
  "GROUP_PROJECT",
  "STANDALONE",
]);

export const whiteboardRoleEnum = z.enum(["OWNER", "EDITOR", "VIEWER"]);

export const createWhiteboardSchema = z.object({
  title: z.string().min(1).max(160).optional(),
  scope: whiteboardScopeEnum.default("STANDALONE"),
  defaultRole: whiteboardRoleEnum.default("VIEWER"),
  classId: z.string().min(1).optional().nullable(),
  courseId: z.string().min(1).optional().nullable(),
  lessonId: z.string().min(1).optional().nullable(),
  assignmentId: z.string().min(1).optional().nullable(),
  studyGroupId: z.string().min(1).optional().nullable(),
});
export type CreateWhiteboardInput = z.infer<typeof createWhiteboardSchema>;

export const updateWhiteboardSchema = z.object({
  title: z.string().min(1).max(160).optional(),
  defaultRole: whiteboardRoleEnum.optional(),
});
export type UpdateWhiteboardInput = z.infer<typeof updateWhiteboardSchema>;

export const createPageSchema = z.object({
  title: z.string().min(1).max(120).optional(),
});

export const updatePageSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  appState: z.record(z.unknown()).optional(),
});

export const reorderPagesSchema = z.object({
  pageIds: z.array(z.string().min(1)).min(1),
});

const syncableElementSchema = z
  .object({
    id: z.string().min(1),
    type: z.string().min(1),
    version: z.number().int().nonnegative(),
    versionNonce: z.number().optional(),
    isDeleted: z.boolean().optional(),
  })
  .passthrough();

export const syncElementsSchema = z.object({
  elements: z
    .array(
      z.object({
        elementId: z.string().min(1),
        type: z.string().min(1),
        data: syncableElementSchema,
        version: z.number().int().nonnegative(),
        isDeleted: z.boolean().default(false),
      }),
    )
    .max(2000),
});
export type SyncElementsInput = z.infer<typeof syncElementsSchema>;

export const addCollaboratorSchema = z.object({
  userId: z.string().min(1),
  role: whiteboardRoleEnum.default("VIEWER"),
});

export const updateCollaboratorSchema = z.object({
  role: whiteboardRoleEnum,
});

export const ASSET_MAX_BYTES = 5 * 1024 * 1024; // 5 MB per image
export const ALLOWED_ASSET_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/svg+xml",
]);
