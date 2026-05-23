/** Matches any character in the Gujarati Unicode block (U+0A80–U+0AFF). */
const GUJARATI_RE = /[઀-૿]/;

/** Returns true when `text` contains at least one Gujarati script character. */
export function hasGujarati(text: string): boolean {
  return GUJARATI_RE.test(text);
}

/**
 * Returns "font-gujarati" (Anek Gujarati) when text contains Gujarati script,
 * otherwise returns an empty string.
 */
export function gujaratiFontClass(text: string): string {
  return hasGujarati(text) ? "font-gujarati" : "";
}
