/**
 * Shared TypeScript types used across the application.
 * These mirror Prisma model shapes but are safe to pass to Client Components
 * (no Date objects — dates are serialised to ISO strings via JSON).
 */

// ─── Auth ─────────────────────────────────────────────────────────────────────

export type UserRole = "STUDENT" | "ADMIN";

export interface SessionUser {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
}

// ─── Course ───────────────────────────────────────────────────────────────────

export type LessonType = "TEXT" | "VIDEO";

export interface CourseDTO {
  id: string;
  title: string;
  description: string;
  thumbnail: string | null;
  published: boolean;
  createdAt: string;
  createdBy: { name: string };
  _count: { lessons: number; enrollments: number };
}

export interface LessonDTO {
  id: string;
  title: string;
  description: string | null;
  type: LessonType;
  content: string | null;
  order: number;
  duration: number | null;
}

// LessonDTO enriched with student progress
export interface LessonWithProgress extends LessonDTO {
  completed: boolean;
}

// ─── Enrollment ───────────────────────────────────────────────────────────────

export interface EnrollmentWithProgress {
  id: string;
  enrolledAt: string;
  completedAt: string | null;
  courseId: string;
  course: CourseDTO;
  progress: number; // 0–100
  completedLessons: number;
}

// ─── API response wrappers ────────────────────────────────────────────────────

export interface ApiError {
  error: string;
}

export type ApiResponse<T> = T | ApiError;
