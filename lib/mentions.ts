/**
 * Mention tokens are stored inline in post bodies as:  @[Display Name](userId)
 *
 * This keeps mentions in the raw text (so edits preserve them) without a
 * username column. The server parses tokens to notify mentioned users;
 * the client renders them as chips.
 */

const MENTION_RE = /@\[([^\]]+)\]\(([a-zA-Z0-9_-]+)\)/g;

/** Extract distinct mentioned userIds from a body string. */
export function extractMentionIds(body: string): string[] {
  const ids = new Set<string>();
  let m: RegExpExecArray | null;
  MENTION_RE.lastIndex = 0;
  while ((m = MENTION_RE.exec(body)) !== null) {
    ids.add(m[2]);
  }
  return [...ids];
}

/** Replace mention tokens with a plain "@Name" — used for notification text. */
export function stripMentionTokens(body: string): string {
  return body.replace(MENTION_RE, (_, name) => `@${name}`);
}

/**
 * Convert mention tokens to the renderer's highlight syntax so they show
 * as a chip:  @[Jane Doe](id)  →  ==@Jane Doe==
 * Call this before passing a body to <MarkdownRenderer>.
 */
export function mentionsToMarkdown(body: string): string {
  return body.replace(MENTION_RE, (_, name) => `==@${name}==`);
}
