"use client";

/**
 * MarkdownRenderer — full-featured markdown renderer for the learning platform.
 *
 * Supports (via react-markdown + remark-gfm):
 *   - GFM tables, task-lists, strikethrough, autolinks
 *   - Fenced code blocks with language badge + copy button + line numbers
 *   - Images with caption, lazy loading, click-to-zoom lightbox
 *   - Video embeds  ::video[url]  (YouTube / Vimeo / mp4)
 *   - Callout boxes  > [!NOTE]  > [!TIP]  > [!WARNING]  > [!IMPORTANT]  > [!CAUTION]
 *   - Keyboard shortcuts  <kbd>Ctrl+K</kbd>
 *   - Horizontal rules, blockquotes, nested lists
 *   - Bold, italic, inline code, strikethrough, links
 */

import { useState, useCallback, memo, ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import {
  Copy, Check, ExternalLink, AlertCircle,
  Info, Lightbulb, AlertTriangle, Flame, X,
  ZoomIn,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  content: string;
  /** Compact mode — tighter spacing for previews / comments */
  compact?: boolean;
  className?: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** No pre-processing needed — callouts are handled in the blockquote component */
function preprocessCallouts(src: string): string {
  return src;
}

/** Detect if a raw text node is a ::video[url] directive */
function parseVideoDirective(text: string): string | null {
  const m = text.trim().match(/^::video\[([^\]]+)\]$/);
  return m ? m[1] : null;
}

function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

function vimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

/** Fenced code block with language label, line numbers, copy button */
function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const lines = code.split("\n");
  // remove trailing empty line produced by fenced blocks
  if (lines[lines.length - 1] === "") lines.pop();

  return (
    <div className="rounded-xl overflow-hidden border border-white/[0.08] bg-[#0d1117] shadow-lg my-4 not-prose">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/[0.03] border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          {/* traffic-light dots */}
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
          <span className="ml-2 text-[11px] font-mono font-medium text-muted-foreground/50 uppercase tracking-wider">
            {lang || "code"}
          </span>
        </div>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50 hover:text-muted-foreground px-2.5 py-1 rounded-md hover:bg-white/[0.06] transition-colors"
        >
          {copied
            ? <><Check className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">Copied</span></>
            : <><Copy className="w-3 h-3" />Copy</>}
        </button>
      </div>
      {/* Code lines */}
      <div className="overflow-x-auto">
        <pre className="p-4 text-[13px] leading-relaxed font-mono">
          {lines.map((line, i) => (
            <div key={i} className="flex">
              <span className="select-none text-white/[0.15] text-right w-8 mr-4 flex-shrink-0 text-xs leading-relaxed">
                {i + 1}
              </span>
              <code className="text-emerald-300/85 whitespace-pre">{line || " "}</code>
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}

/** Embedded video: YouTube / Vimeo / mp4 */
function VideoEmbed({ url }: { url: string }) {
  const ytId    = youtubeId(url);
  const vimeoId_ = vimeoId(url);

  if (ytId) {
    return (
      <div className="my-6 not-prose">
        <div className="relative aspect-video rounded-xl overflow-hidden border border-white/[0.08] shadow-2xl bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`}
            title="YouTube video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>
      </div>
    );
  }

  if (vimeoId_) {
    return (
      <div className="my-6 not-prose">
        <div className="relative aspect-video rounded-xl overflow-hidden border border-white/[0.08] shadow-2xl bg-black">
          <iframe
            src={`https://player.vimeo.com/video/${vimeoId_}?dnt=1`}
            title="Vimeo video"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>
      </div>
    );
  }

  // Direct mp4 / webm
  return (
    <div className="my-6 not-prose">
      <div className="rounded-xl overflow-hidden border border-white/[0.08] shadow-xl bg-black">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          src={url}
          controls
          className="w-full max-h-[480px]"
          preload="metadata"
        />
      </div>
    </div>
  );
}

/** Image with click-to-zoom lightbox */
function ContentImage({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <span className="my-6 flex flex-col items-center not-prose">
        <button
          onClick={() => setOpen(true)}
          className="group relative max-w-full rounded-xl overflow-hidden border border-white/[0.08] shadow-xl bg-card/40 cursor-zoom-in"
          aria-label="Click to zoom"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt || ""}
            loading="lazy"
            className="max-h-[500px] w-auto h-auto object-contain block"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          <span className="absolute inset-0 flex items-end justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="bg-black/60 rounded-lg p-1.5">
              <ZoomIn className="w-4 h-4 text-white" />
            </span>
          </span>
        </button>
        {alt && (
          <span className="mt-3 text-center text-xs text-muted-foreground/50 italic">{alt}</span>
        )}
      </span>

      {/* Lightbox */}
      {open && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            onClick={() => setOpen(false)}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt || ""}
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          {alt && (
            <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/60 text-sm text-center">
              {alt}
            </p>
          )}
        </div>
      )}
    </>
  );
}

// ─── Callout types ──────────────────────────────────────────────────────────────

const CALLOUT_CONFIG = {
  note:      { icon: Info,          border: "border-blue-400/30",   bg: "bg-blue-500/8",   title: "text-blue-400",   text: "text-blue-300/90",   label: "Note"      },
  tip:       { icon: Lightbulb,     border: "border-emerald-400/30",bg: "bg-emerald-500/8",title: "text-emerald-400",text: "text-emerald-300/90",label: "Tip"       },
  warning:   { icon: AlertTriangle, border: "border-yellow-400/30", bg: "bg-yellow-500/8", title: "text-yellow-400", text: "text-yellow-300/90",  label: "Warning"   },
  important: { icon: AlertCircle,   border: "border-orange-400/30", bg: "bg-orange-500/8", title: "text-orange-400", text: "text-orange-300/90",  label: "Important" },
  caution:   { icon: Flame,         border: "border-red-400/30",    bg: "bg-red-500/8",    title: "text-red-400",    text: "text-red-300/90",     label: "Caution"   },
} as const;

type CalloutType = keyof typeof CALLOUT_CONFIG;

function Callout({ type, children }: { type: CalloutType; children: ReactNode }) {
  const cfg = CALLOUT_CONFIG[type];
  const Icon = cfg.icon;
  return (
    <div className={cn("my-5 rounded-xl border p-4 not-prose", cfg.border, cfg.bg)}>
      <div className={cn("flex items-center gap-2 font-semibold text-sm mb-2", cfg.title)}>
        <Icon className="w-4 h-4 flex-shrink-0" />
        {cfg.label}
      </div>
      <div className={cn("text-sm leading-relaxed", cfg.text)}>{children}</div>
    </div>
  );
}

// ─── Table ─────────────────────────────────────────────────────────────────────

function TableWrapper({ children }: { children: ReactNode }) {
  return (
    <div className="my-5 overflow-x-auto rounded-xl border border-border not-prose">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  );
}

// ─── Main renderer ──────────────────────────────────────────────────────────────

const MarkdownRenderer = memo(function MarkdownRenderer({ content, compact = false, className }: Props) {
  // Pre-process callout markers (> [!NOTE] etc.)
  const processed = preprocessCallouts(content);

  const components: Components = {
    // ── Headings ──────────────────────────────────────────────────────────────
    h1: ({ children }) => (
      <h1 className={cn("text-2xl font-bold text-foreground mt-8 mb-4 flex items-center gap-3 first:mt-0", compact && "text-xl mt-5 mb-2")}>
        <span className="text-orange-400 font-black">#</span>
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className={cn("text-lg font-bold text-foreground mt-7 mb-3 border-l-[3px] border-orange-400/50 pl-3 first:mt-0", compact && "text-base mt-4 mb-2")}>
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className={cn("text-base font-semibold text-foreground/90 mt-5 mb-2 first:mt-0", compact && "mt-3 mb-1.5")}>
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-sm font-semibold text-foreground/80 mt-4 mb-1.5 uppercase tracking-wider">
        {children}
      </h4>
    ),

    // ── Paragraph ────────────────────────────────────────────────────────────
    p: ({ children, node }) => {
      // Detect ::video[url] directive
      const child = node?.children?.[0];
      if (child?.type === "text") {
        const videoUrl = parseVideoDirective((child as { value: string }).value);
        if (videoUrl) return <VideoEmbed url={videoUrl} />;
      }
      return (
        <p className={cn("text-muted-foreground leading-[1.85] tracking-wide mb-4 last:mb-0", compact ? "text-sm mb-2" : "text-[15px]")}>
          {children}
        </p>
      );
    },

    // ── Code ─────────────────────────────────────────────────────────────────
    code: ({ className: cls, children, ...props }) => {
      const isBlock = !!(props as { node?: { position?: unknown } }).node?.position;
      const inline = !cls && typeof children === "string" && !String(children).includes("\n");

      if (inline) {
        return (
          <code className="px-1.5 py-0.5 rounded-md bg-orange-500/15 text-primary text-[0.85em] font-mono border border-orange-400/25 not-prose">
            {children}
          </code>
        );
      }

      const lang = cls ? cls.replace("language-", "") : "";
      const code = String(children).replace(/\n$/, "");
      return <CodeBlock lang={lang} code={code} />;
    },
    pre: ({ children }) => <>{children}</>,

    // ── Images ───────────────────────────────────────────────────────────────
    img: ({ src, alt }) => {
      if (!src || typeof src !== "string") return null;
      return <ContentImage src={src} alt={alt ?? ""} />;
    },

    // ── Links ────────────────────────────────────────────────────────────────
    a: ({ href, children }) => {
      const isExternal = href?.startsWith("http");
      return (
        <a
          href={href}
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
          className="text-orange-400 hover:text-orange-300 underline underline-offset-4 decoration-orange-400/40 hover:decoration-orange-300/60 transition-colors inline-flex items-center gap-1 not-prose"
        >
          {children}
          {isExternal && <ExternalLink className="w-3 h-3 opacity-60 flex-shrink-0" />}
        </a>
      );
    },

    // ── Lists ────────────────────────────────────────────────────────────────
    ul: ({ children }) => (
      <ul className="space-y-2 my-4 pl-1">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="space-y-2 my-4 pl-1 list-none counter-reset-[item]">{children}</ol>
    ),
    li: ({ children, className: cls }) => {
      const isTask = cls?.includes("task-list-item");
      return (
        <li className={cn("flex items-start gap-3 text-muted-foreground text-[15px] leading-relaxed", compact && "text-sm gap-2")}>
          {isTask ? (
            <span className="flex-shrink-0 mt-0.5">{children}</span>
          ) : (
            <>
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-orange-500/50 flex-shrink-0" />
              <span className="flex-1">{children}</span>
            </>
          )}
        </li>
      );
    },

    // ── Ordered list item numbers ─────────────────────────────────────────────
    // react-markdown wraps ol items with the correct index — we override li above

    // ── Blockquote (also handles > [!NOTE] callouts) ─────────────────────────
    blockquote: ({ children, node }) => {
      // Detect GitHub-style callout: first paragraph text starts with [!TYPE]
      const firstPara = node?.children?.find((c: { type: string }) => c.type === "paragraph") as
        | { type: "paragraph"; children: Array<{ type: string; value?: string }> }
        | undefined;
      const firstText = firstPara?.children?.find((c) => c.type === "text")?.value ?? "";
      const calloutMatch = firstText.match(/^\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\]$/i);

      if (calloutMatch) {
        const t = calloutMatch[1].toLowerCase() as CalloutType;
        // Strip the [!TYPE] paragraph from the rendered children
        const rest = Array.isArray(children)
          ? children.slice(1)   // skip first child (the [!TYPE] paragraph)
          : children;
        return <Callout type={t}>{rest}</Callout>;
      }

      return (
        <blockquote className="my-4 border-l-[3px] border-amber-400/40 pl-4 text-muted-foreground italic bg-amber-500/5 py-2 rounded-r-lg not-prose">
          {children}
        </blockquote>
      );
    },

    // ── Horizontal rule ───────────────────────────────────────────────────────
    hr: () => (
      <hr className="my-8 border-0 border-t border-border/60" />
    ),

    // ── Table ────────────────────────────────────────────────────────────────
    table: ({ children }) => <TableWrapper>{children}</TableWrapper>,
    thead: ({ children }) => (
      <thead className="bg-secondary/60 border-b border-border">{children}</thead>
    ),
    tbody: ({ children }) => <tbody className="divide-y divide-border/40">{children}</tbody>,
    tr: ({ children }) => <tr className="hover:bg-secondary/30 transition-colors">{children}</tr>,
    th: ({ children }) => (
      <th className="px-4 py-3 text-left text-xs font-bold text-foreground uppercase tracking-wider whitespace-nowrap">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-4 py-3 text-sm text-muted-foreground align-top">{children}</td>
    ),

    // ── Inline elements ───────────────────────────────────────────────────────
    strong: ({ children }) => (
      <strong className="font-semibold text-foreground">{children}</strong>
    ),
    em: ({ children }) => (
      <em className="italic text-muted-foreground/90">{children}</em>
    ),
    del: ({ children }) => (
      <del className="line-through text-muted-foreground/50">{children}</del>
    ),

    // ── Task-list checkboxes ──────────────────────────────────────────────────
    input: ({ type, checked }) => {
      if (type === "checkbox") {
        return (
          <span className={cn(
            "inline-flex items-center justify-center w-4 h-4 rounded border flex-shrink-0 mr-2 mt-0.5",
            checked
              ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-400"
              : "border-border bg-secondary/40"
          )}>
            {checked && <Check className="w-2.5 h-2.5" />}
          </span>
        );
      }
      return null;
    },
  };

  return (
    <div className={cn("markdown-body", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
});

export default MarkdownRenderer;

