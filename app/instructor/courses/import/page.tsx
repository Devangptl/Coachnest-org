import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import CourseImportUploader from "@/components/CourseImportUploader";
import { ArrowLeft, FileUp, BookOpen, Layers, Tags, Zap } from "lucide-react";

export default async function ImportCoursePage() {
  const session = await getSession();
  if (!session || (session.role !== "INSTRUCTOR" && session.role !== "ADMIN")) {
    redirect("/login");
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <Link
        href="/instructor/courses"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" /> My Courses
      </Link>

      {/* Page header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
            <FileUp className="w-5 h-5 text-[#d97757]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Import Course from PDF</h1>
            <p className="text-sm text-muted-foreground">
              Download the structured template, fill it in, upload — course &amp; lessons created instantly.
            </p>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: info panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* How it works */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#d97757]" /> How it works
            </h2>
            <ol className="space-y-4">
              {STEPS.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-500/10 border border-orange-500/25 flex items-center justify-center text-[11px] font-bold text-[#d97757] mt-0.5">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{step.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* What gets created */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-400" /> What gets created
            </h2>
            <ul className="space-y-2.5">
              {CREATED_ITEMS.map((item) => (
                <li key={item.label} className="flex items-start gap-2.5">
                  <item.icon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-sm font-medium text-foreground">{item.label}</span>
                    <span className="text-xs text-muted-foreground ml-1">— {item.desc}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Template format */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" /> Template structure
            </h2>
            <div className="rounded-lg bg-secondary/40 border border-border overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-secondary/60">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">course-template.txt</span>
              </div>
              <pre className="text-[10.5px] leading-relaxed font-mono text-muted-foreground p-3 overflow-x-auto whitespace-pre">{TEMPLATE_SNIPPET}</pre>
            </div>
          </div>
        </div>

        {/* Right: uploader */}
        <div className="lg:col-span-3">
          <CourseImportUploader />
        </div>
      </div>
    </div>
  );
}

const STEPS = [
  {
    title: "Download the template",
    desc: "Get the structured PDF showing exactly what fields to fill in.",
  },
  {
    title: "Fill in your content",
    desc: "Open it in any text editor, replace the placeholders with your course title, description, lessons, and more.",
  },
  {
    title: "Export as PDF & upload",
    desc: "Save your file as PDF (File → Print → Save as PDF works in any editor) and upload it here.",
  },
  {
    title: "Review & publish",
    desc: "The course and all lessons are created instantly. Open the editor to add a thumbnail and publish.",
  },
];

const CREATED_ITEMS = [
  { icon: BookOpen, label: "Course", desc: "title, description, level, language, pricing" },
  { icon: Tags,     label: "Tags",   desc: "auto-created and linked to your course" },
  { icon: Layers,   label: "Lessons", desc: "each lesson block becomes a TEXT or VIDEO lesson" },
];

const TEMPLATE_SNIPPET = `COURSE_TITLE:    Introduction to Python
SHORT_DESC:      Learn Python from scratch
DESCRIPTION:     A beginner-friendly course covering
                 Python fundamentals and real projects.
LEVEL:           beginner
LANGUAGE:        English
PRICE:           0
CATEGORY:        Programming
TAGS:            python, beginner

--- LESSON 1 ---
LESSON_TITLE:    Getting Started
LESSON_TYPE:     TEXT
LESSON_DURATION: 10
LESSON_IS_FREE:  yes
LESSON_CONTENT:  Welcome to Python!
--- END LESSON ---`;
