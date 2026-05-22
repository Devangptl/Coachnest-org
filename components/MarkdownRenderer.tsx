"use client";

/**
 * MarkdownRenderer — full-featured markdown renderer for the learning platform.
 *
 * Supported content types:
 *   Core GFM
 *     - Tables with column alignment  (remark-gfm)
 *     - Task-lists, strikethrough, autolinks
 *     - Fenced code blocks — syntax-highlighted (VSCode Dark+), with copy button + line count
 *     - Diff/patch blocks — +/- lines coloured green/red
 *     - Horizontal rules, blockquotes with quote decoration
 *     - Bold, italic, strikethrough, inline code, links (external icon)
 *   Headings
 *     - h1–h6 with distinct visual hierarchy + anchor IDs
 *   Inline extras  (preprocessor converts shorthand to fenced inline-code markers)
 *     - ==highlighted text==  → yellow highlight mark
 *     - [[Ctrl+K]]            → styled keyboard shortcut(s)
 *     - ^sup^                 → superscript
 *     - ~sub~                 → subscript (only single ~, not ~~strikethrough~~)
 *   Callout boxes  > [!TYPE]  (GitHub-style)
 *     NOTE · TIP · WARNING · IMPORTANT · CAUTION
 *     SUCCESS · DEFINITION · OBJECTIVE · EXAMPLE
 *     Bodies render as full markdown (bold, code, links work inside callouts)
 *   Spoiler / details blocks
 *     +++ Spoiler title
 *     Hidden content
 *     +++
 *   Media
 *     - ::video[url]          → YouTube / Vimeo iframe or <video>
 *     - Images with caption, lazy-load, click-to-zoom lightbox
 */

import {
  useState, useCallback, memo, ReactNode, ReactElement,
  useContext, createContext, Children, isValidElement, cloneElement,
} from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import {
  Copy, Check, ExternalLink, AlertCircle, Info, Lightbulb,
  AlertTriangle, Flame, X, ZoomIn, CheckCircle2, BookOpen,
  Target, Sparkles, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  content: string;
  compact?: boolean;
  className?: string;
}

function isHtml(content: string) {
  return content.trimStart().startsWith("<");
}

// ─── List-type context ─────────────────────────────────────────────────────────

const ListTypeCtx = createContext<"ul" | "ol">("ul");

// ─── Callout config ─────────────────────────────────────────────────────────────

const CALLOUT_CONFIG = {
  note:       { icon: Info,           border: "border-blue-400/30",    bg: "bg-blue-500/[0.07]",    badge: "bg-blue-500/15 text-blue-300 border-blue-400/20",       label: "Note"       },
  tip:        { icon: Lightbulb,      border: "border-emerald-400/30", bg: "bg-emerald-500/[0.07]", badge: "bg-emerald-500/15 text-emerald-300 border-emerald-400/20",label: "Tip"        },
  warning:    { icon: AlertTriangle,  border: "border-yellow-400/30",  bg: "bg-yellow-500/[0.07]",  badge: "bg-yellow-500/15 text-yellow-300 border-yellow-400/20",  label: "Warning"    },
  important:  { icon: AlertCircle,    border: "border-[#d97757]/30",   bg: "bg-orange-500/[0.07]",  badge: "bg-orange-500/15 text-[#d97757] border-[#d97757]/20",    label: "Important"  },
  caution:    { icon: Flame,          border: "border-red-400/30",     bg: "bg-red-500/[0.07]",     badge: "bg-red-500/15 text-red-300 border-red-400/20",           label: "Caution"    },
  success:    { icon: CheckCircle2,   border: "border-emerald-400/30", bg: "bg-emerald-500/[0.07]", badge: "bg-emerald-500/15 text-emerald-300 border-emerald-400/20",label: "Success"    },
  definition: { icon: BookOpen,       border: "border-violet-400/30",  bg: "bg-violet-500/[0.07]",  badge: "bg-violet-500/15 text-violet-300 border-violet-400/20",  label: "Definition" },
  objective:  { icon: Target,         border: "border-cyan-400/30",    bg: "bg-cyan-500/[0.07]",    badge: "bg-cyan-500/15 text-cyan-300 border-cyan-400/20",        label: "Objective"  },
  example:    { icon: Sparkles,         border: "border-purple-400/30",  bg: "bg-purple-500/[0.07]",  badge: "bg-purple-500/15 text-purple-300 border-purple-400/20",  label: "Example"    },
} as const;

type CalloutType = keyof typeof CALLOUT_CONFIG;
const CALLOUT_LANG_PREFIX = "__callout_";
const SPOILER_LANG_PREFIX  = "__spoiler_";
const COMPLIST_LANG_PREFIX = "__complist__";

// ─── Preprocessor ──────────────────────────────────────────────────────────────

/**
 * Run all preprocessor transforms on raw markdown before handing to ReactMarkdown.
 *
 * 1. GitHub-style callouts  > [!TYPE]  (9 types)
 * 2. Spoiler blocks          +++ Title … +++
 * 3. ==highlight==           → `==text==` (inline code sentinel)
 * 4. [[Key+Key]]             → `[[Key+Key]]` (keyboard shortcut sentinel)
 * 5. ^sup^                   → `^text^` (superscript sentinel)
 * 6. ~sub~                   → `~text~` (subscript sentinel, single ~ only)
 */
function preprocess(src: string): string {
  let out = src;

  // 0 — @mentions:  @[Display Name](userId)  →  `@@Display Name@@`
  //     Done first so the [text](id) part is never parsed as a link.
  out = out.replace(
    /@\[([^\]\n]+)\]\([^)\s]+\)/g,
    (_m, name: string) => `\`@@${name.replace(/[`\n]/g, "").trim()}@@\``,
  );

  // 1 — callouts
  out = out.replace(
    /^(> \[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION|SUCCESS|DEFINITION|OBJECTIVE|EXAMPLE)\][^\n]*\n)((?:>[^\n]*\n?)*)/gim,
    (_m, _typeLine, type: string, body: string) => {
      const content = body.split("\n").map((l) => l.replace(/^>\s?/, "")).join("\n").trim();
      return `\`\`\`${CALLOUT_LANG_PREFIX}${type.toLowerCase()}__\n${content}\n\`\`\`\n\n`;
    },
  );

  // 2 — spoiler blocks  (+++ Title\ncontent\n+++)
  out = out.replace(
    /^\+{3}([^\n]*)\n([\s\S]*?)\n\+{3}/gm,
    (_m, title: string, body: string) => {
      const t = title.trim() || "Spoiler";
      return `\`\`\`${SPOILER_LANG_PREFIX}${encodeURIComponent(t)}__\n${body.trim()}\n\`\`\`\n\n`;
    },
  );

  // 3 — ==highlight== (not inside backticks)
  out = out.replace(/(?<!`)==([^=\n]+)==(?!`)/g, (_m, txt: string) => `\`==${txt}==\``);

  // 4 — [[Key+Combo]] keyboard shortcuts
  out = out.replace(/(?<!`)\[\[([^\]\n]+)\]\](?!`)/g, (_m, k: string) => `\`[[${k}]]\``);

  // 5 — ^superscript^ (not inside backticks, single ^)
  out = out.replace(/(?<!`)\^([^^`\n]+)\^(?!`)/g, (_m, txt: string) => `\`^${txt}^\``);

  // 6 — ~subscript~ (not ~~ which is strikethrough)
  out = out.replace(/(?<!`|~)~([^~`\n]+)~(?!`|~)/g, (_m, txt: string) => `\`~${txt}~\``);

  // 7 — comparison / annotation lists  (+ positive, - negative, ! warning)
  // Consecutive lines starting with +, -, or ! followed by a space.
  // Converted to a fenced __complist__ block before GFM treats + / - as list markers.
  // Heuristic: only convert when the block mixes + with - OR contains a ! line.
  out = out.replace(
    /^([+\-!] [^\n]*(?:\n[+\-!] [^\n]*)*)/gm,
    (block) => {
      const lines = block.split("\n").filter(Boolean);
      const hasWarn  = lines.some((l) => l.startsWith("! "));
      const hasPlus  = lines.some((l) => l.startsWith("+ "));
      const hasMinus = lines.some((l) => l.startsWith("- "));
      if (!hasWarn && !(hasPlus && hasMinus)) return block;
      return `\`\`\`${COMPLIST_LANG_PREFIX}\n${lines.join("\n")}\n\`\`\`\n\n`;
    },
  );

  return out;
}

// ─── URL helpers ───────────────────────────────────────────────────────────────

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

// ─── Language alias normaliser ─────────────────────────────────────────────────

const LANG_ALIAS: Record<string, string> = {
  js: "javascript", ts: "typescript", py: "python",
  rb: "ruby", cs: "csharp", sh: "bash", zsh: "bash",
  shell: "bash", yml: "yaml", md: "markdown",
  patch: "diff",
};
const normLang = (l: string) => { const k = l.toLowerCase(); return LANG_ALIAS[k] ?? k; };

// ─── Slug helper (heading IDs) ─────────────────────────────────────────────────

function toSlug(text: unknown): string {
  return String(text ?? "")
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-");
}

// ─── AST text extractor (used for table cell content detection) ───────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractNodeText(node: any): string {
  if (!node) return "";
  if (node.type === "text") return String(node.value ?? "");
  if (Array.isArray(node.children)) return node.children.map(extractNodeText).join("");
  return "";
}

// ─── ComparisonList ───────────────────────────────────────────────────────────

function ComparisonList({ items }: { items: string[] }) {
  return (
    <div className="my-5 rounded-xl border border-border/40 overflow-hidden divide-y divide-border/30">
      {items.map((line, i) => {
        const isPos  = line.startsWith("+ ");
        const isWarn = line.startsWith("! ");
        const text   = line.length > 2 ? line.slice(2) : line;
        return (
          <div key={i} className={cn(
            "flex items-center gap-3 px-4 py-2.5 text-[13px]",
            isPos ? "bg-emerald-500/[0.06]" : isWarn ? "bg-yellow-500/[0.06]" : "bg-red-500/[0.06]",
          )}>
            <span className={cn(
              "flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black border",
              isPos  ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-300"
              : isWarn ? "bg-yellow-400/20 border-yellow-400/40 text-yellow-300"
              :           "bg-red-500/20   border-red-400/40   text-red-300",
            )}>
              {isPos ? "+" : isWarn ? "!" : "−"}
            </span>
            <span className={cn(
              "flex-1 leading-relaxed",
              isPos  ? "text-emerald-300/90" : isWarn ? "text-yellow-300/90" : "text-red-300/90",
            )}>
              {text}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── CodeBlock ────────────────────────────────────────────────────────────────

function DiffBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const lines = code.split("\n");

  return (
    <div className="rounded-xl overflow-hidden border border-white/[0.08] my-5">
      <div className="flex items-center justify-between px-4 py-2 bg-[#1e1e1e] border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
          <span className="ml-2 text-[11px] font-mono font-medium text-white/30 uppercase tracking-wider">diff</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-white/20">{lines.length} lines</span>
          <button onClick={copy} className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/70 px-2.5 py-1 rounded hover:bg-white/[0.06] transition-colors">
            {copied ? <><Check className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">Copied</span></> : <><Copy className="w-3 h-3" />Copy</>}
          </button>
        </div>
      </div>
      <div className="bg-[#1e1e1e] overflow-x-auto">
        <table className="w-full border-collapse text-[13px] font-mono">
          <tbody>
            {lines.map((line, i) => {
              const isAdd = line.startsWith("+") && !line.startsWith("+++");
              const isDel = line.startsWith("-") && !line.startsWith("---");
              const isMeta = line.startsWith("@@") || line.startsWith("diff ") || line.startsWith("index ") || line.startsWith("+++") || line.startsWith("---");
              return (
                <tr key={i} className={cn(
                  isAdd ? "bg-emerald-500/[0.12]" : isDel ? "bg-red-500/[0.12]" : isMeta ? "bg-blue-500/[0.08]" : ""
                )}>
                  <td className="select-none w-10 text-right pr-4 pl-4 text-white/20 border-r border-white/[0.05] leading-6">{i + 1}</td>
                  <td className={cn(
                    "pl-4 pr-6 leading-6 whitespace-pre",
                    isAdd ? "text-emerald-300" : isDel ? "text-red-300" : isMeta ? "text-blue-300" : "text-white/80"
                  )}>
                    {line || " "}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const normalized = normLang(lang);
  if (normalized === "diff") return <DiffBlock code={code} />;

  const lineCount = code.split("\n").length;

  return (
    <div className="rounded-xl overflow-hidden border border-white/[0.08] my-5 group">
      <div className="flex items-center justify-between px-4 py-2 bg-[#1e1e1e] border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
          <span className="ml-2 text-[11px] font-mono font-medium text-white/30 uppercase tracking-wider">
            {lang || "code"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-white/20">{lineCount} {lineCount === 1 ? "line" : "lines"}</span>
          <button
            onClick={copy}
            className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/70 px-2.5 py-1 rounded hover:bg-white/[0.06] transition-colors"
          >
            {copied
              ? <><Check className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">Copied</span></>
              : <><Copy className="w-3 h-3" />Copy</>}
          </button>
        </div>
      </div>
      <SyntaxHighlighter
        language={normalized || "text"}
        style={vscDarkPlus}
        showLineNumbers
        wrapLongLines={false}
        customStyle={{
          margin: 0,
          padding: "14px 16px",
          background: "#1e1e1e",
          fontSize: "13px",
          lineHeight: "1.7",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        }}
        lineNumberStyle={{
          color: "rgba(255,255,255,0.2)",
          minWidth: "2.5em",
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

// ─── CalloutBox ───────────────────────────────────────────────────────────────

function CalloutBox({ type, content }: { type: CalloutType; content: string }) {
  const cfg  = CALLOUT_CONFIG[type];
  const Icon = cfg.icon;
  return (
    <div className={cn("my-5 rounded-xl border overflow-hidden", cfg.border)}>
      {/* Header strip */}
      <div className={cn("flex items-center gap-2 px-4 py-2.5 border-b", cfg.bg, cfg.border)}>
        <Icon className={cn("w-4 h-4 flex-shrink-0", cfg.badge.split(" ")[1])} />
        <span className={cn("text-[12px] font-bold uppercase tracking-wider", cfg.badge.split(" ")[1])}>
          {cfg.label}
        </span>
      </div>
      {/* Body — rendered as markdown so bold/code/links work */}
      <div className={cn("px-4 py-3 text-sm leading-relaxed", cfg.bg)}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => <p className="text-foreground/80 leading-relaxed mb-2 last:mb-0 text-[14px]">{children}</p>,
            strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
            em: ({ children }) => <em className="italic">{children}</em>,
            code: ({ children, className: cls }) => {
              if (cls) return <code className="text-[0.85em] font-mono">{children}</code>;
              return <code className="px-1.5 py-0.5 rounded bg-white/10 text-primary text-[0.85em] font-mono">{children}</code>;
            },
            a: ({ href, children }) => (
              <a href={href} className="underline underline-offset-3 opacity-80 hover:opacity-100" target="_blank" rel="noopener noreferrer">{children}</a>
            ),
            ul: ({ children }) => <ul className="my-1.5 space-y-1 pl-4 list-disc">{children}</ul>,
            ol: ({ children }) => <ol className="my-1.5 space-y-1 pl-4 list-decimal">{children}</ol>,
            li: ({ children }) => <li className="text-foreground/80 text-[14px]">{children}</li>,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}

// ─── SpoilerBlock ─────────────────────────────────────────────────────────────

function SpoilerBlock({ title, content }: { title: string; content: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="my-5 rounded-xl border border-border/50 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-secondary/30 hover:bg-secondary/50 transition-colors text-left"
      >
        <span className="text-[13px] font-semibold text-foreground/80">{title}</span>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground/50 flex-shrink-0 transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open && (
        <div className="px-4 py-4 border-t border-border/40 bg-background/20 text-[14px] text-muted-foreground leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

// ─── VideoEmbed ───────────────────────────────────────────────────────────────

function VideoEmbed({ url }: { url: string }) {
  const yt = youtubeId(url);
  const vi = vimeoId(url);
  const embedSrc = yt
    ? `https://www.youtube.com/embed/${yt}?rel=0&modestbranding=1`
    : vi ? `https://player.vimeo.com/video/${vi}?dnt=1` : null;

  if (embedSrc) {
    return (
      <span className="block my-6">
        <span className="relative block aspect-video rounded-xl overflow-hidden border border-white/[0.08] shadow-2xl bg-black">
          <iframe
            src={embedSrc}
            title="Video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </span>
      </span>
    );
  }
  return (
    <span className="block my-6">
      <span className="block rounded-xl overflow-hidden border border-white/[0.08] shadow-xl bg-black">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video src={url} controls className="w-full max-h-[480px]" preload="metadata" />
      </span>
    </span>
  );
}

// ─── ContentImage ─────────────────────────────────────────────────────────────

function ContentImage({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <span className="my-6 flex flex-col items-center gap-2">
        <button
          onClick={() => setOpen(true)}
          className="group relative max-w-full rounded-xl overflow-hidden border border-white/[0.08] shadow-xl bg-card/40 cursor-zoom-in"
          aria-label="Zoom image"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt || ""}
            loading="lazy"
            className="max-h-[520px] w-auto h-auto object-contain block"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
          <span className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-end justify-end p-3">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-lg p-1.5">
              <ZoomIn className="w-4 h-4 text-white" />
            </span>
          </span>
        </button>
        {alt && (
          <span className="text-center text-xs text-muted-foreground/50 italic px-4">{alt}</span>
        )}
      </span>

      {open && (
        <div
          className="fixed inset-0 z-[9999] bg-black/92 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            onClick={() => setOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src} alt={alt || ""}
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          {alt && (
            <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/50 text-sm text-center px-4 max-w-lg">
              {alt}
            </p>
          )}
        </div>
      )}
    </>
  );
}

// ─── TableWrapper ─────────────────────────────────────────────────────────────

function TableWrapper({ children }: { children: ReactNode }) {
  return (
    <div className="my-6 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">{children}</table>
      </div>
    </div>
  );
}

// ─── MarkdownListItem ─────────────────────────────────────────────────────────

function MarkdownListItem({
  children, className, compact, ...rest
}: { children?: ReactNode; className?: string; compact?: boolean; [k: string]: unknown }) {
  const listType = useContext(ListTypeCtx);
  const isTask   = className?.includes("task-list-item");
  const liIndex  = rest["data-li-index"] as number | undefined;

  if (isTask) {
    return (
      <li className={cn("flex items-start gap-2 text-muted-foreground leading-relaxed list-none", compact ? "text-sm" : "text-[15px]")}>
        {children}
      </li>
    );
  }
  if (listType === "ol" || liIndex !== undefined) {
    return (
      <li className={cn("flex items-start gap-3 text-muted-foreground leading-relaxed list-none", compact ? "text-sm" : "text-[15px]")}>
        <span className="flex-shrink-0 min-w-[1.5rem] h-[1.5rem] rounded-md bg-[#d97757]/15 text-[#d97757] text-[11px] font-bold flex items-center justify-center mt-0.5 border border-[#d97757]/20">
          {liIndex ?? "•"}
        </span>
        <span className="flex-1 min-w-0">{children}</span>
      </li>
    );
  }
  return (
    <li className={cn("flex items-start gap-3 text-muted-foreground leading-relaxed list-none", compact ? "text-sm" : "text-[15px]")}>
      <span className="mt-[0.5em] w-1.5 h-1.5 rounded-full bg-[#d97757]/50 flex-shrink-0" />
      <span className="flex-1 min-w-0">{children}</span>
    </li>
  );
}

// ─── Inline extras (detected by the preprocessor sentinel prefixes) ────────────

function renderInlineExtra(raw: string): ReactNode | null {
  // @@mention@@  → professional mention chip
  if (raw.startsWith("@@") && raw.endsWith("@@") && raw.length > 4) {
    const name = raw.slice(2, -2);
    return (
      <span className="inline-flex items-center gap-0.5 align-baseline mx-px px-1.5 py-0.5 rounded-md bg-[#d97757]/12 text-[#d97757] font-medium text-[0.92em] leading-none border border-[#d97757]/20 not-italic whitespace-nowrap">
        <span className="opacity-60 font-semibold">@</span>
        {name}
      </span>
    );
  }
  // ==highlight==
  if (raw.startsWith("==") && raw.endsWith("==") && raw.length > 4) {
    const text = raw.slice(2, -2);
    return (
      <mark className="bg-yellow-400/25 text-yellow-200 rounded px-0.5 not-italic font-medium border-b border-yellow-400/40">
        {text}
      </mark>
    );
  }
  // [[Ctrl+K]] keyboard shortcut
  if (raw.startsWith("[[") && raw.endsWith("]]")) {
    const keys = raw.slice(2, -2).split(/\+(?=[A-Z]|\b)/);
    return (
      <span className="inline-flex items-center gap-0.5 mx-0.5">
        {keys.map((k, i) => (
          <kbd
            key={i}
            className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-secondary border border-border/80 text-[0.78em] font-mono font-semibold text-foreground/80 shadow-sm leading-none"
          >
            {k.trim()}
          </kbd>
        ))}
      </span>
    );
  }
  // ^sup^
  if (raw.startsWith("^") && raw.endsWith("^") && raw.length > 2 && !raw.slice(1, -1).includes("^")) {
    return <sup className="text-[0.75em] text-muted-foreground/70 align-super">{raw.slice(1, -1)}</sup>;
  }
  // ~sub~
  if (raw.startsWith("~") && raw.endsWith("~") && raw.length > 2 && !raw.slice(1, -1).includes("~")) {
    return <sub className="text-[0.75em] text-muted-foreground/70 align-sub">{raw.slice(1, -1)}</sub>;
  }
  return null;
}

// ─── Main renderer ─────────────────────────────────────────────────────────────

const MarkdownRenderer = memo(function MarkdownRenderer({ content, compact = false, className }: Props) {
  if (!content) return null;
  if (isHtml(content)) {
    const normalized = content.replace(/&nbsp;/g, " ").replace(/ /g, " ");
    return (
      <div
        className={cn("quill-content", compact && "quill-content-compact", className)}
        dangerouslySetInnerHTML={{ __html: normalized }}
      />
    );
  }

  const processed = preprocess(content);

  const components: Components = {

    // ── Headings (h1–h6 with anchor IDs) ──────────────────────────────────────
    h1: ({ children }) => {
      const id = toSlug(children);
      return (
        <h1 id={id} className={cn(
          "group relative text-xl sm:text-2xl font-bold text-foreground mt-8 mb-4 first:mt-0 pb-3 border-b border-border/50 flex items-center gap-2",
          compact && "text-lg mt-5 mb-2 pb-2",
        )}>
          <span className="text-[#d97757] font-black text-base sm:text-lg select-none">#</span>
          <span className="flex-1">{children}</span>
          <a href={`#${id}`} className="opacity-0 group-hover:opacity-40 hover:!opacity-80 transition-opacity text-muted-foreground text-sm font-normal ml-auto">
            ¶
          </a>
        </h1>
      );
    },

    h2: ({ children }) => {
      const id = toSlug(children);
      return (
        <h2 id={id} className={cn(
          "group relative text-base sm:text-[1.15rem] font-bold text-foreground mt-7 mb-3 first:mt-0 flex items-center gap-2.5 border-l-[3px] border-[#d97757]/60 pl-3",
          compact && "text-sm sm:text-base mt-4 mb-2",
        )}>
          <span className="flex-1">{children}</span>
          <a href={`#${id}`} className="opacity-0 group-hover:opacity-40 hover:!opacity-80 transition-opacity text-muted-foreground text-sm font-normal">
            ¶
          </a>
        </h2>
      );
    },

    h3: ({ children }) => {
      const id = toSlug(children);
      return (
        <h3 id={id} className={cn(
          "group text-sm sm:text-[1rem] font-semibold text-foreground/90 mt-5 mb-2 first:mt-0 flex items-center gap-2",
          compact && "mt-3 mb-1",
        )}>
          <span className="w-1.5 h-1.5 rounded-full bg-[#d97757]/60 flex-shrink-0 mt-0.5" />
          <span className="flex-1">{children}</span>
          <a href={`#${id}`} className="opacity-0 group-hover:opacity-40 hover:!opacity-80 transition-opacity text-muted-foreground text-sm font-normal">
            ¶
          </a>
        </h3>
      );
    },

    h4: ({ children }) => (
      <h4 className="text-[13px] sm:text-sm font-semibold text-foreground/70 mt-4 mb-1.5 uppercase tracking-widest">
        {children}
      </h4>
    ),

    h5: ({ children }) => (
      <h5 className="text-[13px] font-semibold text-muted-foreground mt-3 mb-1">{children}</h5>
    ),

    h6: ({ children }) => (
      <h6 className="text-[12px] font-semibold text-muted-foreground/70 mt-3 mb-1 uppercase tracking-wider">{children}</h6>
    ),

    // ── Paragraph ──────────────────────────────────────────────────────────────
    p: ({ children, node }) => {
      const child = node?.children?.[0];
      if (child?.type === "text") {
        const videoUrl = parseVideoDirective((child as { value: string }).value);
        if (videoUrl) return <VideoEmbed url={videoUrl} />;
      }
      return (
        <p className={cn(
          "text-muted-foreground leading-[1.85] tracking-wide mb-4 last:mb-0 whitespace-normal",
          compact ? "text-sm mb-2" : "text-[15px]",
        )}>
          {children}
        </p>
      );
    },

    // ── Code ───────────────────────────────────────────────────────────────────
    code: ({ className: cls, children }) => {
      const lang    = cls ? cls.replace("language-", "") : "";
      const rawStr  = String(children).replace(/\n$/, "");

      // Callout box
      if (lang.startsWith(CALLOUT_LANG_PREFIX)) {
        const type = lang.slice(CALLOUT_LANG_PREFIX.length).replace(/__$/, "") as CalloutType;
        if (type in CALLOUT_CONFIG) return <CalloutBox type={type} content={rawStr} />;
      }

      // Spoiler block
      if (lang.startsWith(SPOILER_LANG_PREFIX)) {
        const title = decodeURIComponent(lang.slice(SPOILER_LANG_PREFIX.length).replace(/__$/, ""));
        return <SpoilerBlock title={title} content={rawStr} />;
      }

      // Comparison list (+/-/! lines)
      if (lang === COMPLIST_LANG_PREFIX) {
        return <ComparisonList items={rawStr.split("\n").filter(Boolean)} />;
      }

      // Fenced code block
      if (cls) return <CodeBlock lang={lang} code={rawStr} />;

      // Inline code — check for preprocessor sentinels first
      const extra = renderInlineExtra(rawStr);
      if (extra) return <>{extra}</>;

      // Plain inline code
      return (
        <code className="px-1.5 py-0.5 rounded-md bg-[#d97757]/10 text-[#d97757] text-[0.85em] font-mono border border-[#d97757]/20">
          {children}
        </code>
      );
    },

    pre: ({ children }) => <>{children}</>,

    // ── Image ──────────────────────────────────────────────────────────────────
    img: ({ src, alt }) => {
      if (!src || typeof src !== "string") return null;
      return <ContentImage src={src} alt={alt ?? ""} />;
    },

    // ── Link ───────────────────────────────────────────────────────────────────
    a: ({ href, children }) => {
      const external = !!href?.startsWith("http");
      return (
        <a
          href={href}
          target={external ? "_blank" : undefined}
          rel={external ? "noopener noreferrer" : undefined}
          className="text-[#d97757] hover:text-orange-300 underline underline-offset-4 decoration-[#d97757]/40 hover:decoration-orange-300/60 transition-colors inline-flex items-baseline gap-1"
        >
          {children}
          {external && <ExternalLink className="w-3 h-3 opacity-50 flex-shrink-0 self-center" />}
        </a>
      );
    },

    // ── Lists ──────────────────────────────────────────────────────────────────
    ul: ({ children }) => (
      <ListTypeCtx.Provider value="ul">
        <ul className={cn("pl-0 list-none space-y-2", compact ? "my-2" : "my-4")}>{children}</ul>
      </ListTypeCtx.Provider>
    ),

    ol: ({ children }) => {
      let counter = 0;
      const numbered = Children.map(children, (child) => {
        if (!isValidElement(child)) return child;
        if ((child as ReactElement<{ className?: string }>).props?.className?.includes("task-list-item")) return child;
        counter++;
        return cloneElement(child as ReactElement<Record<string, unknown>>, { "data-li-index": counter });
      });
      return (
        <ListTypeCtx.Provider value="ol">
          <ol className={cn("pl-0 list-none space-y-2", compact ? "my-2" : "my-4")}>{numbered}</ol>
        </ListTypeCtx.Provider>
      );
    },

    li: (props) => <MarkdownListItem {...props} compact={compact} />,

    // ── Blockquote ─────────────────────────────────────────────────────────────
    blockquote: ({ children }) => (
      <blockquote className={cn(
        "relative my-5 pl-5 border-l-[3px] border-[#d97757]/40 text-muted-foreground/80 italic",
        "before:content-['\\201C'] before:absolute before:-top-1 before:-left-0.5 before:text-3xl before:text-[#d97757]/20 before:font-serif before:leading-none before:select-none",
      )}>
        {children}
      </blockquote>
    ),

    // ── Horizontal rule ────────────────────────────────────────────────────────
    hr: () => (
      <div className="my-8 flex items-center gap-3">
        <div className="flex-1 h-px bg-border/50" />
        <div className="w-1.5 h-1.5 rounded-full bg-[#d97757]/30" />
        <div className="flex-1 h-px bg-border/50" />
      </div>
    ),

    // ── Tables ─────────────────────────────────────────────────────────────────
    table:  ({ children })          => <TableWrapper>{children}</TableWrapper>,
    thead:  ({ children })          => <thead className="bg-secondary/[0.15]">{children}</thead>,
    tbody:  ({ children })          => <tbody>{children}</tbody>,
    tr:     ({ children })          => <tr className="hover:bg-[#d97757]/[0.03] transition-colors duration-100">
        {children}
      </tr>,
    th:     ({ children, style })   => (
      <th
        style={{ textAlign: (style as React.CSSProperties)?.textAlign }}
        className="px-4 py-3 text-left text-[11px] font-bold text-foreground/60 uppercase tracking-widest whitespace-nowrap border border-border/25"
      >
        {children}
      </th>
    ),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    td: ({ children, style, node }: any) => {
      const raw    = extractNodeText(node);
      const isPos = raw.startsWith("+ ");
      const isNeg = raw.startsWith("- ") || raw.startsWith("−");
      return (
        <td
          style={{ textAlign: (style as React.CSSProperties)?.textAlign }}
          className={cn(
            "px-4 py-3 text-[13px] align-top border border-border/[0.12] whitespace-normal",
            isPos ? "text-emerald-400 font-medium" : isNeg ? "text-red-400 font-medium" : "text-muted-foreground/90",
          )}
        >
          {children}
        </td>
      );
    },

    // ── Inline marks ───────────────────────────────────────────────────────────
    strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
    em:     ({ children }) => <em className="italic text-muted-foreground/90">{children}</em>,
    del:    ({ children }) => <del className="line-through text-muted-foreground/45 decoration-muted-foreground/30">{children}</del>,

    // ── Task-list checkbox ─────────────────────────────────────────────────────
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
    <div className={cn(
      "markdown-body whitespace-normal [overflow-wrap:break-word] [word-break:break-word]",
      className,
    )}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {processed}
      </ReactMarkdown>
    </div>
  );
});

export default MarkdownRenderer;
