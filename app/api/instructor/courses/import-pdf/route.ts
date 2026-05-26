/**
 * POST /api/instructor/courses/import-pdf
 *
 * Accepts a multipart/form-data PDF (field "file") that matches the
 * Coachnest course-creation template.  Parses course metadata, then
 * creates Lessons of all three supported types:
 *
 *   TEXT  — LESSON_CONTENT holds the written body
 *   VIDEO — LESSON_CONTENT holds the video URL
 *   QUIZ  — QUIZ_TITLE / QUIZ_PASS_MARK / QUIZ_TIME_LIMIT + Q1/A-D/CORRECT/POINTS blocks
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import slugify from "slugify";

const FREE_COURSE_LIMIT = 5;

// ── PDF text extraction ───────────────────────────────────────────────────────
async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const { pathToFileURL } = await import("url");
  const { getPath }       = await import("pdf-parse/worker");
  const pdfjs             = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(getPath()).href;

  const { PDFParse } = await import("pdf-parse");
  const result       = await new PDFParse({ data: buffer }).getText();
  return result.text;
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface ParsedOption   { text: string; order: number; }
interface ParsedQuestion {
  text:    string;
  points:  number;
  order:   number;
  options: ParsedOption[];
  correct: string;        // letter A-D
}
interface ParsedQuiz {
  title:     string;
  passMark:  number;
  timeLimit: number | null;
  questions: ParsedQuestion[];
}
interface ParsedLesson {
  title:    string;
  type:     "TEXT" | "VIDEO" | "QUIZ";
  duration: number | null;
  isFree:   boolean;
  content:  string;
  order:    number;
  quiz:     ParsedQuiz | null;
}
interface ParsedCourse {
  title:       string;
  shortDesc:   string;
  description: string;
  level:       string;
  language:    string;
  price:       number;
  isFree:      boolean;
  category:    string;
  tags:        string[];
  lessons:     ParsedLesson[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function clean(v: string) { return v.replace(/\[.*?\]/g, "").trim(); }

function emptyLesson(order: number): ParsedLesson {
  return { title: "", type: "TEXT", duration: null, isFree: false, content: "", order, quiz: null };
}

function emptyQuiz(): ParsedQuiz {
  return { title: "", passMark: 70, timeLimit: null, questions: [] };
}

// ── Core parser ───────────────────────────────────────────────────────────────
function parseTemplate(raw: string): ParsedCourse {
  const lines = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

  const course: ParsedCourse = {
    title: "", shortDesc: "", description: "",
    level: "beginner", language: "English",
    price: 0, isFree: true, category: "", tags: [], lessons: [],
  };

  let lesson:      ParsedLesson | null = null;
  let quiz:        ParsedQuiz   | null = null;
  let question:    ParsedQuestion | null = null;
  let activeField: string | null = null;
  let lessonIdx    = 0;

  const LESSON_START = /^---\s*LESSON\s*\d*\s*---$/i;
  const LESSON_END   = /^---\s*END\s*LESSON\s*---$/i;
  const FIELD_RE     = /^\s*([A-Z][A-Z0-9_]*):\s*(.*)/;

  const pushQuestion = () => {
    if (question && quiz && question.text) {
      quiz.questions.push(question);
      question = null;
    }
  };

  const pushLesson = () => {
    if (!lesson) return;
    if (quiz) {
      pushQuestion();
      lesson.quiz = quiz;
      quiz = null;
    }
    if (lesson.title) course.lessons.push(lesson);
    lesson = null;
  };

  for (const raw of lines) {
    const t = raw.trim();

    if (LESSON_START.test(t)) { pushLesson(); lesson = emptyLesson(++lessonIdx); activeField = null; continue; }
    if (LESSON_END.test(t))   { pushLesson(); activeField = null; continue; }

    const m = t.match(FIELD_RE);
    if (m) {
      const key = m[1];
      const val = clean(m[2]);
      activeField = key;

      if (lesson) {
        // ── Quiz question sub-fields ──────────────────────────────
        if (key === "Q1" || key.match(/^Q\d+$/)) {
          pushQuestion();
          if (!quiz) quiz = emptyQuiz();
          const qNum = parseInt(key.slice(1));
          question = { text: val, points: 1, order: qNum, options: [], correct: "A" };
          continue;
        }
        if (question) {
          if (key === "A" || key === "B" || key === "C" || key === "D") {
            const ord = ["A","B","C","D"].indexOf(key) + 1;
            question.options.push({ text: val, order: ord });
            continue;
          }
          if (key === "CORRECT") { question.correct = val.toUpperCase(); continue; }
          if (key === "POINTS")  { question.points  = parseInt(val) || 1; continue; }
        }

        // ── Lesson-level fields ───────────────────────────────────
        switch (key) {
          case "LESSON_TITLE":    lesson.title    = val; break;
          case "LESSON_TYPE": {
            const up = val.toUpperCase();
            lesson.type = up === "VIDEO" ? "VIDEO" : up === "QUIZ" ? "QUIZ" : "TEXT";
            if (lesson.type === "QUIZ" && !quiz) quiz = emptyQuiz();
            break;
          }
          case "LESSON_DURATION": lesson.duration = parseInt(val) || null; break;
          case "LESSON_IS_FREE":  lesson.isFree   = val.toLowerCase() === "yes"; break;
          case "LESSON_CONTENT":  lesson.content  = val; break;
          case "QUIZ_TITLE":      if (!quiz) quiz = emptyQuiz(); quiz.title     = val; break;
          case "QUIZ_PASS_MARK":  if (!quiz) quiz = emptyQuiz(); quiz.passMark  = parseInt(val) || 70; break;
          case "QUIZ_TIME_LIMIT": if (!quiz) quiz = emptyQuiz(); quiz.timeLimit = parseInt(val) || null; break;
        }
      } else {
        // ── Course-level fields ────────────────────────────────────
        switch (key) {
          case "COURSE_TITLE": course.title       = val; break;
          case "SHORT_DESC":   course.shortDesc   = val; break;
          case "DESCRIPTION":  course.description = val; break;
          case "LEVEL":        course.level       = val || "beginner"; break;
          case "LANGUAGE":     course.language    = val || "English"; break;
          case "PRICE": {
            const p = parseFloat(val);
            course.price  = isNaN(p) ? 0 : p;
            course.isFree = course.price === 0;
            break;
          }
          case "CATEGORY": course.category = val; break;
          case "TAGS":     course.tags     = val.split(",").map(s => s.trim()).filter(Boolean); break;
        }
      }
      continue;
    }

    // ── Multi-line continuation ────────────────────────────────────────────
    if (activeField && t) {
      if (lesson && activeField === "LESSON_CONTENT") {
        lesson.content += (lesson.content ? "\n" : "") + t;
      } else if (!lesson && activeField === "DESCRIPTION") {
        course.description += (course.description ? "\n" : "") + t;
      }
    }
  }

  pushLesson(); // flush last
  return course;
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "INSTRUCTOR" && session.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let formData: FormData;
  try { formData = await req.formData(); }
  catch { return NextResponse.json({ error: "Invalid form data." }, { status: 400 }); }

  const file = formData.get("file");
  if (!file || typeof file === "string")
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  if (file.type !== "application/pdf")
    return NextResponse.json({ error: "Only PDF files are accepted." }, { status: 400 });
  if (file.size > 10 * 1024 * 1024)
    return NextResponse.json({ error: "File too large (max 10 MB)." }, { status: 400 });

  // ── Extract + parse ──────────────────────────────────────────────────────
  let rawText: string;
  try {
    rawText = await extractTextFromPdf(Buffer.from(await file.arrayBuffer()));
  } catch (err) {
    console.error("[import-pdf] pdf-parse error:", err);
    return NextResponse.json(
      { error: "Could not read the PDF. Make sure it contains selectable text (not a scanned image)." },
      { status: 422 },
    );
  }

  const parsed = parseTemplate(rawText);

  if (!parsed.title)
    return NextResponse.json({ error: "COURSE_TITLE is missing from the template." }, { status: 422 });
  if (!parsed.description)
    return NextResponse.json({ error: "DESCRIPTION is missing from the template." }, { status: 422 });

  // ── Free-course cap ──────────────────────────────────────────────────────
  if (parsed.isFree && session.role === "INSTRUCTOR") {
    const count = await prisma.course.count({ where: { createdById: session.userId, isFree: true } });
    if (count >= FREE_COURSE_LIMIT)
      return NextResponse.json(
        { error: `Free course limit (${FREE_COURSE_LIMIT}) reached. Set PRICE to a non-zero value.`, code: "FREE_COURSE_LIMIT_REACHED" },
        { status: 403 },
      );
  }

  // ── Category lookup ──────────────────────────────────────────────────────
  let categoryId: string | null = null;
  if (parsed.category) {
    const cat = await prisma.category.findFirst({ where: { name: { equals: parsed.category, mode: "insensitive" } } });
    categoryId = cat?.id ?? null;
  }

  const status: "DRAFT" | "PENDING_REVIEW" =
    parsed.isFree && session.role === "INSTRUCTOR" ? "PENDING_REVIEW" : "DRAFT";

  let slug = slugify(parsed.title, { lower: true, strict: true });
  if (await prisma.course.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;

  // ── Create course ────────────────────────────────────────────────────────
  const course = await prisma.course.create({
    data: {
      title: parsed.title, slug,
      description: parsed.description,
      shortDesc:   parsed.shortDesc || null,
      isFree:      parsed.isFree,
      price:       parsed.isFree ? null : parsed.price,
      level:       parsed.level,
      language:    parsed.language,
      categoryId,  status,
      createdById: session.userId,
      instructorRevenuePercent: 70,
    },
  });

  // ── Tags ─────────────────────────────────────────────────────────────────
  const cleanedTags = Array.from(new Set(parsed.tags.slice(0, 10)));
  await Promise.all(
    cleanedTags.map(async (name) => {
      const ts = slugify(name, { lower: true, strict: true });
      if (!ts) return;
      const tag = await prisma.tag.upsert({ where: { slug: ts }, create: { name, slug: ts }, update: {} });
      await prisma.courseTag.upsert({
        where:  { courseId_tagId: { courseId: course.id, tagId: tag.id } },
        create: { courseId: course.id, tagId: tag.id },
        update: {},
      });
    }),
  );

  // ── Lessons + quizzes ────────────────────────────────────────────────────
  let lessonsCreated = 0;
  let quizzesCreated = 0;

  for (const l of parsed.lessons.filter(l => l.title)) {
    const lesson = await prisma.lesson.create({
      data: {
        courseId: course.id,
        title:    l.title,
        type:     l.type,
        content:  l.content || null,
        duration: l.duration,
        isFree:   l.isFree,
        order:    l.order,
      },
    });
    lessonsCreated++;

    // ── QUIZ: create Quiz → Questions → Options ──────────────────────────
    if (l.type === "QUIZ" && l.quiz && l.quiz.questions.length > 0) {
      const q = l.quiz;
      const quiz = await prisma.quiz.create({
        data: {
          lessonId:  lesson.id,
          title:     q.title || l.title,
          passMark:  q.passMark,
          timeLimit: q.timeLimit,
        },
      });

      // Question.options is a Json column — store as array of {text, isCorrect}
      await prisma.question.createMany({
        data: q.questions.map((question) => {
          const correctIdx = ["A","B","C","D"].indexOf(question.correct.toUpperCase());
          const optionsJson = question.options.map((opt, i) => ({
            text:      opt.text,
            isCorrect: i === correctIdx,
          }));
          return {
            quizId:  quiz.id,
            text:    question.text,
            points:  question.points,
            order:   question.order,
            options: optionsJson,
          };
        }),
      });
      quizzesCreated++;
    }
  }

  return NextResponse.json(
    {
      course:        { id: course.id, title: course.title, slug: course.slug, status },
      lessonsCreated,
      quizzesCreated,
      editUrl:       `/instructor/courses/${course.id}/edit`,
    },
    { status: 201 },
  );
}
