"use client";

/**
 * MarkdownRenderer — full-featured markdown renderer for the learning platform.
 *
 * Supports:
 *   - GFM tables, task-lists, strikethrough, autolinks  (remark-gfm)
 *   - Fenced code blocks with language badge, line numbers, copy button
 *   - Images with caption, lazy-load, click-to-zoom lightbox
 *   - Video embeds  ::video[url]  (YouTube / Vimeo / mp4)
 *   - Callout boxes  > [!NOTE|TIP|WARNING|IMPORTANT|CAUTION]
 *   - Ordered lists with numbered badges
 *   - Unordered lists with custom bullet
 *   - Horizontal rules, blockquotes, nested lists
 *   - Bold, italic, strikethrough, inline code, links
 */

import { useState, useCallback, memo, ReactNode, useContext, createContext, Children, isValidElement, cloneElement } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import {
  Copy, Check, ExternalLink, AlertCircle,
  Info, Lightbulb, AlertTriangle, Flame, X, ZoomIn,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  content: string;
  /** Tighter spacing — for editor preview, comments, etc. */
  compact?: boolean;
  className?: string;
}

/** Detect HTML produced by QuillEditor (getSemanticHTML starts with "<") */
function isHtml(content: string) {
  return content.trimStart().startsWith("<");
}

// ─── List-type context (lets <li> know if it's inside <ol> or <ul>) ───────────

const ListTypeCtx = createContext<"ul" | "ol">("ul");

// ─── Callout config ─────────────────────────────────────────────────────────────

const CALLOUT_CONFIG = {
  note:      { icon: Info,          border: "border-blue-400/30",    bg: "bg-blue-500/[0.08]",    title: "text-blue-400",    body: "text-blue-200/80",   label: "Note"      },
  tip:       { icon: Lightbulb,     border: "border-emerald-400/30", bg: "bg-emerald-500/[0.08]", title: "text-emerald-400", body: "text-emerald-200/80",label: "Tip"       },
  warning:   { icon: AlertTriangle, border: "border-yellow-400/30",  bg: "bg-yellow-500/[0.08]",  title: "text-yellow-400",  body: "text-yellow-200/80", label: "Warning"   },
  important: { icon: AlertCircle,   border: "border-[#d97757]/30",  bg: "bg-orange-500/[0.08]",  title: "text-[#d97757]",  body: "text-orange-200/80", label: "Important" },
  caution:   { icon: Flame,         border: "border-red-400/30",     bg: "bg-red-500/[0.08]",     title: "text-red-400",     body: "text-red-200/80",    label: "Caution"   },
} as const;

type CalloutType = keyof typeof CALLOUT_CONFIG;

// Fenced-code language prefix used by the preprocessor
const CALLOUT_LANG_PREFIX = "__callout_";

// ─── Preprocessor ──────────────────────────────────────────────────────────────

/**
 * Converts GitHub-style callout blockquotes into a special fenced-code block
 * that the `code` component can detect and render as a styled callout box.
 *
 *   > [!NOTE]
 *   > Your content here.
 *
 * becomes:
 *
 *   ```__callout_note__
 *   Your content here.
 *   ```
 *
 * This avoids unreliable hast-tree inspection and works for single-line,
 * multi-line, and multi-paragraph callouts.
 */
function preprocessCallouts(src: string): string {
  return src.replace(
    /^(> \[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\][^\n]*\n)((?:>[^\n]*\n?)*)/gim,
    (_match, _typeLine, type: string, body: string) => {
      const content = body
        .split("\n")
        .map((l) => l.replace(/^>\s?/, ""))
        .join("\n")
        .trim();
      return `\`\`\`${CALLOUT_LANG_PREFIX}${type.toLowerCase()}__\n${content}\n\`\`\`\n\n`;
    }
  );
}

/** Detect a ::video[url] directive in a raw text value */
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

// ─── Prism language alias normaliser ────────────────────────────────────────────

const LANG_ALIAS: Record<string, string> = {
  js: "javascript", ts: "typescript", py: "python",
  rb: "ruby", cs: "csharp", sh: "bash", zsh: "bash",
  shell: "bash", yml: "yaml", md: "markdown",
};

function normLang(lang: string): string {
  const l = lang.toLowerCase();
  return LANG_ALIAS[l] ?? l;
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);
  
  const isDark = document.documentElement.classList.contains("dark");

  return (
    <div className="rounded-md overflow-hidden border border-white/[0.08] my-4 sm:my-5">
      {/* Header */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-1.5 sm:py-2 bg-white/[0.03] border-b border-white/[0.06]">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-red-500/70" />
          <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-yellow-500/70" />
          <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-green-500/70" />
          <span className="ml-1.5 sm:ml-2 text-[10px] sm:text-[11px] font-mono font-medium text-white/30 uppercase tracking-wider">
            {lang || "code"}
          </span>
        </div>
        <button
          onClick={copy}
          className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] text-white/30 hover:text-white/70 px-2 sm:px-2.5 py-1 rounded-md hover:bg-white/[0.06] transition-colors"
        >
          {copied
            ? <><Check className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">Copied</span></>
            : <><Copy className="w-3 h-3" />Copy</>}
        </button>
      </div>
      {/* Syntax-highlighted code (VS Code Dark+ theme, transparent bg) */}
      <SyntaxHighlighter
        language={normLang(lang) || "text"}
        style={vscDarkPlus}
        showLineNumbers
        wrapLongLines={false}
        customStyle={{
          margin: 0,
          padding: "12px 16px",
          background: "transparent",
          fontSize: "13px",
          lineHeight: "1.65",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        }}
        lineNumberStyle={{
          color: isDark
                  ? "rgba(255,255,255,0.25)"
                    : "rgba(0,0,0,0.35)",
          minWidth: "2.25em",
          paddingRight: "1em",
          userSelect: "none",
        }}
        codeTagProps={{ style: { fontFamily: "inherit" } }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

function CalloutBox({ type, content }: { type: CalloutType; content: string }) {
  const cfg = CALLOUT_CONFIG[type];
  const Icon = cfg.icon;
  return (
    <div className={cn("my-5 rounded-md border p-4", cfg.border, cfg.bg)}>
      <div className={cn("flex items-center gap-2 font-semibold text-sm mb-2", cfg.title)}>
        <Icon className="w-4 h-4 flex-shrink-0" />
        {cfg.label}
      </div>
      {content && (
        <p className={cn("text-sm leading-relaxed whitespace-pre-line", cfg.body)}>
          {content}
        </p>
      )}
    </div>
  );
}

function VideoEmbed({ url }: { url: string }) {
  const yt = youtubeId(url);
  const vi = vimeoId(url);

  if (yt) {
    return (
      <div className="my-6">
        <div className="relative aspect-video rounded-md overflow-hidden border border-white/[0.08] shadow-2xl bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${yt}?rel=0&modestbranding=1`}
            title="YouTube video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>
      </div>
    );
  }
  if (vi) {
    return (
      <div className="my-6">
        <div className="relative aspect-video rounded-md overflow-hidden border border-white/[0.08] shadow-2xl bg-black">
          <iframe
            src={`https://player.vimeo.com/video/${vi}?dnt=1`}
            title="Vimeo video"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>
      </div>
    );
  }
  return (
    <div className="my-6">
      <div className="rounded-md overflow-hidden border border-white/[0.08] shadow-xl bg-black">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video src={url} controls className="w-full max-h-[480px]" preload="metadata" />
      </div>
    </div>
  );
}

function ContentImage({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <span className="my-6 flex flex-col items-center">
        <button
          onClick={() => setOpen(true)}
          className="group relative max-w-full rounded-md overflow-hidden border border-white/[0.08] shadow-xl bg-card/40 cursor-zoom-in"
          aria-label="Zoom image"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt || ""}
            loading="lazy"
            className="max-h-[480px] w-auto h-auto object-contain block"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
          <span className="absolute inset-0 flex items-end justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="bg-black/60 rounded-lg p-1.5">
              <ZoomIn className="w-4 h-4 text-white" />
            </span>
          </span>
        </button>
        {alt && <span className="mt-2 text-center text-xs text-muted-foreground/50 italic">{alt}</span>}
      </span>

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
            className="max-w-full max-h-[90vh] object-contain rounded-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          {alt && (
            <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/60 text-sm text-center px-4">
              {alt}
            </p>
          )}
        </div>
      )}
    </>
  );
}

// ─── Table wrapper ──────────────────────────────────────────────────────────────

function TableWrapper({ children }: { children: ReactNode }) {
  return (
    <div className="my-5 overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  );
}

// ─── List item (reads context set by <ul>/<ol>) ─────────────────────────────────

function MarkdownListItem({
  children,
  className,
  compact,
  ...rest
}: {
  children?: ReactNode;
  className?: string;
  compact?: boolean;
  [k: string]: unknown;
}) {
  const listType  = useContext(ListTypeCtx);
  const isTask    = className?.includes("task-list-item");
  // index injected by our ol handler via cloneElement
  const liIndex   = rest["data-li-index"] as number | undefined;

  if (isTask) {
    return (
      <li className={cn(
        "flex items-start gap-2 text-muted-foreground leading-relaxed list-none",
        compact ? "text-sm" : "text-[15px]",
      )}>
        {children}
      </li>
    );
  }

  if (listType === "ol" || liIndex !== undefined) {
    return (
      <li className={cn(
        "flex items-start gap-3 text-muted-foreground leading-relaxed list-none",
        compact ? "text-sm" : "text-[15px]",
      )}>
        <span className="flex-shrink-0 min-w-[1.4rem] h-[1.4rem] rounded-md bg-orange-500/15 text-primary text-[11px] font-bold flex items-center justify-center mt-0.5">
          {liIndex ?? "•"}
        </span>
        <span className="flex-1 min-w-0">{children}</span>
      </li>
    );
  }

  return (
    <li className={cn(
      "flex items-start gap-3 text-muted-foreground leading-relaxed list-none",
      compact ? "text-sm" : "text-[15px]",
    )}>
      <span className="mt-[0.45em] w-1.5 h-1.5 rounded-full bg-orange-500/50 flex-shrink-0" />
      <span className="flex-1 min-w-0">{children}</span>
    </li>
  );
}

// ─── Main renderer ──────────────────────────────────────────────────────────────

const MarkdownRenderer = memo(function MarkdownRenderer({ content, compact = false, className }: Props) {
  // Quill outputs semantic HTML — render it directly with scoped styles
  if (isHtml(content)) {
    return (
      <div
        className={cn("quill-content", compact && "quill-content-compact", className)}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  const processed = preprocessCallouts(content);
  let blockIdx = 0;

  const components: Components = {

    // ── Headings ────────────────────────────────────────────────────────────────
    h1: ({ children }) => (
      <h1 data-block-index={blockIdx++} className={cn("text-xl sm:text-2xl font-bold text-foreground mt-6 sm:mt-8 mb-3 sm:mb-4 flex items-center gap-2.5 sm:gap-3 first:mt-0", compact && "text-lg sm:text-xl mt-4 sm:mt-5 mb-2")}>
        <span className="text-[#d97757] font-black text-base sm:text-lg select-none">#</span>
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 data-block-index={blockIdx++} className={cn("text-base sm:text-[1.15rem] font-bold text-foreground mt-5 sm:mt-7 mb-2 sm:mb-3 border-l-[3px] border-[#d97757]/50 pl-3 first:mt-0", compact && "text-sm sm:text-base mt-3 sm:mt-4 mb-1.5 sm:mb-2")}>
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 data-block-index={blockIdx++} className={cn("text-sm sm:text-base font-semibold text-foreground/90 mt-4 sm:mt-5 mb-1.5 sm:mb-2 first:mt-0", compact && "mt-2.5 sm:mt-3 mb-1 sm:mb-1.5")}>
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 data-block-index={blockIdx++} className="text-sm font-semibold text-foreground/75 mt-4 mb-1.5 uppercase tracking-wider">
        {children}
      </h4>
    ),

    // ── Paragraph ───────────────────────────────────────────────────────────────
    p: ({ children, node }) => {
      // ::video[url] directive
      const child = node?.children?.[0];
      if (child?.type === "text") {
        const videoUrl = parseVideoDirective((child as { value: string }).value);
        if (videoUrl) return <VideoEmbed url={videoUrl} />;
      }
      const idx = blockIdx++;
      return (
        <p data-block-index={idx} className={cn(
          "text-muted-foreground leading-[1.85] tracking-wide mb-4 last:mb-0 break-words hyphens-auto",
          compact ? "text-sm mb-2" : "text-[15px]",
        )}>
          {children}
        </p>
      );
    },

    // ── Code ────────────────────────────────────────────────────────────────────
    code: ({ className: cls, children }) => {
      const lang = cls ? cls.replace("language-", "") : "";

      // Callout box (injected by preprocessor)
      if (lang.startsWith(CALLOUT_LANG_PREFIX)) {
        const type = lang.slice(CALLOUT_LANG_PREFIX.length).replace(/__$/, "") as CalloutType;
        if (type in CALLOUT_CONFIG) {
          return <CalloutBox type={type} content={String(children).trim()} />;
        }
      }

      // Inline code — no className → no language
      if (!cls) {
        return (
          <code className="px-1.5 py-0.5 rounded-md bg-orange-500/15 text-primary text-[0.85em] font-mono border border-[#d97757]/25">
            {children}
          </code>
        );
      }

      // Fenced code block
      const code = String(children).replace(/\n$/, "");
      return <CodeBlock lang={lang} code={code} />;
    },
    pre: ({ children }) => <>{children}</>,

    // ── Image ───────────────────────────────────────────────────────────────────
    img: ({ src, alt }) => {
      if (!src || typeof src !== "string") return null;
      return <ContentImage src={src} alt={alt ?? ""} />;
    },

    // ── Link ────────────────────────────────────────────────────────────────────
    a: ({ href, children }) => {
      const isExternal = !!href?.startsWith("http");
      return (
        <a
          href={href}
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
          className="text-[#d97757] hover:text-orange-300 underline underline-offset-4 decoration-[#d97757]/40 hover:decoration-orange-300/60 transition-colors inline-flex items-center gap-1"
        >
          {children}
          {isExternal && <ExternalLink className="w-3 h-3 opacity-50 flex-shrink-0" />}
        </a>
      );
    },

    // ── Lists ───────────────────────────────────────────────────────────────────
    ul: ({ children }) => (
      <ListTypeCtx.Provider value="ul">
        <ul className="my-4 space-y-2 pl-0 list-none">{children}</ul>
      </ListTypeCtx.Provider>
    ),

    ol: ({ children }) => {
      // Inject data-li-index into each direct <li> child so MarkdownListItem
      // can render a styled number badge without needing CSS counters.
      let counter = 0;
      const numbered = Children.map(children, (child) => {
        if (!isValidElement(child)) return child;
        // Only number actual li elements (not whitespace text nodes)
        if ((child as React.ReactElement<{ className?: string }>).props?.className?.includes("task-list-item")) {
          return child; // task list items already have checkboxes
        }
        counter++;
        return cloneElement(child as React.ReactElement<Record<string, unknown>>, {
          "data-li-index": counter,
        });
      });
      return (
        <ListTypeCtx.Provider value="ol">
          <ol className="my-4 space-y-2 pl-0 list-none">{numbered}</ol>
        </ListTypeCtx.Provider>
      );
    },

    li: (props) => <MarkdownListItem {...props} compact={compact} />,

    // ── Blockquote ──────────────────────────────────────────────────────────────
    blockquote: ({ children }) => (
      <blockquote className="my-5 border-l-4 border-amber-400/40 pl-4 py-1 bg-amber-500/[0.05] rounded-r-lg text-muted-foreground italic">
        {children}
      </blockquote>
    ),

    // ── Horizontal rule ──────────────────────────────────────────────────────────
    hr: () => <hr className="my-8 border-0 border-t border-border/60" />,

    // ── Table ───────────────────────────────────────────────────────────────────
    table:  ({ children })  => <TableWrapper>{children}</TableWrapper>,
    thead:  ({ children })  => <thead className="bg-secondary/60 border-b border-border">{children}</thead>,
    tbody:  ({ children })  => <tbody className="divide-y divide-border/40">{children}</tbody>,
    tr:     ({ children })  => <tr className="hover:bg-secondary/30 transition-colors">{children}</tr>,
    th:     ({ children })  => <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[11px] sm:text-xs font-bold text-foreground uppercase tracking-wider whitespace-nowrap">{children}</th>,
    td:     ({ children })  => <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-muted-foreground align-top">{children}</td>,

    // ── Inline ──────────────────────────────────────────────────────────────────
    strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
    em:     ({ children }) => <em className="italic text-muted-foreground/90">{children}</em>,
    del:    ({ children }) => <del className="line-through text-muted-foreground/50">{children}</del>,

    // ── Task-list checkbox ───────────────────────────────────────────────────────
    input: ({ type, checked }) => {
      if (type !== "checkbox") return null;
      return (
        <span className={cn(
          "inline-flex items-center justify-center w-4 h-4 rounded border flex-shrink-0 mr-2 mt-0.5 align-middle",
          checked
            ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-400"
            : "border-border bg-secondary/40",
        )}>
          {checked && <Check className="w-2.5 h-2.5" />}
        </span>
      );
    },
  };

  return (
    <div className={cn("markdown-body break-words hyphens-auto", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {processed}
      </ReactMarkdown>
    </div>
  );
});

export default MarkdownRenderer;
