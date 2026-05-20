/**
 * Utilities for converting between HTML (Quill rich-text format) and Markdown.
 *
 * htmlToMarkdown  — turndown + GFM plugin (tables, fenced code blocks)
 * markdownToHtml  — marked with GFM and breaks enabled
 *
 * Client-only (imported by MarkdownEditor which is "use client").
 */

import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import { marked } from "marked";

// ── HTML → Markdown ────────────────────────────────────────────────────────────

let _td: TurndownService | null = null;

function getTurndown(): TurndownService {
  if (_td) return _td;

  _td = new TurndownService({
    headingStyle: "atx",
    hr: "---",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    fence: "```",
    emDelimiter: "*",
    strongDelimiter: "**",
    linkStyle: "inlined",
  });

  // GFM plugin adds table and strikethrough support
  _td.use(gfm);

  // Preserve underline as HTML since standard Markdown has no underline syntax
  _td.addRule("underline", {
    filter: ["u"],
    replacement: (content: string) => `<u>${content}</u>`,
  });

  // Map Quill's <pre> code blocks to fenced code blocks
  _td.addRule("pre", {
    filter: "pre",
    replacement: (content: string, node: Node) => {
      const el = node as HTMLElement;
      const lang = el.getAttribute("data-language") ?? "";
      const code = content.replace(/\n$/, "");
      return `\n\`\`\`${lang}\n${code}\n\`\`\`\n\n`;
    },
  });

  // Quill v2 tables have no <thead> — convert them to GFM markdown tables
  _td.addRule("quill-table", {
    filter: "table",
    replacement: (_content: string, node: Node) => {
      const table = node as HTMLTableElement;
      const rows = Array.from(table.querySelectorAll("tr"));
      if (!rows.length) return "";

      const cellText = (cell: Element) =>
        cell.textContent?.replace(/\|/g, "\\|").trim() ?? "";

      const headerCells = Array.from(rows[0].querySelectorAll("td, th")).map(cellText);
      const colCount = headerCells.length;
      const separator = Array(colCount).fill("---").join(" | ");
      const headerRow = "| " + headerCells.join(" | ") + " |";
      const sepRow = "| " + separator + " |";

      const bodyRows = rows.slice(1).map((row) => {
        const cells = Array.from(row.querySelectorAll("td, th")).map(cellText);
        return "| " + cells.join(" | ") + " |";
      });

      return "\n\n" + [headerRow, sepRow, ...bodyRows].join("\n") + "\n\n";
    },
  });

  return _td;
}

/**
 * Convert Quill-produced HTML to GitHub-Flavored Markdown.
 * Returns the original string unchanged if it doesn't look like HTML.
 */
export function htmlToMarkdown(html: string): string {
  if (!html || !html.trimStart().startsWith("<")) return html;
  try {
    const md = getTurndown().turndown(html);
    return md.trim();
  } catch {
    return html;
  }
}

// ── Markdown → HTML ────────────────────────────────────────────────────────────

marked.use({ gfm: true, breaks: true });

/**
 * Convert Markdown to HTML suitable for Quill's dangerouslyPasteHTML.
 * Returns the original string unchanged if it's already HTML.
 */
export function markdownToHtml(md: string): string {
  if (!md) return "<p><br></p>";
  if (md.trimStart().startsWith("<")) return md;
  try {
    const html = marked.parse(md, { async: false }) as string;
    return html.trim() || "<p><br></p>";
  } catch {
    return `<p>${md}</p>`;
  }
}
