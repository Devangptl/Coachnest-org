/**
 * Seed script — run with: npm run db:seed
 * Creates sample users, categories, courses, lessons, reviews, and enrollments.
 */
import { PrismaClient, Role, LessonType, ContentStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ── Users ────────────────────────────────────────────────────────────────────
  const [adminPassword, instructorPassword, studentPassword] = await Promise.all([
    bcrypt.hash("admin123",      12),
    bcrypt.hash("instructor123", 12),
    bcrypt.hash("student123",    12),
  ]);

  const admin = await prisma.user.upsert({
    where:  { email: "admin@learnhub.dev" },
    update: {},
    create: { name: "Admin User", email: "admin@learnhub.dev", password: adminPassword, role: Role.ADMIN },
  });

  const instructor = await prisma.user.upsert({
    where:  { email: "instructor@learnhub.dev" },
    update: {},
    create: {
      name:     "Alex Instructor",
      email:    "instructor@learnhub.dev",
      password: instructorPassword,
      role:     Role.INSTRUCTOR,
      headline: "Senior Full-Stack Developer",
      bio:      "10 years of experience in web development. Passionate about teaching.",
    },
  });

  const student = await prisma.user.upsert({
    where:  { email: "student@learnhub.dev" },
    update: {},
    create: { name: "Jane Student", email: "student@learnhub.dev", password: studentPassword, role: Role.STUDENT },
  });

  // ── Categories ───────────────────────────────────────────────────────────────
  const catWeb = await prisma.category.upsert({
    where:  { slug: "web-development" },
    update: {},
    create: { name: "Web Development", slug: "web-development", icon: "💻", color: "#7c3aed" },
  });

  const catReact = await prisma.category.upsert({
    where:  { slug: "react" },
    update: {},
    create: { name: "React & Next.js", slug: "react", icon: "⚛️", color: "#0ea5e9" },
  });

  // ── Tags ─────────────────────────────────────────────────────────────────────
  const tagHTML = await prisma.tag.upsert({ where: { slug: "html" },       update: {}, create: { name: "HTML",       slug: "html" } });
  const tagCSS  = await prisma.tag.upsert({ where: { slug: "css" },        update: {}, create: { name: "CSS",        slug: "css" } });
  const tagJS   = await prisma.tag.upsert({ where: { slug: "javascript" }, update: {}, create: { name: "JavaScript", slug: "javascript" } });
  const tagTS   = await prisma.tag.upsert({ where: { slug: "typescript" }, update: {}, create: { name: "TypeScript", slug: "typescript" } });

  // ── Course 1: Web Dev Fundamentals (free) ────────────────────────────────────
  const course1 = await prisma.course.upsert({
    where:  { slug: "web-development-fundamentals" },
    update: {},
    create: {
      id:          "course-web-fundamentals",
      title:       "Web Development Fundamentals",
      slug:        "web-development-fundamentals",
      description: "Learn the core building blocks of the web: HTML, CSS, and JavaScript. Perfect for absolute beginners who want to start their coding journey.",
      shortDesc:   "Master HTML, CSS, and JavaScript from scratch.",
      thumbnail:   "https://images.unsplash.com/photo-1593720213428-28a5b9e94613?w=800",
      status:      ContentStatus.PUBLISHED,
      isFree:      true,
      level:       "beginner",
      totalLessons: 3,
      createdById: instructor.id,
      categoryId:  catWeb.id,
    },
  });

  await prisma.courseTag.createMany({
    skipDuplicates: true,
    data: [
      { courseId: course1.id, tagId: tagHTML.id },
      { courseId: course1.id, tagId: tagCSS.id  },
      { courseId: course1.id, tagId: tagJS.id   },
    ],
  });

  // ── Course 2: React Mastery (paid) ───────────────────────────────────────────
  const course2 = await prisma.course.upsert({
    where:  { slug: "react-mastery" },
    update: {},
    create: {
      id:          "course-react-mastery",
      title:       "React Mastery",
      slug:        "react-mastery",
      description: "Master React from hooks to advanced patterns. Build real-world applications with modern React best practices.",
      shortDesc:   "Go from React beginner to confident developer.",
      thumbnail:   "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800",
      status:      ContentStatus.PUBLISHED,
      price:       1999,
      discountPrice: 999,
      isFree:      false,
      level:       "intermediate",
      totalLessons: 2,
      createdById: instructor.id,
      categoryId:  catReact.id,
    },
  });

  await prisma.courseTag.createMany({
    skipDuplicates: true,
    data: [
      { courseId: course2.id, tagId: tagJS.id },
      { courseId: course2.id, tagId: tagTS.id },
    ],
  });

  // ── Lessons for course1 ──────────────────────────────────────────────────────
  await prisma.lesson.createMany({
    skipDuplicates: true,
    data: [
      {
        id:      "lesson-html-intro",
        title:   "Introduction to HTML",
        type:    LessonType.TEXT,
        content: `# Introduction to HTML\n\nHTML (HyperText Markup Language) is the backbone of every web page.\n\n## Key Tags\n- \`<h1>\` to \`<h6>\` — Headings\n- \`<p>\` — Paragraphs\n- \`<a>\` — Links\n- \`<img>\` — Images\n\nStart building your first page today!`,
        order:   1,
        isFree:  true,
        courseId: course1.id,
      },
      {
        id:       "lesson-css-basics",
        title:    "CSS Basics",
        type:     LessonType.VIDEO,
        content:  "https://www.youtube.com/embed/1PnVor36_40",
        duration: 20,
        order:    2,
        courseId: course1.id,
      },
      {
        id:      "lesson-js-intro",
        title:   "JavaScript Fundamentals",
        type:    LessonType.TEXT,
        content: "# JavaScript Fundamentals\n\nJavaScript adds interactivity to your pages.\n\n```js\nconst greet = (name) => `Hello, ${name}!`;\nconsole.log(greet('World'));\n```",
        order:   3,
        courseId: course1.id,
      },
    ],
  });

  // ── Lessons for course2 ──────────────────────────────────────────────────────
  await prisma.lesson.createMany({
    skipDuplicates: true,
    data: [
      {
        id:      "lesson-react-intro",
        title:   "What is React?",
        type:    LessonType.TEXT,
        content: "# What is React?\n\nReact is a JavaScript library for building user interfaces.\n\n## Core Concepts\n- **Components** — reusable building blocks\n- **Props** — data passed to components\n- **State** — internal component data\n- **Hooks** — functions to use React features",
        order:   1,
        isFree:  true,
        courseId: course2.id,
      },
      {
        id:       "lesson-hooks",
        title:    "React Hooks Deep Dive",
        type:     LessonType.VIDEO,
        content:  "https://www.youtube.com/embed/dpw9EHDh2bM",
        duration: 35,
        order:    2,
        courseId: course2.id,
      },
    ],
  });

  // ── Enroll student in course1 ────────────────────────────────────────────────
  await prisma.enrollment.upsert({
    where:  { userId_courseId: { userId: student.id, courseId: course1.id } },
    update: {},
    create: { userId: student.id, courseId: course1.id },
  });

  // Mark first lesson complete
  await prisma.lessonProgress.upsert({
    where:  { userId_lessonId: { userId: student.id, lessonId: "lesson-html-intro" } },
    update: {},
    create: { userId: student.id, lessonId: "lesson-html-intro", completed: true, completedAt: new Date() },
  });

  // ── Sample review ────────────────────────────────────────────────────────────
  await prisma.review.upsert({
    where:  { userId_courseId: { userId: student.id, courseId: course1.id } },
    update: {},
    create: { userId: student.id, courseId: course1.id, rating: 5, comment: "Excellent course! Very beginner-friendly." },
  });

  // ── Sample coupon ────────────────────────────────────────────────────────────
  await prisma.coupon.upsert({
    where:  { code: "LAUNCH50" },
    update: {},
    create: { code: "LAUNCH50", description: "50% off launch discount", discountType: "PERCENTAGE", discount: 50, maxUses: 100 },
  });

  console.log("\nSeed complete ✓");
  console.log("  Admin      → admin@learnhub.dev        / admin123");
  console.log("  Instructor → instructor@learnhub.dev   / instructor123");
  console.log("  Student    → student@learnhub.dev      / student123");
  console.log("  Coupon     → LAUNCH50 (50% off)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
