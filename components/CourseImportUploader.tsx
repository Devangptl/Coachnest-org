"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Upload, FileText, CheckCircle2, AlertCircle, Download,
  ArrowRight, Loader2, X, BookOpen, Layers, RefreshCcw, ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";

interface ImportResult {
  course: { id: string; title: string; slug: string; status: string };
  lessonsCreated: number;
  quizzesCreated: number;
  editUrl: string;
}

// ── Status badge label map ──────────────────────────────────────────
const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  DRAFT:          { label: "Draft",          className: "bg-secondary text-muted-foreground border-border" },
  PENDING_REVIEW: { label: "Pending Review", className: "bg-amber-500/10 text-amber-400 border-amber-500/25" },
  PUBLISHED:      { label: "Published",      className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25" },
};

export default function CourseImportUploader() {
  const router   = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [dragging,  setDragging]  = useState(false);
  const [file,      setFile]      = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result,    setResult]    = useState<ImportResult | null>(null);
  const [error,     setError]     = useState<string | null>(null);

  const handleFile = useCallback((f: File) => {
    if (f.type !== "application/pdf") {
      setError("Only PDF files are supported. Please export your filled template as a PDF.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("File exceeds 10 MB limit. Please reduce the PDF size.");
      return;
    }
    setFile(f);
    setError(null);
    setResult(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleImport = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res  = await fetch("/api/instructor/courses/import-pdf", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Import failed. Please try again.");
        return;
      }

      setResult(data as ImportResult);
      toast.success("Course created successfully!");
    } catch {
      setError("Network error. Please check your connection and retry.");
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setFile(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  // ── Success state ────────────────────────────────────────────────────────────
  if (result) {
    const statusInfo = STATUS_LABEL[result.course.status] ?? STATUS_LABEL.DRAFT;
    return (
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Green top accent */}
        <div className="h-1 bg-gradient-to-r from-emerald-500 to-emerald-400" />

        <div className="p-8">
          {/* Icon + heading */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Course Created!</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Your course is ready. Head to the editor to add a thumbnail and publish.
            </p>
          </div>

          {/* Course summary card */}
          <div className="bg-secondary/30 border border-border rounded-xl p-5 mb-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Course title</p>
                <p className="text-base font-semibold text-foreground truncate">{result.course.title}</p>
              </div>
              <span className={`shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${statusInfo.className}`}>
                {statusInfo.label}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="bg-card border border-border rounded-lg px-3 py-3 text-center">
                <p className="text-2xl font-bold text-foreground">{result.lessonsCreated}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Lesson{result.lessonsCreated !== 1 ? "s" : ""}</p>
              </div>
              <div className="bg-card border border-border rounded-lg px-3 py-3 text-center">
                <p className="text-2xl font-bold text-foreground">{result.quizzesCreated ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Quiz{(result.quizzesCreated ?? 0) !== 1 ? "zes" : ""}</p>
              </div>
              <div className="bg-card border border-border rounded-lg px-3 py-3 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <BookOpen className="w-4 h-4 text-orange-400" />
                  <p className="text-sm font-semibold text-foreground">Ready to edit</p>
                </div>
                <p className="text-xs text-muted-foreground">Add thumbnail &amp; publish</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => router.push(result.editUrl)}
              className="btn-primary flex-1 inline-flex items-center justify-center gap-2 text-sm"
            >
              Open Course Editor <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href={`/courses/${result.course.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary inline-flex items-center justify-center gap-2 text-sm"
            >
              Preview <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button onClick={reset} className="btn-secondary inline-flex items-center justify-center gap-2 text-sm">
              <RefreshCcw className="w-3.5 h-3.5" /> Import Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main upload UI ────────────────────────────────────────────────────────────
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Orange top accent */}
      <div className="h-1 bg-gradient-to-r from-orange-500 to-amber-400" />

      <div className="p-6 space-y-5">
        {/* Step A — Download */}
        <div className="flex items-start gap-4 p-4 rounded-xl border border-border bg-secondary/20">
          <div className="w-8 h-8 rounded-full bg-orange-500/10 border border-orange-500/25 flex items-center justify-center text-sm font-bold text-orange-400 shrink-0">
            A
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground mb-0.5">Download the template</p>
            <p className="text-xs text-muted-foreground mb-3">
              Contains the exact structure the importer expects — fill in each field, then export as PDF.
            </p>
            <a
              href="/api/instructor/courses/template"
              download="learnhub-course-template.pdf"
              className="inline-flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-lg bg-orange-500/10 border border-orange-500/25 text-orange-400 hover:bg-orange-500/20 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download Template PDF
            </a>
          </div>
        </div>

        {/* Step B — Upload */}
        <div className="flex items-start gap-4 p-4 rounded-xl border border-border bg-secondary/20">
          <div className="w-8 h-8 rounded-full bg-orange-500/10 border border-orange-500/25 flex items-center justify-center text-sm font-bold text-orange-400 shrink-0">
            B
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground mb-0.5">Upload your filled PDF</p>
            <p className="text-xs text-muted-foreground mb-3">
              The system reads your template, creates the course, and adds all lessons automatically.
            </p>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => !file && inputRef.current?.click()}
              className={`relative rounded-xl border-2 border-dashed transition-all duration-200 ${
                dragging
                  ? "border-orange-400 bg-orange-500/5 scale-[1.01]"
                  : file
                  ? "border-emerald-500/50 bg-emerald-500/5 cursor-default"
                  : "border-border hover:border-orange-400/50 hover:bg-secondary/40 cursor-pointer"
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />

              {file ? (
                <div className="flex items-center gap-3 px-4 py-4">
                  {/* PDF icon */}
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB · PDF</p>
                  </div>
                  <button
                    onClick={clearFile}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    title="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="py-10 text-center px-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary border border-border flex items-center justify-center mx-auto mb-3">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">
                    Drop your PDF here or{" "}
                    <span className="text-orange-400 font-semibold">browse</span>
                  </p>
                  <p className="text-xs text-muted-foreground">PDF only · max 10 MB · must contain selectable text</p>
                </div>
              )}
            </div>

            {/* Error message */}
            {error && (
              <div className="mt-3 flex items-start gap-2.5 text-sm text-red-400 bg-red-500/5 border border-red-500/20 rounded-lg px-3.5 py-3">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="text-xs leading-relaxed">{error}</span>
              </div>
            )}

            {/* Import button */}
            {file && (
              <button
                onClick={handleImport}
                disabled={uploading}
                className="mt-4 w-full btn-primary inline-flex items-center justify-center gap-2 text-sm py-2.5 disabled:opacity-60"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Parsing PDF &amp; Creating Course…</span>
                  </>
                ) : (
                  <>
                    <Layers className="w-4 h-4" />
                    <span>Import Course from PDF</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Tips */}
        <div className="rounded-xl border border-border bg-secondary/10 px-4 py-3.5 space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tips</p>
          {TIPS.map((tip, i) => (
            <p key={i} className="text-xs text-muted-foreground leading-relaxed">
              <span className="text-foreground font-medium">{tip.label}</span> {tip.body}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

const TIPS = [
  { label: "Use any text editor.", body: "Fill the template in Notepad, VS Code, or Word, then use File → Print → Save as PDF." },
  { label: "Keep the field names.", body: "Lines like COURSE_TITLE:, LESSON_TITLE: must stay exactly as shown — only replace the values." },
  { label: "Multi-line fields work.", body: "DESCRIPTION and LESSON_CONTENT can span multiple lines — the parser reads until the next field." },
  { label: "Add as many lessons as needed.", body: "Duplicate the --- LESSON N --- … --- END LESSON --- block for each lesson." },
];
