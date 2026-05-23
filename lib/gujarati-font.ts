/** Matches any character in the Gujarati Unicode block (U+0A80–U+0AFF). */
const GUJARATI_RE = /[઀-૿]/;

/** Returns true when `text` contains at least one Gujarati script character. */
export function hasGujarati(text: string): boolean {
  return GUJARATI_RE.test(text);
}

export type GujaratiFontUsage = "lesson" | "paragraph" | "ui" | "heading";

const USAGE_CLASS: Record<GujaratiFontUsage, string> = {
  lesson: "font-gu-lesson",
  paragraph: "font-gu-para",
  ui: "font-gu-ui",
  heading: "font-gu-heading",
};

/**
 * Returns the Tailwind/CSS class for the correct Gujarati typeface given a
 * usage context, or an empty string when text contains no Gujarati script.
 *
 * Usage → Font
 * ─────────────────────────────
 * lesson    → Anek Gujarati   (main lesson content)
 * paragraph → Mukta Vaani     (long reading paragraphs)
 * ui        → Hind Vadodara   (buttons / navbar / labels)
 * heading   → Baloo Bhai 2    (thumbnails / headings)
 */
export function gujaratiFontClass(
  text: string,
  usage: GujaratiFontUsage
): string {
  return hasGujarati(text) ? USAGE_CLASS[usage] : "";
}
