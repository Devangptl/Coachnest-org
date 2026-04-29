/**
 * POST /api/instructor/courses/import-pdf
 *
 * Accepts a multipart/form-data PDF upload (field name: "file").
 * Parses the structured template text, creates the Course and its Lessons,
 * and returns the new course.
 *
 * Expected template structure (see GET /api/instructor/courses/template):
 *
 *   COURSE_TITLE:   My Course
 *   SHORT_DESC:     A brief tagline
 *   DESCRIPTION:    Full description (may span multiple lines)
 *   LEVEL:          beginner
 *   LANGUAGE:       English
 *   PRICE:          0
 *   CATEGORY:       Programming
 *   TAGS:           python, beginner
 *
 *   --- LESSON 1 ---
 *   LESSON_TITLE:    Getting Started
 *   LESSON_TYPE:     TEXT
 *   LESSON_DURATION: 10
 *   LESSON_IS_FREE:  yes
 *   LESSON_CONTENT:  Lesson body text...
 *   --- END LESSON ---
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import slugify from "slugify";

const FREE_COURSE_LIMIT = 5;

// ── PDF text extraction ────────────────────────────────────────────────────────
async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  return result.text;
}

// ── Template parser ────────────────────────────────────────────────────────────
interface ParsedLesson {
  title: string;
  type: "TEXT" | "VIDEO";
  duration: number | null;
  isFree: boolean;
  content: string;
  order: number;
}

interface ParsedCourse {
  title: string;
  shortDesc: string;
  description: string;
  level: string;
  language: string;
  price: number;
  isFree: boolean;
  category: string;
  tags: string[];
  lessons: ParsedLesson[];
}

function cleanValue(value: string): string {
  return value.replace(/\[.*?\]/g, "").trim();
}

function parseTemplate(raw: string): ParsedCourse {
  const lines = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

  const course: ParsedCourse = {
    title: "",
    shortDesc: "",
    description: "",
    level: "beginner",
    language: "English",
    price: 0,
    isFree: true,
    category: "",
    tags: [],
    lessons: [],
  };

  let currentLesson: ParsedLesson | null = null;
  let activeField: string | null = null;
  let lessonIndex = 0;

  const LESSON_START = /^---\s*LESSON\s*\d*\s*---$/i;
  const LESSON_END   = /^---\s*END\s*LESSON\s*---$/i;
  // Match KEY: value  (keys are UPPER_CASE with optional leading spaces)
  const FIELD_RE     = /^\s*([A-Z][A-Z0-9_]*):\s*(.*)/;

  for (const raw of lines) {
    const trimmed = raw.trim();

    // ── Lesson delimiters ──────────────────────────────────────────
    if (LESSON_START.test(trimmed)) {
      if (currentLesson) course.lessons.push(currentLesson);
      currentLesson = {
        title: "",
        type: "TEXT",
        duration: null,
        isFree: false,
        content: "",
        order: ++lessonIndex,
      };
      activeField = null;
      continue;
    }

    if (LESSON_END.test(trimmed)) {
      if (currentLesson) {
        course.lessons.push(currentLesson);
        currentLesson = null;
      }
      activeField = null;
      continue;
    }

    // ── Named field ────────────────────────────────────────────────
    const m = trimmed.match(FIELD_RE);
    if (m) {
      const key = m[1];
      const val = cleanValue(m[2]);
      activeField = key;

      if (currentLesson) {
        switch (key) {
          case "LESSON_TITLE":    currentLesson.title   = val; break;
          case "LESSON_TYPE":     currentLesson.type    = (val.toUpperCase() === "VIDEO" ? "VIDEO" : "TEXT"); break;
          case "LESSON_DURATION": currentLesson.duration = parseInt(val) || null; break;
          case "LESSON_IS_FREE":  currentLesson.isFree  = val.toLowerCase() === "yes"; break;
          case "LESSON_CONTENT":  currentLesson.content = val; break;
        }
      } else {
        switch (key) {
          case "COURSE_TITLE": course.title      = val; break;
          case "SHORT_DESC":   course.shortDesc  = val; break;
          case "DESCRIPTION":  course.description = val; break;
          case "LEVEL":        course.level      = val || "beginner"; break;
          case "LANGUAGE":     course.language   = val || "English"; break;
          case "PRICE": {
            const p = parseFloat(val);
            course.price  = isNaN(p) ? 0 : p;
            course.isFree = course.price === 0;
            break;
          }
          case "CATEGORY": course.category = val; break;
          case "TAGS":
            course.tags = val.split(",").map((t) => t.trim()).filter(Boolean);
            break;
        }
      }
      continue;
    }

    // ── Multi-line continuation ────────────────────────────────────
    if (activeField && trimmed) {
      if (currentLesson && activeField === "LESSON_CONTENT") {
        currentLesson.content += (currentLesson.content ? "\n" : "") + trimmed;
      } else if (!currentLesson && activeField === "DESCRIPTION") {
        course.description += (course.description ? "\n" : "") + trimmed;
      }
    }
  }

  // Push final lesson if delimiter was omitted
  if (currentLesson) course.lessons.push(currentLesson);

  return course;
}

// ── Route handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "INSTRUCTOR" && session.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Parse multipart body ────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are accepted." }, { status: 400 });
  }

  const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 10 MB)." }, { status: 400 });
  }

  // ── Extract text ────────────────────────────────────────────────
  let rawText: string;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    rawText = await extractTextFromPdf(buffer);
  } catch (err) {
    console.error("[import-pdf] pdf-parse error:", err);
    return NextResponse.json({ error: "Could not read the PDF. Make sure it contains selectable text (not a scanned image)." }, { status: 422 });
  }

  // ── Parse template ──────────────────────────────────────────────
  const parsed = parseTemplate(rawText);

  if (!parsed.title) {
    return NextResponse.json(
      { error: "COURSE_TITLE is missing from the template. Make sure your PDF contains the filled template." },
      { status: 422 },
    );
  }
  if (!parsed.description) {
    return NextResponse.json(
      { error: "DESCRIPTION is missing from the template." },
      { status: 422 },
    );
  }

  // ── Free-course cap (instructors only) ─────────────────────────
  if (parsed.isFree && session.role === "INSTRUCTOR") {
    const freeCourseCount = await prisma.course.count({
      where: { createdById: session.userId, isFree: true },
    });
    if (freeCourseCount >= FREE_COURSE_LIMIT) {
      return NextResponse.json(
        {
          error: `Free course limit (${FREE_COURSE_LIMIT}) reached. Set PRICE to a non-zero value.`,
          code: "FREE_COURSE_LIMIT_REACHED",
        },
        { status: 403 },
      );
    }
  }

  // ── Resolve category ────────────────────────────────────────────
  let categoryId: string | null = null;
  if (parsed.category) {
    const cat = await prisma.category.findFirst({
      where: { name: { equals: parsed.category, mode: "insensitive" } },
    });
    categoryId = cat?.id ?? null;
  }

  // ── Status ─────────────────────────────────────────────────────
  const status: "DRAFT" | "PENDING_REVIEW" =
    parsed.isFree && session.role === "INSTRUCTOR" ? "PENDING_REVIEW" : "DRAFT";

  // ── Slug ───────────────────────────────────────────────────────
  let slug = slugify(parsed.title, { lower: true, strict: true });
  const existing = await prisma.course.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  // ── Create course ───────────────────────────────────────────────
  const course = await prisma.course.create({
    data: {
      title:       parsed.title,
      slug,
      description: parsed.description,
      shortDesc:   parsed.shortDesc || null,
      isFree:      parsed.isFree,
      price:       parsed.isFree ? null : parsed.price,
      level:       parsed.level,
      language:    parsed.language,
      categoryId,
      status,
      createdById: session.userId,
      instructorRevenuePercent: 70,
    },
  });

  // ── Attach tags ─────────────────────────────────────────────────
  if (parsed.tags.length > 0) {
    const cleanedTags = Array.from(new Set(parsed.tags.slice(0, 10)));
    await Promise.all(
      cleanedTags.map(async (name) => {
        const tagSlug = slugify(name, { lower: true, strict: true });
        if (!tagSlug) return;
        const tag = await prisma.tag.upsert({
          where:  { slug: tagSlug },
          create: { name, slug: tagSlug },
          update: {},
        });
        await prisma.courseTag.upsert({
          where:  { courseId_tagId: { courseId: course.id, tagId: tag.id } },
          create: { courseId: course.id, tagId: tag.id },
          update: {},
        });
      }),
    );
  }

  // ── Create lessons ──────────────────────────────────────────────
  let lessonsCreated = 0;
  if (parsed.lessons.length > 0) {
    await prisma.lesson.createMany({
      data: parsed.lessons
        .filter((l) => l.title)
        .map((l) => ({
          courseId: course.id,
          title:    l.title,
          type:     l.type,
          content:  l.content || null,
          duration: l.duration,
          isFree:   l.isFree,
          order:    l.order,
        })),
    });
    lessonsCreated = parsed.lessons.filter((l) => l.title).length;
  }

  return NextResponse.json(
    {
      course: { id: course.id, title: course.title, slug: course.slug, status },
      lessonsCreated,
      editUrl: `/instructor/courses/${course.id}/edit`,
    },
    { status: 201 },
  );
}
