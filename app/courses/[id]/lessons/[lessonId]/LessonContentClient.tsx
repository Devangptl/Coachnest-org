"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, Circle, Lock, PlayCircle, FileText, HelpCircle,
  ChevronLeft, ChevronRight, Clock, Sparkles, Eye,
  Copy, Check, Code2, Hash, Award, Download, Headphones, ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import QuizPlayer from "@/components/QuizPlayer";
import TextHighlighter from "@/components/TextHighlighter";
import LessonAudioPlayer from "@/components/LessonAudioPlayer";
import { useLessonContext } from "../LessonProvider";
import toast from "react-hot-toast";

interface LessonData {
  id: string;
  title: string;
  type: "TEXT" | "VIDEO" | "QUIZ";
  content?: string | null;
  duration?: number | null;
  isFree?: boolean;
}

interface NavItem {
  id: string;
  title: string;
}

interface Props {
  courseId: string;
  lesson: LessonData;
  lessonIndex: number;
  totalLessons: number;
  prev: NavItem | null;
  next: NavItem | null;
}

const typeConfig = {
  VIDEO: { icon: PlayCircle, color: "text-orange-400", bg: "bg-orange-500/15", border: "border-orange-400/20", label: "Video" },
  TEXT:  { icon: FileText,   color: "text-blue-400",   bg: "bg-blue-500/15",   border: "border-blue-400/20",   label: "Reading" },
  QUIZ:  { icon: HelpCircle, color: "text-amber-400",  bg: "bg-amber-500/15",  border: "border-amber-400/20",  label: "Quiz" },
};

export default function LessonContentClient({ courseId, lesson, lessonIndex, totalLessons, prev, next }: Props) {
  const router = useRouter();
  const { isEnrolled, loading, isCompleted, markComplete } = useLessonContext();
  const [marking, setMarking] = useState(false);

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft" && prev) router.push(`/courses/${courseId}/lessons/${prev.id}`);
      if (e.key === "ArrowRight" && next) router.push(`/courses/${courseId}/lessons/${next.id}`);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, courseId, router]);
  const [showAudioPlayer, setShowAudioPlayer] = useState(false);
  const [downloadingCert, setDownloadingCert] = useState(false);

  const config = typeConfig[lesson.type] ?? typeConfig.TEXT;
  const TypeIcon = config.icon;

  const done = isCompleted(lesson.id);
  const isLocked = !loading && !lesson.isFree && !isEnrolled;

  // Treat "all complete" only when enrolled and last lesson is also complete
  const allComplete = !loading && isEnrolled && !next && done;

  async function handleToggle() {
    if (!isEnrolled || marking) return;
    setMarking(true);
    try {
      await markComplete(lesson.id, !done);
    } finally {
      setMarking(false);
    }
  }

  async function downloadCertificate() {
    if (downloadingCert) return;
    setDownloadingCert(true);
    try {
      const res = await fetch(`/api/certificates/${courseId}`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to generate certificate");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificate-${courseId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Certificate downloaded!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloadingCert(false);
    }
  }

  // ── Locked state ────────────────────────────────────────────────────────────
  if (isLocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 py-20 text-center">
        <div className="w-20 h-20 rounded-2xl bg-secondary border border-border flex items-center justify-center mb-6">
          <Lock className="w-10 h-10 text-muted-foreground/25" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-3">Enroll to Access</h2>
        <p className="text-muted-foreground/70 max-w-sm leading-relaxed mb-6">
          This lesson is part of a paid course. Enroll to unlock all {totalLessons} lessons.
        </p>
        <Link
          href={`/courses/${courseId}`}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-lg shadow-orange-600/20"
        >
          View Course &amp; Enroll
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      {/* ── Lesson header ── */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center border flex-shrink-0", config.bg, config.border)}>
            <TypeIcon className={cn("w-5 h-5", config.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[11px] text-muted-foreground/60 font-medium uppercase tracking-wide">
                Lesson {lessonIndex + 1} of {totalLessons}
              </span>
              <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full border", config.color, config.bg, config.border)}>
                {config.label}
              </span>
              {lesson.isFree && !isEnrolled && !loading && (
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded-full border border-emerald-400/20 font-medium">
                  <Eye className="w-2.5 h-2.5" /> Free Preview
                </span>
              )}
              {lesson.duration && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                  <Clock className="w-3 h-3" />
                  {lesson.duration} min
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">{lesson.title}</h1>
          </div>
        </div>

        {/* Action bar — enrolled only */}
        {isEnrolled && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
            {lesson.type === "TEXT" && lesson.content && (
              <button
                onClick={() => setShowAudioPlayer((v) => !v)}
                className={cn(
                  "flex items-center gap-1.5 text-xs px-3 py-2 rounded-md border transition-all font-medium",
                  showAudioPlayer
                    ? "bg-blue-500/20 border-blue-400/30 text-blue-400"
                    : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                )}
              >
                <Headphones className="w-4 h-4" />
                {showAudioPlayer ? "Hide Audio" : "Listen"}
              </button>
            )}
            <button
              onClick={handleToggle}
              disabled={marking}
              className={cn(
                "flex items-center gap-2 text-xs px-4 py-2 rounded-md border transition-all font-semibold ml-auto",
                done
                  ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-400"
                  : "bg-secondary border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {done ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
              {done ? "Completed" : "Mark Complete"}
            </button>
          </div>
        )}
      </div>

      {/* ── Audio player ── */}
      <AnimatePresence>
        {showAudioPlayer && lesson.type === "TEXT" && lesson.content && (
          <motion.div
            key="audio"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.18 }}
            className="mb-6"
          >
            <LessonAudioPlayer text={lesson.content} lessonTitle={lesson.title} onClose={() => setShowAudioPlayer(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Content body ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        {lesson.type === "QUIZ" ? (
          <div className="p-6">
            <QuizLoader
              lessonId={lesson.id}
              onComplete={() => { if (!done) markComplete(lesson.id, true); }}
            />
          </div>
        ) : lesson.type === "VIDEO" && lesson.content ? (
          <div className="relative aspect-video bg-black">
            <iframe
              src={lesson.content}
              title={lesson.title}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : lesson.content ? (
          <LessonContent content={lesson.content} lessonId={lesson.id} isEnrolled={isEnrolled} />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <FileText className="w-12 h-12 text-muted-foreground/20 mb-4" />
            <p className="text-muted-foreground/60">No content added yet.</p>
          </div>
        )}
      </div>

      {/* ── Prev / Next ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-8 pt-6 border-t border-border">
        {prev ? (
          <Link
            href={`/courses/${courseId}/lessons/${prev.id}`}
            className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-all group px-4 py-3 rounded-xl hover:bg-secondary border border-border/50 hover:border-border"
          >
            <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            </div>
            <div className="text-left min-w-0">
              <p className="text-[10px] text-muted-foreground/50 mb-0.5 font-medium uppercase tracking-wide">Previous</p>
              <p className="text-sm font-semibold truncate max-w-[180px]">{prev.title}</p>
            </div>
          </Link>
        ) : (
          <Link
            href={`/courses/${courseId}`}
            className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-all group px-4 py-3 rounded-xl hover:bg-secondary border border-border/50 hover:border-border"
          >
            <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            </div>
            <div className="text-left">
              <p className="text-[10px] text-muted-foreground/50 mb-0.5 font-medium uppercase tracking-wide">Back to</p>
              <p className="text-sm font-semibold">Course Overview</p>
            </div>
          </Link>
        )}

        {next ? (
          <Link
            href={`/courses/${courseId}/lessons/${next.id}`}
            className="flex items-center justify-end gap-3 group bg-gradient-to-r from-orange-600/15 to-orange-500/15 border border-orange-400/20 text-primary hover:text-foreground px-4 py-3 rounded-xl transition-all hover:from-orange-600/25 hover:to-orange-500/20"
          >
            <div className="text-right min-w-0 flex-1">
              <p className="text-[10px] text-muted-foreground/50 mb-0.5 font-medium uppercase tracking-wide">Next</p>
              <p className="text-sm font-semibold truncate max-w-[180px]">{next.title}</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-orange-500/15 flex items-center justify-center flex-shrink-0">
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        ) : (
          <div className="flex items-center justify-center gap-2.5 text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-400/20 px-5 py-3 rounded-xl text-sm">
            <Sparkles className="w-5 h-5" />
            You&apos;ve reached the end!
          </div>
        )}
      </div>

      {/* ── Certificate banner ── */}
      {allComplete && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, delay: 0.15 }}
          className="mt-6 p-5 rounded-xl bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border border-amber-400/20 relative overflow-hidden"
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent"
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <Award className="w-6 h-6 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-foreground font-bold text-sm">Course Completed!</h3>
              <p className="text-muted-foreground/70 text-xs mt-0.5">All lessons done. Claim your certificate!</p>
            </div>
            <button
              onClick={downloadCertificate}
              disabled={downloadingCert}
              className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold px-5 py-2.5 rounded-xl text-sm hover:from-amber-400 hover:to-yellow-400 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 flex-shrink-0"
            >
              {downloadingCert ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <Download className="w-4 h-4" />}
              {downloadingCert ? "Generating…" : "Get Certificate"}
            </button>
          </div>
        </motion.div>
      )}

      <p className="text-muted-foreground/30 text-[10px] text-center mt-6 hidden lg:block">
        Use ← → arrow keys to navigate between lessons
      </p>
    </div>
  );
}

// ── Quiz loader ────────────────────────────────────────────────────────────────

function QuizLoader({ lessonId, onComplete }: { lessonId: string; onComplete: () => void }) {
  const [quiz, setQuiz] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true); setError(null); setQuiz(null);
    fetch(`/api/lessons/${lessonId}/quiz`)
      .then((r) => (r.ok ? r.json() : r.json().then((d) => Promise.reject(d.error))))
      .then(setQuiz)
      .catch((e) => setError(typeof e === "string" ? e : "Failed to load quiz"))
      .finally(() => setLoading(false));
  }, [lessonId]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-orange-400/25 border-t-orange-400 rounded-full animate-spin" />
    </div>
  );
  if (error || !quiz) return (
    <div className="text-center py-16">
      <HelpCircle className="w-12 h-12 text-muted-foreground/25 mx-auto mb-4" />
      <p className="text-muted-foreground/60">{error || "No quiz available."}</p>
    </div>
  );
  return <QuizPlayer quiz={quiz as Parameters<typeof QuizPlayer>[0]["quiz"]} onComplete={(_s, passed) => { if (passed) onComplete(); }} />;
}

// ── Content renderer ──────────────────────────────────────────────────────────

type Block =
  | { type: "h1" | "h2" | "h3"; text: string }
  | { type: "code"; lang: string; code: string }
  | { type: "list" | "numlist"; items: string[] }
  | { type: "image"; src: string; alt: string }
  | { type: "paragraph"; text: string };

function parseContent(raw: string): Block[] {
  const lines = raw.split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trimStart().startsWith("```")) {
      const lang = line.trim().replace(/^```/, "").trim();
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) { code.push(lines[i]); i++; }
      i++;
      blocks.push({ type: "code", lang: lang || "code", code: code.join("\n") });
      continue;
    }
    if (line.startsWith("### ")) { blocks.push({ type: "h3", text: line.slice(4).trim() }); i++; continue; }
    if (line.startsWith("## "))  { blocks.push({ type: "h2", text: line.slice(3).trim() }); i++; continue; }
    if (line.startsWith("# "))   { blocks.push({ type: "h1", text: line.slice(2).trim() }); i++; continue; }
    const imgMatch = line.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) { blocks.push({ type: "image", src: imgMatch[2], alt: imgMatch[1] }); i++; continue; }
    if (/^[\s]*[•\-\*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[\s]*[•\-\*]\s/.test(lines[i])) { items.push(lines[i].replace(/^[\s]*[•\-\*]\s/, "").trim()); i++; }
      blocks.push({ type: "list", items }); continue;
    }
    if (/^\d+[\.\)]\s/.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^\d+[\.\)]\s/.test(lines[i].trim())) { items.push(lines[i].replace(/^\d+[\.\)]\s/, "").trim()); i++; }
      blocks.push({ type: "numlist", items }); continue;
    }
    if (line.trim() === "") { i++; continue; }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !lines[i].startsWith("#") && !lines[i].trimStart().startsWith("```") && !/^[\s]*[•\-\*]\s/.test(lines[i]) && !/^\d+[\.\)]\s/.test(lines[i].trim())) { para.push(lines[i]); i++; }
    if (para.length) blocks.push({ type: "paragraph", text: para.join(" ") });
  }
  return blocks;
}

function renderInline(text: string): React.ReactNode {
  return text.split(/(`[^`]+`)/g).flatMap((p, i) => {
    if (p.startsWith("`") && p.endsWith("`")) return <code key={i} className="px-1.5 py-0.5 rounded-md bg-orange-500/15 text-primary text-[0.85em] font-mono border border-orange-400/25">{p.slice(1, -1)}</code>;
    return p.split(/(\[[^\]]+\]\([^)]+\))/g).flatMap((lp, j) => {
      const m = lp.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (m) return <a key={`${i}-${j}`} href={m[2]} target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-400 hover:underline font-medium underline-offset-4 transition-colors">{m[1]}</a>;
      return lp.split(/(\*\*[^*]+\*\*)/g).map((bp, k) =>
        bp.startsWith("**") && bp.endsWith("**")
          ? <strong key={`${i}-${j}-${k}`} className="font-semibold text-foreground">{bp.slice(2, -2)}</strong>
          : <span key={`${i}-${j}-${k}`}>{bp}</span>
      );
    });
  });
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-xl overflow-hidden border border-white/[0.08] bg-[#0d1117] shadow-lg my-1">
      <div className="flex items-center justify-between px-4 py-2 bg-white/[0.03] border-b border-white/[0.06]">
        <div className="flex items-center gap-2"><Code2 className="w-3.5 h-3.5 text-emerald-400" /><span className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider">{lang}</span></div>
        <button onClick={async () => { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50 hover:text-muted-foreground px-2 py-1 rounded-md hover:bg-secondary transition-colors">
          {copied ? <><Check className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">Copied</span></> : <><Copy className="w-3 h-3" />Copy</>}
        </button>
      </div>
      <div className="overflow-x-auto">
        <pre className="p-4 text-sm leading-relaxed">
          {code.split("\n").map((line, i) => <div key={i} className="flex"><span className="select-none text-white/15 text-right w-8 mr-4 flex-shrink-0 font-mono text-xs">{i + 1}</span><code className="font-mono text-emerald-300/80">{line || " "}</code></div>)}
        </pre>
      </div>
    </div>
  );
}

function LessonContent({ content, lessonId, isEnrolled }: { content: string; lessonId: string; isEnrolled: boolean }) {
  const blocks = useMemo(() => parseContent(content), [content]);
  return (
    <div className="px-6 sm:px-10 py-8">
      <TextHighlighter lessonId={lessonId} isEnrolled={isEnrolled}>
        <div className="space-y-5">
          {blocks.map((block, i) => {
            switch (block.type) {
              case "h1": return <h1 key={i} className="text-2xl font-bold text-foreground flex items-center gap-3 pt-2"><Hash className="w-5 h-5 text-orange-400 flex-shrink-0" />{block.text}</h1>;
              case "h2": return <h2 key={i} className="text-lg font-semibold text-foreground border-l-2 border-orange-400/40 pl-3 pt-3">{block.text}</h2>;
              case "h3": return <h3 key={i} className="text-base font-semibold text-foreground/80 pt-2">{block.text}</h3>;
              case "code": return <CodeBlock key={i} lang={block.lang} code={block.code} />;
              case "list": return <ul key={i} className="space-y-2 pl-1">{block.items.map((it, j) => <li key={j} className="flex items-start gap-3 text-muted-foreground text-sm leading-relaxed"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-orange-500/40 flex-shrink-0" /><span>{renderInline(it)}</span></li>)}</ul>;
              case "numlist": return <ol key={i} className="space-y-2 pl-1">{block.items.map((it, j) => <li key={j} className="flex items-start gap-3 text-muted-foreground text-sm leading-relaxed"><span className="flex-shrink-0 w-5 h-5 rounded-md bg-orange-500/15 text-primary text-[11px] font-bold flex items-center justify-center mt-0.5">{j + 1}</span><span>{renderInline(it)}</span></li>)}</ol>;
              case "paragraph": return <p key={i} className="text-muted-foreground text-sm leading-[1.85] tracking-wide">{renderInline(block.text)}</p>;
              case "image": return <div key={i} className="my-8 flex flex-col items-center"><div className="max-w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-card/40">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={block.src} alt={block.alt} className="max-h-[600px] w-auto h-auto object-contain" /></div>{block.alt && <p className="mt-4 text-center text-xs text-muted-foreground/50 italic">{block.alt}</p>}</div>;
            }
          })}
        </div>
      </TextHighlighter>
    </div>
  );
}
