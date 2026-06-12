/**
 * Shared option lists for the Request a Demo form — used by both the
 * public form UI and the API route's Zod schema so they can't drift.
 */

export const TEAM_SIZES = ["1-10", "11-50", "51-200", "201-1000", "1000+"] as const;

export const TIME_SLOTS = [
  "Morning (9 AM – 12 PM)",
  "Afternoon (12 PM – 4 PM)",
  "Evening (4 PM – 8 PM)",
] as const;

export const DEMO_INTERESTS = [
  "Course creation & delivery",
  "Payments & revenue splits",
  "Gamification & engagement",
  "Community & forums",
  "Analytics & reporting",
  "Certificates & assessments",
] as const;

export type TeamSize = (typeof TEAM_SIZES)[number];
export type TimeSlot = (typeof TIME_SLOTS)[number];
export type DemoInterest = (typeof DEMO_INTERESTS)[number];
