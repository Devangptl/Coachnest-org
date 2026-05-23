"use client";

import { useMemo } from "react";
import { gujaratiFontClass } from "@/lib/gujarati-font";

/**
 * Returns "font-gujarati" (Anek Gujarati) when the supplied text contains
 * Gujarati script characters, otherwise returns an empty string.
 *
 * @example
 * const cls = useGujaratiFont(content);
 * <div className={cls}>{content}</div>
 */
export function useGujaratiFont(text: string): string {
  return useMemo(() => gujaratiFontClass(text), [text]);
}
