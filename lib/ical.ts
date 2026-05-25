/**
 * Minimal RFC 5545 iCalendar (VCALENDAR) generator.
 *
 * Enough to produce single-event and feed-style calendar exports for class
 * live sessions. We don't need recurrence rules, alarms, or attendees —
 * keep the surface small and predictable so calendar apps don't choke.
 */

export type ICalEvent = {
  /** Stable per-event identifier; should NOT change across edits. */
  uid: string;
  title: string;
  description?: string | null;
  /** Absolute URL — most clients render this as the "join" link. */
  url?: string | null;
  location?: string | null;
  start: Date;
  /** Optional explicit end; if absent, derived from start + durationMinutes. */
  end?: Date | null;
  durationMinutes?: number;
  /** Last-modified timestamp; used by clients to detect updates. */
  updatedAt?: Date | null;
  /** When CANCELLED, the event still appears but marked tombstoned. */
  status?: "CONFIRMED" | "TENTATIVE" | "CANCELLED";
};

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatUTC(d: Date): string {
  return (
    `${d.getUTCFullYear()}` +
    `${pad(d.getUTCMonth() + 1)}` +
    `${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}` +
    `${pad(d.getUTCMinutes())}` +
    `${pad(d.getUTCSeconds())}Z`
  );
}

/** Escape per RFC 5545 §3.3.11. */
function escapeText(input: string): string {
  return input
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/** Fold long lines to 75 octets per RFC 5545 §3.1. */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let i = 0;
  while (i < line.length) {
    chunks.push(line.slice(i, i + 75));
    i += 75;
  }
  return chunks.join("\r\n ");
}

function buildEvent(ev: ICalEvent): string[] {
  const lines: string[] = ["BEGIN:VEVENT"];
  lines.push(`UID:${ev.uid}`);
  lines.push(`DTSTAMP:${formatUTC(new Date())}`);
  lines.push(`DTSTART:${formatUTC(ev.start)}`);
  const end =
    ev.end ??
    (ev.durationMinutes
      ? new Date(ev.start.getTime() + ev.durationMinutes * 60 * 1000)
      : new Date(ev.start.getTime() + 60 * 60 * 1000));
  lines.push(`DTEND:${formatUTC(end)}`);
  lines.push(`SUMMARY:${escapeText(ev.title)}`);
  if (ev.description) lines.push(`DESCRIPTION:${escapeText(ev.description)}`);
  if (ev.url) lines.push(`URL:${ev.url}`);
  if (ev.location) lines.push(`LOCATION:${escapeText(ev.location)}`);
  if (ev.updatedAt) lines.push(`LAST-MODIFIED:${formatUTC(ev.updatedAt)}`);
  lines.push(`STATUS:${ev.status ?? "CONFIRMED"}`);
  lines.push("END:VEVENT");
  return lines.map(foldLine);
}

export function buildICalendar(opts: {
  calName: string;
  events: ICalEvent[];
}): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LearnHub//Class Live Sessions//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    foldLine(`X-WR-CALNAME:${escapeText(opts.calName)}`),
  ];
  for (const ev of opts.events) lines.push(...buildEvent(ev));
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
