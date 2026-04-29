"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, CheckCircle2, AlertCircle, Download, ArrowRight, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface ImportResult {
  course: { id: string; title: string; slug: string; status: string };
  lessonsCreated: number;
  editUrl: string;
}

export default function CourseImportUploader() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (f: File) => {
    if (f.type !== "application/pdf") {
      setError("Please select a PDF file.");
      return;
    }
    setFile(f);
    setError(null);
    setResult(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleImport = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/instructor/courses/import-pdf", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Import failed. Please try again.");
        return;
      }

      setResult(data as ImportResult);
      toast.success(`Course "${data.course.title}" created with ${data.lessonsCreated} lesson${data.lessonsCreated !== 1 ? "s" : ""}!`);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setUploading(false);
    }
  };

  // ── Success state ──────────────────────────────────────────────────
  if (result) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center space-y-4">
        <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
        <div>
          <h3 className="text-lg font-semibold text-foreground">{result.course.title}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Course created with <span className="font-medium text-foreground">{result.lessonsCreated}</span> lesson{result.lessonsCreated !== 1 ? "s" : ""}.
            Status: <span className="font-medium text-amber-400">{result.course.status.replace("_", " ")}</span>
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => router.push(result.editUrl)}
            className="btn-primary inline-flex items-center gap-2 text-sm"
          >
            Edit Course <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setResult(null); setFile(null); }}
            className="btn-secondary text-sm"
          >
            Import Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Step 1 — Download template */}
      <div className="rounded-xl border border-border bg-secondary/20 p-6">
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-bold text-sm">1</div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-1">Download the template</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Get the structured template PDF. Open it, copy the text block into any text editor, fill in your course details and lessons, then export as PDF.
            </p>
            <a
              href="/api/instructor/courses/template"
              download="learnhub-course-template.pdf"
              className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border border-primary/40 text-primary hover:bg-primary/5 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download Template PDF
            </a>
          </div>
        </div>
      </div>

      {/* Step 2 — Upload filled PDF */}
      <div className="rounded-xl border border-border bg-secondary/20 p-6">
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-bold text-sm">2</div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-1">Upload your filled PDF</h3>
            <p className="text-sm text-muted-foreground mb-4">
              The system will parse the template structure, create your course, and add all lessons automatically.
            </p>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`cursor-pointer rounded-xl border-2 border-dashed transition-colors p-8 text-center ${
                dragging
                  ? "border-primary bg-primary/5"
                  : file
                  ? "border-emerald-500/50 bg-emerald-500/5"
                  : "border-border hover:border-primary/40 hover:bg-secondary/40"
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
                <div className="flex items-center justify-center gap-3">
                  <FileText className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    <span className="text-primary font-medium">Click to choose</span> or drag &amp; drop your PDF here
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">PDF only · max 10 MB</p>
                </>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="mt-3 flex items-start gap-2 text-sm text-red-400 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Import button */}
            {file && (
              <button
                onClick={handleImport}
                disabled={uploading}
                className="mt-4 btn-primary inline-flex items-center gap-2 text-sm disabled:opacity-60"
              >
                {uploading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Parsing &amp; Creating Course…</>
                ) : (
                  <><Upload className="w-4 h-4" /> Import Course</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Format reference */}
      <details className="rounded-xl border border-border">
        <summary className="cursor-pointer select-none px-5 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          Template format reference
        </summary>
        <div className="px-5 pb-5 pt-2">
          <pre className="text-xs text-muted-foreground bg-secondary/40 rounded-lg p-4 overflow-x-auto leading-relaxed whitespace-pre">{TEMPLATE_EXAMPLE}</pre>
        </div>
      </details>
    </div>
  );
}

const TEMPLATE_EXAMPLE = `COURSE_TITLE:    Introduction to Python
SHORT_DESC:      Learn Python programming from scratch
DESCRIPTION:     A comprehensive beginner-friendly course covering Python
                 fundamentals, data structures, and real-world projects.
LEVEL:           beginner
LANGUAGE:        English
PRICE:           0
CATEGORY:        Programming
TAGS:            python, beginner, programming

--- LESSON 1 ---
LESSON_TITLE:    Getting Started with Python
LESSON_TYPE:     TEXT
LESSON_DURATION: 10
LESSON_IS_FREE:  yes
LESSON_CONTENT:  Python is a versatile, beginner-friendly language used
                 in web development, data science, AI, and more.
--- END LESSON ---

--- LESSON 2 ---
LESSON_TITLE:    Variables and Data Types
LESSON_TYPE:     TEXT
LESSON_DURATION: 15
LESSON_IS_FREE:  no
LESSON_CONTENT:  In this lesson we explore Python's built-in types:
                 int, float, str, bool, list, dict, and tuple.
--- END LESSON ---`;
