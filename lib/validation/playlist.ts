/**
 * Zod validation schemas for Course Playlists.
 */
import { z } from "zod";

export const playlistVisibilityEnum = z.enum(["PUBLIC", "PRIVATE"]);

export const createPlaylistSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().max(5000).optional().nullable(),
  coverImage: z.string().url().optional().nullable(),
  visibility: playlistVisibilityEnum.default("PUBLIC"),
  courseIds: z.array(z.string().min(1)).max(200).default([]),
});
export type CreatePlaylistInput = z.infer<typeof createPlaylistSchema>;

export const updatePlaylistSchema = z.object({
  title: z.string().min(3).max(120).optional(),
  description: z.string().max(5000).optional().nullable(),
  coverImage: z.string().url().optional().nullable(),
  visibility: playlistVisibilityEnum.optional(),
});
export type UpdatePlaylistInput = z.infer<typeof updatePlaylistSchema>;

export const addPlaylistCourseSchema = z.object({
  courseId: z.string().min(1),
});

export const reorderPlaylistSchema = z.object({
  items: z.array(
    z.object({
      itemId: z.string().min(1),
      order: z.number().int().nonnegative(),
    }),
  ),
});
