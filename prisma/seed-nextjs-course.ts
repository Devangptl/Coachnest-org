/**
 * Next.js 16 — Complete Developer Guide
 * Standalone, idempotent seed.
 *
 * Run:  npm run db:seed:nextjs
 *
 * - Verifies the target instructor exists
 * - Upserts category & tags
 * - Deletes any prior course with the same slug (cascades sections/lessons/quizzes)
 * - Recreates the full course (10 chapters, ~59 lessons, 10 quizzes)
 */

import "dotenv/config";
import { PrismaClient, ContentStatus, LessonType } from "@prisma/client";

const prisma = new PrismaClient();

const INSTRUCTOR_ID = "36aa2cdf-7a37-4ec2-8ca4-f887586d5e7a";
const COURSE_SLUG = "nextjs-16-complete-developer-guide";

function opts(items: Array<{ text: string; correct?: boolean }>) {
  return items.map((item, i) => ({
    id: String.fromCharCode(97 + i),
    text: item.text,
    isCorrect: item.correct ?? false,
  }));
}

async function ensureCategoryAndTags() {
  const category = await prisma.category.upsert({
    where: { slug: "web-development" },
    update: {},
    create: {
      name: "Web Development",
      slug: "web-development",
      icon: "🌐",
      color: "#0ea5e9",
    },
  });

  const tagDefs = [
    { name: "Next.js", slug: "nextjs" },
    { name: "React", slug: "react" },
    { name: "TypeScript", slug: "typescript" },
    { name: "Server Components", slug: "server-components" },
    { name: "App Router", slug: "app-router" },
    { name: "Full-Stack", slug: "full-stack" },
  ];

  const tags = await Promise.all(
    tagDefs.map((t) =>
      prisma.tag.upsert({
        where: { slug: t.slug },
        update: {},
        create: t,
      })
    )
  );

  return { category, tags };
}

async function main() {
  console.log("\n🌱  Next.js 16 course seed starting…\n");

  const instructor = await prisma.user.findUnique({ where: { id: INSTRUCTOR_ID } });
  if (!instructor) {
    throw new Error(
      `Instructor ${INSTRUCTOR_ID} not found. Create the user first, then re-run.`
    );
  }
  console.log(`  ✓ Instructor verified: ${instructor.name ?? instructor.email}`);

  const { category, tags } = await ensureCategoryAndTags();
  console.log(`  ✓ Category & ${tags.length} tags ready`);

  const existing = await prisma.course.findUnique({ where: { slug: COURSE_SLUG } });
  if (existing) {
    console.log(`  ↻ Removing existing course "${COURSE_SLUG}" (id=${existing.id})…`);
    await prisma.course.delete({ where: { id: existing.id } });
  }

  const course = await prisma.course.create({
    data: {
      title: "Next.js 16: The Complete Developer Guide",
      slug: COURSE_SLUG,
      description:
        "The definitive, project-driven guide to Next.js 16 — the latest stable release. Master the App Router, Server Components, Server Actions, Cache Components, Partial Prerendering, Turbopack (now default), React 19 integration, authentication, database integration, testing, and production deployment. Built for engineers shipping real, production-grade apps in 2026.",
      shortDesc:
        "Master Next.js 16 from first principles to production: App Router, Server Components, Cache Components, PPR, Server Actions, and full deployment.",
      thumbnail:
        "https://images.unsplash.com/photo-1618477388954-7852f32655ec?w=1200&auto=format",
      previewVideo: "https://www.youtube.com/embed/__mSgDEOyv8",
      status: ContentStatus.PUBLISHED,
      price: 5999,
      discountPrice: 3499,
      isFree: false,
      level: "intermediate",
      language: "English",
      totalDuration: 1240,
      totalLessons: 59,
      categoryId: category.id,
      createdById: instructor.id,
    },
  });

  await prisma.courseTag.createMany({
    data: tags.map((t) => ({ courseId: course.id, tagId: t.id })),
  });

  console.log(`  ✓ Course created (id=${course.id})\n`);

  // Build the curriculum from a declarative spec.
  const curriculum = buildCurriculum();

  let sectionOrder = 1;
  let totalLessons = 0;
  let totalQuizzes = 0;

  for (const chapter of curriculum) {
    const section = await prisma.section.create({
      data: {
        title: chapter.title,
        order: sectionOrder++,
        courseId: course.id,
      },
    });

    let lessonOrder = 1;
    for (const l of chapter.lessons) {
      const lesson = await prisma.lesson.create({
        data: {
          courseId: course.id,
          sectionId: section.id,
          order: lessonOrder++,
          title: l.title,
          description: l.description ?? null,
          type: l.type,
          isFree: l.isFree ?? false,
          duration: l.duration,
          content: l.content ?? null,
        },
      });
      totalLessons++;

      if (l.type === LessonType.QUIZ && l.quiz) {
        const quiz = await prisma.quiz.create({
          data: {
            lessonId: lesson.id,
            title: l.quiz.title,
            passMark: l.quiz.passMark ?? 70,
            timeLimit: l.quiz.timeLimit ?? 15,
          },
        });
        await prisma.question.createMany({
          data: l.quiz.questions.map((q, i) => ({
            quizId: quiz.id,
            order: i + 1,
            points: q.points ?? 1,
            text: q.text,
            options: opts(q.options),
          })),
        });
        totalQuizzes++;
      }
    }

    console.log(`  ✓ Chapter ${section.order}: ${chapter.title} (${chapter.lessons.length} lessons)`);
  }

  console.log("\n═══════════════════════════════════════════════════");
  console.log("  ✅  Next.js 16 course seed complete!");
  console.log("═══════════════════════════════════════════════════");
  console.log(`  Course:    ${course.title}`);
  console.log(`  Slug:      ${COURSE_SLUG}`);
  console.log(`  Chapters:  ${curriculum.length}`);
  console.log(`  Lessons:   ${totalLessons}`);
  console.log(`  Quizzes:   ${totalQuizzes}`);
  console.log("═══════════════════════════════════════════════════\n");
}

type LessonSpec = {
  title: string;
  type: LessonType;
  duration: number;
  isFree?: boolean;
  description?: string;
  content?: string;
  quiz?: {
    title: string;
    passMark?: number;
    timeLimit?: number;
    questions: Array<{
      text: string;
      points?: number;
      options: Array<{ text: string; correct?: boolean }>;
    }>;
  };
};

type ChapterSpec = { title: string; lessons: LessonSpec[] };

function buildCurriculum(): ChapterSpec[] {
  return [
    chapter1(),
    chapter2(),
    chapter3(),
    chapter4(),
    chapter5(),
    chapter6(),
    chapter7(),
    chapter8(),
    chapter9(),
    chapter10(),
  ];
}

// Chapter implementations are appended below.

function chapter1(): ChapterSpec {
  return {
    title: "Chapter 1 — Getting Started with Next.js 16",
    lessons: [
      {
        title: "What's New in Next.js 16",
        type: LessonType.TEXT,
        duration: 14,
        isFree: true,
        description: "Tour of the biggest features and breaking changes in Next.js 16.",
        content: `# What's New in Next.js 16

Next.js 16 is the most significant release since the App Router landed. It's a refinement release: features that were experimental for the past year are now stable, defaults have changed, and the mental model is cleaner than ever.

## Headline Features

### 1. Turbopack is the default bundler
Both \`next dev\` and \`next build\` use **Turbopack** out of the box. Cold dev starts are 4–10× faster than the Webpack era. Webpack is still available behind \`--webpack\` for the rare edge case.

### 2. Cache Components
The new \`"use cache"\` directive lets you mark a component, function, or file as cacheable. Combined with \`cacheTag\` and \`cacheLife\`, you get fine-grained, declarative caching that replaces the old \`fetch()\` cache options.

\`\`\`tsx
"use cache";

import { cacheLife, cacheTag } from "next/cache";

export async function getCourse(slug: string) {
  cacheTag("course", \`course:\${slug}\`);
  cacheLife("hours");
  return db.course.findUnique({ where: { slug } });
}
\`\`\`

### 3. Partial Prerendering (PPR) is stable
Pages render a static shell instantly while dynamic holes stream in. No new APIs to learn — just opt in per-route with \`experimental_ppr\` (kept named for compatibility, now stable).

### 4. React 19.2 baseline
Next.js 16 ships React 19.2 with the **React Compiler** enabled by default. Most \`useMemo\` / \`useCallback\` calls become unnecessary.

### 5. Improved Server Actions
Action results are typed end-to-end, \`useActionState\` (formerly \`useFormState\`) is stable, and progressive enhancement just works.

### 6. Streaming Metadata
Metadata can now stream alongside the page body. No more blocking the document head on a slow database call.

## Breaking Changes To Know

| Change | Impact |
|--------|--------|
| Turbopack default | Some legacy webpack-only plugins won't work. |
| \`next/image\` requires explicit \`sizes\` for \`fill\` | Build error in 16; warning in 15. |
| \`unstable_cache\` deprecated | Use \`"use cache"\` instead. |
| Node 18 dropped | Minimum Node version is **20.9+**. |
| \`pages/\` router maintenance-only | Still supported but no new features. |

## Should You Upgrade?

If you're on **15.x**, the upgrade path is short — most apps need only a few hours. If you're on **14 or earlier**, plan a day per ~10 KLOC of app code. The codemod (\`npx @next/codemod@latest upgrade\`) handles 80% of the mechanical work.

## What You'll Build In This Course

By the final chapter, you will have built:

- A **production-grade course platform** (the kind hosting this very lesson)
- A **real-time dashboard** using Server Components + WebSockets
- A **full authentication system** with sessions, OAuth, and route protection
- A **deployed app on Vercel and a self-hosted Docker container**

Welcome to Next.js 16 — let's go. 🚀
`,
      },
      {
        title: "Installation, CLI & Your First Project",
        type: LessonType.TEXT,
        duration: 12,
        isFree: true,
        content: `# Installation, CLI & Your First Project

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | **20.9+** (LTS recommended) |
| Package manager | npm 10+, pnpm 9+, yarn 4+, or bun 1.1+ |
| Git | Any recent version |

Verify:

\`\`\`bash
node --version   # v20.9.0 or later
npm --version    # 10+
\`\`\`

## Creating a Project

The fastest way:

\`\`\`bash
npx create-next-app@latest my-app
\`\`\`

The CLI asks a handful of questions. The Next.js 16 defaults:

\`\`\`
✔ Would you like to use TypeScript?     › Yes
✔ Would you like to use ESLint?         › Yes
✔ Would you like to use Tailwind CSS?   › Yes
✔ Would you like your code inside a 'src/' directory? › No
✔ Would you like to use App Router?     › Yes
✔ Would you like to customize the default import alias (@/*)? › No
✔ Use Turbopack? (now default)          › Yes
\`\`\`

> **Tip:** Pass \`--use-pnpm\` (or \`--use-bun\`) to skip the prompt and avoid creating a stray \`package-lock.json\`.

## The Dev Server

\`\`\`bash
cd my-app
npm run dev
\`\`\`

You should see:

\`\`\`
   ▲ Next.js 16.0.0  (Turbopack)
   - Local:        http://localhost:3000
   - Environments: .env.local

 ✓ Ready in 480ms
\`\`\`

Open [http://localhost:3000](http://localhost:3000). Edit \`app/page.tsx\` — the browser updates in well under 100 ms.

## The Five Commands You'll Run Daily

| Command | What it does |
|---------|--------------|
| \`next dev\` | Turbopack dev server with HMR |
| \`next build\` | Production build (Turbopack) |
| \`next start\` | Runs the production build |
| \`next lint\` | ESLint with the Next preset |
| \`next info\` | Diagnostic dump for bug reports |

## Project Layout (Default)

\`\`\`
my-app/
  app/
    layout.tsx       ← Root layout (must export <html><body>)
    page.tsx         ← Home route (/)
    globals.css      ← Tailwind directives & global styles
    favicon.ico
  public/            ← Static files served from /
  next.config.ts     ← Configuration (TypeScript!)
  tsconfig.json
  package.json
\`\`\`

## Common First-Day Mistakes

1. **Editing \`node_modules\`** — never works; reinstall instead.
2. **Importing from \`pages/\`** — App Router uses \`app/\`. Don't mix unless intentional.
3. **Restarting the dev server after every change** — HMR handles 99% of edits. Only restart on config changes.
4. **Forgetting \`"use client"\`** — adding state/effects to a Server Component throws an error. Add the directive at the top.

## Quick Smoke Test

Replace \`app/page.tsx\` with:

\`\`\`tsx
export default function HomePage() {
  return (
    <main className="p-12">
      <h1 className="text-4xl font-bold">Hello, Next.js 16!</h1>
      <p className="mt-2 text-gray-600">If you see this, you're ready.</p>
    </main>
  );
}
\`\`\`

Save. The page updates. You're set. ✅
`,
      },
      {
        title: "Project Structure & Conventions Deep Dive",
        type: LessonType.TEXT,
        duration: 16,
        content: `# Project Structure & Conventions Deep Dive

Next.js is **convention over configuration**. Knowing the conventions saves you from reading docs every time you add a feature.

## Top-Level Folders

| Folder | Purpose |
|--------|---------|
| \`app/\` | App Router routes, layouts, pages, server logic |
| \`public/\` | Static assets served at the URL root |
| \`components/\` | (You create) shared React components |
| \`lib/\` | (You create) helpers, db clients, server utilities |
| \`styles/\` | (You create) CSS files if not co-located |

## Special Files in \`app/\`

These file names have superpowers. Every other file is just a regular module.

| File | Purpose | Runs On |
|------|---------|---------|
| \`page.tsx\` | Renders the URL | Server (default) |
| \`layout.tsx\` | Wraps a route segment + its children | Server (default) |
| \`template.tsx\` | Like layout but **re-mounts** on navigation | Server |
| \`loading.tsx\` | Suspense fallback for the segment | Server |
| \`error.tsx\` | Error boundary for the segment | **Client** |
| \`global-error.tsx\` | Catches errors in the root layout | Client |
| \`not-found.tsx\` | Renders for \`notFound()\` calls | Server |
| \`route.ts\` | HTTP endpoint (GET/POST/...) | Server |
| \`middleware.ts\` | Edge middleware (project root) | Edge runtime |

## Routing Conventions

| Pattern | URL | Notes |
|---------|-----|-------|
| \`app/about/page.tsx\` | \`/about\` | Static segment |
| \`app/blog/[slug]/page.tsx\` | \`/blog/:slug\` | Dynamic segment |
| \`app/shop/[...path]/page.tsx\` | \`/shop/*\` | Catch-all |
| \`app/shop/[[...path]]/page.tsx\` | \`/shop\` & \`/shop/*\` | Optional catch-all |
| \`app/(marketing)/page.tsx\` | \`/\` | Route group (no URL effect) |
| \`app/@modal/page.tsx\` | — | Parallel route slot |
| \`app/(.)photo/[id]/page.tsx\` | Intercepts \`/photo/:id\` | Intercepting route |
| \`app/_internal/util.ts\` | (none) | Underscored → private, never routed |

## Component Conventions

A \`page.tsx\` must default-export a React component:

\`\`\`tsx
// app/about/page.tsx
export default function AboutPage() {
  return <h1>About</h1>;
}
\`\`\`

A \`layout.tsx\` must accept \`{ children }\`:

\`\`\`tsx
// app/blog/layout.tsx
export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[200px_1fr]">
      <Sidebar />
      <main>{children}</main>
    </div>
  );
}
\`\`\`

A \`route.ts\` exports HTTP verbs:

\`\`\`ts
// app/api/health/route.ts
export async function GET() {
  return Response.json({ status: "ok" });
}
\`\`\`

## File Co-location

You can place any non-special file inside \`app/\` — components, tests, hooks, CSS. Only files with reserved names participate in routing.

\`\`\`
app/
  blog/
    page.tsx
    PostCard.tsx        ← regular component
    PostCard.test.tsx   ← test (never routed)
    post-card.module.css
\`\`\`

## Metadata Files

| File | Result |
|------|--------|
| \`favicon.ico\` (root of \`app/\`) | Site favicon |
| \`opengraph-image.png\` | OG image for the segment |
| \`robots.txt\` / \`robots.ts\` | Generated robots rules |
| \`sitemap.xml\` / \`sitemap.ts\` | Generated sitemap |
| \`manifest.json\` / \`manifest.ts\` | PWA manifest |

Drop the file in the right place — Next does the wiring.

## A Realistic Folder for a Mid-Size App

\`\`\`
app/
  (marketing)/
    layout.tsx
    page.tsx
    pricing/page.tsx
  (app)/
    layout.tsx         ← requires auth
    dashboard/
      page.tsx
      loading.tsx
    courses/
      [slug]/
        page.tsx
        @reviews/page.tsx
  api/
    auth/[...nextauth]/route.ts
    webhooks/stripe/route.ts
  layout.tsx           ← root layout
  globals.css
components/
  ui/                  ← primitives (button, input, dialog)
  feature/             ← domain components
lib/
  auth.ts
  db.ts
  validations/
middleware.ts
\`\`\`

This structure scales from prototype to 200 KLOC apps without restructuring.
`,
      },
      {
        title: "Turbopack — The New Default Bundler",
        type: LessonType.VIDEO,
        duration: 18,
        content: "https://www.youtube.com/embed/__mSgDEOyv8",
      },
      {
        title: "Configuring TypeScript, ESLint & next.config.ts",
        type: LessonType.TEXT,
        duration: 14,
        content: `# Configuring TypeScript, ESLint & next.config.ts

## next.config.ts — Now TypeScript Native

Next.js 16 reads \`next.config.ts\` natively. You get auto-completion and type-checking on every option.

\`\`\`ts
import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "cdn.coachnest.dev" },
    ],
  },
  experimental: {
    ppr: "incremental",          // Partial Prerendering, opt-in per route
    typedRoutes: true,            // Type-safe <Link href> across the app
    serverActions: { bodySizeLimit: "2mb" },
  },
  async redirects() {
    return [{ source: "/docs", destination: "/learn", permanent: true }];
  },
};

export default config;
\`\`\`

> Use \`satisfies NextConfig\` if you'd rather keep literal types narrow.

## tsconfig.json — Recommended Settings

The CLI scaffolds a solid default. Two settings worth turning on once you're comfortable:

\`\`\`json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,   // safer array & object access
    "noFallthroughCasesInSwitch": true,
    "moduleResolution": "bundler",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
\`\`\`

Path aliases work everywhere — components, server actions, route handlers.

## Typed Routes

With \`experimental.typedRoutes: true\`:

\`\`\`tsx
import Link from "next/link";

// ✅ Valid
<Link href="/dashboard" />
<Link href={\`/courses/\${slug}\`} />

// ❌ Compile error — no such route
<Link href="/dashbaord" />
\`\`\`

Catches typos at build time. Worth the opt-in.

## ESLint

\`\`\`bash
npm run lint
\`\`\`

The \`eslint-config-next\` preset enforces:

- React rules of hooks
- Anti-patterns for \`next/image\`, \`next/link\`, \`next/script\`
- No \`<a href>\` for internal nav
- No \`<img>\` when \`next/image\` works
- No \`React.lazy\` for routes (use the App Router instead)

## Environment Variables

| File | Loaded in |
|------|-----------|
| \`.env\` | All environments |
| \`.env.local\` | All environments — **gitignored** |
| \`.env.development\` | \`next dev\` |
| \`.env.production\` | \`next build\` / \`next start\` |

### Public vs Private

\`\`\`bash
# Only available on the server (default)
DATABASE_URL=postgresql://...

# Exposed to the browser — prefix with NEXT_PUBLIC_
NEXT_PUBLIC_POSTHOG_KEY=phc_abc123
\`\`\`

> **Security:** never put secrets behind \`NEXT_PUBLIC_\`. The variable is inlined into the JS bundle and visible in DevTools.

### Validating Env at Boot

\`\`\`ts
// lib/env.ts
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

export const env = schema.parse(process.env);
\`\`\`

Crash early on misconfigured deploys instead of returning HTTP 500s in production.

## Recommended Scripts (package.json)

\`\`\`json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest",
    "e2e": "playwright test"
  }
}
\`\`\`

Run \`npm run typecheck\` in CI — \`next build\` reports type errors, but a dedicated step keeps PR feedback fast.
`,
      },
      {
        title: "Chapter 1 — Quiz",
        type: LessonType.QUIZ,
        duration: 10,
        quiz: {
          title: "Getting Started Quiz",
          passMark: 70,
          timeLimit: 10,
          questions: [
            {
              text: "What is the default bundler in Next.js 16?",
              options: [
                { text: "Webpack" },
                { text: "Turbopack", correct: true },
                { text: "esbuild" },
                { text: "Rollup" },
              ],
            },
            {
              text: "Which Node.js version is the minimum for Next.js 16?",
              options: [
                { text: "Node 16+" },
                { text: "Node 18+" },
                { text: "Node 20.9+", correct: true },
                { text: "Node 22+" },
              ],
            },
            {
              text: "Which environment-variable prefix exposes a value to the browser?",
              options: [
                { text: "PUBLIC_" },
                { text: "NEXT_PUBLIC_", correct: true },
                { text: "CLIENT_" },
                { text: "BROWSER_" },
              ],
            },
            {
              text: "Where does a Next.js project's `middleware.ts` file belong?",
              options: [
                { text: "Inside `app/`" },
                { text: "Inside `app/api/`" },
                { text: "At the project root (or `src/`)", correct: true },
                { text: "Anywhere — Next.js auto-discovers it" },
              ],
            },
            {
              text: "Which file name renders the UI shown while a route segment loads?",
              options: [
                { text: "spinner.tsx" },
                { text: "loading.tsx", correct: true },
                { text: "fallback.tsx" },
                { text: "suspense.tsx" },
              ],
            },
          ],
        },
      },
    ],
  };
}
function chapter2(): ChapterSpec {
  return {
    title: "Chapter 2 — Routing & Navigation with the App Router",
    lessons: [
      {
        title: "App Router Fundamentals",
        type: LessonType.TEXT,
        duration: 16,
        content: `# App Router Fundamentals

The App Router is the routing system every new Next.js project uses. It's built on React Server Components, supports nested layouts, streaming, and parallel routes — capabilities the old Pages Router could not offer.

## Files = Routes

Every \`page.tsx\` inside \`app/\` becomes a URL.

| File | URL |
|------|-----|
| \`app/page.tsx\` | \`/\` |
| \`app/about/page.tsx\` | \`/about\` |
| \`app/blog/page.tsx\` | \`/blog\` |
| \`app/(marketing)/pricing/page.tsx\` | \`/pricing\` |
| \`app/dashboard/settings/page.tsx\` | \`/dashboard/settings\` |

## Layouts

A \`layout.tsx\` wraps a segment and **persists across navigation** between sibling pages — its state, scroll, and DOM nodes are kept.

\`\`\`tsx
// app/dashboard/layout.tsx
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[240px_1fr]">
      <Sidebar />        {/* persists when you navigate from /dashboard/courses → /dashboard/billing */}
      <main className="p-8">{children}</main>
    </div>
  );
}
\`\`\`

Layouts nest. The root layout (\`app/layout.tsx\`) is the only one that must include \`<html>\` and \`<body>\`.

## Pages

Pages render the leaf segment. They receive **params** (dynamic segments) and **searchParams** (query string) — both as Promises in Next.js 15+.

\`\`\`tsx
// app/blog/[slug]/page.tsx
type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function BlogPost({ params, searchParams }: Props) {
  const { slug } = await params;
  const { tab = "post" } = await searchParams;
  const post = await getPost(slug);
  return <article>{tab === "comments" ? <Comments id={post.id} /> : <Body post={post} />}</article>;
}
\`\`\`

> **Why Promises?** It lets Next.js stream the route shell before either is resolved when prerendering.

## Templates

A \`template.tsx\` looks like a layout but **does not persist**. A new instance mounts on every navigation. Use when you need an entry animation or a fresh effect run per page view.

## The Render Order

When you navigate to \`/dashboard/courses/intro/lessons/1\`, Next renders:

\`\`\`
app/layout.tsx
  app/dashboard/layout.tsx
    app/dashboard/courses/layout.tsx
      app/dashboard/courses/[slug]/layout.tsx
        app/dashboard/courses/[slug]/lessons/[id]/page.tsx
\`\`\`

Each layer can have its own \`loading.tsx\` and \`error.tsx\` — so a slow database call in the lesson page doesn't block the dashboard chrome from rendering.

## Linking

Use \`next/link\` for client-side transitions. It prefetches the target route automatically when the link enters the viewport.

\`\`\`tsx
import Link from "next/link";

<Link href="/dashboard">Dashboard</Link>
<Link href={\`/courses/\${course.slug}\`} prefetch={false}>Don't prefetch</Link>
\`\`\`

## Programmatic Navigation

\`\`\`tsx
"use client";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button onClick={async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();   // re-fetch server components on the next page
    }}>Sign out</button>
  );
}
\`\`\`

## Reading the Current Route

\`\`\`tsx
"use client";
import { usePathname, useSearchParams } from "next/navigation";

export function ActiveLink({ href, children }: Props) {
  const pathname = usePathname();
  const active = pathname === href;
  return <Link href={href} className={active ? "font-bold" : ""}>{children}</Link>;
}
\`\`\`

These hooks are client-only — call them inside files marked \`"use client"\`.
`,
      },
      {
        title: "Dynamic Routes, Catch-Alls & Type-Safe Params",
        type: LessonType.TEXT,
        duration: 14,
        content: `# Dynamic Routes, Catch-Alls & Type-Safe Params

## Single Dynamic Segment

\`\`\`
app/users/[id]/page.tsx     →  /users/:id
\`\`\`

\`\`\`tsx
export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await db.user.findUnique({ where: { id } });
  if (!user) notFound();
  return <h1>{user.name}</h1>;
}
\`\`\`

## Multiple Dynamic Segments

\`\`\`
app/blog/[year]/[slug]/page.tsx   →  /blog/2026/hello-world
\`\`\`

\`\`\`tsx
type Params = Promise<{ year: string; slug: string }>;

export default async function Post({ params }: { params: Params }) {
  const { year, slug } = await params;
  // …
}
\`\`\`

## Catch-All Segments

\`\`\`
app/docs/[...path]/page.tsx   →  /docs/a, /docs/a/b, /docs/a/b/c
\`\`\`

\`params.path\` is a **string array**:

\`\`\`tsx
const { path } = await params;
// /docs/a/b/c  →  path = ["a", "b", "c"]
\`\`\`

## Optional Catch-All

Wrap the brackets: \`[[...path]]\`. Matches both \`/docs\` (no segments) **and** \`/docs/a/b\`.

| URL | \`params.path\` |
|-----|-----------------|
| \`/docs\` | \`undefined\` |
| \`/docs/intro\` | \`["intro"]\` |
| \`/docs/api/auth\` | \`["api", "auth"]\` |

## Pre-Generating Pages with \`generateStaticParams\`

Tell Next which dynamic routes to prerender at build time:

\`\`\`tsx
// app/blog/[slug]/page.tsx
export async function generateStaticParams() {
  const posts = await db.post.findMany({ select: { slug: true } });
  return posts.map((p) => ({ slug: p.slug }));
}

// Optionally: error on unknown slugs (no on-demand SSG)
export const dynamicParams = false;
\`\`\`

## Generating Per-Route Metadata

\`\`\`tsx
import type { Metadata } from "next";

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: { images: [post.coverImage] },
  };
}
\`\`\`

## Typed Routes for Dynamic Segments

With \`experimental.typedRoutes: true\` and template literals:

\`\`\`tsx
<Link href={\`/blog/\${post.slug}\`} />   // ✅ inferred
<Link href={\`/blogs/\${post.slug}\`} />  // ❌ compile error
\`\`\`

## Pitfalls

1. **Forgetting \`await\` on \`params\`** — TypeScript catches this; runtime error otherwise.
2. **Catch-all conflict** — \`[id]\` and \`[...path]\` in the same folder shadow each other. Be explicit.
3. **Returning \`null\` from \`generateStaticParams\`** — return an empty array to opt out of prerender, not \`null\`.
`,
      },
      {
        title: "Route Groups & Parallel Routes",
        type: LessonType.TEXT,
        duration: 16,
        content: `# Route Groups & Parallel Routes

## Route Groups — Folders Without URLs

Wrap a folder name in parentheses: \`(name)\`. The folder organizes files but does **not** appear in the URL.

\`\`\`
app/
  (marketing)/
    layout.tsx           ← marketing-specific layout
    page.tsx             →  /
    pricing/page.tsx     →  /pricing
    blog/page.tsx        →  /blog
  (app)/
    layout.tsx           ← authed layout, separate chrome
    dashboard/page.tsx   →  /dashboard
    settings/page.tsx    →  /settings
\`\`\`

Use cases:

1. **Multiple root layouts.** Marketing pages vs. authed app — different chrome, different fonts, different metadata.
2. **Co-locate by feature.** Group \`(checkout)/cart\`, \`(checkout)/payment\`, \`(checkout)/confirm\`.
3. **Apply different middleware.** Combined with matcher rules in \`middleware.ts\`.

### Multiple Root Layouts

Place \`layout.tsx\` directly inside each group and remove the global \`app/layout.tsx\` from a top-level role:

\`\`\`tsx
// app/(marketing)/layout.tsx
import "./globals.css";
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en"><body className="font-sans">{children}</body></html>
  );
}

// app/(app)/layout.tsx
import "./globals.css";
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark"><body className="font-mono bg-gray-950 text-gray-50">{children}</body></html>
  );
}
\`\`\`

> Each root layout must render \`<html>\` and \`<body>\` — they are independent.

## Parallel Routes — Multiple Pages in One Layout

Parallel routes let one layout render **multiple slots** that navigate independently.

### Folder Convention

\`@\` prefixes a parallel slot. The layout receives it as a prop.

\`\`\`
app/dashboard/
  layout.tsx
  page.tsx
  @analytics/page.tsx
  @team/page.tsx
\`\`\`

\`\`\`tsx
// app/dashboard/layout.tsx
export default function DashboardLayout({
  children,
  analytics,
  team,
}: {
  children: React.ReactNode;
  analytics: React.ReactNode;
  team: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <section>{children}</section>
      <section>{analytics}</section>
      <section>{team}</section>
    </div>
  );
}
\`\`\`

### Why It's Powerful

- Each slot can have its own \`loading.tsx\` and \`error.tsx\`.
- The URL stays the same — \`/dashboard\` — while slots can be navigated independently.
- Combine with intercepting routes to build modals.

### Default & Conditional Slots

If a slot has no matching segment for a URL, Next renders its \`default.tsx\` (or \`null\` if absent):

\`\`\`tsx
// app/dashboard/@analytics/default.tsx
export default function Default() {
  return null;   // no analytics for this URL
}
\`\`\`

### Conditional Rendering by User Role

\`\`\`tsx
export default async function DashboardLayout({ children, admin, user }) {
  const me = await getSession();
  return (
    <>
      {children}
      {me?.role === "ADMIN" ? admin : user}
    </>
  );
}
\`\`\`

The unused slot isn't fetched — Next code-splits per slot.

## Common Mistakes

- Forgetting \`default.tsx\` → the slot 404s on direct URL visits.
- Using parallel routes when a regular nested layout would do — adds complexity for no benefit.
- Confusing route groups \`(name)\` with parallel routes \`@name\` — the first is organizational; the second renders multiple pages.
`,
      },
      {
        title: "Intercepting Routes & Modal Patterns",
        type: LessonType.TEXT,
        duration: 12,
        content: `# Intercepting Routes & Modal Patterns

Intercepting routes solve a classic problem: **clicking a thumbnail should open a modal, but visiting the URL directly should show a full page**.

## The Convention

| Prefix | Meaning |
|--------|---------|
| \`(.)\` | Match the same level |
| \`(..)\` | Match one level up |
| \`(..)(..)\` | Match two levels up |
| \`(...)\` | Match from the app root |

These are folder names, not file names.

## A Photo Gallery Example

We want \`/photo/:id\` to:

- Show a **full page** when the URL is opened or refreshed
- Show a **modal over the feed** when navigated to from \`/feed\`

\`\`\`
app/
  feed/
    page.tsx
    @modal/
      (.)photo/[id]/page.tsx    ← intercepts /photo/:id when nav happens from /feed
      default.tsx
    layout.tsx                   ← renders {children} and {modal}
  photo/[id]/page.tsx           ← the regular, full-page version
\`\`\`

### The Layout

\`\`\`tsx
// app/feed/layout.tsx
export default function FeedLayout({ children, modal }: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <>
      {children}
      {modal}     {/* renders the intercepted modal when present */}
    </>
  );
}
\`\`\`

### The Modal

\`\`\`tsx
// app/feed/@modal/(.)photo/[id]/page.tsx
import { Dialog } from "@/components/ui/dialog";
import { getPhoto } from "@/lib/photos";

export default async function PhotoModal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const photo = await getPhoto(id);
  return (
    <Dialog open>
      <img src={photo.src} alt={photo.caption} />
      <p>{photo.caption}</p>
    </Dialog>
  );
}
\`\`\`

### The Default Slot

If you navigate to \`/feed\` directly, the modal slot has nothing to render:

\`\`\`tsx
// app/feed/@modal/default.tsx
export default function Default() {
  return null;
}
\`\`\`

### The Trigger

\`\`\`tsx
import Link from "next/link";

<Link href={\`/photo/\${photo.id}\`}>      {/* navigated → modal opens */}
  <img src={photo.thumb} alt="" />
</Link>
\`\`\`

A right-click → "open in new tab" loads the full page route at \`app/photo/[id]/page.tsx\`. The URL is the same.

## Closing the Modal

Push back to the parent route:

\`\`\`tsx
"use client";
import { useRouter } from "next/navigation";

export function CloseButton() {
  const router = useRouter();
  return <button onClick={() => router.back()}>Close</button>;
}
\`\`\`

## Real-World Recipes

- **Image lightbox** on a gallery
- **Login modal** that overlays the page you were on (deep-linkable)
- **Quick view** of a product card on a shop listing
- **Comment thread** opened from a notifications feed

## When NOT to Use Intercepting Routes

- The modal has **no URL** of its own. Use a regular client component.
- You need to render the modal from **anywhere** in the app, not just a single segment. Use a portal pattern.
- You want a **drawer** that doesn't change the URL. Don't intercept — keep it local state.
`,
      },
      {
        title: "Loading, Error & Not-Found UI",
        type: LessonType.TEXT,
        duration: 12,
        content: `# Loading, Error & Not-Found UI

## loading.tsx — Streaming UI

Drop a \`loading.tsx\` in a route segment to wrap its \`page.tsx\` in a Suspense boundary automatically.

\`\`\`tsx
// app/dashboard/loading.tsx
export default function Loading() {
  return (
    <div className="space-y-3 p-8">
      <div className="h-8 w-1/3 rounded bg-gray-200 animate-pulse" />
      <div className="h-32 w-full rounded bg-gray-200 animate-pulse" />
    </div>
  );
}
\`\`\`

While the server renders \`page.tsx\`, the browser sees the skeleton **immediately**.

### Nested loading.tsx

\`\`\`
app/
  dashboard/loading.tsx           ← shown on /dashboard, /dashboard/*
  dashboard/billing/loading.tsx   ← takes over inside billing
\`\`\`

A nested loading state replaces the parent's only for its own subtree.

## error.tsx — Per-Segment Error Boundaries

\`\`\`tsx
// app/dashboard/error.tsx
"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="p-8 text-center">
      <h2 className="text-xl font-bold">Something went wrong</h2>
      <p className="text-sm text-gray-600">Error code: {error.digest}</p>
      <button onClick={reset} className="mt-4 rounded bg-black px-4 py-2 text-white">
        Try again
      </button>
    </div>
  );
}
\`\`\`

\`error.tsx\` **must** be a Client Component (it uses React's error boundary mechanism). The \`reset()\` function re-renders the segment.

### Why Per-Segment?

The error catcher resets independently. A failure in \`/dashboard/billing\` doesn't blank out the dashboard chrome — only the billing region shows the error UI.

## global-error.tsx — Catches Root Layout Crashes

\`\`\`tsx
// app/global-error.tsx
"use client";

export default function GlobalError({ error, reset }: ErrorProps) {
  return (
    <html>
      <body>
        <h2>Application crashed</h2>
        <button onClick={reset}>Retry</button>
      </body>
    </html>
  );
}
\`\`\`

This file is **mandatory** to render when even the root layout fails — that's why it includes its own \`<html><body>\`.

## not-found.tsx — Friendly 404s

Render when you call \`notFound()\` or hit an unmatched URL.

\`\`\`tsx
// app/blog/[slug]/page.tsx
import { notFound } from "next/navigation";

const post = await db.post.findUnique({ where: { slug } });
if (!post) notFound();   // unwinds, renders the nearest not-found.tsx
\`\`\`

\`\`\`tsx
// app/blog/[slug]/not-found.tsx
export default function NotFound() {
  return (
    <div className="p-8 text-center">
      <h1 className="text-3xl font-bold">Post not found</h1>
      <Link href="/blog">← Back to blog</Link>
    </div>
  );
}
\`\`\`

## Throwing Errors From Server Components

\`\`\`tsx
export default async function Page() {
  const data = await fetch("/api/something");
  if (!data.ok) throw new Error("Upstream failure");
  // … nearest error.tsx renders
}
\`\`\`

In production the error message is redacted from the client and replaced with a unique \`error.digest\`. Use the digest to look up the full trace in your server logs.

## Putting It All Together

\`\`\`
app/dashboard/
  layout.tsx
  loading.tsx        ← shows skeleton while page streams
  error.tsx          ← catches errors in the dashboard tree
  not-found.tsx      ← shown if notFound() is called inside
  page.tsx
  billing/
    loading.tsx
    error.tsx
    page.tsx
\`\`\`

This is the production-grade default. Build it once, never think about generic loading/error screens again.
`,
      },
      {
        title: "Navigating with Link, useRouter & router.refresh()",
        type: LessonType.VIDEO,
        duration: 14,
        content: "https://www.youtube.com/embed/PXMjL4hH_VQ",
      },
      {
        title: "Chapter 2 — Routing Quiz",
        type: LessonType.QUIZ,
        duration: 12,
        quiz: {
          title: "Routing & Navigation Quiz",
          passMark: 70,
          timeLimit: 12,
          questions: [
            {
              text: "What does wrapping a folder name in parentheses, e.g. `(marketing)`, do?",
              options: [
                { text: "Marks it as a server-only segment" },
                { text: "Organizes routes without affecting the URL", correct: true },
                { text: "Creates a dynamic route" },
                { text: "Prevents the folder from being routable at all" },
              ],
            },
            {
              text: "Which file renders when `notFound()` is called?",
              options: [
                { text: "404.tsx" },
                { text: "error.tsx" },
                { text: "not-found.tsx", correct: true },
                { text: "fallback.tsx" },
              ],
            },
            {
              text: "What is the URL for `app/shop/[[...path]]/page.tsx` when visiting `/shop`?",
              options: [
                { text: "404 — no segments provided" },
                { text: "Matches and renders with params.path = undefined", correct: true },
                { text: "Matches but params.path = []" },
                { text: "Redirects to /shop/index" },
              ],
            },
            {
              text: "Why must `error.tsx` start with `\"use client\"`?",
              options: [
                { text: "Server Components can't throw errors" },
                { text: "It implements a React error boundary, which requires client rendering", correct: true },
                { text: "It needs access to environment variables" },
                { text: "Next.js routes errors through the client by default" },
              ],
            },
            {
              text: "A parallel route slot is identified by which prefix?",
              options: [
                { text: "_" },
                { text: "$" },
                { text: "@", correct: true },
                { text: "%" },
              ],
            },
            {
              text: "When are `params` and `searchParams` passed to a page component in Next.js 16?",
              options: [
                { text: "As plain objects" },
                { text: "As Promises that must be awaited", correct: true },
                { text: "As React Contexts" },
                { text: "Via `useParams()` only" },
              ],
            },
          ],
        },
      },
    ],
  };
}
function chapter3(): ChapterSpec {
  return {
    title: "Chapter 3 — Server Components & Client Components",
    lessons: [
      {
        title: "Understanding the Server/Client Boundary",
        type: LessonType.TEXT,
        duration: 18,
        content: `# Understanding the Server/Client Boundary

The single biggest mental shift in Next.js (since v13, refined in v16) is that **components are server-rendered by default**. You opt into client rendering only where you need it.

## The Three Kinds of Components

| Kind | Marker | Runs On |
|------|--------|---------|
| **Server Component** | None (default) | Server only |
| **Client Component** | \`"use client"\` at the top of the file | Server (for the initial HTML) **and** client (for hydration & interactivity) |
| **Shared Component** | No client APIs, no server APIs | Either — depends on who imports it |

## Server Component — What You Can Do

- \`async\` directly: \`export default async function Page() { … }\`
- Access the database, the filesystem, secrets in env
- Fetch with the global \`fetch()\` (deduped & cacheable)
- Import heavyweight server libraries — they never reach the client bundle

What you **cannot** do:

- \`useState\`, \`useEffect\`, \`useReducer\`, \`useRef\` — no client hooks
- Browser APIs (\`window\`, \`document\`, \`localStorage\`)
- Event handlers like \`onClick={() => …}\`

## Client Component — What You Can Do

- All React hooks
- Event handlers
- Browser APIs
- State

What you **cannot** do:

- Be \`async\` (use Suspense + a data hook instead)
- Import server-only modules (Next.js will error)
- Read env vars not prefixed with \`NEXT_PUBLIC_\`

## A Picture

\`\`\`
┌─────────────────────────────────────────┐
│  Server                                  │
│  - Layout (server)                       │
│    - Page (server, async)                │
│      - Hero (server)                     │
│      - PriceWidget ("use client") ◀──┐  │
│        - <CountUp/> (lib)            │  │
│      - Sidebar (server)              │  │
│                                       │  │
└───────────────────────────────────────┼──┘
                                        │
                              ships JS for this subtree only
\`\`\`

## How the Boundary Propagates

Once you mark a component \`"use client"\`, **everything it imports becomes part of the client bundle**, transitively. So push the directive as deep as possible.

\`\`\`tsx
// ❌ Marks the whole product card client-side just for a button
"use client";
export default function ProductCard({ product }) {
  return (
    <article>
      <Image src={product.cover} alt={product.title} width={400} height={300} />
      <h3>{product.title}</h3>
      <p>{product.summary}</p>
      <button onClick={() => addToCart(product.id)}>Add to cart</button>
    </article>
  );
}
\`\`\`

\`\`\`tsx
// ✅ Only the button is interactive
// ProductCard.tsx — server
export default function ProductCard({ product }) {
  return (
    <article>
      <Image src={product.cover} alt={product.title} width={400} height={300} />
      <h3>{product.title}</h3>
      <p>{product.summary}</p>
      <AddToCartButton id={product.id} />
    </article>
  );
}

// AddToCartButton.tsx — client
"use client";
export function AddToCartButton({ id }: { id: string }) {
  return <button onClick={() => addToCart(id)}>Add to cart</button>;
}
\`\`\`

## A Useful Mental Model

> Server Components handle **rendering data**.
> Client Components handle **rendering interactions**.

Most of your tree is Server Components reading data. The interactive leaves are small Client Components: forms, modals, buttons with state, sliders, theme toggles.

## Common Errors

| Error | Fix |
|-------|-----|
| \`Cannot use useState in a Server Component\` | Add \`"use client"\` to the file. |
| \`You're importing a component that needs the browser …\` | Move the import into a Client Component. |
| \`Functions cannot be passed directly to Client Components\` | Pass plain JSON-serializable props, or wrap the function in a Server Action. |
| \`Module not found: Can't resolve 'fs'\` from a Client Component | The component is somehow being included client-side; verify the directive and import chain. |
`,
      },
      {
        title: "Choosing When to use \"use client\"",
        type: LessonType.TEXT,
        duration: 14,
        content: `# Choosing When to use \"use client\"

A simple decision tree: **start as a Server Component**. Only switch when you need something a Server Component can't do.

## Use Client When You Need…

1. **State** — \`useState\`, \`useReducer\`
2. **Effects** — \`useEffect\`, \`useLayoutEffect\`
3. **Event handlers** — \`onClick\`, \`onChange\`, \`onSubmit\`
4. **Browser APIs** — \`window\`, \`document\`, \`localStorage\`, \`navigator\`, \`IntersectionObserver\`
5. **Third-party libraries that need the DOM** — e.g. Mapbox, Three.js, Quill editor
6. **Context** — \`useContext\` (the Provider itself must be a Client Component)

## Stay Server When You Need…

1. Just rendering data (the most common case!)
2. Fetching from the database or a secret API
3. Reading the file system
4. Computing markdown/MDX
5. Anything that takes user input but submits via **Server Actions** or **forms**

## The Test

> "If I deleted JavaScript on the client entirely, would this still work?"

If yes — keep it server.
If no — make it client.

## Patterns

### Forms

\`\`\`tsx
// app/contact/page.tsx — Server Component
import { submitContact } from "./actions";

export default function ContactPage() {
  return (
    <form action={submitContact}>
      <input name="email" type="email" required />
      <textarea name="message" required />
      <button>Send</button>
    </form>
  );
}
\`\`\`

No \`"use client"\` needed — the form posts to a Server Action. Works without JavaScript.

### Theme Toggle

\`\`\`tsx
// components/ThemeToggle.tsx
"use client";
import { useState, useEffect } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  return <button onClick={() => setDark((d) => !d)}>{dark ? "☀️" : "🌙"}</button>;
}
\`\`\`

Must be client — needs state and DOM access.

### Conditional Rendering Based on Auth

\`\`\`tsx
// Server — reads cookies on the server
export default async function Header() {
  const user = await getCurrentUser();
  return (
    <header>
      <Logo />
      {user ? <UserMenu user={user} /> : <SignInButton />}
    </header>
  );
}
\`\`\`

Don't ship auth logic to the client — read the session server-side.

## Anti-Patterns

### Anti-pattern 1 — Marking The Root Client

\`\`\`tsx
// app/layout.tsx
"use client";   // ❌ Now the entire app is a client component tree
\`\`\`

Defaults to client → loses Server Component benefits everywhere. Push \`"use client"\` to the leaves.

### Anti-pattern 2 — Putting a Provider at the Root Without a Wrapper

The third-party providers (Theme, ReactQuery, Redux) are all Client Components. Wrap them in a single \`Providers\` file and use it inside the server root layout:

\`\`\`tsx
// components/Providers.tsx
"use client";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const qc = new QueryClient();
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={qc}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}

// app/layout.tsx — Server Component
import { Providers } from "@/components/Providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en"><body><Providers>{children}</Providers></body></html>
  );
}
\`\`\`
`,
      },
      {
        title: "Composing Server & Client Components",
        type: LessonType.TEXT,
        duration: 14,
        content: `# Composing Server & Client Components

## The Rules of Composition

1. **Server can render Client.**
2. **Client cannot render Server** — but it can render Server Components passed in as \`children\` or props.
3. Props passed across the boundary must be **serializable**: strings, numbers, booleans, arrays, plain objects, Dates, JSX. **Not** functions, class instances, Maps, Sets, Symbols.

## Pattern: Server Component as a Child of a Client Component

Want a client-side interactive shell (tab switcher, accordion, modal) with server-rendered content inside? Pass the content as \`children\`.

\`\`\`tsx
// components/Tabs.tsx — Client
"use client";
import { useState } from "react";

export function Tabs({ labels, children }: { labels: string[]; children: React.ReactNode[] }) {
  const [active, setActive] = useState(0);
  return (
    <div>
      <nav>{labels.map((l, i) => (
        <button key={l} onClick={() => setActive(i)} className={active === i ? "font-bold" : ""}>
          {l}
        </button>
      ))}</nav>
      <section>{children[active]}</section>
    </div>
  );
}
\`\`\`

\`\`\`tsx
// app/dashboard/page.tsx — Server
import { Tabs } from "@/components/Tabs";
import { Earnings } from "./Earnings";      // Server Component
import { Students } from "./Students";       // Server Component, async + DB

export default function Dashboard() {
  return (
    <Tabs labels={["Earnings", "Students"]}>
      <Earnings />
      <Students />
    </Tabs>
  );
}
\`\`\`

The \`Tabs\` shell is interactive. The slot contents are still rendered on the server with full access to the DB. The bundle ships only \`Tabs\` to the client — not \`Earnings\` or \`Students\`.

## Pattern: Server-Fetched Data as a Prop

\`\`\`tsx
// app/profile/page.tsx — Server
import { ProfileForm } from "./ProfileForm";

export default async function Profile() {
  const user = await getCurrentUser();
  return <ProfileForm initialValues={{ name: user.name, email: user.email }} />;
}

// ./ProfileForm.tsx — Client
"use client";
import { useState } from "react";

export function ProfileForm({ initialValues }: { initialValues: { name: string; email: string } }) {
  const [v, setV] = useState(initialValues);
  // …
}
\`\`\`

## What Cannot Cross The Boundary

\`\`\`tsx
// ❌ Will fail
<MyClient onSave={async (data) => db.user.update(data)} />
\`\`\`

Pass a **Server Action** instead — it serializes to a reference, not a function body.

\`\`\`tsx
// ✅
import { saveUser } from "./actions";
<MyClient onSave={saveUser} />
\`\`\`

## \`server-only\` and \`client-only\` Packages

To prevent accidental bundle leaks, use these tiny marker packages:

\`\`\`bash
npm i server-only client-only
\`\`\`

\`\`\`ts
// lib/db.ts
import "server-only";
import { PrismaClient } from "@prisma/client";
export const db = new PrismaClient();
\`\`\`

If anything imports \`lib/db.ts\` from a client component, the build will fail with a clear error.

\`\`\`ts
// lib/analytics.ts
import "client-only";
import posthog from "posthog-js";
posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!);
\`\`\`

## Practical Architecture

A real Next.js app typically splits like this:

| Layer | Components | Roughly % of LOC |
|-------|-----------|--------------------|
| Pages & layouts | Server | 30% |
| Domain components (Cards, Lists, Details) | Server | 40% |
| Interactive shells (Tabs, Modals, Forms) | Client | 20% |
| Primitives (Button, Input, Dialog) | Mostly Client | 10% |

Server Components dominate the line count. Client Components stay narrow.
`,
      },
      {
        title: "server-only, client-only & Code Splitting",
        type: LessonType.TEXT,
        duration: 12,
        content: `# server-only, client-only & Code Splitting

## The Problem

You write a helper:

\`\`\`ts
// lib/payments.ts
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function createCheckout(items: Item[]) {
  return stripe.checkout.sessions.create({ /* … */ });
}
\`\`\`

A teammate imports it into a Client Component. Now the **Stripe secret key** is referenced (and potentially logged) in client code, and the entire \`stripe\` Node SDK gets pulled into the browser bundle.

## The Fix: server-only

Add an import that **fails at build time** if the file is ever included in a client bundle:

\`\`\`ts
import "server-only";   // ← this line is enough
import Stripe from "stripe";
\`\`\`

The build fails with:

\`\`\`
Error: This module is marked with "server-only" and cannot be imported from a Client Component.
\`\`\`

Equivalent on the other side:

\`\`\`ts
import "client-only";
import confetti from "canvas-confetti";
\`\`\`

Use these on every sensitive boundary.

## Dynamic Imports for Heavy Client Libraries

A \`Chart\` component that pulls in 200 KB of charting code should be loaded only when needed:

\`\`\`tsx
"use client";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("./Chart"), {
  ssr: false,                       // skip SSR (e.g., for canvas/three.js)
  loading: () => <ChartSkeleton />,
});
\`\`\`

> \`ssr: false\` cannot be used in a Server Component. It's a client-side dynamic import.

## React.lazy + Suspense (Server Components)

\`\`\`tsx
import { lazy, Suspense } from "react";
const Mdx = lazy(() => import("./Mdx"));

export default function Doc() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <Mdx />
    </Suspense>
  );
}
\`\`\`

## Per-Route Code Splitting (Automatic)

Each route segment is automatically code-split — you don't need to think about it. Importing \`HeavyComponent\` only in \`app/admin/page.tsx\` keeps it out of \`/dashboard\`'s bundle.

## Auditing What's in the Client Bundle

\`\`\`bash
npx @next/bundle-analyzer
\`\`\`

Or use the built-in analyzer:

\`\`\`ts
// next.config.ts
import withBundleAnalyzer from "@next/bundle-analyzer";

const enable = process.env.ANALYZE === "true";

export default withBundleAnalyzer({ enabled: enable })({
  // …your config
});
\`\`\`

\`\`\`bash
ANALYZE=true npm run build
\`\`\`

## A Rule of Thumb for Client JS

Aim for **< 100 KB** of JavaScript on a typical page (gzip). Above 150 KB, hydration starts to noticeably delay interactivity on mid-range mobile.

The biggest wins come from:

1. Pushing more rendering to the server
2. Lazy-loading heavy client libraries
3. Avoiding moment.js, lodash, axios in favor of native APIs and date-fns
`,
      },
      {
        title: "Streaming UI with Suspense",
        type: LessonType.VIDEO,
        duration: 18,
        content: "https://www.youtube.com/embed/8q2q_t1lJqM",
      },
      {
        title: "Chapter 3 — Quiz",
        type: LessonType.QUIZ,
        duration: 10,
        quiz: {
          title: "Server & Client Components Quiz",
          passMark: 70,
          timeLimit: 10,
          questions: [
            {
              text: "Which directive opts a file into client rendering?",
              options: [
                { text: '"use client"', correct: true },
                { text: '"use browser"' },
                { text: '"client"' },
                { text: '"render client"' },
              ],
            },
            {
              text: "Which is allowed inside a Server Component?",
              options: [
                { text: "`useState` for local UI state" },
                { text: "`onClick` event handlers" },
                { text: "`async`/`await` at the component level", correct: true },
                { text: "Reading `localStorage`" },
              ],
            },
            {
              text: "Can a Client Component render a Server Component?",
              options: [
                { text: "No, never" },
                { text: "Yes, but only if it's passed as `children` or a prop from a Server Component", correct: true },
                { text: "Yes, by importing it directly" },
                { text: "Yes, but only inside a `useEffect`" },
              ],
            },
            {
              text: "Which package prevents a module from being included in the client bundle?",
              options: [
                { text: "server-side" },
                { text: "no-client" },
                { text: "server-only", correct: true },
                { text: "node-only" },
              ],
            },
            {
              text: "Why should you push `\"use client\"` to the leaves of your tree?",
              options: [
                { text: "It's a syntax requirement" },
                { text: "Everything imported by a Client Component becomes part of the client bundle", correct: true },
                { text: "Otherwise React 19 won't hydrate the tree" },
                { text: "Server Components can't render Client Components otherwise" },
              ],
            },
          ],
        },
      },
    ],
  };
}
function chapter4(): ChapterSpec {
  return {
    title: "Chapter 4 — Data Fetching & The Next.js 16 Cache Model",
    lessons: [
      {
        title: "Fetching Data in Server Components",
        type: LessonType.TEXT,
        duration: 14,
        content: `# Fetching Data in Server Components

In Next.js 16 the simplest, fastest, most-cacheable way to load data is to call \`fetch\` (or your DB client) directly inside a \`async\` Server Component.

## The Basic Pattern

\`\`\`tsx
// app/courses/page.tsx
export default async function CoursesPage() {
  const res = await fetch("https://api.coachnest.dev/courses");
  const courses: Course[] = await res.json();

  return (
    <ul>
      {courses.map((c) => (
        <li key={c.id}>{c.title}</li>
      ))}
    </ul>
  );
}
\`\`\`

No \`useEffect\`. No loading flicker on the client. The HTML arrives populated.

## With a Database Client

\`\`\`tsx
import { db } from "@/lib/db";

export default async function CoursesPage() {
  const courses = await db.course.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, title: true, slug: true },
    orderBy: { createdAt: "desc" },
  });

  return courses.map((c) => <CourseCard key={c.id} course={c} />);
}
\`\`\`

## Parallel Fetches

Avoid waterfalls — request things in parallel.

\`\`\`tsx
// ❌ Serial — 2 round trips back-to-back
const user   = await getUser(id);
const orders = await getOrders(id);

// ✅ Parallel — both fire at the same time
const [user, orders] = await Promise.all([getUser(id), getOrders(id)]);
\`\`\`

## Nested Data: Lift the Fetch

Suspense + multiple Server Components let you stream independent regions:

\`\`\`tsx
export default function Dashboard() {
  return (
    <>
      <Suspense fallback={<EarningsSkeleton />}>
        <Earnings />     {/* its own async server component, own DB call */}
      </Suspense>
      <Suspense fallback={<StudentsSkeleton />}>
        <Students />
      </Suspense>
    </>
  );
}
\`\`\`

The browser sees one or the other render as data arrives — TTFB is dictated by the fastest fetch, not the slowest.

## Deduplication

Multiple components in the same render that call \`fetch()\` with the same URL & options share a single network request:

\`\`\`tsx
async function getMe() {
  const res = await fetch("/api/me");
  return res.json();
}

// Both call getMe() in the same render — only ONE network request fires.
\`\`\`

For non-fetch deduplication, wrap helpers with React's \`cache()\`:

\`\`\`ts
import { cache } from "react";

export const getUser = cache(async (id: string) => {
  return db.user.findUnique({ where: { id } });
});
\`\`\`

## Forwarding Cookies & Headers

\`\`\`ts
import { cookies, headers } from "next/headers";

const session = (await cookies()).get("session")?.value;
const ua = (await headers()).get("user-agent");
\`\`\`

In Next.js 16 \`cookies()\` and \`headers()\` are **asynchronous** — always \`await\` them.

## Calling External APIs With Auth

\`\`\`ts
const res = await fetch("https://api.example.com/v1/users", {
  headers: { Authorization: \`Bearer \${process.env.API_TOKEN}\` },
});
\`\`\`

The token never reaches the client. The fetch happens server-side, full stop.

## Error Handling

\`\`\`tsx
const res = await fetch("/api/something");

if (!res.ok) {
  if (res.status === 404) notFound();
  throw new Error(\`API failed: \${res.status}\`);
}

const data = await res.json();
\`\`\`

\`notFound()\` and \`redirect()\` are special — they don't throw user-visible errors, they unwind to the routing layer.
`,
      },
      {
        title: "The Next.js 16 Cache Model",
        type: LessonType.TEXT,
        duration: 16,
        content: `# The Next.js 16 Cache Model

Next.js 16 introduces an **opt-in** caching model. By default nothing is cached — you cache deliberately, with \`"use cache"\` + \`cacheTag\` + \`cacheLife\`.

## The Old Model (Pre-15) vs the New Model

| | Old | New (16) |
|---|---|---|
| Default | \`fetch\` was cached forever | \`fetch\` is uncached |
| Opt-in cache | \`fetch(url, { next: { revalidate } })\` | \`"use cache"\` directive |
| Invalidation | \`revalidatePath\` / \`revalidateTag\` | \`revalidateTag(tag)\` (still works) |
| Purpose | Full route caching | Cache **any function or component** |

Why the change? The old model conflated "is this request cached?" with "is this route static?" — leading to surprising production behavior. The new one is explicit.

## "use cache" — The Core Primitive

Add the directive at the top of a function or file:

\`\`\`ts
// lib/data/courses.ts
"use cache";
import { db } from "@/lib/db";

export async function getPublishedCourses() {
  return db.course.findMany({ where: { status: "PUBLISHED" } });
}
\`\`\`

Calling \`getPublishedCourses()\` from anywhere — a Server Component, an API route, a Server Action — returns the cached value when the cache is warm and fresh.

## cacheTag — Tag It For Invalidation

\`\`\`ts
"use cache";
import { cacheTag } from "next/cache";

export async function getCourse(slug: string) {
  cacheTag("course", \`course:\${slug}\`);
  return db.course.findUnique({ where: { slug } });
}
\`\`\`

Now you can revalidate every cached entry for that course with one call:

\`\`\`ts
import { revalidateTag } from "next/cache";
revalidateTag(\`course:\${slug}\`);
\`\`\`

Or wipe all cached courses:

\`\`\`ts
revalidateTag("course");
\`\`\`

## cacheLife — How Long Things Stay Fresh

\`\`\`ts
"use cache";
import { cacheLife } from "next/cache";

export async function getHomeFeed() {
  cacheLife("minutes");      // alias for { stale: 60s, revalidate: 5min, expire: 30min }
  return /* … */;
}
\`\`\`

Named profiles:

| Profile | Stale | Revalidate | Expire |
|---------|-------|-----------:|-------:|
| \`"seconds"\` | 0 | 1s | 60s |
| \`"minutes"\` | 60s | 5m | 30m |
| \`"hours"\` | 5m | 1h | 1d |
| \`"days"\` | 5m | 12h | 7d |
| \`"weeks"\` | 1h | 1d | 30d |
| \`"max"\` | 5m | 1y | 1y |

Custom values:

\`\`\`ts
cacheLife({ stale: 30, revalidate: 300, expire: 3600 });
\`\`\`

## Stale-While-Revalidate Semantics

The terminology matters:

- **stale** — within this window, serve from cache and **don't** re-fetch
- **revalidate** — after this window, serve from cache **and** trigger a background re-fetch
- **expire** — after this window, the entry is gone; the next request blocks for a fresh fetch

This is the same model CDNs use for \`Cache-Control: stale-while-revalidate\`.

## Caching a Whole Page

\`\`\`tsx
// app/(marketing)/page.tsx
"use cache";
import { cacheLife } from "next/cache";

export default async function Home() {
  cacheLife("hours");
  const posts = await db.blog.findMany({ take: 6 });
  return <Hero posts={posts} />;
}
\`\`\`

## Caching a Single Component

\`\`\`tsx
// components/Reviews.tsx
"use cache";
import { cacheTag, cacheLife } from "next/cache";

export async function Reviews({ courseId }: { courseId: string }) {
  cacheTag(\`reviews:\${courseId}\`);
  cacheLife("hours");
  const reviews = await db.review.findMany({ where: { courseId } });
  return /* … */;
}
\`\`\`

The page can be uncached while only the \`Reviews\` block is cached — a form of partial caching that the old model never made easy.
`,
      },
      {
        title: "Revalidation: revalidateTag, revalidatePath & On-Demand",
        type: LessonType.TEXT,
        duration: 12,
        content: `# Revalidation: revalidateTag, revalidatePath & On-Demand

Caching without invalidation is just stale data. Next.js gives you precise, fast revalidation primitives.

## revalidateTag

Invalidate every cached entry that was tagged with a matching string.

\`\`\`ts
// app/actions/publish.ts
"use server";
import { revalidateTag } from "next/cache";

export async function publishCourse(courseId: string) {
  await db.course.update({ where: { id: courseId }, data: { status: "PUBLISHED" } });
  revalidateTag("course");                     // wipe everything tagged "course"
  revalidateTag(\`course:\${courseId}\`);          // and this specific course
}
\`\`\`

## revalidatePath

Invalidate the cache for a specific URL path. Useful when you don't have tags.

\`\`\`ts
import { revalidatePath } from "next/cache";

export async function addReview(courseSlug: string, rating: number, comment: string) {
  await db.review.create({ /* … */ });
  revalidatePath(\`/courses/\${courseSlug}\`);    // single page
  revalidatePath("/courses", "page");           // /courses listing
  revalidatePath("/(marketing)", "layout");     // whole layout subtree
}
\`\`\`

The second argument disambiguates whether you're invalidating a \`page\` or a \`layout\`.

## Webhooks → On-Demand Revalidation

A common pattern: your CMS publishes content → it hits a Next.js route handler → that handler calls \`revalidateTag\`.

\`\`\`ts
// app/api/revalidate/route.ts
import { revalidateTag } from "next/cache";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.REVALIDATE_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { tag } = await req.json();
  revalidateTag(tag);
  return Response.json({ revalidated: true, tag });
}
\`\`\`

Your CMS posts to \`/api/revalidate?secret=…\` with a body like \`{ "tag": "course:nextjs-16" }\`.

## Time-Based Revalidation (Legacy fetch options still work)

\`\`\`ts
const res = await fetch("https://api.example.com/v1/posts", {
  next: { revalidate: 600 },          // re-fetch at most every 10 minutes
});
\`\`\`

Or for a route segment:

\`\`\`ts
// app/blog/page.tsx
export const revalidate = 600;
\`\`\`

These still work, but \`"use cache"\` + \`cacheLife\` is the preferred path for new code.

## Forcing Dynamic Rendering

If a page must run on **every** request:

\`\`\`ts
// app/dashboard/page.tsx
export const dynamic = "force-dynamic";
\`\`\`

Reading cookies/headers or calling \`searchParams\` typically does this automatically.

## Forcing Static Rendering

For pure static output:

\`\`\`ts
export const dynamic = "force-static";
\`\`\`

Useful for marketing pages where you want to assert "this must not depend on the request".

## Patterns I Use Daily

1. **Listings tagged by entity** — \`cacheTag("course")\` on the list, \`cacheTag("course", \`course:\${id}\`)\` on each detail page. One \`revalidateTag("course")\` updates both.
2. **User-scoped caches** — don't cache; user data is highly variable. Use \`dynamic = "force-dynamic"\`.
3. **Hot pages with low write rate** — \`cacheLife("hours")\` + \`revalidateTag\` on the mutation path.
4. **Cold pages** — long cacheLife (\`"days"\`) + tag invalidation on edits.
`,
      },
      {
        title: "Cache Components — Building Reusable Cached Functions",
        type: LessonType.TEXT,
        duration: 14,
        content: `# Cache Components — Building Reusable Cached Functions

The pattern: **wrap each domain operation in a cached function**. Pages and components call those functions; the cache layer is invisible.

## A Domain Module

\`\`\`ts
// lib/data/courses.ts
"use cache";
import { cacheTag, cacheLife } from "next/cache";
import { db } from "@/lib/db";
import "server-only";

export async function getCourse(slug: string) {
  cacheTag("course", \`course:\${slug}\`);
  cacheLife("hours");
  return db.course.findUnique({
    where: { slug },
    include: { sections: { include: { lessons: true } } },
  });
}

export async function getFeaturedCourses() {
  cacheTag("course");
  cacheLife("hours");
  return db.course.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    take: 6,
  });
}

export async function getReviews(courseId: string) {
  cacheTag(\`reviews:\${courseId}\`);
  cacheLife("minutes");
  return db.review.findMany({
    where: { courseId },
    include: { user: { select: { name: true, avatar: true } } },
    orderBy: { createdAt: "desc" },
  });
}
\`\`\`

## A Mutation Module

\`\`\`ts
// lib/data/mutations.ts
"use server";
import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";

export async function publishCourse(id: string) {
  const course = await db.course.update({ where: { id }, data: { status: "PUBLISHED" } });
  revalidateTag("course");
  revalidateTag(\`course:\${course.slug}\`);
  return course;
}

export async function postReview(courseId: string, input: { rating: number; comment: string }) {
  const review = await db.review.create({ data: { courseId, ...input } });
  revalidateTag(\`reviews:\${courseId}\`);
  return review;
}
\`\`\`

## Usage

\`\`\`tsx
// app/courses/[slug]/page.tsx
import { getCourse, getReviews } from "@/lib/data/courses";

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [course, reviews] = await Promise.all([
    getCourse(slug),
    getReviews(slug),
  ]);

  if (!course) notFound();
  return <CourseLayout course={course} reviews={reviews} />;
}
\`\`\`

The page is plain code — no cache wiring visible. All caching lives in the data layer.

## Composition

A cached function can call another cached function. Tags merge:

\`\`\`ts
"use cache";
export async function getCourseWithStats(slug: string) {
  cacheTag(\`course:\${slug}\`);
  cacheLife("hours");

  const course = await getCourse(slug);                  // also cached
  const reviews = await getReviews(course!.id);          // also cached
  const stats = computeStats(reviews);
  return { ...course, stats };
}
\`\`\`

Invalidating \`course:\${slug}\` wipes both this composed function and its sub-calls.

## When NOT to Cache

| Case | Reason |
|------|--------|
| Authenticated user data | Different per user; cache pollution risk |
| Real-time data (prices, scores) | Expected to be fresh |
| Personalized recommendations | Same as above |
| Cart contents | Per-session, ephemeral |
| Anything with PII in args | Tag explosion + privacy concerns |

For these, just call the DB directly — no \`"use cache"\`.

## Designing Tag Hierarchies

A small, deliberate tag scheme makes invalidation trivial:

\`\`\`
course                  ← the whole "courses" namespace
course:<slug>           ← one specific course
reviews:<courseId>      ← reviews for one course
user:<id>:enrollments   ← a user's enrollment list
\`\`\`

When in doubt, **tag more, not less** — but avoid PII (emails, IPs) in tag names; they're stored verbatim.
`,
      },
      {
        title: "Search Params, Cookies & Dynamic APIs",
        type: LessonType.TEXT,
        duration: 12,
        content: `# Search Params, Cookies & Dynamic APIs

Any time you read a request-specific value (cookies, headers, search params), the route turns **dynamic** — it cannot be prerendered. Knowing this avoids surprise build failures.

## searchParams (Promise in 16)

\`\`\`tsx
// app/search/page.tsx
type SP = Promise<{ q?: string; page?: string }>;

export default async function Search({ searchParams }: { searchParams: SP }) {
  const { q = "", page = "1" } = await searchParams;
  const results = await searchCourses(q, Number(page));
  return <SearchResults results={results} query={q} />;
}
\`\`\`

Reading \`searchParams\` makes the page dynamic — that's correct here.

## cookies() — Read & Write

\`\`\`ts
import { cookies } from "next/headers";

// Read
const session = (await cookies()).get("session")?.value;

// Write (only inside Server Actions or Route Handlers)
(await cookies()).set({
  name: "session",
  value: token,
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
});

// Delete
(await cookies()).delete("session");
\`\`\`

## headers()

\`\`\`ts
import { headers } from "next/headers";

const h = await headers();
const ua = h.get("user-agent");
const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim();
\`\`\`

\`headers()\` is read-only. To set response headers, return them from a Route Handler.

## draftMode()

For previewing unpublished CMS content:

\`\`\`ts
import { draftMode } from "next/headers";

const { isEnabled } = await draftMode();
\`\`\`

Toggle from a route handler:

\`\`\`ts
// app/api/draft/route.ts
import { draftMode } from "next/headers";

export async function GET() {
  (await draftMode()).enable();
  return Response.redirect(new URL("/", request.url));
}
\`\`\`

## When a Page Becomes Dynamic

Any of these calls flip the page to dynamic rendering:

- \`cookies()\`
- \`headers()\`
- \`draftMode()\`
- \`searchParams\` access
- \`fetch\` with \`cache: "no-store"\`
- A route handler with a non-GET method

If you want a page to **stay static**, push these calls into a Client Component, an Action, or a separate dynamic route segment.

## A Pattern: Static Shell, Dynamic Island

Combine a static page with a small dynamic Server Component using Suspense:

\`\`\`tsx
// app/page.tsx — static
import { Suspense } from "react";

export default function Home() {
  return (
    <>
      <Hero />
      <Suspense fallback={<UserBadgeSkeleton />}>
        <UserBadge />     {/* dynamic — reads cookies */}
      </Suspense>
      <Footer />
    </>
  );
}

// components/UserBadge.tsx — dynamic
import { cookies } from "next/headers";

export async function UserBadge() {
  const session = (await cookies()).get("session")?.value;
  if (!session) return <SignInPrompt />;
  const user = await getUserBySession(session);
  return <span>Hi, {user.name}</span>;
}
\`\`\`

Enable PPR on the route, and the shell prerenders while the badge streams in per-request — best of both worlds.
`,
      },
      {
        title: "Database Reads with Prisma & Drizzle",
        type: LessonType.VIDEO,
        duration: 16,
        content: "https://www.youtube.com/embed/qS9hPwvOGCQ",
      },
      {
        title: "Chapter 4 — Quiz",
        type: LessonType.QUIZ,
        duration: 12,
        quiz: {
          title: "Data Fetching & Caching Quiz",
          passMark: 70,
          timeLimit: 12,
          questions: [
            {
              text: "What's the default caching behavior of `fetch()` in Next.js 16?",
              options: [
                { text: "Cached forever" },
                { text: "Cached for 1 hour" },
                { text: "Not cached unless you opt in", correct: true },
                { text: "Cached when offline only" },
              ],
            },
            {
              text: "Which directive marks a function or component as cacheable?",
              options: [
                { text: '"use server"' },
                { text: '"use static"' },
                { text: '"use cache"', correct: true },
                { text: '"use memoize"' },
              ],
            },
            {
              text: "Which call invalidates every cache entry tagged with `course`?",
              options: [
                { text: 'revalidatePath("/courses")' },
                { text: 'revalidateTag("course")', correct: true },
                { text: 'cacheInvalidate("course")' },
                { text: 'expireCache("course")' },
              ],
            },
            {
              text: "Why are `Promise.all([getA(), getB()])` calls preferred over sequential awaits?",
              options: [
                { text: "They're easier to type" },
                { text: "They run the fetches in parallel, reducing total latency", correct: true },
                { text: "Sequential awaits cause memory leaks" },
                { text: "It's required by Server Components" },
              ],
            },
            {
              text: "What's the cacheLife profile that means 'revalidate hourly, expire daily'?",
              options: [
                { text: '"minutes"' },
                { text: '"hours"', correct: true },
                { text: '"days"' },
                { text: '"max"' },
              ],
            },
            {
              text: "Which API call automatically forces a page to render dynamically?",
              options: [
                { text: '`Math.random()` in JSX' },
                { text: '`cookies()` from `next/headers`', correct: true },
                { text: '`useState`' },
                { text: '`fetch` with `cache: "force-cache"`' },
              ],
            },
          ],
        },
      },
    ],
  };
}
function chapter5(): ChapterSpec {
  return {
    title: "Chapter 5 — Server Actions & Forms",
    lessons: [
      {
        title: "Server Actions From First Principles",
        type: LessonType.TEXT,
        duration: 16,
        content: `# Server Actions From First Principles

Server Actions are functions that **run on the server** but can be called from a Client Component or directly from a \`<form action={…}>\`. They replace 90% of the boilerplate of API routes for write operations.

## Anatomy of a Server Action

\`\`\`ts
"use server";   // marks every export in this file as a Server Action

import { db } from "@/lib/db";

export async function createCourse(formData: FormData) {
  const title = formData.get("title")?.toString() ?? "";
  if (!title) throw new Error("Title is required");
  return db.course.create({ data: { title, slug: slugify(title) } });
}
\`\`\`

## Calling From a Form (No JS Required!)

\`\`\`tsx
import { createCourse } from "./actions";

export default function NewCourse() {
  return (
    <form action={createCourse}>
      <input name="title" required />
      <button>Create</button>
    </form>
  );
}
\`\`\`

This is a **Server Component** with a server-side form action. It works without JavaScript — progressive enhancement by default.

## Calling From a Client Component

\`\`\`tsx
"use client";
import { createCourse } from "./actions";

export function NewCourseButton() {
  return (
    <button onClick={async () => {
      const fd = new FormData();
      fd.append("title", "Untitled course");
      await createCourse(fd);
    }}>+ New course</button>
  );
}
\`\`\`

Or with typed input (no \`FormData\`):

\`\`\`ts
// actions.ts
"use server";

export async function createCourseTyped(input: { title: string }) {
  return db.course.create({ data: { title: input.title } });
}
\`\`\`

\`\`\`tsx
// Client
const course = await createCourseTyped({ title: "New course" });
\`\`\`

## Where Actions Can Live

| Location | Note |
|----------|------|
| In a \`actions.ts\` file with \`"use server";\` at the top | Every export is an action |
| Inline inside a Server Component body | Mark the function itself with \`"use server"\` |

\`\`\`tsx
export default function Page() {
  async function save(formData: FormData) {
    "use server";
    // …
  }
  return <form action={save}>{/* … */}</form>;
}
\`\`\`

Use file-level actions for anything reusable. Use inline actions for one-off forms close to where they're used.

## Returning Data

\`\`\`ts
"use server";

export async function rename(id: string, name: string) {
  const course = await db.course.update({ where: { id }, data: { name } });
  return { ok: true, course };
}
\`\`\`

The return value is a normal value to the caller — typed end-to-end.

## Errors

\`\`\`ts
"use server";

export async function deleteCourse(id: string) {
  try {
    await db.course.delete({ where: { id } });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: "Cannot delete a published course" };
  }
}
\`\`\`

Prefer **typed error return values** over throwing. Form handlers cope with them gracefully via \`useActionState\`.

## Behind the Scenes

Server Actions are POSTed as a multipart form (when called from a form) or as an RPC-style request (when called directly). Next.js generates a stable, signed action ID — there is no public API route you accidentally expose. The function body never reaches the browser.

## What You Can't Do

- Pass non-serializable arguments (React elements, class instances, Maps)
- Call them from outside the request lifecycle (cron — use a Route Handler)
- Stream large responses (Actions return atomically; for streaming use a Route Handler with a stream response)
`,
      },
      {
        title: "Forms with useActionState & Progressive Enhancement",
        type: LessonType.TEXT,
        duration: 14,
        content: `# Forms with useActionState & Progressive Enhancement

\`useActionState\` (formerly \`useFormState\`) is the canonical way to wire a form to a Server Action and get back state — validation errors, success messages, the new entity.

## Shape of the Action

\`\`\`ts
// app/contact/actions.ts
"use server";
import { z } from "zod";

type State = { ok: boolean; error?: string; data?: { id: string } };

const schema = z.object({
  email: z.string().email(),
  message: z.string().min(10).max(2000),
});

export async function submitContact(prev: State, formData: FormData): Promise<State> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const msg = await db.contactMessage.create({ data: parsed.data });
  return { ok: true, data: { id: msg.id } };
}
\`\`\`

Note the signature: **(previousState, formData) → newState**.

## The Client Component

\`\`\`tsx
// app/contact/ContactForm.tsx
"use client";
import { useActionState } from "react";
import { submitContact } from "./actions";

const initial = { ok: false } as const;

export function ContactForm() {
  const [state, action, pending] = useActionState(submitContact, initial);

  if (state.ok) {
    return <p className="text-green-600">Thanks — message #{state.data!.id} received.</p>;
  }

  return (
    <form action={action} className="space-y-3">
      <input name="email" type="email" required placeholder="you@example.com" />
      <textarea name="message" required minLength={10} placeholder="What's up?" />
      {state.error && <p className="text-red-600 text-sm">{state.error}</p>}
      <button disabled={pending} className="rounded bg-black px-4 py-2 text-white">
        {pending ? "Sending…" : "Send"}
      </button>
    </form>
  );
}
\`\`\`

The third value, \`pending\`, is React's built-in pending boolean — no manual state needed.

## Progressive Enhancement

Even with JavaScript disabled, this form still submits. The browser POSTs to Next's action endpoint, the server runs the action, the page re-renders with the new state in the URL.

Test it:

1. Disable JS in DevTools → Settings → Debugger
2. Submit the form
3. The success state still appears

That's a real, working website with zero client JS for the form.

## useFormStatus — Pending States for Nested Buttons

A parent form's pending state can be read by any nested Client Component:

\`\`\`tsx
"use client";
import { useFormStatus } from "react-dom";

export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <button disabled={pending}>{pending ? "Saving…" : children}</button>;
}
\`\`\`

Drop \`<SubmitButton>Save</SubmitButton>\` into any form — it knows when its enclosing form is submitting.

## Multi-Field Errors

Return a structured error map:

\`\`\`ts
type State =
  | { ok: true; data: { id: string } }
  | { ok: false; errors: Record<string, string> };

if (!parsed.success) {
  const errors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    errors[issue.path[0] as string] = issue.message;
  }
  return { ok: false, errors };
}
\`\`\`

\`\`\`tsx
{!state.ok && state.errors.email && (
  <p className="text-red-600 text-sm">{state.errors.email}</p>
)}
\`\`\`
`,
      },
      {
        title: "Optimistic UI with useOptimistic",
        type: LessonType.TEXT,
        duration: 12,
        content: `# Optimistic UI with useOptimistic

For lists where the user adds, removes, or edits items, you don't want to wait for the server round-trip before showing the change. \`useOptimistic\` lets you render the predicted next state instantly.

## Anatomy

\`\`\`tsx
"use client";
import { useOptimistic } from "react";
import { addTodo } from "./actions";

type Todo = { id: string; text: string; pending?: boolean };

export function TodoList({ initial }: { initial: Todo[] }) {
  const [optimistic, addOptimistic] = useOptimistic(
    initial,
    (state, next: Todo) => [...state, { ...next, pending: true }],
  );

  async function action(formData: FormData) {
    const text = formData.get("text")?.toString() ?? "";
    addOptimistic({ id: crypto.randomUUID(), text });   // instant!
    await addTodo(text);                                 // confirms or rolls back
  }

  return (
    <>
      <form action={action}>
        <input name="text" required />
        <button>Add</button>
      </form>
      <ul>
        {optimistic.map((t) => (
          <li key={t.id} className={t.pending ? "opacity-50" : ""}>{t.text}</li>
        ))}
      </ul>
    </>
  );
}
\`\`\`

## How It Works

1. The user submits → \`addOptimistic(newTodo)\` is called → \`optimistic\` is the predicted state.
2. React renders the list with the new item immediately.
3. The server action fires. When the action returns + the Server Component re-renders with fresh data, React **reconciles** the optimistic state with the real state.

If the action fails, the optimistic state is discarded automatically.

## Patterns

### Optimistic Delete

\`\`\`tsx
const [optimistic, removeOptimistic] = useOptimistic(
  items,
  (state, idToRemove: string) => state.filter((x) => x.id !== idToRemove),
);

async function onDelete(id: string) {
  removeOptimistic(id);
  await deleteItem(id);
}
\`\`\`

### Optimistic Update

\`\`\`tsx
const [optimistic, updateOptimistic] = useOptimistic(
  items,
  (state, patch: { id: string; fields: Partial<Item> }) =>
    state.map((x) => (x.id === patch.id ? { ...x, ...patch.fields } : x)),
);

async function rename(id: string, name: string) {
  updateOptimistic({ id, fields: { name } });
  await renameItem(id, name);
}
\`\`\`

## When to Skip Optimistic UI

- The action is **slow but rare** (e.g. a yearly subscription purchase) — users expect a moment of waiting.
- The action has **side effects you can't model client-side** (charge a card, send an email).
- The user is supposed to **see** that work is happening (e.g., uploading a large file with a progress bar).

For everything else — likes, todos, comments, list reorderings — optimistic UI is a UX upgrade with very little code.
`,
      },
      {
        title: "Validation with Zod + Server Actions",
        type: LessonType.TEXT,
        duration: 12,
        content: `# Validation with Zod + Server Actions

Don't trust the form. Don't trust the client. **Validate on the server, every time.**

## Why Server-Side Validation Is Non-Negotiable

A motivated user can:

- Submit your form with curl
- Modify the form's HTML in DevTools
- Edit the JavaScript that calls your action

If the only validation is client-side, your server data is **as good as untrusted**.

## A Reusable Validator

\`\`\`ts
// lib/validators/course.ts
import { z } from "zod";

export const courseInputSchema = z.object({
  title: z.string().min(3).max(200),
  slug: z.string().min(3).max(80).regex(/^[a-z0-9-]+$/),
  level: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
  price: z.coerce.number().int().min(0).max(99_999),
  isFree: z.coerce.boolean().default(false),
});

export type CourseInput = z.infer<typeof courseInputSchema>;
\`\`\`

\`z.coerce.number()\` and \`z.coerce.boolean()\` are gold for FormData, where every value is a string.

## Using It In an Action

\`\`\`ts
"use server";
import { courseInputSchema } from "@/lib/validators/course";

type State = { ok: boolean; errors?: Record<string, string> };

export async function createCourse(prev: State, formData: FormData): Promise<State> {
  const parsed = courseInputSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      ok: false,
      errors: Object.fromEntries(
        parsed.error.issues.map((i) => [i.path[0] as string, i.message]),
      ),
    };
  }

  const course = await db.course.create({ data: parsed.data });
  return { ok: true };
}
\`\`\`

## Sharing the Schema with the Client

Re-use the same Zod schema in the client component to give instant feedback while typing — without duplicating rules:

\`\`\`tsx
"use client";
import { courseInputSchema } from "@/lib/validators/course";
import { useState } from "react";

export function CourseForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});

  function onBlur(e: React.FocusEvent<HTMLInputElement>) {
    const field = e.target.name;
    const value = e.target.value;
    const result = courseInputSchema.shape[field as keyof CourseInput].safeParse(value);
    setErrors((s) => ({ ...s, [field]: result.success ? "" : result.error.issues[0].message }));
  }
  // …
}
\`\`\`

## Defense In Depth

| Layer | Catches | Implemented with |
|-------|---------|------------------|
| HTML attributes (required, minlength) | Typos | The browser |
| Client-side Zod | UX feedback | Same schema |
| Server-side Zod | Malicious / scripted requests | Same schema |
| DB constraints (UNIQUE, CHECK) | Race conditions | SQL |

Use **all four**. The schema is the contract; the DB is the law.

## Returning Field-Specific Errors

A robust action returns errors keyed by field name. The form then renders them adjacent to the right input:

\`\`\`tsx
{state.errors?.title && <p className="text-red-600 text-xs">{state.errors.title}</p>}
\`\`\`

A single user-visible error toast is a fallback — **good** forms tell the user precisely which field is wrong.
`,
      },
      {
        title: "File Uploads with Server Actions",
        type: LessonType.VIDEO,
        duration: 18,
        content: "https://www.youtube.com/embed/dDtNX-Z3a-0",
      },
      {
        title: "Chapter 5 — Quiz",
        type: LessonType.QUIZ,
        duration: 10,
        quiz: {
          title: "Server Actions & Forms Quiz",
          passMark: 70,
          timeLimit: 10,
          questions: [
            {
              text: 'Which directive marks a file or function as a Server Action?',
              options: [
                { text: '"use action"' },
                { text: '"use server"', correct: true },
                { text: '"server"' },
                { text: '"action"' },
              ],
            },
            {
              text: "What signature does the action passed to `useActionState` use?",
              options: [
                { text: "(formData) → state" },
                { text: "(state, formData) → state", correct: true },
                { text: "(formData) → Promise<void>" },
                { text: "() → state" },
              ],
            },
            {
              text: "Why is client-side validation alone insufficient?",
              options: [
                { text: "Browsers don't run Zod" },
                { text: "Clients can bypass UI and submit any payload directly", correct: true },
                { text: "Server Actions don't run client validators" },
                { text: "FormData isn't compatible with Zod" },
              ],
            },
            {
              text: "What does `useFormStatus()` return?",
              options: [
                { text: "The current form values" },
                { text: "An object including the parent form's `pending` flag", correct: true },
                { text: "The action's return value" },
                { text: "A function to submit the form" },
              ],
            },
            {
              text: "What happens to optimistic state when the underlying Server Action fails?",
              options: [
                { text: "It persists indefinitely" },
                { text: "It is automatically discarded on re-render", correct: true },
                { text: "It is committed to the database anyway" },
                { text: "It must be manually rolled back" },
              ],
            },
          ],
        },
      },
    ],
  };
}
function chapter6(): ChapterSpec {
  return {
    title: "Chapter 6 — Rendering Strategies: SSG, SSR, ISR & PPR",
    lessons: [
      {
        title: "Static vs Dynamic vs Streaming",
        type: LessonType.TEXT,
        duration: 14,
        content: `# Static vs Dynamic vs Streaming

Next.js gives you four ways to render a page. Pick the right one and you get amazing performance for free. Pick the wrong one and you serve stale data or slow requests.

## The Four Strategies

| Strategy | When Rendered | Pros | Cons |
|----------|---------------|------|------|
| **Static (SSG)** | At build time | Fastest, cacheable on a CDN | Stale until rebuild or revalidation |
| **ISR** | At build, then in background on demand | Fast + can update without redeploy | Per-page revalidation only |
| **Dynamic (SSR)** | Every request | Always fresh | Slowest TTFB; needs warm servers |
| **Streaming (with PPR)** | Static shell + per-request fragments | Best of both | Newest API surface |

## How Next.js Picks for You

Next.js infers the strategy from what your page **does**:

- If your page only reads cached data and doesn't touch \`cookies()\` / \`headers()\` / \`searchParams\` → **static**.
- If it reads dynamic APIs but you've enabled \`"use cache"\` + tags → **ISR-style**.
- If it reads dynamic APIs and no caching is opted in → **dynamic**.
- If you've enabled \`experimental_ppr\` and used \`<Suspense>\` for dynamic islands → **PPR**.

## Explicit Overrides

You can force a strategy from any \`page.tsx\` or \`layout.tsx\`:

\`\`\`ts
// Force static (build will fail if anything dynamic is used)
export const dynamic = "force-static";

// Force dynamic (every request)
export const dynamic = "force-dynamic";

// Allow Next.js to decide (default)
export const dynamic = "auto";
\`\`\`

\`\`\`ts
// Revalidate this segment every 60s
export const revalidate = 60;
\`\`\`

## A Worked Example

A blog has three routes:

| Route | Best strategy |
|-------|--------------|
| \`/blog\` (listing) | Static or ISR (changes occasionally) |
| \`/blog/[slug]\` (post) | Static — prerendered with \`generateStaticParams\` |
| \`/blog/[slug]/comments\` (recent comments) | Streaming — static shell + dynamic comments island |
| \`/dashboard\` | Dynamic — per-user content |

A real app mixes all four routinely. Next.js doesn't make you choose one for the whole app.

## How to See What Next Chose

After \`next build\`, you'll see a table like:

\`\`\`
Route (app)                              Size     First Load JS
┌ ○ /                                    1.5 kB        87 kB
├ ○ /about                               150 B         85 kB
├ λ /dashboard                           320 B         88 kB
└ ● /blog/[slug]                         450 B         86 kB

○  (Static)   prerendered as static content
●  (SSG)      prerendered as static HTML (uses getStaticParams)
λ  (Dynamic)  server-rendered on demand
\`\`\`

If you expected \`/blog\` to be \`○\` and you're seeing \`λ\`, something on the page is dynamic.

## Common Surprises

- Calling \`new Date().toISOString()\` directly in JSX → **dynamic** in some cases. Wrap in a Client Component or a cached function.
- Importing a library that reads env at module top → can dynamicize routes by accident.
- Calling \`fetch\` with \`cache: "no-store"\` → forces dynamic.

Use the **next build** output as the ground truth for what's static and what isn't.
`,
      },
      {
        title: "generateStaticParams & Pre-Rendering Dynamic Routes",
        type: LessonType.TEXT,
        duration: 12,
        content: `# generateStaticParams & Pre-Rendering Dynamic Routes

For routes like \`/blog/[slug]\`, you usually want to **build all known posts at build time** so each is a static HTML file served from a CDN.

## The API

\`\`\`tsx
// app/blog/[slug]/page.tsx
export async function generateStaticParams() {
  const posts = await db.post.findMany({ select: { slug: true } });
  return posts.map((p) => ({ slug: p.slug }));
}

export default async function Post({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  return <Article post={post} />;
}
\`\`\`

At build, Next.js calls \`generateStaticParams()\` once, then renders \`Post\` for every slug returned. Each becomes a \`.html\` file in \`.next/server/app/blog/<slug>.html\`.

## What About New Slugs After Build?

By default (\`dynamicParams = true\`), if a user requests an unknown slug, Next.js renders it dynamically — and (if caching is enabled) caches the result for subsequent visitors.

To **disallow** unknown slugs (404 instead):

\`\`\`ts
export const dynamicParams = false;
\`\`\`

## Multiple Dynamic Segments

\`\`\`tsx
// app/blog/[year]/[slug]/page.tsx
export async function generateStaticParams() {
  const posts = await db.post.findMany({ select: { year: true, slug: true } });
  return posts.map((p) => ({ year: String(p.year), slug: p.slug }));
}
\`\`\`

## Hierarchical Routes — Build Per Level

\`\`\`tsx
// app/[lang]/[category]/[slug]/page.tsx
export async function generateStaticParams() {
  return [
    { lang: "en", category: "tech",   slug: "react-19-is-here"  },
    { lang: "en", category: "design", slug: "color-systems"      },
    { lang: "hi", category: "tech",   slug: "react-19-aaya-hai"  },
  ];
}
\`\`\`

The return is a flat list of {param: value} tuples — Next builds each combination once.

## Avoiding Build Times Of Doom

For sites with **tens of thousands** of dynamic pages:

\`\`\`ts
export async function generateStaticParams() {
  // Pre-render the most popular 1,000 — the long tail renders on-demand
  return db.post.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { views: "desc" },
    take: 1000,
    select: { slug: true },
  });
}
\`\`\`

This is **partial pre-rendering of dynamic routes**: hot pages are static-fast; rare pages render JIT and then become cached.

## generateStaticParams + ISR

Combine with a \`revalidate\` export to refresh post HTML on a cadence:

\`\`\`ts
export const revalidate = 3600;     // hourly
\`\`\`

Or use tag-based invalidation from your CMS webhook → \`revalidateTag(\`post:\${slug}\`)\`.
`,
      },
      {
        title: "Incremental Static Regeneration (ISR)",
        type: LessonType.TEXT,
        duration: 12,
        content: `# Incremental Static Regeneration (ISR)

ISR gives you the speed of static HTML with the freshness of dynamic rendering, by **regenerating pages in the background** when they grow stale.

## The Mental Model

\`\`\`
Request → CDN → cached HTML (instant)
                   │
                   ├─ if "fresh"     → done
                   └─ if "stale"     → serve cached + kick off background regen
                                            ↓
                                       updated HTML stored for next visitor
\`\`\`

## Enabling It

Set \`revalidate\` on the page (in seconds):

\`\`\`ts
// app/news/page.tsx
export const revalidate = 60;       // revalidate at most every 60s
\`\`\`

Or on a fetch:

\`\`\`ts
const data = await fetch("https://api.news.com/headlines", {
  next: { revalidate: 60 },
});
\`\`\`

## On-Demand ISR

You don't have to wait for the timer:

\`\`\`ts
// app/api/revalidate/route.ts
import { revalidatePath, revalidateTag } from "next/cache";

export async function POST(req: Request) {
  const { path, tag, secret } = await req.json();
  if (secret !== process.env.REVALIDATE_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (path) revalidatePath(path);
  if (tag)  revalidateTag(tag);

  return Response.json({ revalidated: true });
}
\`\`\`

The CMS posts to this endpoint when a writer publishes. Within milliseconds, the new article is live worldwide.

## Per-Request vs Background Regen

ISR's promise: **no visitor ever waits** for a regeneration. The stale page is served instantly; regen happens after the response is flushed.

Exception: the **very first** time a page is requested (cache miss), the user waits for the initial render. Use \`generateStaticParams\` to prebuild your hot pages.

## ISR + Tags

\`\`\`ts
// lib/data/posts.ts
"use cache";
import { cacheTag, cacheLife } from "next/cache";

export async function getPost(slug: string) {
  cacheTag("post", \`post:\${slug}\`);
  cacheLife("hours");
  return db.post.findUnique({ where: { slug } });
}
\`\`\`

When the writer edits a post:

\`\`\`ts
revalidateTag(\`post:\${slug}\`);    // wipes the cache for that post only
\`\`\`

Subsequent visitors see the updated content. Visitors to **other** posts continue to hit cache.

## ISR On Vercel vs Self-Hosted

- **Vercel** handles ISR storage and propagation across edge nodes automatically. Nothing to configure.
- **Self-hosted** (Node.js, Docker, Kubernetes) ships ISR with the filesystem as the cache. Multi-instance deployments need a shared cache:

\`\`\`ts
// next.config.ts
const config: NextConfig = {
  cacheHandler: require.resolve("./cache-handler.js"),
  cacheMaxMemorySize: 0,    // disable in-memory; rely on shared layer
};
\`\`\`

Popular shared backends: Redis, S3, Cloudflare KV.

## When ISR Is Not the Right Choice

- **Personalized content** — ISR shares a cache key, so per-user data leaks. Use dynamic rendering.
- **Strict consistency** required — ISR is eventually consistent. For a banking app, render dynamic.
- **Very low traffic** — if a page is hit only once a day, ISR's freshness window doesn't help. Make it dynamic and cache the DB query instead.
`,
      },
      {
        title: "Partial Prerendering (PPR)",
        type: LessonType.TEXT,
        duration: 16,
        content: `# Partial Prerendering (PPR)

Partial Prerendering combines a **static shell** with **dynamic "holes"** that stream in at request time. It's the closest thing Next.js has to a silver bullet.

## What PPR Looks Like

Visit a homepage:

\`\`\`
0 ms        — HTML arrives: navbar, hero, layout — all static, cached on the CDN
50 ms       — page is interactive; static content paints
50–250 ms   — dynamic holes stream in: user badge, cart count, personalized feed
\`\`\`

The user sees something instantly. The dynamic bits arrive a moment later — over the same response stream.

## Enabling PPR

Per-route in Next.js 16:

\`\`\`ts
// app/page.tsx
export const experimental_ppr = true;
\`\`\`

Or globally:

\`\`\`ts
// next.config.ts
const config: NextConfig = {
  experimental: { ppr: "incremental" },
};
\`\`\`

\`"incremental"\` means: only routes that explicitly opt in get PPR. \`true\` means: all routes.

## The Code Pattern

The static shell is the page body. Dynamic content goes inside a \`<Suspense>\`:

\`\`\`tsx
import { Suspense } from "react";

export const experimental_ppr = true;

export default function HomePage() {
  return (
    <main>
      <Hero />                                      {/* static */}
      <FeaturedSection />                            {/* static */}
      <Suspense fallback={<UserBadgeSkeleton />}>
        <UserBadge />                                {/* dynamic — reads cookies */}
      </Suspense>
      <Footer />                                     {/* static */}
    </main>
  );
}
\`\`\`

When Next.js builds, it pre-renders everything **outside** \`<Suspense>\` to static HTML. At request time, only the \`UserBadge\` work happens — its HTML streams into the document via a \`<template>\` tag.

## What Counts as Dynamic?

Inside a \`<Suspense>\` boundary, you can use any dynamic API:

- \`cookies()\`, \`headers()\`, \`draftMode()\`
- \`searchParams\` access (via props)
- \`fetch(url, { cache: "no-store" })\`
- Any uncached DB query

Outside the boundary: stick to static.

## A Real Pattern — Personalized Marketing Page

\`\`\`tsx
export const experimental_ppr = true;

export default function Home() {
  return (
    <>
      <Hero />
      <ValueProps />
      <Suspense fallback={<PricingSkeleton />}>
        <PersonalizedPricing />     {/* fetches per visitor */}
      </Suspense>
      <Testimonials />              {/* static */}
      <FAQ />                       {/* static */}
      <CTA />
    </>
  );
}
\`\`\`

The marketing page can still serve from a CDN at the edge — only the pricing fragment hits the origin.

## Caveats

- The route opts in **as a whole**. You can't PPR-enable half a route file.
- Layouts must not be dynamic; only pages and components inside Suspense can be.
- The Edge runtime is supported but has cold-start tradeoffs.

## Verifying PPR Is Working

After \`next build\` watch for the **\`◐\`** (partial) symbol next to your route:

\`\`\`
Route (app)
◐ /                          (static shell + dynamic holes)
\`\`\`

Open the page in incognito and watch DevTools' Network tab — you'll see a single HTML response stream with multiple sections delivered in chunks.
`,
      },
      {
        title: "Edge Runtime vs Node.js Runtime",
        type: LessonType.TEXT,
        duration: 12,
        content: `# Edge Runtime vs Node.js Runtime

Every route segment in Next.js runs in one of two runtimes:

- **Node.js runtime** (default) — runs in a full Node 20+ environment
- **Edge runtime** — runs on a lightweight V8 environment near the user (Vercel Edge, Cloudflare Workers)

## Choosing a Runtime

\`\`\`ts
// app/api/echo/route.ts
export const runtime = "edge";    // or "nodejs" (default)
\`\`\`

Same option on a page:

\`\`\`ts
// app/page.tsx
export const runtime = "edge";
\`\`\`

## When Edge Is The Right Choice

| Use case | Why Edge wins |
|----------|---------------|
| Auth middleware | Run at the CDN edge, before reaching origin |
| Geolocation routing | Edge has IP-to-region built-in |
| Quick API responses (< 50 ms work) | Cold starts are sub-100ms |
| Streaming responses | First chunk emitted very fast |
| A/B test variants | Decision happens close to the user |

## When Node Is The Right Choice

| Use case | Why Edge fails |
|----------|-----------------|
| Database with TCP driver | Edge runtimes don't support raw TCP |
| Long-running work (> 1s) | Edge has tight wall-clock and memory limits |
| Native Node modules (sharp, bcrypt) | Edge can't run native bindings |
| Big libraries (Stripe SDK) | Edge bundle size limits (1–4 MB) |
| File system access | Edge has no fs |

## Edge-Compatible Patterns

Use **HTTP-only** database drivers:

- **Neon** (Postgres) — \`@neondatabase/serverless\` over HTTP
- **PlanetScale** (MySQL) — \`@planetscale/database\` over HTTP
- **Turso** (SQLite-derived) — over HTTP
- **Cloudflare D1** — via Workers

These connect over HTTPS, not raw TCP, so they work in Edge.

\`\`\`ts
// lib/db.ts
import { neon } from "@neondatabase/serverless";

export const sql = neon(process.env.DATABASE_URL!);
\`\`\`

\`\`\`ts
// app/api/users/route.ts
export const runtime = "edge";
import { sql } from "@/lib/db";

export async function GET() {
  const users = await sql\`SELECT id, name FROM users LIMIT 10\`;
  return Response.json(users);
}
\`\`\`

## Middleware Always Runs at the Edge

\`middleware.ts\` is **always** edge-runtime. You cannot use \`fs\`, native modules, or heavy Node-only libraries in it.

\`\`\`ts
// middleware.ts
import { NextResponse, type NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const country = req.geo?.country ?? "US";
  if (country === "EU") {
    return NextResponse.rewrite(new URL("/eu" + req.nextUrl.pathname, req.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|api/health).*)"],
};
\`\`\`

## Streaming Responses From Edge

\`\`\`ts
// app/api/feed/route.ts
export const runtime = "edge";

export async function GET() {
  const stream = new ReadableStream({
    async start(controller) {
      for (let i = 0; i < 5; i++) {
        controller.enqueue(\`tick \${i}\\n\`);
        await new Promise((r) => setTimeout(r, 200));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
\`\`\`

The first byte goes out almost instantly. Great for token-by-token LLM streaming.
`,
      },
      {
        title: "Rendering Strategies Deep Dive",
        type: LessonType.VIDEO,
        duration: 22,
        content: "https://www.youtube.com/embed/MTcPrTIBkpA",
      },
      {
        title: "Chapter 6 — Quiz",
        type: LessonType.QUIZ,
        duration: 12,
        quiz: {
          title: "Rendering Strategies Quiz",
          passMark: 70,
          timeLimit: 12,
          questions: [
            {
              text: "Which export forces a route to be rendered on every request?",
              options: [
                { text: 'export const dynamic = "auto"' },
                { text: 'export const dynamic = "force-dynamic"', correct: true },
                { text: 'export const ssr = true' },
                { text: 'export const cache = false' },
              ],
            },
            {
              text: "What does `generateStaticParams` do?",
              options: [
                { text: "Caches a fetch result" },
                { text: "Lists dynamic segments to prerender at build time", correct: true },
                { text: "Sets the runtime to edge" },
                { text: "Disables ISR for the page" },
              ],
            },
            {
              text: "What does Partial Prerendering (PPR) primarily combine?",
              options: [
                { text: "Edge and Node runtimes in one request" },
                { text: "A static shell with dynamic, per-request fragments streamed in", correct: true },
                { text: "Two ISR pages into one route" },
                { text: "SSR and client-side rendering" },
              ],
            },
            {
              text: "Which is true about the Edge runtime?",
              options: [
                { text: "It supports all native Node modules" },
                { text: "It cannot use raw TCP database drivers", correct: true },
                { text: "It is slower than Node for cold starts" },
                { text: "It allows reading from the local filesystem" },
              ],
            },
            {
              text: "What's the symbol shown in `next build` output for a PPR-enabled route?",
              options: [
                { text: "○" },
                { text: "●" },
                { text: "λ" },
                { text: "◐", correct: true },
              ],
            },
            {
              text: "Which is the ideal use of ISR?",
              options: [
                { text: "Highly personalized dashboards" },
                { text: "Bank account balance pages" },
                { text: "Blog or marketing pages updated several times per day", correct: true },
                { text: "Live sports scores" },
              ],
            },
          ],
        },
      },
    ],
  };
}
function chapter7(): ChapterSpec {
  return {
    title: "Chapter 7 — Styling, Assets & Performance",
    lessons: [
      {
        title: "Tailwind CSS v4 with Next.js 16",
        type: LessonType.TEXT,
        duration: 14,
        content: `# Tailwind CSS v4 with Next.js 16

Tailwind v4 is **dramatically faster** (Rust-based engine) and **simpler to configure** than v3. Next.js 16 ships with first-class support and a one-step install.

## Install

\`\`\`bash
npm i -D tailwindcss@latest @tailwindcss/postcss
\`\`\`

## postcss.config.mjs

\`\`\`js
export default {
  plugins: { "@tailwindcss/postcss": {} },
};
\`\`\`

## globals.css

\`\`\`css
@import "tailwindcss";

@theme {
  --color-brand: #f97316;
  --font-sans: "Inter", ui-sans-serif;
}
\`\`\`

That's the whole config. No \`tailwind.config.ts\` required — themes live in CSS.

## Custom Utilities

\`\`\`css
@layer utilities {
  .text-balance { text-wrap: balance; }
  .gradient-brand {
    background: linear-gradient(135deg, theme(--color-brand) 0%, #ef4444 100%);
  }
}
\`\`\`

## Composing Class Names

\`\`\`bash
npm i clsx tailwind-merge
\`\`\`

\`\`\`ts
// lib/cn.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
\`\`\`

\`\`\`tsx
import { cn } from "@/lib/cn";

<button className={cn(
  "rounded-md px-4 py-2 text-sm font-medium",
  variant === "primary" && "bg-brand text-white",
  variant === "ghost" && "border bg-transparent",
  disabled && "opacity-50 cursor-not-allowed",
  className,                // allow consumers to override
)} />
\`\`\`

\`twMerge\` resolves conflicting utilities — e.g. \`px-2 px-4\` becomes \`px-4\`. Always wrap consumer-overridable classes.

## Dark Mode

In v4, dark mode is **a media query by default**. To use a class:

\`\`\`css
@import "tailwindcss";

@variant dark (.dark &);
\`\`\`

Then toggle \`<html class="dark">\` from a theme provider.

## Tailwind + Server Components

Tailwind classes are just strings — they cross the server/client boundary without any special handling. Server Components can use any Tailwind class.

## Performance Notes

- Tailwind v4 build is **5–10× faster** than v3 due to the new Rust engine.
- The output CSS contains **only** the utilities you actually use — bundle size scales with your codebase, not the framework.
- For a typical app, the final CSS is **15–30 KB** gzipped.

## Common Patterns

### Container Queries

\`\`\`tsx
<div className="@container">
  <article className="@md:grid @md:grid-cols-2 @md:gap-6">
    {/* responds to its container's width, not viewport */}
  </article>
</div>
\`\`\`

### Modern Color Syntax

\`\`\`tsx
<div className="bg-blue-500/20 text-blue-700" />   // 20% opacity, no extra classes
\`\`\`

### Animations

\`\`\`tsx
<button className="transition-colors duration-200 hover:bg-brand active:scale-95" />
\`\`\`

For complex animations, reach for Framer Motion. For basic UI transitions, Tailwind alone is enough.
`,
      },
      {
        title: "CSS Modules, Global Styles & Scoped CSS",
        type: LessonType.TEXT,
        duration: 10,
        content: `# CSS Modules, Global Styles & Scoped CSS

Tailwind isn't the only option. Next.js supports CSS Modules, global CSS, and CSS-in-JS — usually all three at once.

## Global CSS

Imported **once** from the root layout:

\`\`\`tsx
// app/layout.tsx
import "./globals.css";
\`\`\`

You can't import global CSS from any other component. This enforces a single global file.

## CSS Modules

For component-scoped styles, name the file \`*.module.css\`.

\`\`\`css
/* Button.module.css */
.button {
  border-radius: 6px;
  padding: 8px 16px;
  background: black;
  color: white;
}

.button:disabled {
  opacity: 0.5;
}
\`\`\`

\`\`\`tsx
import styles from "./Button.module.css";

export function Button({ children, disabled }: Props) {
  return <button className={styles.button} disabled={disabled}>{children}</button>;
}
\`\`\`

Class names are hashed at build (\`Button_button__a1b2c3\`) so collisions across files are impossible.

## CSS-in-JS

CSS-in-JS libraries that **run at build time** (vanilla-extract, Pigment CSS, StyleX) work in Server Components. Runtime CSS-in-JS (Emotion, styled-components) requires \`"use client"\` and a special setup — not recommended for new code.

## Sass

\`\`\`bash
npm i -D sass
\`\`\`

Then import \`.scss\` files anywhere CSS works. CSS Modules with Sass: \`Button.module.scss\`.

## A Practical Mix

In a real codebase, a common split:

| Style for | Tool |
|-----------|------|
| Layout & utilities | Tailwind |
| Component-specific tricky styles | CSS Modules |
| Single global file (resets, fonts, vars) | global.css |
| Marketing landing animations | Framer Motion |

Don't dogmatize one tool. Pick whichever takes the least code at the call site.

## Theming

CSS variables work the best across all these tools:

\`\`\`css
:root {
  --color-fg: #0a0a0a;
  --color-bg: #ffffff;
}

.dark {
  --color-fg: #f5f5f5;
  --color-bg: #0a0a0a;
}
\`\`\`

\`\`\`tsx
<div style={{ color: "var(--color-fg)", background: "var(--color-bg)" }} />
\`\`\`

Same approach works whether you're styling with CSS modules, Tailwind (\`bg-[var(--color-bg)]\`), or plain CSS.
`,
      },
      {
        title: "next/image — Smart, Fast Images",
        type: LessonType.TEXT,
        duration: 14,
        content: `# next/image — Smart, Fast Images

\`next/image\` is one of Next.js's biggest wins. It automatically:

- Generates multiple sizes (responsive srcSet)
- Converts to modern formats (AVIF, WebP) on the fly
- Lazy-loads off-screen images
- Blocks layout shift (CLS) by reserving space

## Local Images

\`\`\`tsx
import Image from "next/image";
import logo from "@/public/logo.png";

<Image src={logo} alt="CoachNest" />
\`\`\`

Local imports include width/height **at build time** — no dimensions needed.

## Remote Images

Whitelist the domain in \`next.config.ts\`:

\`\`\`ts
images: {
  remotePatterns: [
    { protocol: "https", hostname: "images.unsplash.com" },
    { protocol: "https", hostname: "cdn.coachnest.dev" },
  ],
},
\`\`\`

Then provide width/height (or \`fill\`):

\`\`\`tsx
<Image
  src="https://images.unsplash.com/photo-...."
  alt="Hero"
  width={1200}
  height={600}
/>
\`\`\`

## The \`fill\` Prop

For containers where you don't know the dimensions ahead of time:

\`\`\`tsx
<div className="relative aspect-video">
  <Image
    src={course.thumbnail}
    alt={course.title}
    fill
    sizes="(max-width: 768px) 100vw, 50vw"
    className="object-cover"
  />
</div>
\`\`\`

> **Next.js 16 change:** \`sizes\` is now **required** when using \`fill\`. The build will fail without it.

## Priority for Above-the-Fold Images

\`\`\`tsx
<Image
  src={hero}
  alt="…"
  priority
  sizes="100vw"
  className="w-full"
/>
\`\`\`

\`priority\` opts out of lazy loading and adds the image to the preload list.

## Placeholder & Blur

\`\`\`tsx
<Image src={cover} alt="…" placeholder="blur" />
\`\`\`

Local imports include a \`blurDataURL\` automatically. For remote images, generate one with the \`plaiceholder\` library or skip the placeholder.

## Quality & Format

\`\`\`tsx
<Image src={cover} alt="…" width={1200} height={600} quality={75} />
\`\`\`

The default \`quality\` (75) is the sweet spot. Increase only if you've measured a visual issue.

## Vercel vs Self-Hosted Image Optimization

- **Vercel** runs the optimizer at the edge — no setup.
- **Self-hosted** uses \`sharp\` (a native library). The Docker base image \`node:20-alpine\` works; you may need to add \`apk add vips\` for some image types.

If you don't want Next.js to optimize images at all (e.g., your CDN already does):

\`\`\`ts
images: { unoptimized: true }
\`\`\`

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using \`<img>\` instead of \`<Image>\` for app content | Use \`<Image>\` — ESLint will warn |
| Forgetting \`sizes\` with \`fill\` | Build will error in Next.js 16 |
| Setting both width/height AND fill | Pick one |
| Loading 4000×3000 images | Always pass \`sizes\` so smaller versions are generated |
| Marking every image \`priority\` | Only the LCP image should be priority |
`,
      },
      {
        title: "Fonts, Icons & Metadata",
        type: LessonType.TEXT,
        duration: 12,
        content: `# Fonts, Icons & Metadata

## next/font — Self-Hosted Fonts, Zero CLS

\`\`\`tsx
// app/layout.tsx
import { Inter, JetBrains_Mono } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={\`\${inter.variable} \${mono.variable}\`}>
      <body>{children}</body>
    </html>
  );
}
\`\`\`

At build time, Next.js downloads the font files and serves them from your own domain — no Google CDN call from the user's browser. Faster, more private, no CLS.

### Local Fonts

\`\`\`tsx
import localFont from "next/font/local";

const display = localFont({
  src: [
    { path: "./fonts/Display-Regular.woff2", weight: "400" },
    { path: "./fonts/Display-Bold.woff2", weight: "700" },
  ],
  variable: "--font-display",
});
\`\`\`

## Icons — Lucide is the Default

\`\`\`bash
npm i lucide-react
\`\`\`

\`\`\`tsx
import { Search, ArrowRight } from "lucide-react";

<Search className="h-5 w-5 text-gray-500" />
\`\`\`

Tree-shakes per icon — you don't pay for the whole library.

## Metadata API — Static Defaults

\`\`\`tsx
// app/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://coachnest.dev"),
  title: { default: "CoachNest", template: "%s — CoachNest" },
  description: "A modern learning platform.",
  openGraph: {
    siteName: "CoachNest",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    creator: "@coachnest",
  },
};
\`\`\`

Per-page override:

\`\`\`ts
// app/about/page.tsx
export const metadata: Metadata = {
  title: "About us",            // → "About us — CoachNest" via the template
  description: "Who we are.",
};
\`\`\`

## Dynamic Metadata

\`\`\`ts
// app/courses/[slug]/page.tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourse(slug);
  if (!course) return { title: "Course not found" };

  return {
    title: course.title,
    description: course.shortDesc,
    openGraph: { images: [course.thumbnail] },
  };
}
\`\`\`

## OG Image Generation

Drop \`opengraph-image.tsx\` in any segment:

\`\`\`tsx
// app/courses/[slug]/opengraph-image.tsx
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function og({ params }: { params: { slug: string } }) {
  const course = await getCourse(params.slug);
  return new ImageResponse(
    (
      <div style={{ fontSize: 64, background: "#0a0a0a", color: "white", width: "100%", height: "100%", padding: 60 }}>
        <p style={{ opacity: 0.7, fontSize: 28 }}>CoachNest</p>
        <h1>{course?.title}</h1>
      </div>
    ),
    { ...size },
  );
}
\`\`\`

A fresh OG image per course, rendered at the edge — beautifully scalable.

## Sitemap & Robots

\`\`\`ts
// app/sitemap.ts
export default async function sitemap() {
  const courses = await db.course.findMany({ select: { slug: true, updatedAt: true } });
  return [
    { url: "https://coachnest.dev", lastModified: new Date(), priority: 1.0 },
    ...courses.map((c) => ({
      url: \`https://coachnest.dev/courses/\${c.slug}\`,
      lastModified: c.updatedAt,
      priority: 0.7,
    })),
  ];
}
\`\`\`

\`\`\`ts
// app/robots.ts
export default function robots() {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: "/api/" }],
    sitemap: "https://coachnest.dev/sitemap.xml",
  };
}
\`\`\`

Drop the files; Next.js routes \`/sitemap.xml\` and \`/robots.txt\` automatically.
`,
      },
      {
        title: "Chapter 7 — Quiz",
        type: LessonType.QUIZ,
        duration: 10,
        quiz: {
          title: "Styling & Performance Quiz",
          passMark: 70,
          timeLimit: 10,
          questions: [
            {
              text: "What's required when using `<Image fill>` in Next.js 16?",
              options: [
                { text: "A `width` prop" },
                { text: "A `sizes` prop", correct: true },
                { text: "A `priority` prop" },
                { text: "A `quality` prop" },
              ],
            },
            {
              text: "Why use `next/font` instead of importing fonts from Google CDN?",
              options: [
                { text: "It's free; Google fonts are paid" },
                { text: "It self-hosts the fonts, eliminating extra DNS lookups and CLS", correct: true },
                { text: "Other CDNs are blocked in production" },
                { text: "It compiles faster" },
              ],
            },
            {
              text: "Which file makes Next.js generate `/sitemap.xml` automatically?",
              options: [
                { text: "public/sitemap.xml" },
                { text: "app/sitemap.ts", correct: true },
                { text: "next-sitemap.config.js" },
                { text: "app/(sitemap)/page.ts" },
              ],
            },
            {
              text: "What does `tailwind-merge` (the `twMerge` helper) do?",
              options: [
                { text: "Combines multiple Tailwind config files" },
                { text: "Resolves conflicting utility classes so later ones override earlier ones", correct: true },
                { text: "Minifies the production CSS" },
                { text: "Allows arbitrary class names in HTML" },
              ],
            },
            {
              text: "From where can global CSS be imported in App Router?",
              options: [
                { text: "Any component" },
                { text: "Only `app/layout.tsx` (the root layout)", correct: true },
                { text: "Only client components" },
                { text: "Only server components" },
              ],
            },
          ],
        },
      },
    ],
  };
}
function chapter8(): ChapterSpec {
  return {
    title: "Chapter 8 — Authentication & Middleware",
    lessons: [
      {
        title: "Middleware Fundamentals",
        type: LessonType.TEXT,
        duration: 14,
        content: `# Middleware Fundamentals

Middleware runs **before** a request reaches a page or route handler. It runs in the **Edge runtime**, close to the user. Use it for:

- Authentication & route protection
- Redirects (locale, A/B tests, legacy URLs)
- Rewrites (proxy /api to a different service)
- Adding request headers
- Bot detection / rate limiting

## Anatomy

\`\`\`ts
// middleware.ts (project root, sibling of app/)
import { NextResponse, type NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  // 1. Inspect the request
  const isApi = req.nextUrl.pathname.startsWith("/api");

  // 2. Decide what to do
  if (isApi && !req.headers.get("x-api-key")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 3. Pass through (default)
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
\`\`\`

## The matcher

\`matcher\` decides which paths run through middleware. Anything outside the matcher skips it.

\`\`\`ts
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/account/:path*",
    "/api/:path*",
  ],
};
\`\`\`

Be generous in **what to exclude** — never run middleware on \`_next/static\`, which would 10× your edge invocations.

## Three Things You Can Return

\`\`\`ts
return NextResponse.next();                                  // continue
return NextResponse.redirect(new URL("/login", req.url));    // 302
return NextResponse.rewrite(new URL("/eu", req.url));        // URL unchanged, served from /eu
return new NextResponse("Forbidden", { status: 403 });        // short-circuit
\`\`\`

## Reading Cookies

\`\`\`ts
const token = req.cookies.get("session")?.value;
\`\`\`

Middleware can read **and** write cookies:

\`\`\`ts
const res = NextResponse.next();
res.cookies.set("visit", String(Date.now()));
return res;
\`\`\`

## Forwarding Headers to Pages

Add a header in middleware → pages read it via \`headers()\`:

\`\`\`ts
const res = NextResponse.next();
res.headers.set("x-pathname", req.nextUrl.pathname);
return res;
\`\`\`

\`\`\`tsx
import { headers } from "next/headers";
const pathname = (await headers()).get("x-pathname");
\`\`\`

Useful for layouts that need to know the current pathname.

## A Real-World Middleware

\`\`\`ts
import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC = ["/", "/login", "/signup", "/blog"];
const isPublic = (p: string) => PUBLIC.some((x) => p === x || p.startsWith(\`\${x}/\`));

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const token = req.cookies.get("session")?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  try {
    await jwtVerify(token, new TextEncoder().encode(process.env.SESSION_SECRET!));
    return NextResponse.next();
  } catch {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/((?!api|_next|favicon.ico).*)"],
};
\`\`\`

## What You Can't Do in Middleware

- Use Node-only APIs (\`fs\`, \`crypto\`'s sync APIs, native modules)
- Run expensive work (> ~50 ms)
- Read request bodies (use a route handler)
- Access \`cookies()\` from \`next/headers\` (use \`req.cookies\` instead)
`,
      },
      {
        title: "Sessions, JWTs & Cookies",
        type: LessonType.TEXT,
        duration: 16,
        content: `# Sessions, JWTs & Cookies

A pragmatic auth setup for a new Next.js 16 app: **signed JWT sessions stored in HTTP-only cookies**. Simple, secure, no third-party service required.

## The Library: \`jose\`

\`\`\`bash
npm i jose
\`\`\`

\`jose\` works in both Node and Edge runtimes — important since middleware runs at the edge.

## Signing a Session

\`\`\`ts
// lib/session.ts
import "server-only";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";

const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET!);
const COOKIE = "session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type SessionPayload = JWTPayload & { uid: string; role: "USER" | "ADMIN" };

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(SECRET);

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function readSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}
\`\`\`

## Logging In

\`\`\`ts
// app/(auth)/login/actions.ts
"use server";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";

export async function login(prev: unknown, formData: FormData) {
  const email = formData.get("email")?.toString() ?? "";
  const password = formData.get("password")?.toString() ?? "";

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "Invalid credentials" };
  }

  await createSession({ uid: user.id, role: user.role });
  redirect("/dashboard");
}
\`\`\`

## Logging Out

\`\`\`ts
"use server";
import { destroySession } from "@/lib/session";
import { redirect } from "next/navigation";

export async function logout() {
  await destroySession();
  redirect("/login");
}
\`\`\`

## Reading the Current User

\`\`\`ts
// lib/auth.ts
import { cache } from "react";
import { readSession } from "@/lib/session";
import { db } from "@/lib/db";

export const getCurrentUser = cache(async () => {
  const session = await readSession();
  if (!session) return null;
  return db.user.findUnique({ where: { id: session.uid } });
});
\`\`\`

\`cache()\` ensures a single DB lookup per request, even if many components call \`getCurrentUser()\`.

## Verifying in Middleware

\`\`\`ts
// middleware.ts
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET!);

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  if (!token) return NextResponse.redirect(new URL("/login", req.url));
  try {
    await jwtVerify(token, SECRET);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}
\`\`\`

## Things To Get Right

- **HttpOnly**: cookies can't be read by JS — prevents XSS token theft
- **SameSite=lax**: prevents CSRF on cross-site GETs
- **Secure** in production: cookies only travel over HTTPS
- **Path=/**: cookie sent on every request
- **Rotate the SESSION_SECRET** on a known cadence (every 90 days is reasonable)
- **Short expiration + refresh** for high-security apps; long expiration is fine for most consumer apps

## When To Use a Library Instead

For OAuth providers (Google, GitHub, Apple), magic links, and account linking, use **Auth.js** (next-auth v5). It plugs into the same cookie/session model and saves you weeks of work.
`,
      },
      {
        title: "Protecting Server Components & Server Actions",
        type: LessonType.TEXT,
        duration: 12,
        content: `# Protecting Server Components & Server Actions

Middleware is your **front door**. But you must also re-check auth inside every Server Action and any sensitive Server Component — middleware can be bypassed if a route is misconfigured.

## The DRY Helper

\`\`\`ts
// lib/auth-guard.ts
import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/403");
  return user;
}
\`\`\`

## Using It

\`\`\`tsx
// app/admin/page.tsx
import { requireAdmin } from "@/lib/auth-guard";

export default async function AdminPage() {
  const admin = await requireAdmin();
  return <h1>Hi, {admin.name} — you're an admin.</h1>;
}
\`\`\`

\`\`\`ts
// app/courses/actions.ts
"use server";
import { requireUser } from "@/lib/auth-guard";

export async function enroll(courseId: string) {
  const user = await requireUser();
  return db.enrollment.create({ data: { userId: user.id, courseId } });
}
\`\`\`

> **Never trust** a userId passed from the client. Always read it from the session.

## Resource-Level Authorization

\`\`\`ts
"use server";
export async function updateCourse(id: string, data: CourseInput) {
  const user = await requireUser();
  const course = await db.course.findUnique({ where: { id }, select: { createdById: true } });
  if (!course) notFound();
  if (course.createdById !== user.id && user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
  return db.course.update({ where: { id }, data });
}
\`\`\`

The pattern:

1. Identify the actor (\`requireUser\`).
2. Fetch the target resource.
3. Check ownership (or role).
4. Perform the action.

## A Permissions Module

For complex apps, group rules in one place:

\`\`\`ts
// lib/permissions.ts
import type { User, Course } from "@prisma/client";

export const can = {
  editCourse: (u: User | null, c: Course) =>
    !!u && (u.role === "ADMIN" || u.id === c.createdById),
  deleteCourse: (u: User | null, c: Course) =>
    !!u && u.role === "ADMIN",
};
\`\`\`

\`\`\`tsx
{can.editCourse(user, course) && <EditButton id={course.id} />}
\`\`\`

Same module is reused server- and client-side (rules are pure functions — fine to ship).

## CSRF Protection

Server Actions are immune to traditional CSRF because:

- Each action is identified by a signed action ID
- The Origin header is validated by Next.js
- The request is POST-only and tied to the user's cookie

Route handlers that perform mutations still need their own CSRF checks if you're not using SameSite cookies.

## A Final Pattern: Re-fetch After Sensitive Updates

After password changes, role changes, or account deletes, **rotate the session**:

\`\`\`ts
"use server";
export async function changePassword(input: ChangePassword) {
  const user = await requireUser();
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hash(input.newPassword) } });
  await createSession({ uid: user.id, role: user.role });   // new JWT, invalidates the old one
}
\`\`\`
`,
      },
      {
        title: "OAuth Login with Auth.js (NextAuth v5)",
        type: LessonType.VIDEO,
        duration: 22,
        content: "https://www.youtube.com/embed/yccpx7zjMTw",
      },
      {
        title: "Chapter 8 — Quiz",
        type: LessonType.QUIZ,
        duration: 10,
        quiz: {
          title: "Authentication & Middleware Quiz",
          passMark: 70,
          timeLimit: 10,
          questions: [
            {
              text: "Why must session cookies be `HttpOnly`?",
              options: [
                { text: "Faster network transfer" },
                { text: "Prevents JavaScript on the page from reading the token, mitigating XSS exfiltration", correct: true },
                { text: "Required by the SameSite spec" },
                { text: "Required for cross-origin requests" },
              ],
            },
            {
              text: "Where does Next.js middleware run?",
              options: [
                { text: "Inside each route's renderer" },
                { text: "In the Edge runtime, before the route is matched", correct: true },
                { text: "Only at build time" },
                { text: "Only when explicitly invoked" },
              ],
            },
            {
              text: "Which library works in BOTH Node and Edge runtimes for JWTs?",
              options: [
                { text: "jsonwebtoken" },
                { text: "jose", correct: true },
                { text: "passport" },
                { text: "express-jwt" },
              ],
            },
            {
              text: "Why must Server Actions re-check authorization, even if middleware ran?",
              options: [
                { text: "Server Actions skip middleware" },
                { text: "It's required by Next.js" },
                { text: "Defense-in-depth — a misconfigured matcher could bypass middleware; never trust caller-supplied identity", correct: true },
                { text: "Middleware can't read cookies" },
              ],
            },
            {
              text: "Which is the right way to redirect from a Server Action when auth fails?",
              options: [
                { text: "throw new Response('Redirect')" },
                { text: "redirect('/login') from 'next/navigation'", correct: true },
                { text: "router.push('/login')" },
                { text: "return NextResponse.redirect('/login')" },
              ],
            },
          ],
        },
      },
    ],
  };
}
function chapter9(): ChapterSpec {
  return {
    title: "Chapter 9 — Database Integration & APIs",
    lessons: [
      {
        title: "Prisma with Next.js — The Production Setup",
        type: LessonType.TEXT,
        duration: 14,
        content: `# Prisma with Next.js — The Production Setup

Prisma is the most popular ORM for Next.js. It gives you a type-safe query builder, schema migrations, and a great DX.

## Install

\`\`\`bash
npm i @prisma/client
npm i -D prisma
npx prisma init
\`\`\`

Choose Postgres in the prompts (most flexible).

## A Real Schema

\`\`\`prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  name         String?
  passwordHash String
  role         Role     @default(STUDENT)
  createdAt    DateTime @default(now())

  courses      Course[]
  enrollments  Enrollment[]
}

enum Role { STUDENT INSTRUCTOR ADMIN }

model Course {
  id          String  @id @default(cuid())
  slug        String  @unique
  title       String
  description String  @db.Text
  createdById String

  createdBy   User    @relation(fields: [createdById], references: [id])
  lessons     Lesson[]
  enrollments Enrollment[]
}

model Lesson {
  id       String @id @default(cuid())
  courseId String
  title    String
  content  String @db.Text
  order    Int

  course Course @relation(fields: [courseId], references: [id], onDelete: Cascade)
}

model Enrollment {
  id        String   @id @default(cuid())
  userId    String
  courseId  String
  createdAt DateTime @default(now())

  user   User   @relation(fields: [userId], references: [id])
  course Course @relation(fields: [courseId], references: [id])

  @@unique([userId, courseId])
}
\`\`\`

## The Singleton Client

In dev, hot-reload would create a new \`PrismaClient\` on every save → DB connection exhaustion.

\`\`\`ts
// lib/db.ts
import "server-only";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["query", "error"] : ["error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
\`\`\`

## Generating the Client

After every schema change:

\`\`\`bash
npx prisma generate            # regenerates the typed client
npx prisma migrate dev --name <reason>   # applies a migration in dev
\`\`\`

Add to package.json so it runs on install:

\`\`\`json
{
  "scripts": {
    "postinstall": "prisma generate",
    "db:push":   "prisma db push",
    "db:studio": "prisma studio"
  }
}
\`\`\`

## Migrations vs db push

| Command | Use For |
|---------|---------|
| \`prisma migrate dev\` | Versioned migrations, committed to git |
| \`prisma db push\`     | Quick prototyping, no migration files |

Use \`migrate\` for any project that will reach production. Use \`db push\` for fast experimentation only.

## Querying

\`\`\`ts
// Find with relations
const course = await db.course.findUnique({
  where: { slug },
  include: { lessons: { orderBy: { order: "asc" } } },
});

// Aggregate
const stats = await db.enrollment.groupBy({
  by: ["courseId"],
  _count: { _all: true },
  having: { courseId: { _count: { _all: { gt: 50 } } } },
});

// Transactions
await db.$transaction(async (tx) => {
  await tx.course.update({ where: { id }, data: { status: "PUBLISHED" } });
  await tx.notification.create({ data: { /* … */ } });
});
\`\`\`

## Connection Pooling

In serverless (Vercel), each invocation creates a fresh process. You **must** front Postgres with a pooler:

- **Neon** has a built-in pooler — use the \`-pooler\` URL.
- **Supabase** offers Supavisor.
- **PgBouncer** for self-hosted.

For Prisma + serverless, also enable \`directUrl\` for migrations:

\`\`\`prisma
datasource db {
  url      = env("DATABASE_URL")        // pooled, used at runtime
  directUrl = env("DIRECT_URL")          // direct, used only for migrations
}
\`\`\`
`,
      },
      {
        title: "Mutations: Server Actions + Database Writes",
        type: LessonType.TEXT,
        duration: 12,
        content: `# Mutations: Server Actions + Database Writes

The Next.js 16 mutation pattern is the **same five steps**, every time:

1. Validate input
2. Authenticate / authorize
3. Mutate the database (preferably in a transaction)
4. Invalidate caches
5. Return a typed result (or redirect)

## A Canonical Action

\`\`\`ts
// app/courses/actions.ts
"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidateTag, revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth-guard";

const schema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(20).max(5000),
});

type Result =
  | { ok: true; slug: string }
  | { ok: false; errors: Record<string, string> };

export async function createCourse(prev: unknown, formData: FormData): Promise<Result> {
  // 1. validate
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      errors: Object.fromEntries(parsed.error.issues.map((i) => [i.path[0] as string, i.message])),
    };
  }

  // 2. auth
  const user = await requireUser();

  // 3. mutate
  const slug = slugify(parsed.data.title);
  const course = await db.course.create({
    data: {
      ...parsed.data,
      slug,
      createdById: user.id,
    },
  });

  // 4. invalidate
  revalidateTag("course");
  revalidatePath("/dashboard");

  // 5. return / redirect
  redirect(\`/courses/\${course.slug}/edit\`);
}
\`\`\`

## Transactions

When two writes must succeed together:

\`\`\`ts
await db.$transaction(async (tx) => {
  const order = await tx.order.create({ data: { userId, total } });
  await tx.orderItem.createMany({ data: items.map((i) => ({ orderId: order.id, ...i })) });
  await tx.user.update({ where: { id: userId }, data: { spent: { increment: total } } });
});
\`\`\`

If anything throws, the entire transaction rolls back.

## Idempotency for Critical Mutations

For mutations that should not double-charge or double-book:

\`\`\`ts
export async function purchase(courseId: string, idempotencyKey: string) {
  const existing = await db.payment.findUnique({ where: { idempotencyKey } });
  if (existing) return existing;
  // … create payment with this key
}
\`\`\`

Pass a UUID from the client and store it as a unique column.

## Soft Deletes

If a row may be needed for audit / restoration, prefer:

\`\`\`prisma
model Course {
  deletedAt DateTime?
  // …
}
\`\`\`

\`\`\`ts
await db.course.update({ where: { id }, data: { deletedAt: new Date() } });
\`\`\`

Wrap reads in a helper that filters \`deletedAt: null\` by default.

## Bulk Operations

\`\`\`ts
await db.enrollment.createMany({
  data: students.map((s) => ({ userId: s.id, courseId })),
  skipDuplicates: true,
});
\`\`\`

Far faster than N round trips. Skip duplicates avoids errors on \`@@unique\` constraints.

## Pagination

Cursor-based — scales to any size:

\`\`\`ts
const PAGE = 20;
const courses = await db.course.findMany({
  take: PAGE + 1,                     // fetch one extra to know if there's another page
  cursor: cursor ? { id: cursor } : undefined,
  orderBy: { createdAt: "desc" },
});
const hasMore = courses.length > PAGE;
const items = hasMore ? courses.slice(0, PAGE) : courses;
const nextCursor = hasMore ? items[items.length - 1].id : null;
\`\`\`
`,
      },
      {
        title: "Route Handlers & REST APIs",
        type: LessonType.TEXT,
        duration: 12,
        content: `# Route Handlers & REST APIs

Server Actions cover **most** mutations. Use **Route Handlers** when you need:

- A public, callable HTTP endpoint (mobile app, third-party integration)
- Webhooks (Stripe, GitHub, Clerk)
- File uploads with streaming
- Custom auth schemes (API keys, OAuth bearer tokens)
- Non-HTML responses (RSS, sitemaps, OG images, PDFs)

## Anatomy

\`\`\`ts
// app/api/courses/route.ts
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const courses = await db.course.findMany({
    where: { title: { contains: q, mode: "insensitive" } },
    select: { id: true, title: true, slug: true },
    take: 20,
  });
  return Response.json(courses);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  // … validate, auth, create
  return Response.json({ id: "new-id" }, { status: 201 });
}
\`\`\`

## All HTTP Verbs Supported

\`GET\`, \`POST\`, \`PUT\`, \`PATCH\`, \`DELETE\`, \`HEAD\`, \`OPTIONS\` — each is a named export.

## Dynamic Params

\`\`\`ts
// app/api/courses/[id]/route.ts
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = await db.course.findUnique({ where: { id } });
  if (!course) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(course);
}
\`\`\`

## Webhooks — Verifying Signatures

\`\`\`ts
// app/api/webhooks/stripe/route.ts
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Missing signature", { status: 400 });

  const body = await req.text();   // .text() — Stripe needs the raw body
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (e) {
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const s = event.data.object as Stripe.Checkout.Session;
    await fulfillOrder(s.metadata!.orderId);
  }

  return new Response("ok");
}
\`\`\`

## Streaming Responses

\`\`\`ts
export async function GET() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for (let i = 0; i < 10; i++) {
        controller.enqueue(encoder.encode(\`data: tick \${i}\\n\\n\`));
        await new Promise((r) => setTimeout(r, 500));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
\`\`\`

Server-Sent Events for live dashboards, LLM token streams, build logs.

## CORS

\`\`\`ts
export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "https://your-mobile-app.com",
      "Access-Control-Allow-Methods": "GET, POST",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
\`\`\`

For SaaS-style APIs called from arbitrary origins, allow \`*\` (and don't accept cookies).

## Rate Limiting

\`\`\`ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const limit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 m"),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "anon";
  const { success } = await limit.limit(ip);
  if (!success) return new Response("Too many requests", { status: 429 });
  // …
}
\`\`\`
`,
      },
      {
        title: "Real-Time with WebSockets & Server-Sent Events",
        type: LessonType.VIDEO,
        duration: 18,
        content: "https://www.youtube.com/embed/2Hj9-pKfPzo",
      },
      {
        title: "Chapter 9 — Quiz",
        type: LessonType.QUIZ,
        duration: 10,
        quiz: {
          title: "Database & APIs Quiz",
          passMark: 70,
          timeLimit: 10,
          questions: [
            {
              text: "Why use a singleton PrismaClient in development?",
              options: [
                { text: "Prisma requires it" },
                { text: "Hot-reload would otherwise create many clients and exhaust connections", correct: true },
                { text: "It's faster" },
                { text: "It generates fewer queries" },
              ],
            },
            {
              text: "Where does a Route Handler file go?",
              options: [
                { text: "pages/api/route.ts" },
                { text: "app/api/.../route.ts (or any segment named `route.ts`)", correct: true },
                { text: "api/router.ts" },
                { text: "lib/api/handler.ts" },
              ],
            },
            {
              text: "Which Prisma method runs multiple writes atomically?",
              options: [
                { text: "db.$run" },
                { text: "db.$transaction", correct: true },
                { text: "db.atomic" },
                { text: "db.batch" },
              ],
            },
            {
              text: "Why must Stripe webhook handlers read the raw body with `req.text()` (not `req.json()`)?",
              options: [
                { text: "Stripe sends YAML, not JSON" },
                { text: "Signature verification requires the byte-exact body that was signed", correct: true },
                { text: "json() is slower" },
                { text: "json() throws CORS errors" },
              ],
            },
            {
              text: "What is the recommended way to paginate large lists in Prisma?",
              options: [
                { text: "skip + take" },
                { text: "Cursor pagination with `take` and `cursor`", correct: true },
                { text: "findMany() and slice on the server" },
                { text: "Use Postgres LIMIT manually" },
              ],
            },
          ],
        },
      },
    ],
  };
}
function chapter10(): ChapterSpec {
  return {
    title: "Chapter 10 — Testing, Deployment & Production",
    lessons: [
      {
        title: "Unit & Component Testing with Vitest",
        type: LessonType.TEXT,
        duration: 12,
        content: `# Unit & Component Testing with Vitest

Vitest is the modern test runner for Next.js — Jest-compatible API, fast (Vite-powered), and works out of the box with TypeScript and React.

## Install

\`\`\`bash
npm i -D vitest @testing-library/react @testing-library/jest-dom @vitejs/plugin-react jsdom
\`\`\`

## vitest.config.ts

\`\`\`ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./") },
  },
});
\`\`\`

\`\`\`ts
// vitest.setup.ts
import "@testing-library/jest-dom/vitest";
\`\`\`

## A Component Test

\`\`\`tsx
// components/CourseCard.test.tsx
import { render, screen } from "@testing-library/react";
import { CourseCard } from "./CourseCard";

const course = { id: "1", title: "Next.js 16", slug: "next-16", price: 2999 };

test("renders title and price", () => {
  render(<CourseCard course={course} />);
  expect(screen.getByRole("heading", { name: /next\\.js 16/i })).toBeInTheDocument();
  expect(screen.getByText("₹2,999")).toBeInTheDocument();
});
\`\`\`

## Testing a Server Action

Server Actions are just async functions. Test them like any other:

\`\`\`ts
// app/courses/actions.test.ts
import { createCourse } from "./actions";
import { db } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  db: { course: { create: vi.fn() } },
}));

vi.mock("@/lib/auth-guard", () => ({
  requireUser: vi.fn().mockResolvedValue({ id: "u1", role: "USER" }),
}));

test("creates a course with valid input", async () => {
  (db.course.create as any).mockResolvedValue({ id: "c1", slug: "abc" });
  const fd = new FormData();
  fd.set("title", "My course");
  fd.set("description", "A long enough description for validation.");
  const result = await createCourse(null, fd);
  expect(db.course.create).toHaveBeenCalled();
});
\`\`\`

## Testing Async Server Components

Server Components are async functions returning JSX. Test them directly:

\`\`\`tsx
import Page from "./page";

test("renders 5 courses", async () => {
  const el = await Page({ params: Promise.resolve({}) });
  render(el);
  expect(screen.getAllByRole("article")).toHaveLength(5);
});
\`\`\`

## What to Test

- **Server Actions** — input validation, auth checks, happy path, error paths
- **Pure utility functions** — slugify, format, validation schemas
- **Critical components** — buttons, forms, complex layouts with state
- **Permission helpers** — \`can.editCourse\`, role gates

What **not** to test in unit tests:

- Real database queries (use integration / E2E)
- Authentication flow end-to-end (use Playwright)
- Visual styling (use visual regression tools like Chromatic)

## CI Script

\`\`\`json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
\`\`\`

Add to your CI: \`npm run test:run\`.
`,
      },
      {
        title: "End-to-End Testing with Playwright",
        type: LessonType.TEXT,
        duration: 14,
        content: `# End-to-End Testing with Playwright

E2E tests open a real browser, navigate, click buttons, and verify the rendered output. Use them for **critical user journeys** — signup, checkout, the main feature loop.

## Install

\`\`\`bash
npm init playwright@latest
\`\`\`

The init wizard sets up:

- \`tests/\` folder
- \`playwright.config.ts\`
- A GitHub Action template

## A Smoke Test

\`\`\`ts
// tests/home.spec.ts
import { test, expect } from "@playwright/test";

test("home page loads and shows hero", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /learn anything/i })).toBeVisible();
});
\`\`\`

## A Real Journey

\`\`\`ts
// tests/signup.spec.ts
test("user signs up, enrolls, completes lesson 1", async ({ page }) => {
  await page.goto("/signup");

  const email = \`test+\${Date.now()}@example.com\`;
  await page.fill('[name="email"]', email);
  await page.fill('[name="password"]', "SuperSafe!23");
  await page.click('button:has-text("Create account")');

  await expect(page).toHaveURL(/\\/dashboard/);

  await page.goto("/courses/nextjs-16-complete-developer-guide");
  await page.click('button:has-text("Enroll")');
  await expect(page.getByText(/enrolled/i)).toBeVisible();

  await page.click('a:has-text("What\\'s New in Next.js 16")');
  await page.click('button:has-text("Mark complete")');
  await expect(page.getByText(/lesson complete/i)).toBeVisible();
});
\`\`\`

## Auth Setup — Reuse a Logged-In State

Reduces test time dramatically:

\`\`\`ts
// tests/setup/auth.setup.ts
import { test as setup } from "@playwright/test";

const STORAGE = "tests/.auth/user.json";

setup("authenticate", async ({ page }) => {
  await page.goto("/login");
  await page.fill('[name="email"]', "test@example.com");
  await page.fill('[name="password"]', "Password123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL("/dashboard");
  await page.context().storageState({ path: STORAGE });
});
\`\`\`

In \`playwright.config.ts\`:

\`\`\`ts
projects: [
  { name: "setup", testMatch: /.*\\.setup\\.ts/ },
  {
    name: "chromium",
    use: { ...devices["Desktop Chrome"], storageState: "tests/.auth/user.json" },
    dependencies: ["setup"],
  },
],
\`\`\`

Now every test starts already logged in.

## Network Stubbing

\`\`\`ts
await page.route("**/api/courses", (route) => {
  route.fulfill({ status: 200, json: [{ id: "1", title: "Stub" }] });
});
\`\`\`

Mock flaky third-party calls for deterministic tests.

## Running Against the Dev Server

\`playwright.config.ts\`:

\`\`\`ts
webServer: {
  command: "npm run dev",
  url: "http://localhost:3000",
  reuseExistingServer: !process.env.CI,
},
\`\`\`

\`\`\`bash
npx playwright test                # headless
npx playwright test --headed       # see the browser
npx playwright test --ui           # interactive runner
npx playwright codegen localhost:3000   # record interactions to scaffold a test
\`\`\`

## What to E2E vs Unit

| Layer | E2E | Unit |
|-------|-----|------|
| Critical flows (signup, checkout) | ✅ | ❌ |
| Edge cases in validation | ❌ | ✅ |
| Visual regressions | Playwright visual | ❌ |
| Permission rules | ❌ | ✅ |
| Server Action happy paths | ✅ | ✅ |

Aim for **5–15 high-leverage E2E tests** and dozens of unit tests. Don't try to E2E everything — they're slow.
`,
      },
      {
        title: "Deploying to Vercel",
        type: LessonType.TEXT,
        duration: 12,
        content: `# Deploying to Vercel

Vercel is built by the team behind Next.js. Deploying there is the lowest-friction option: every push to GitHub becomes a preview URL; every push to \`main\` is a production deploy.

## Setup (One-Time)

1. Push your project to GitHub
2. Visit [vercel.com/new](https://vercel.com/new) → "Import Project"
3. Pick the repo → Vercel detects Next.js automatically
4. Add environment variables (\`DATABASE_URL\`, \`SESSION_SECRET\`, etc.)
5. Click **Deploy**

That's it. Within ~90 seconds you have a live URL.

## Environment Variables

| Type | Available in |
|------|--------------|
| Production | Production deploys |
| Preview | PR & branch deploys |
| Development | \`vercel env pull\` for local |

Pull production env to your machine:

\`\`\`bash
npx vercel env pull .env.local
\`\`\`

## Preview Deployments

Every branch gets a preview URL like \`my-app-feature-x-username.vercel.app\`. Share with stakeholders before merging.

## Custom Domains

Project Settings → Domains → add \`yourdomain.com\`. Vercel issues a Let's Encrypt cert automatically. DNS:

| Type | Name | Value |
|------|------|-------|
| A | @ | 76.76.21.21 |
| CNAME | www | cname.vercel-dns.com |

## Edge & Serverless Functions

By default:

- Static pages → CDN
- Dynamic pages → Serverless Functions (Node.js)
- Routes with \`runtime = "edge"\` → Edge Functions
- Middleware → Edge Functions

Each lives at a different layer of the network — Vercel routes requests transparently.

## Caching & ISR on Vercel

\`revalidateTag\`, \`revalidatePath\`, and ISR work out of the box. The cache is shared across all regions and invalidations propagate in seconds.

## Image Optimization

\`next/image\` uses Vercel's image optimization service automatically. No \`sharp\` required, no Docker tricks.

## Production Checklist

Before flipping the switch:

- [ ] All env vars set in Vercel
- [ ] \`metadataBase\` set in \`app/layout.tsx\`
- [ ] \`sitemap.ts\` and \`robots.ts\` present
- [ ] \`next build\` runs locally without warnings
- [ ] Largest Contentful Paint < 2.5s on a real device
- [ ] Sentry or similar error tracking installed
- [ ] DB connection pooling configured

## Observability

Vercel Analytics + Speed Insights are one-click:

\`\`\`bash
npm i @vercel/analytics @vercel/speed-insights
\`\`\`

\`\`\`tsx
// app/layout.tsx
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
\`\`\`

Real-user metrics, automatically, no setup.

## Cost Model (At a Glance)

| Resource | Free Tier | Paid |
|----------|-----------|------|
| Bandwidth | 100 GB | $0.15/GB after |
| Edge function invocations | 1M | $2/M after |
| Serverless invocations | 1M | $0.65/M after |
| Build minutes | 6000/month | $0.20/min after |
| Image optimizations | 5000 | included in Pro |

For most early-stage apps, the free tier is generous. The paid plan ($20/seat) kicks in for production traffic.
`,
      },
      {
        title: "Self-Hosting with Docker",
        type: LessonType.TEXT,
        duration: 14,
        content: `# Self-Hosting with Docker

Next.js doesn't require Vercel. Any container platform — Docker, Kubernetes, Fly.io, Railway, Render — can run a Next.js app.

## next.config.ts — Standalone Output

\`\`\`ts
const config: NextConfig = {
  output: "standalone",
};
\`\`\`

With \`output: "standalone"\`, \`next build\` produces a self-contained \`.next/standalone\` folder including a minimal \`node_modules\` — perfect for Docker.

## A Production Dockerfile

\`\`\`dockerfile
# 1. Install deps with a lockfile-only layer for cacheability
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# 2. Build the app
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# 3. Run the slim production image
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
\`\`\`

## .dockerignore

\`\`\`
node_modules
.next
.git
.env.local
.env.development
README.md
tests
*.log
\`\`\`

## Build & Run

\`\`\`bash
docker build -t my-app .
docker run -p 3000:3000 \\
  -e DATABASE_URL=postgres://... \\
  -e SESSION_SECRET=... \\
  my-app
\`\`\`

## docker-compose for Local Stack

\`\`\`yaml
services:
  web:
    build: .
    ports: ["3000:3000"]
    environment:
      DATABASE_URL: postgresql://postgres:secret@db:5432/myapp
      SESSION_SECRET: dev-secret-not-for-prod
    depends_on: [db]

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: myapp
    volumes: ["db:/var/lib/postgresql/data"]

volumes:
  db:
\`\`\`

\`docker compose up\` boots the whole stack.

## ISR & Cache on Self-Hosted

The default cache uses the local filesystem — fine for single-replica, problematic for horizontal scaling. For multi-instance:

\`\`\`ts
// next.config.ts
const config: NextConfig = {
  cacheHandler: require.resolve("./cache-handler.js"),
  cacheMaxMemorySize: 0,
};
\`\`\`

Implement a Redis-backed cache handler — examples in the Next.js docs.

## Image Optimization

The default image optimizer requires \`sharp\`. \`node:20-alpine\` ships musl libc — install \`vips-dev\` build tools if you hit issues:

\`\`\`dockerfile
FROM node:20-alpine
RUN apk add --no-cache vips-dev
\`\`\`

Or set \`images: { unoptimized: true }\` and let your CDN (Cloudflare, CloudFront, Imgix) handle resizing.

## Reverse Proxy (Nginx)

\`\`\`nginx
server {
  listen 80;
  server_name yourapp.com;

  location / {
    proxy_pass http://localhost:3000;
    proxy_set_header Host \\$host;
    proxy_set_header X-Real-IP \\$remote_addr;
    proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \\$scheme;
  }
}
\`\`\`

Add Let's Encrypt with Certbot, you're production-ready.

## Pros & Cons vs Vercel

| | Vercel | Self-Hosted |
|---|---|---|
| Time to first deploy | 5 min | 1–2 hours |
| Edge network | Worldwide | Wherever you deploy |
| ISR / cache | Built-in | Bring your own |
| Image optimization | Free | sharp install needed |
| Cost at scale | $$$ | $ (raw compute) |
| Lock-in | Some | None |

For most startups, **Vercel until ~$1k/month in bills, then evaluate**. For enterprises with regulated workloads, self-host from day one.
`,
      },
      {
        title: "Production Performance Checklist",
        type: LessonType.TEXT,
        duration: 12,
        content: `# Production Performance Checklist

Before flipping the switch to prod, walk through this list. Each item is a 5-minute check that prevents a 5-hour incident.

## Build-Time Checks

- [ ] \`next build\` runs without warnings (treat warnings as errors)
- [ ] Bundle analyzer shows no unexpected large chunks
- [ ] No \`console.log\` statements remain (lint or strip with babel)
- [ ] Source maps are uploaded to Sentry / your APM but not served publicly

## Configuration

\`\`\`ts
// next.config.ts
const config: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  compiler: { removeConsole: { exclude: ["error", "warn"] } },
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};
\`\`\`

## Core Web Vitals Targets

| Metric | Good | Needs Work | Poor |
|--------|:----:|:----------:|:----:|
| LCP (Largest Contentful Paint) | < 2.5s | 2.5–4s | > 4s |
| INP (Interaction to Next Paint) | < 200ms | 200–500ms | > 500ms |
| CLS (Cumulative Layout Shift) | < 0.1 | 0.1–0.25 | > 0.25 |

Measure with PageSpeed Insights, Vercel Speed Insights, or Lighthouse on a throttled 4G profile.

## LCP Wins

1. **\`priority\` on the hero image** — adds it to the preload list
2. **Self-hosted fonts via \`next/font\`** — no DNS lookup
3. **Server-render the LCP element** — no waiting on hydration
4. **CDN-cached HTML for the entry page** — PPR if dynamic

## INP Wins

1. **Less client JS** — push more to the server
2. **Break up long tasks** — \`startTransition\` for non-urgent updates
3. **Lazy-load heavy widgets** — \`dynamic(() => import("Chart"))\`
4. **Avoid hydration storms** — small Client Components, big Server tree

## Database

- [ ] Connection pooling enabled
- [ ] Slow query logs on
- [ ] Indexes on every \`WHERE\` / \`ORDER BY\` column
- [ ] No N+1 queries (use \`include\` / \`select\` to eager-load)

## Observability

| Concern | Tool |
|---------|------|
| Errors | Sentry, Bugsnag |
| Logs | Logtail, Axiom, Datadog |
| Metrics | Vercel Analytics, Grafana |
| Uptime | BetterStack, Pingdom |

## Security

- [ ] CSP header set (start with \`Report-Only\`)
- [ ] HTTPS enforced (HSTS header)
- [ ] Rate limit on auth endpoints
- [ ] Dependency scan in CI (\`npm audit --omit=dev\`)
- [ ] Secrets in env vars only — nothing in git
- [ ] CSRF protected (Server Actions handle this; route handlers need explicit checks)

## Pre-Launch Smoke Tests

1. **Cold load**: incognito, throttled to 4G, LCP must be under 2.5s.
2. **Auth flow**: signup → login → logout → re-login. Cookies expire correctly.
3. **Payment flow** (if any): full Stripe test card path including webhook fulfillment.
4. **Recovery**: kill the app server while a request is in flight — graceful 5xx, not a hang.
5. **DB outage**: stop the database, page should show a graceful error, not crash the process.

## Post-Launch

- Monitor Sentry for the first 24h closely
- Watch p50/p95 latency in your APM
- Run a small chaos test in week 2 (kill an instance, see if traffic survives)
- Re-run Lighthouse weekly to catch regressions early
`,
      },
      {
        title: "Course Capstone Project Walkthrough",
        type: LessonType.VIDEO,
        duration: 28,
        content: "https://www.youtube.com/embed/2x7omTu0e9w",
      },
      {
        title: "Final Assessment — Next.js 16 Mastery",
        type: LessonType.QUIZ,
        duration: 20,
        quiz: {
          title: "Next.js 16 Final Assessment",
          passMark: 75,
          timeLimit: 20,
          questions: [
            {
              text: "Which output mode produces a self-contained server suitable for Docker?",
              points: 2,
              options: [
                { text: 'output: "export"' },
                { text: 'output: "standalone"', correct: true },
                { text: 'output: "static"' },
                { text: 'output: "docker"' },
              ],
            },
            {
              text: "Which file enables ISR-style time-based revalidation for a route?",
              points: 2,
              options: [
                { text: 'export const isr = 60' },
                { text: 'export const revalidate = 60', correct: true },
                { text: 'export const cache = 60' },
                { text: 'export const refresh = 60' },
              ],
            },
            {
              text: "What's the most reliable way to verify a user's identity inside a Server Action?",
              points: 2,
              options: [
                { text: "Trust an `actorId` parameter from the client" },
                { text: "Read the session from the cookie on the server and resolve the user", correct: true },
                { text: "Check the Referer header" },
                { text: "Verify a CSRF token only" },
              ],
            },
            {
              text: "Which combination correctly invalidates ISR data after a writer publishes an article?",
              points: 2,
              options: [
                { text: 'router.refresh() in a client component' },
                { text: 'revalidateTag("post:slug") inside a Server Action or webhook handler', correct: true },
                { text: 'next dev --reload' },
                { text: 'Calling location.reload()' },
              ],
            },
            {
              text: "What's the most likely reason `next build` reports a route as dynamic (λ) when you wanted it static?",
              points: 2,
              options: [
                { text: "You used Tailwind" },
                { text: "Your page calls a dynamic API like `cookies()` or `headers()` somewhere in its tree", correct: true },
                { text: "The package-lock.json is missing" },
                { text: "TypeScript is too strict" },
              ],
            },
            {
              text: "Which is the best location to enforce an admin-only access rule for a server-rendered page?",
              points: 2,
              options: [
                { text: "On the client, conditionally rendering nothing" },
                { text: "In a `useEffect` that redirects" },
                { text: "In middleware AND in the page's Server Component (defense in depth)", correct: true },
                { text: "Trust the URL only being known to admins" },
              ],
            },
            {
              text: "Which is a valid reason to choose the Edge runtime for a route?",
              points: 2,
              options: [
                { text: "You need the `fs` module" },
                { text: "Your work is short, latency-sensitive, and uses HTTP-only DB drivers", correct: true },
                { text: "You need to use sharp for image processing" },
                { text: "Your route is > 4 MB after bundling" },
              ],
            },
            {
              text: "Which is the most idiomatic Next.js 16 way to share data across many Server Components in one request?",
              points: 2,
              options: [
                { text: "Use a global variable" },
                { text: "Wrap the fetcher with React's `cache()` (and/or `\"use cache\"`) so calls are deduped per request", correct: true },
                { text: "Store the value in localStorage" },
                { text: "Pass through context only" },
              ],
            },
            {
              text: "Why is `output: \"standalone\"` recommended for Docker?",
              points: 2,
              options: [
                { text: "It enables Edge runtime" },
                { text: "It produces a minimal server bundle with only runtime deps, dramatically reducing image size", correct: true },
                { text: "It disables TypeScript" },
                { text: "It compresses static assets more aggressively" },
              ],
            },
            {
              text: "What's the right tool to compose Tailwind class names so consumer overrides win?",
              points: 2,
              options: [
                { text: "Plain string concatenation" },
                { text: "clsx alone" },
                { text: "clsx + tailwind-merge (`twMerge`)", correct: true },
                { text: "Template literals + `!important`" },
              ],
            },
          ],
        },
      },
    ],
  };
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
