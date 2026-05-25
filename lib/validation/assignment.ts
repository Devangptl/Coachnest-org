/**
 * Zod validation schemas for class assignments.
 */
import { z } from "zod";

export const assignmentTypeEnum = z.enum(["TEXT", "FILE", "URL", "QUIZ"]);
export const assignmentStatusEnum = z.enum(["DRAFT", "PUBLISHED", "CLOSED"]);
export const submissionStatusEnum = z.enum([
  "DRAFT",
  "SUBMITTED",
  "GRADED",
  "RETURNED",
]);

export const createAssignmentSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(5000).optional().nullable(),
  instructions: z.string().max(20000).optional().nullable(),
  type: assignmentTypeEnum.default("TEXT"),
  maxScore: z.number().int().positive().max(10000).default(100),
  passingScore: z.number().int().min(0).max(10000).default(60),
  weight: z.number().int().min(1).max(100).default(1),
  dueAt: z.coerce.date().optional().nullable(),
  publishAt: z.coerce.date().optional().nullable(),
  quizId: z.string().optional().nullable(),
  allowLate: z.boolean().default(true),
  latePenalty: z.number().int().min(0).max(100).default(0),
  maxAttempts: z.number().int().min(0).max(50).default(1),
  attachments: z.array(z.string().url()).default([]),
});
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;

export const updateAssignmentSchema = createAssignmentSchema.partial().extend({
  status: assignmentStatusEnum.optional(),
});
export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>;

export const submitAssignmentSchema = z.object({
  textBody: z.string().max(50000).optional().nullable(),
  fileUrls: z.array(z.string().url()).default([]),
  url: z.string().url().optional().nullable(),
  // Whether to save as draft or finalize submission.
  finalize: z.boolean().default(true),
});
export type SubmitAssignmentInput = z.infer<typeof submitAssignmentSchema>;

export const gradeSubmissionSchema = z.object({
  score: z.number().int().min(0).max(10000),
  feedback: z.string().max(10000).optional().nullable(),
  // When true, mark as RETURNED instead of GRADED so the student can resubmit.
  returnForRevision: z.boolean().default(false),
});
export type GradeSubmissionInput = z.infer<typeof gradeSubmissionSchema>;
