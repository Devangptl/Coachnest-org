"use client";

import { useMemo } from "react";
import { gujaratiFontClass, type GujaratiFontUsage } from "@/lib/gujarati-font";

/**
 * Returns the CSS class for the correct Gujarati typeface when the supplied
 * text contains Gujarati script, otherwise returns an empty string.
 *
 * @example
 * const cls = useGujaratiFont(lesson.content, "lesson");
 * // → "font-gu-lesson"  when content has Gujarati characters
 * // → ""                for Latin / other scripts
 *
 * Font map
 * ─────────────────────────────────────────────────────
 * "lesson"    → Anek Gujarati   — main lesson body
 * "paragraph" → Mukta Vaani     — long reading paragraphs
 * "ui"        → Hind Vadodara   — buttons / navbar / labels
 * "heading"   → Baloo Bhai 2    — thumbnails / headings
 */
export function useGujaratiFont(text: string, usage: GujaratiFontUsage): string {
  return useMemo(() => gujaratiFontClass(text, usage), [text, usage]);
}
