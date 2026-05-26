/**
 * Coachnest — complete database seed
 *
 * Run:  npm run db:seed
 *
 * Creates:
 *   • 1 Admin  • 3 Instructors  • 5 Students
 *   • 6 Categories  • 8 Tags
 *   • 3 fully-structured Courses (sections → lessons → quizzes)
 *   • Enrollments, Reviews, Blogs, Notifications
 *
 * Password for all accounts: Password123!
 */

import "dotenv/config";
import { PrismaClient, Role, ContentStatus } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PASSWORD = "Password123!";

// ─── Clear ────────────────────────────────────────────────────────────────────

async function clearAll() {
  console.log("  Clearing tables…");
  await prisma.activityFeedEvent.deleteMany();
  await prisma.peerReview.deleteMany();
  await prisma.peerReviewAssignment.deleteMany();
  await prisma.groupNote.deleteMany();
  await prisma.studyGroupMember.deleteMany();
  await prisma.studyGroup.deleteMany();
  await prisma.forumVote.deleteMany();
  await prisma.forumReply.deleteMany();
  await prisma.forumThread.deleteMany();
  await prisma.highlight.deleteMany();
  await prisma.xpEvent.deleteMany();
  await prisma.userBadge.deleteMany();
  await prisma.userGameProfile.deleteMany();
  await prisma.contactMessage.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.couponUse.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.featurePurchase.deleteMany();
  await prisma.platformFeature.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.quizAttempt.deleteMany();
  await prisma.question.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.lessonProgress.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.section.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.review.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.order.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.courseTag.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.course.deleteMany();
  await prisma.category.deleteMany();

  await prisma.organizationMember.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.blog.deleteMany();
  await prisma.waitlistEntry.deleteMany();
  await prisma.user.deleteMany();
  console.log("  ✓ Prisma tables cleared");

  try {
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (error) throw error;
    await Promise.all(users.map((u) => supabaseAdmin.auth.admin.deleteUser(u.id)));
    console.log(`  ✓ Supabase Auth cleared (${users.length} users removed)`);
  } catch (e) {
    console.warn("  ⚠ Supabase Auth unreachable — skipping auth user cleanup (DB records already cleared)");
  }
}

// ─── Create user helper ───────────────────────────────────────────────────────

async function createUser({
  name, email, role, headline, bio, avatar,
}: {
  name: string; email: string; role: Role;
  headline?: string; bio?: string; avatar?: string;
}) {
  // Try to create via Supabase Auth; fall back to a deterministic UUID if unreachable
  let userId: string;
  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email, password: PASSWORD,
      email_confirm: true,
      user_metadata: { name, avatar: avatar ?? null },
      app_metadata: { role },
    });
    if (error || !data.user) throw new Error(error?.message ?? "No user returned");
    userId = data.user.id;
  } catch (e: unknown) {
    // Supabase Auth unreachable — generate a stable deterministic UUID from email
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`  ⚠ Auth fallback for ${email}: ${msg}`);
    // Simple deterministic UUID v5-style: hash the email into a UUID shape
    const hash = email.split("").reduce((acc, c) => ((acc << 5) - acc + c.charCodeAt(0)) | 0, 5381);
    const h = Math.abs(hash).toString(16).padStart(8, "0");
    userId = `${h.slice(0,8)}-${h.slice(0,4)}-4${h.slice(1,4)}-a${h.slice(2,5)}-${h.padEnd(12,"0").slice(0,12)}`;
  }

  return prisma.user.upsert({
    where: { id: userId },
    create: { id: userId, name, email, role, headline, bio, avatar },
    update: { name, email, role, headline, bio, avatar },
  });
}

// ─── Quiz option builder ──────────────────────────────────────────────────────

function opts(items: Array<{ text: string; correct?: boolean }>) {
  return items.map((item, i) => ({
    id: String.fromCharCode(97 + i),          // "a", "b", "c", "d"
    text: item.text,
    isCorrect: item.correct ?? false,
  }));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🌱  Coachnest seed starting…\n");

  await clearAll();
  console.log();

  // ── 1. Users ──────────────────────────────────────────────────────────────

  console.log("Creating users…");

  const admin = await createUser({
    name: "Devang Admin",
    email: "admin@coachnest.com",
    role: Role.ADMIN,
    headline: "Platform Administrator",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=DA&backgroundColor=f97316",
  });

  const instructorRahul = await createUser({
    name: "Rahul Sharma",
    email: "rahul@coachnest.com",
    role: Role.INSTRUCTOR,
    headline: "Senior Full-Stack Engineer · 8 yrs exp",
    bio: "Building web products since 2016. Passionate about React, Next.js, and clean architecture. I love breaking down complex concepts into simple, digestible lessons.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=RS&backgroundColor=3b82f6",
  });

  const instructorPriya = await createUser({
    name: "Priya Patel",
    email: "priya@coachnest.com",
    role: Role.INSTRUCTOR,
    headline: "Data Scientist & ML Engineer",
    bio: "MSc in Statistics, working in ML at a leading tech firm. I help learners go from zero to production-ready ML models with Python.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=PP&backgroundColor=8b5cf6",
  });

  const instructorAmit = await createUser({
    name: "Amit Singh",
    email: "amit@coachnest.com",
    role: Role.INSTRUCTOR,
    headline: "DevOps & Cloud Architect · AWS Certified",
    bio: "10+ years building infrastructure for scale. Docker, Kubernetes, CI/CD, and cloud-native are my daily tools. Let me teach you the DevOps mindset.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=AS&backgroundColor=22c55e",
  });

  const studentArjun   = await createUser({ name: "Arjun Kumar",   email: "arjun@example.com",   role: Role.STUDENT, headline: "Aspiring Full-Stack Dev" });
  const studentSneha   = await createUser({ name: "Sneha Gupta",   email: "sneha@example.com",   role: Role.STUDENT, headline: "UX Designer learning to code" });
  const studentRavi    = await createUser({ name: "Ravi Mehta",    email: "ravi@example.com",    role: Role.STUDENT, headline: "Data Enthusiast" });
  const studentAnjali  = await createUser({ name: "Anjali Reddy",  email: "anjali@example.com",  role: Role.STUDENT, headline: "Backend Developer" });
  const studentVikram  = await createUser({ name: "Vikram Nair",   email: "vikram@example.com",  role: Role.STUDENT, headline: "SRE at a Startup" });

  console.log("  ✓ Users created (9 total)\n");

  // ── 2. Categories & Tags ──────────────────────────────────────────────────

  console.log("Creating categories & tags…");

  const [catWeb, catData, catDevops, catDesign, catBusiness, catMobile] =
    await Promise.all([
      prisma.category.create({ data: { name: "Web Development", slug: "web-development",   icon: "🌐", color: "#3b82f6" } }),
      prisma.category.create({ data: { name: "Data Science",    slug: "data-science",      icon: "📊", color: "#8b5cf6" } }),
      prisma.category.create({ data: { name: "DevOps",          slug: "devops",            icon: "⚙️",  color: "#22c55e" } }),
      prisma.category.create({ data: { name: "UI/UX Design",    slug: "ui-ux-design",      icon: "🎨", color: "#f43f5e" } }),
      prisma.category.create({ data: { name: "Business",        slug: "business",          icon: "💼", color: "#f59e0b" } }),
      prisma.category.create({ data: { name: "Mobile Dev",      slug: "mobile-dev",        icon: "📱", color: "#06b6d4" } }),
    ]);

  const [tagReact, tagNext, tagPython, tagML, tagDocker, tagK8s, tagJS, tagTS] =
    await Promise.all([
      prisma.tag.create({ data: { name: "React",       slug: "react"       } }),
      prisma.tag.create({ data: { name: "Next.js",     slug: "nextjs"      } }),
      prisma.tag.create({ data: { name: "Python",      slug: "python"      } }),
      prisma.tag.create({ data: { name: "Machine Learning", slug: "machine-learning" } }),
      prisma.tag.create({ data: { name: "Docker",      slug: "docker"      } }),
      prisma.tag.create({ data: { name: "Kubernetes",  slug: "kubernetes"  } }),
      prisma.tag.create({ data: { name: "JavaScript",  slug: "javascript"  } }),
      prisma.tag.create({ data: { name: "TypeScript",  slug: "typescript"  } }),
    ]);

  console.log("  ✓ Categories & tags created\n");

  // ── 4. COURSE 1 — Modern React & Next.js Masterclass ─────────────────────

  console.log("Creating Course 1: Modern React & Next.js Masterclass…");

  const course1 = await prisma.course.create({ data: {
    title:         "Modern React & Next.js Masterclass",
    slug:          "modern-react-nextjs-masterclass",
    description:   "The most complete React and Next.js course on the platform. From JSX and hooks to the App Router, Server Components, and deploying production-grade applications — you will build real projects at every step.",
    shortDesc:     "Master React 18 and Next.js 14 from fundamentals to production deployment.",
    thumbnail:     "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&auto=format",
    previewVideo:  "https://www.youtube.com/embed/Tn6-PIqc4UM",
    status:        ContentStatus.PUBLISHED,
    price:         2999,
    discountPrice: 1999,
    isFree:        false,
    level:         "intermediate",
    language:      "English",
    totalDuration: 420,
    totalLessons:  9,
    categoryId:    catWeb.id,
    createdById:   instructorRahul.id,
  }});

  await prisma.courseTag.createMany({ data: [
    { courseId: course1.id, tagId: tagReact.id },
    { courseId: course1.id, tagId: tagNext.id  },
    { courseId: course1.id, tagId: tagJS.id    },
    { courseId: course1.id, tagId: tagTS.id    },
  ]});

  // Sections
  const s1a = await prisma.section.create({ data: { title: "React Foundations",  order: 1, courseId: course1.id } });
  const s1b = await prisma.section.create({ data: { title: "Hooks & State",      order: 2, courseId: course1.id } });
  const s1c = await prisma.section.create({ data: { title: "Next.js App Router", order: 3, courseId: course1.id } });

  // Section 1 lessons
  const l1_1 = await prisma.lesson.create({ data: {
    courseId: course1.id, sectionId: s1a.id, order: 1,
    title:    "Why React? — The Modern UI Revolution",
    type:     "TEXT",
    isFree:   true,
    duration: 8,
    content: `# Why React?

React is a **JavaScript library** for building user interfaces. Created by Meta in 2013, it has become the most widely used front-end library in the world, powering apps at Facebook, Netflix, Airbnb, and thousands of startups.

## The Problem React Solves

Before React, building interactive UIs meant manually manipulating the DOM with jQuery or vanilla JavaScript. This led to:

- **Spaghetti code** — hard to maintain as apps grew
- **Performance issues** — full page re-renders on every change
- **No component reuse** — writing the same UI patterns repeatedly

## React's Core Ideas

### 1. Components
Everything in React is a component — a reusable piece of UI. Think of them as custom HTML elements you design yourself.

\`\`\`jsx
function Button({ label, onClick }) {
  return (
    <button onClick={onClick} className="btn">
      {label}
    </button>
  );
}
\`\`\`

### 2. Declarative UI
Instead of writing *how* to update the DOM, you describe *what* the UI should look like at any given state. React figures out the most efficient way to make it happen.

\`\`\`jsx
// Declarative — describe the desired outcome
function Greeting({ isLoggedIn }) {
  return isLoggedIn ? <h1>Welcome back!</h1> : <h1>Please sign in.</h1>;
}
\`\`\`

### 3. The Virtual DOM
React keeps a lightweight copy of the real DOM in memory. When state changes:

1. React re-renders the virtual DOM
2. Computes the *diff* between old and new virtual DOM
3. Applies **only** the changed parts to the real DOM

This makes React extremely fast for complex, frequently-updating UIs.

## Who Uses React?

| Company      | Use Case                         |
|--------------|----------------------------------|
| Meta         | Facebook & Instagram feeds       |
| Netflix       | Browse UI & playback controls    |
| Airbnb       | Listing pages & booking flow     |
| Atlassian    | Jira & Confluence                |
| Shopify      | Merchant dashboard               |

## What You'll Build in This Course

By the end of this course you will have built:

- ✅ A personal portfolio site with Next.js
- ✅ A full-stack e-commerce storefront
- ✅ A real-time chat application using React + WebSockets

> **Prerequisites:** Basic HTML, CSS, and JavaScript (ES6+). No React experience needed.

Let's get started! 🚀`,
  }});

  const l1_2 = await prisma.lesson.create({ data: {
    courseId: course1.id, sectionId: s1a.id, order: 2,
    title:    "Setting Up Your Dev Environment",
    type:     "VIDEO",
    isFree:   false,
    duration: 12,
    content:  "https://www.youtube.com/embed/N3AkSS5hXMA",
  }});

  const l1_3 = await prisma.lesson.create({ data: {
    courseId: course1.id, sectionId: s1a.id, order: 3,
    title:    "React Foundations Quiz",
    type:     "QUIZ",
    isFree:   false,
    duration: 10,
  }});

  // Section 2 lessons
  const l1_4 = await prisma.lesson.create({ data: {
    courseId: course1.id, sectionId: s1b.id, order: 4,
    title:    "useState & useEffect Explained",
    type:     "TEXT",
    isFree:   false,
    duration: 15,
    content: `# useState & useEffect

The two most fundamental React hooks — master these and you can build almost anything.

## useState

\`useState\` lets a component "remember" values between renders.

\`\`\`jsx
import { useState } from "react";

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>+</button>
      <button onClick={() => setCount(count - 1)}>-</button>
    </div>
  );
}
\`\`\`

### Rules of State

- **State updates are asynchronous** — don't read state immediately after setting it.
- **State is immutable** — always create a new value, never mutate directly.
- Use the **functional update form** when new state depends on old state:

\`\`\`jsx
// ✅ Safe — uses functional update
setCount(prev => prev + 1);

// ❌ Risky — may use stale state
setCount(count + 1);
\`\`\`

## useEffect

\`useEffect\` runs **side effects** after render — data fetching, subscriptions, DOM manipulation.

\`\`\`jsx
import { useState, useEffect } from "react";

function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(\`/api/users/\${userId}\`)
      .then(res => res.json())
      .then(data => {
        setUser(data);
        setLoading(false);
      });
  }, [userId]); // Re-runs when userId changes

  if (loading) return <p>Loading…</p>;
  return <h2>{user?.name}</h2>;
}
\`\`\`

### The Dependency Array

| Usage                     | Behaviour                                  |
|---------------------------|--------------------------------------------|
| \`useEffect(fn)\`           | Runs after every render                    |
| \`useEffect(fn, [])\`       | Runs once (on mount)                       |
| \`useEffect(fn, [a, b])\`   | Runs when \`a\` or \`b\` changes               |

### Cleanup

Always return a cleanup function when creating subscriptions or timers:

\`\`\`jsx
useEffect(() => {
  const id = setInterval(() => setTick(t => t + 1), 1000);
  return () => clearInterval(id); // Runs on unmount
}, []);
\`\`\`

> **Common mistake:** Missing cleanup causes memory leaks in long-running apps.`,
  }});

  const l1_5 = await prisma.lesson.create({ data: {
    courseId: course1.id, sectionId: s1b.id, order: 5,
    title:    "Custom Hooks — Reusable Logic",
    type:     "VIDEO",
    isFree:   false,
    duration: 18,
    content:  "https://www.youtube.com/embed/TNhaISOUy6Q",
  }});

  const l1_6 = await prisma.lesson.create({ data: {
    courseId: course1.id, sectionId: s1b.id, order: 6,
    title:    "Context API & Global State",
    type:     "TEXT",
    isFree:   false,
    duration: 14,
    content: `# Context API & Global State

When props need to travel through many component layers, **Context** provides a clean way to share data without prop-drilling.

## The Problem: Prop Drilling

\`\`\`jsx
// ❌ Passing theme 5 levels deep just to reach a Button
<App theme="dark">
  <Layout theme="dark">
    <Sidebar theme="dark">
      <NavItem theme="dark">
        <Button theme="dark" />
      </NavItem>
    </Sidebar>
  </Layout>
</App>
\`\`\`

## The Solution: createContext

\`\`\`jsx
import { createContext, useContext, useState } from "react";

// 1. Create the context
const ThemeContext = createContext("light");

// 2. Provide the value at the top level
function App() {
  const [theme, setTheme] = useState("dark");
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <Layout />
    </ThemeContext.Provider>
  );
}

// 3. Consume anywhere in the tree — no props needed!
function Button() {
  const { theme } = useContext(ThemeContext);
  return <button className={\`btn btn-\${theme}\`}>Click me</button>;
}
\`\`\`

## When to Use Context

✅ Use Context for:
- Theme / appearance settings
- Current authenticated user
- Language / locale
- App-wide notifications

❌ Don't use Context for:
- High-frequency updates (use Zustand or Redux)
- Server state (use React Query or SWR)

## Building a Custom Context Hook

\`\`\`jsx
// auth-context.jsx
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const login  = (userData) => setUser(userData);
  const logout = ()         => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook — cleaner API for consumers
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
\`\`\`

Now any component can call \`const { user, login } = useAuth();\` directly.`,
  }});

  // Section 3 lessons
  const l1_7 = await prisma.lesson.create({ data: {
    courseId: course1.id, sectionId: s1c.id, order: 7,
    title:    "Next.js App Router In Depth",
    type:     "VIDEO",
    isFree:   false,
    duration: 22,
    content:  "https://www.youtube.com/embed/wm5gMKuwSYk",
  }});

  const l1_8 = await prisma.lesson.create({ data: {
    courseId: course1.id, sectionId: s1c.id, order: 8,
    title:    "Server Components vs Client Components",
    type:     "TEXT",
    isFree:   false,
    duration: 16,
    content: `# Server Components vs Client Components

Next.js 13+ introduced a new mental model: by default, all components are **Server Components**. You opt into client-side rendering with \`"use client"\`.

## Server Components

Server Components render **only on the server** and ship zero JavaScript to the browser.

**Benefits:**
- Direct database / filesystem access
- Smaller client bundle
- Automatic data fetching — no useEffect needed

\`\`\`tsx
// app/page.tsx — Server Component by default
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  // Direct DB query — no API route needed!
  const courses = await prisma.course.findMany({
    where: { status: "PUBLISHED" },
    take: 6,
  });

  return (
    <main>
      {courses.map(c => <CourseCard key={c.id} course={c} />)}
    </main>
  );
}
\`\`\`

## Client Components

Client Components run in the browser and support interactivity.

\`\`\`tsx
"use client"; // This directive opts the file into client rendering

import { useState } from "react";

export function LikeButton({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount);
  return (
    <button onClick={() => setCount(c => c + 1)}>
      ❤️ {count}
    </button>
  );
}
\`\`\`

## The Golden Rule

> **Keep the server/client boundary as deep as possible.**

Fetch data and prepare props in Server Components. Push interactivity (click handlers, state) down to small, leaf Client Components.

\`\`\`
app/
  page.tsx              ← Server Component (fetches data)
    CourseList.tsx       ← Server Component (renders list)
      CourseCard.tsx     ← Server Component (renders card)
        LikeButton.tsx   ← "use client" (tiny, interactive)
\`\`\`

## Quick Reference

| Feature                      | Server Component | Client Component |
|------------------------------|:----------------:|:----------------:|
| async/await at component level | ✅             | ❌              |
| Access DB / filesystem        | ✅              | ❌              |
| useState / useEffect          | ❌              | ✅              |
| Event listeners               | ❌              | ✅              |
| Browser APIs                  | ❌              | ✅              |
| Cached by Next.js             | ✅              | ❌              |`,
  }});

  const l1_9 = await prisma.lesson.create({ data: {
    courseId: course1.id, sectionId: s1c.id, order: 9,
    title:    "Final Assessment — React & Next.js",
    type:     "QUIZ",
    isFree:   false,
    duration: 20,
  }});

  // Quizzes
  const quiz1 = await prisma.quiz.create({ data: {
    lessonId: l1_3.id,
    title:    "React Foundations Quiz",
    passMark: 70,
    timeLimit: 10,
  }});
  await prisma.question.createMany({ data: [
    {
      quizId: quiz1.id, order: 1, points: 1,
      text: "Which company originally created React?",
      options: opts([
        { text: "Google" }, { text: "Meta (Facebook)", correct: true },
        { text: "Microsoft" }, { text: "Twitter" },
      ]),
    },
    {
      quizId: quiz1.id, order: 2, points: 1,
      text: "What does the Virtual DOM do?",
      options: opts([
        { text: "Stores HTML in a database" },
        { text: "Replaces CSS with JavaScript" },
        { text: "Keeps a lightweight in-memory copy of the DOM to minimise real DOM updates", correct: true },
        { text: "Connects React to a backend server" },
      ]),
    },
    {
      quizId: quiz1.id, order: 3, points: 1,
      text: "What is a React component?",
      options: opts([
        { text: "A CSS class for styling elements" },
        { text: "A reusable, self-contained piece of UI", correct: true },
        { text: "A database model" },
        { text: "A Node.js module" },
      ]),
    },
    {
      quizId: quiz1.id, order: 4, points: 1,
      text: "React's UI model is best described as:",
      options: opts([
        { text: "Imperative — you tell React exactly how to update the DOM" },
        { text: "Declarative — you describe what the UI should look like", correct: true },
        { text: "Event-driven — UI updates only on user interactions" },
        { text: "Functional — pure functions with no side effects" },
      ]),
    },
    {
      quizId: quiz1.id, order: 5, points: 1,
      text: "Which file extension is used for JSX files?",
      options: opts([
        { text: ".html" }, { text: ".xml" },
        { text: ".jsx or .tsx", correct: true }, { text: ".css" },
      ]),
    },
  ]});

  const quiz2 = await prisma.quiz.create({ data: {
    lessonId: l1_9.id,
    title:    "React & Next.js Final Assessment",
    passMark: 70,
    timeLimit: 20,
  }});
  await prisma.question.createMany({ data: [
    {
      quizId: quiz2.id, order: 1, points: 2,
      text: "Which hook is used to run side effects in React?",
      options: opts([
        { text: "useState" }, { text: "useEffect", correct: true },
        { text: "useRef" }, { text: "useMemo" },
      ]),
    },
    {
      quizId: quiz2.id, order: 2, points: 2,
      text: "What does passing an empty array [] as the dependency to useEffect do?",
      options: opts([
        { text: "Runs after every render" },
        { text: "Disables the effect entirely" },
        { text: "Runs the effect once after the initial render", correct: true },
        { text: "Causes an infinite loop" },
      ]),
    },
    {
      quizId: quiz2.id, order: 3, points: 2,
      text: "In Next.js App Router, which directive makes a component a Client Component?",
      options: opts([
        { text: '"use server"' }, { text: '"use client"', correct: true },
        { text: '"use browser"' }, { text: '"use react"' },
      ]),
    },
    {
      quizId: quiz2.id, order: 4, points: 2,
      text: "Server Components in Next.js can do which of the following?",
      options: opts([
        { text: "Use useState and useEffect" },
        { text: "Add browser event listeners" },
        { text: "Query the database directly without an API route", correct: true },
        { text: "Access localStorage" },
      ]),
    },
    {
      quizId: quiz2.id, order: 5, points: 2,
      text: "What is prop drilling?",
      options: opts([
        { text: "Passing props through many nested component layers to reach a deep child", correct: true },
        { text: "Using the useRef hook to drill into DOM nodes" },
        { text: "A performance optimisation technique" },
        { text: "A Next.js routing pattern" },
      ]),
    },
  ]});

  console.log("  ✓ Course 1 created (9 lessons, 2 quizzes)\n");

  // ── 5. COURSE 2 — Python for Data Science & ML ────────────────────────────

  console.log("Creating Course 2: Python for Data Science & ML…");

  const course2 = await prisma.course.create({ data: {
    title:         "Python for Data Science & Machine Learning",
    slug:          "python-data-science-ml",
    description:   "Go from Python beginner to building production-ready machine learning models. Covers NumPy, Pandas, Matplotlib, Scikit-learn, and real-world case studies with actual datasets.",
    shortDesc:     "From Python basics to ML models — a practical, project-driven data science course.",
    thumbnail:     "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=800&auto=format",
    previewVideo:  "https://www.youtube.com/embed/rfscVS0vtbw",
    status:        ContentStatus.PUBLISHED,
    price:         3499,
    discountPrice: 2499,
    isFree:        false,
    level:         "beginner",
    language:      "English",
    totalDuration: 360,
    totalLessons:  9,
    categoryId:    catData.id,
    createdById:   instructorPriya.id,
  }});

  await prisma.courseTag.createMany({ data: [
    { courseId: course2.id, tagId: tagPython.id },
    { courseId: course2.id, tagId: tagML.id     },
  ]});

  const s2a = await prisma.section.create({ data: { title: "Python Essentials",       order: 1, courseId: course2.id } });
  const s2b = await prisma.section.create({ data: { title: "Data Analysis with Pandas", order: 2, courseId: course2.id } });
  const s2c = await prisma.section.create({ data: { title: "Machine Learning",         order: 3, courseId: course2.id } });

  const l2_1 = await prisma.lesson.create({ data: {
    courseId: course2.id, sectionId: s2a.id, order: 1,
    title:    "Python Setup & Language Basics",
    type:     "TEXT",
    isFree:   true,
    duration: 10,
    content: `# Python Setup & Language Basics

Python is the language of data science. Its clean syntax, massive ecosystem of libraries, and active community make it the go-to choice for analysts, engineers, and researchers worldwide.

## Installation

1. Download Python 3.11+ from [python.org](https://python.org)
2. Install with the "Add to PATH" option checked
3. Verify: \`python --version\`
4. Create a virtual environment: \`python -m venv venv\`
5. Activate it: \`source venv/bin/activate\` (Mac/Linux) or \`venv\\Scripts\\activate\` (Windows)

## Variables & Data Types

\`\`\`python
# Python is dynamically typed — no declaration needed
name    = "Alice"           # str
age     = 28                # int
score   = 94.5              # float
is_pro  = True              # bool
tags    = ["ml", "python"]  # list
profile = {"role": "admin"} # dict
coords  = (12.9, 77.5)      # tuple (immutable)
\`\`\`

## Control Flow

\`\`\`python
# If / elif / else
grade = 85
if grade >= 90:
    print("A")
elif grade >= 80:
    print("B")    # → "B"
else:
    print("C")

# For loops
fruits = ["apple", "banana", "cherry"]
for fruit in fruits:
    print(fruit.upper())

# List comprehension — Pythonic!
squares = [x**2 for x in range(10)]   # [0, 1, 4, 9, 16, …]
evens   = [x for x in range(20) if x % 2 == 0]
\`\`\`

## Functions

\`\`\`python
def calculate_bmi(weight_kg: float, height_m: float) -> float:
    """Calculate Body Mass Index."""
    return weight_kg / (height_m ** 2)

bmi = calculate_bmi(70, 1.75)
print(f"Your BMI is {bmi:.1f}")  # f-string formatting

# Lambda (anonymous function)
double = lambda x: x * 2
print(double(5))   # 10
\`\`\`

## Why Python for Data Science?

| Library      | Purpose                             |
|--------------|-------------------------------------|
| NumPy        | Fast numerical arrays & math        |
| Pandas       | Data manipulation & analysis        |
| Matplotlib   | Plotting & visualisation            |
| Scikit-learn | Machine learning algorithms         |
| TensorFlow   | Deep learning                       |

In this course we'll use all of the first four extensively. Let's dive in! 🐍`,
  }});

  const l2_2 = await prisma.lesson.create({ data: {
    courseId: course2.id, sectionId: s2a.id, order: 2,
    title:    "Data Types, Functions & OOP",
    type:     "VIDEO",
    isFree:   false,
    duration: 20,
    content:  "https://www.youtube.com/embed/_uQrJ0TkZlc",
  }});

  const l2_3 = await prisma.lesson.create({ data: {
    courseId: course2.id, sectionId: s2a.id, order: 3,
    title:    "Python Fundamentals Quiz",
    type:     "QUIZ",
    isFree:   false,
    duration: 10,
  }});

  const l2_4 = await prisma.lesson.create({ data: {
    courseId: course2.id, sectionId: s2b.id, order: 4,
    title:    "NumPy Arrays & Vectorised Operations",
    type:     "TEXT",
    isFree:   false,
    duration: 18,
    content: `# NumPy Arrays & Vectorised Operations

NumPy (Numerical Python) is the backbone of scientific computing in Python. It provides the \`ndarray\` — a fast, memory-efficient multi-dimensional array.

## Why Not Just Use Python Lists?

\`\`\`python
import numpy as np
import time

# Python list — slow
data = list(range(1_000_000))
start = time.time()
result = [x * 2 for x in data]
print(f"List: {time.time() - start:.3f}s")  # ~0.08s

# NumPy array — fast
arr = np.arange(1_000_000)
start = time.time()
result = arr * 2          # vectorised — no Python loop!
print(f"NumPy: {time.time() - start:.3f}s") # ~0.002s  (40x faster)
\`\`\`

## Creating Arrays

\`\`\`python
import numpy as np

# From a Python list
a = np.array([1, 2, 3, 4, 5])

# Ranges
b = np.arange(0, 10, 2)          # [0, 2, 4, 6, 8]
c = np.linspace(0, 1, 5)         # [0., 0.25, 0.5, 0.75, 1.]

# Special arrays
zeros  = np.zeros((3, 4))         # 3×4 matrix of 0s
ones   = np.ones((2, 2))          # 2×2 matrix of 1s
eye    = np.eye(3)                 # 3×3 identity matrix
random = np.random.randn(100)      # 100 standard-normal samples
\`\`\`

## Array Maths

\`\`\`python
a = np.array([10, 20, 30, 40])
b = np.array([ 1,  2,  3,  4])

print(a + b)      # [11, 22, 33, 44]
print(a * b)      # [10, 40, 90, 160]
print(a / b)      # [10., 10., 10., 10.]
print(a ** 2)     # [100, 400, 900, 1600]
print(np.sqrt(a)) # [3.16, 4.47, 5.47, 6.32]
\`\`\`

## Indexing & Slicing

\`\`\`python
matrix = np.array([[1, 2, 3],
                   [4, 5, 6],
                   [7, 8, 9]])

print(matrix[1, 2])      # 6  (row 1, col 2)
print(matrix[:, 1])      # [2, 5, 8]  (all rows, column 1)
print(matrix[0:2, 0:2])  # top-left 2×2 submatrix

# Boolean indexing
data = np.array([15, 42, 7, 88, 23])
print(data[data > 20])   # [42, 88, 23]
\`\`\`

## Common Aggregations

\`\`\`python
prices = np.array([299, 499, 999, 149, 799])

print(prices.mean())    # 549.0
print(prices.std())     # 312.7
print(prices.min())     # 149
print(prices.max())     # 999
print(prices.sum())     # 2745
print(np.median(prices))# 499.0
\`\`\``,
  }});

  const l2_5 = await prisma.lesson.create({ data: {
    courseId: course2.id, sectionId: s2b.id, order: 5,
    title:    "Pandas DataFrames — Data Wrangling",
    type:     "VIDEO",
    isFree:   false,
    duration: 25,
    content:  "https://www.youtube.com/embed/vmEHCJofslg",
  }});

  const l2_6 = await prisma.lesson.create({ data: {
    courseId: course2.id, sectionId: s2b.id, order: 6,
    title:    "Cleaning & Transforming Real Datasets",
    type:     "TEXT",
    isFree:   false,
    duration: 20,
    content: `# Cleaning & Transforming Real Datasets

Real-world data is messy. Data cleaning typically takes 60–80% of a data scientist's time. Here's how to tackle it efficiently with Pandas.

## Loading Data

\`\`\`python
import pandas as pd

df = pd.read_csv("students.csv")
print(df.shape)          # (1200, 8) → 1200 rows, 8 columns
print(df.dtypes)         # Column data types
print(df.describe())     # Statistical summary
print(df.head())         # First 5 rows
\`\`\`

## Handling Missing Values

\`\`\`python
# Check for nulls
print(df.isnull().sum())

# Drop rows with any null
df_clean = df.dropna()

# Fill nulls with a value
df["score"] = df["score"].fillna(df["score"].median())

# Forward-fill (useful for time series)
df["price"] = df["price"].ffill()
\`\`\`

## Filtering & Selecting

\`\`\`python
# Boolean filter
high_scorers = df[df["score"] > 80]

# Multiple conditions
top = df[(df["score"] > 80) & (df["enrolled"] == True)]

# Select columns
subset = df[["name", "score", "grade"]]

# Query method (readable!)
rich_query = df.query("score > 80 and age < 30")
\`\`\`

## Applying Transformations

\`\`\`python
# Apply a function to a column
df["score_normalized"] = df["score"].apply(lambda x: (x - df["score"].mean()) / df["score"].std())

# Map categories to numbers
grade_map = {"A": 4, "B": 3, "C": 2, "D": 1, "F": 0}
df["gpa_points"] = df["grade"].map(grade_map)

# String operations
df["email_domain"] = df["email"].str.split("@").str[1]
\`\`\`

## GroupBy Aggregations

\`\`\`python
# Average score by grade
df.groupby("grade")["score"].mean()

# Multiple aggregations
summary = df.groupby("city").agg({
    "score": ["mean", "std", "count"],
    "age":   "median",
})
\`\`\`

> **Rule of thumb:** Always inspect your data with \`head()\`, \`info()\`, and \`describe()\` before doing anything. Assumptions about data are almost always wrong.`,
  }});

  const l2_7 = await prisma.lesson.create({ data: {
    courseId: course2.id, sectionId: s2c.id, order: 7,
    title:    "Scikit-learn — ML in 30 Minutes",
    type:     "VIDEO",
    isFree:   false,
    duration: 30,
    content:  "https://www.youtube.com/embed/M9Itm95nc9I",
  }});

  const l2_8 = await prisma.lesson.create({ data: {
    courseId: course2.id, sectionId: s2c.id, order: 8,
    title:    "Building & Evaluating Your First Model",
    type:     "TEXT",
    isFree:   false,
    duration: 22,
    content: `# Building & Evaluating Your First ML Model

We'll build a **classification model** to predict whether a student passes or fails based on study hours and previous scores.

## The ML Workflow

\`\`\`
1. Load & explore data
2. Clean & preprocess
3. Split into train/test sets
4. Choose & train a model
5. Evaluate performance
6. Improve (tune, feature engineer)
7. Deploy
\`\`\`

## Full Example — Student Pass/Fail Classifier

\`\`\`python
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix

# 1. Load data
df = pd.read_csv("students.csv")

# 2. Features & target
X = df[["study_hours", "prev_score", "attendance_pct"]]
y = df["passed"]   # 1 = pass, 0 = fail

# 3. Train/Test split (80% / 20%)
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# 4. Scale features (important for Logistic Regression)
scaler  = StandardScaler()
X_train = scaler.fit_transform(X_train)
X_test  = scaler.transform(X_test)     # transform only — don't fit on test!

# 5. Train model
model = LogisticRegression()
model.fit(X_train, y_train)

# 6. Evaluate
y_pred = model.predict(X_test)
print(classification_report(y_test, y_pred))
print(confusion_matrix(y_test, y_pred))
\`\`\`

## Understanding the Metrics

| Metric    | What it means                                          |
|-----------|--------------------------------------------------------|
| Accuracy  | Overall % correct predictions                          |
| Precision | Of predicted positives, how many are actually positive |
| Recall    | Of actual positives, how many did we predict correctly |
| F1 Score  | Harmonic mean of precision and recall                  |

## Common Pitfalls

- **Data leakage** — fitting the scaler on the full dataset (not just training data)
- **Class imbalance** — 95% pass rate → model predicts "pass" every time and gets 95% accuracy
- **Overfitting** — great training accuracy, poor test accuracy
- **Underfitting** — model is too simple to capture the pattern

> **Next step:** Try \`RandomForestClassifier\` and \`XGBClassifier\` on the same dataset and compare the metrics.`,
  }});

  const l2_9 = await prisma.lesson.create({ data: {
    courseId: course2.id, sectionId: s2c.id, order: 9,
    title:    "Data Science & ML Knowledge Check",
    type:     "QUIZ",
    isFree:   false,
    duration: 15,
  }});

  const quiz3 = await prisma.quiz.create({ data: {
    lessonId: l2_3.id,
    title:    "Python Fundamentals Quiz",
    passMark: 70,
    timeLimit: 10,
  }});
  await prisma.question.createMany({ data: [
    {
      quizId: quiz3.id, order: 1, points: 1,
      text: "Which data type represents an ordered, immutable sequence in Python?",
      options: opts([
        { text: "list" }, { text: "dict" },
        { text: "tuple", correct: true }, { text: "set" },
      ]),
    },
    {
      quizId: quiz3.id, order: 2, points: 1,
      text: "What does the following code print?  squares = [x**2 for x in range(4)]",
      options: opts([
        { text: "[1, 4, 9, 16]" },
        { text: "[0, 1, 4, 9]", correct: true },
        { text: "[0, 2, 4, 6]" },
        { text: "[1, 2, 3, 4]" },
      ]),
    },
    {
      quizId: quiz3.id, order: 3, points: 1,
      text: "What keyword is used to define a function in Python?",
      options: opts([
        { text: "function" }, { text: "fun" },
        { text: "define" }, { text: "def", correct: true },
      ]),
    },
    {
      quizId: quiz3.id, order: 4, points: 1,
      text: "Which library is the primary tool for data manipulation in Python?",
      options: opts([
        { text: "NumPy" }, { text: "Pandas", correct: true },
        { text: "Matplotlib" }, { text: "Requests" },
      ]),
    },
  ]});

  const quiz4 = await prisma.quiz.create({ data: {
    lessonId: l2_9.id,
    title:    "ML Knowledge Check",
    passMark: 70,
    timeLimit: 15,
  }});
  await prisma.question.createMany({ data: [
    {
      quizId: quiz4.id, order: 1, points: 2,
      text: "What is the correct order for train_test_split when preventing data leakage with scaling?",
      options: opts([
        { text: "Scale all data first, then split" },
        { text: "Split first, then fit the scaler on training data only", correct: true },
        { text: "The order doesn't matter" },
        { text: "Scale only the test data" },
      ]),
    },
    {
      quizId: quiz4.id, order: 2, points: 2,
      text: "A model achieves 95% accuracy on imbalanced data (95% class 0). This is likely because:",
      options: opts([
        { text: "The model is excellent" },
        { text: "The model always predicts class 0", correct: true },
        { text: "Overfitting occurred" },
        { text: "The features are irrelevant" },
      ]),
    },
    {
      quizId: quiz4.id, order: 3, points: 2,
      text: "NumPy is significantly faster than Python lists for numerical operations because:",
      options: opts([
        { text: "NumPy uses multithreading by default" },
        { text: "NumPy stores data in contiguous typed memory and uses vectorised C operations", correct: true },
        { text: "NumPy avoids using RAM" },
        { text: "Python lists are always converted to NumPy arrays internally" },
      ]),
    },
    {
      quizId: quiz4.id, order: 4, points: 2,
      text: "Which metric should you use when false negatives are very costly (e.g., disease detection)?",
      options: opts([
        { text: "Accuracy" }, { text: "Precision" },
        { text: "Recall", correct: true }, { text: "Specificity" },
      ]),
    },
  ]});

  console.log("  ✓ Course 2 created (9 lessons, 2 quizzes)\n");

  // ── 6. COURSE 3 — DevOps Essentials ──────────────────────────────────────

  console.log("Creating Course 3: DevOps Essentials: Docker to Kubernetes…");

  const course3 = await prisma.course.create({ data: {
    title:         "DevOps Essentials: Docker to Kubernetes",
    slug:          "devops-docker-kubernetes",
    description:   "Master the DevOps toolchain from first principles. You will containerise applications with Docker, orchestrate them with Kubernetes, build CI/CD pipelines with GitHub Actions, and deploy to the cloud — all with hands-on labs.",
    shortDesc:     "Container fundamentals to production Kubernetes — hands-on DevOps for engineers.",
    thumbnail:     "https://images.unsplash.com/photo-1605745341112-85968b19335b?w=800&auto=format",
    previewVideo:  "https://www.youtube.com/embed/Gjnup-PuquQ",
    status:        ContentStatus.PUBLISHED,
    price:         4499,
    discountPrice: 2999,
    isFree:        false,
    level:         "advanced",
    language:      "English",
    totalDuration: 300,
    totalLessons:  6,
    categoryId:    catDevops.id,
    createdById:   instructorAmit.id,
  }});

  await prisma.courseTag.createMany({ data: [
    { courseId: course3.id, tagId: tagDocker.id },
    { courseId: course3.id, tagId: tagK8s.id    },
  ]});

  const s3a = await prisma.section.create({ data: { title: "Docker Fundamentals", order: 1, courseId: course3.id } });
  const s3b = await prisma.section.create({ data: { title: "Kubernetes",          order: 2, courseId: course3.id } });

  const l3_1 = await prisma.lesson.create({ data: {
    courseId: course3.id, sectionId: s3a.id, order: 1,
    title:    "Container Fundamentals",
    type:     "TEXT",
    isFree:   true,
    duration: 12,
    content: `# Container Fundamentals

Before Docker, deploying software was painful. "It works on my machine" was a running joke — and a real problem. Containers solve this once and for all.

## Virtual Machines vs Containers

| Feature              | Virtual Machine         | Container               |
|----------------------|-------------------------|-------------------------|
| Startup time         | 30–120 seconds          | < 1 second              |
| Size                 | GBs                     | MBs                     |
| OS overhead          | Full OS per VM          | Shares host OS kernel   |
| Isolation            | Hardware-level          | Process-level           |
| Portability          | Good (OVF format)       | Excellent (Docker Hub)  |

## What is a Container?

A container is a **standardised, isolated process** that packages:
- The application code
- Runtime (Python, Node, JVM, etc.)
- System libraries & dependencies
- Configuration files

The same container image runs identically on:
- Your laptop (macOS, Windows, Linux)
- A CI/CD runner
- A production server in any cloud

## Docker Architecture

\`\`\`
┌─────────────────────────────────────────┐
│               Your Machine              │
│  ┌─────────────┐   ┌──────────────────┐ │
│  │  Docker CLI  │──▶│  Docker Daemon   │ │
│  └─────────────┘   │  (dockerd)       │ │
│                    └────────┬─────────┘ │
│                             │           │
│          ┌──────────────────┼──────┐    │
│          │     Containers   │      │    │
│          │  ┌───────┐  ┌───────┐  │    │
│          │  │ App A │  │ App B │  │    │
│          │  └───────┘  └───────┘  │    │
│          └──────────────────────────┘   │
└─────────────────────────────────────────┘
\`\`\`

## Your First Container

\`\`\`bash
# Pull and run an nginx web server
docker run -d -p 8080:80 --name my-nginx nginx

# Visit http://localhost:8080 to see it running

# List running containers
docker ps

# Stop & remove
docker stop my-nginx
docker rm my-nginx
\`\`\`

## The Dockerfile

A \`Dockerfile\` is the blueprint for your container image:

\`\`\`dockerfile
# Start from an official Node.js image
FROM node:20-alpine

# Set the working directory
WORKDIR /app

# Copy and install dependencies first (for layer caching)
COPY package*.json ./
RUN npm ci --only=production

# Copy app code
COPY . .

# Expose the port your app listens on
EXPOSE 3000

# Start the app
CMD ["node", "server.js"]
\`\`\`

\`\`\`bash
# Build the image
docker build -t my-app:1.0 .

# Run it
docker run -p 3000:3000 my-app:1.0
\`\`\`

Understanding these basics unlocks the entire DevOps ecosystem. Let's go deeper! 🐳`,
  }});

  const l3_2 = await prisma.lesson.create({ data: {
    courseId: course3.id, sectionId: s3a.id, order: 2,
    title:    "Docker in Practice — Compose & Networking",
    type:     "VIDEO",
    isFree:   false,
    duration: 35,
    content:  "https://www.youtube.com/embed/fqMOX6JJhGo",
  }});

  const l3_3 = await prisma.lesson.create({ data: {
    courseId: course3.id, sectionId: s3a.id, order: 3,
    title:    "Docker Assessment",
    type:     "QUIZ",
    isFree:   false,
    duration: 15,
  }});

  const l3_4 = await prisma.lesson.create({ data: {
    courseId: course3.id, sectionId: s3b.id, order: 4,
    title:    "Kubernetes Architecture & Core Concepts",
    type:     "TEXT",
    isFree:   false,
    duration: 20,
    content: `# Kubernetes Architecture & Core Concepts

Kubernetes (K8s) is the industry-standard container orchestration platform. It automates deployment, scaling, and management of containerised applications.

## Why Kubernetes?

Running one container on one server is easy. Running **thousands of containers across hundreds of servers** is not. Kubernetes solves:

- **Scheduling** — which containers run on which nodes?
- **Self-healing** — restart failed containers automatically
- **Scaling** — add more instances when load increases
- **Rolling updates** — deploy new versions with zero downtime
- **Service discovery** — containers find each other by name, not IP

## The Control Plane

\`\`\`
┌─────────────────────────────────────────────────┐
│               Kubernetes Cluster                 │
│                                                  │
│  ┌─────────────────────────────────────────┐    │
│  │            Control Plane                 │    │
│  │  ┌──────────┐  ┌───────┐  ┌──────────┐  │    │
│  │  │ API Server│  │  etcd │  │ Scheduler│  │    │
│  │  └──────────┘  └───────┘  └──────────┘  │    │
│  └─────────────────────────────────────────┘    │
│                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐   │
│  │  Node 1  │    │  Node 2  │    │  Node 3  │   │
│  │ ┌──────┐ │    │ ┌──────┐ │    │ ┌──────┐ │   │
│  │ │ Pod  │ │    │ │ Pod  │ │    │ │ Pod  │ │   │
│  │ └──────┘ │    │ └──────┘ │    │ └──────┘ │   │
│  └──────────┘    └──────────┘    └──────────┘   │
└─────────────────────────────────────────────────┘
\`\`\`

## Core Objects

### Pod
The smallest deployable unit — one or more containers that share networking and storage.

\`\`\`yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app
spec:
  containers:
  - name: app
    image: my-app:1.0
    ports:
    - containerPort: 3000
\`\`\`

### Deployment
Manages a set of identical Pods. Handles rolling updates and rollbacks.

\`\`\`yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3              # Run 3 Pods
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
      - name: app
        image: my-app:1.0
        ports:
        - containerPort: 3000
        resources:
          requests:
            cpu: "100m"
            memory: "128Mi"
          limits:
            cpu: "250m"
            memory: "256Mi"
\`\`\`

### Service
Provides a stable network endpoint to reach a set of Pods.

\`\`\`yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app-svc
spec:
  selector:
    app: my-app
  ports:
  - port: 80
    targetPort: 3000
  type: ClusterIP    # or LoadBalancer for external access
\`\`\`

## Essential kubectl Commands

\`\`\`bash
kubectl get pods                     # List pods
kubectl get deployments              # List deployments
kubectl describe pod my-app          # Detailed info
kubectl logs my-app-abc123           # Pod logs
kubectl exec -it my-app-abc123 -- sh # Shell into pod
kubectl apply -f deployment.yaml     # Apply config
kubectl scale deploy/my-app --replicas=5  # Scale up
kubectl rollout undo deploy/my-app   # Rollback
\`\`\``,
  }});

  const l3_5 = await prisma.lesson.create({ data: {
    courseId: course3.id, sectionId: s3b.id, order: 5,
    title:    "Deploying a Full-Stack App on Kubernetes",
    type:     "VIDEO",
    isFree:   false,
    duration: 40,
    content:  "https://www.youtube.com/embed/X48VuDVv0do",
  }});

  const l3_6 = await prisma.lesson.create({ data: {
    courseId: course3.id, sectionId: s3b.id, order: 6,
    title:    "DevOps Final Assessment",
    type:     "QUIZ",
    isFree:   false,
    duration: 20,
  }});

  const quiz5 = await prisma.quiz.create({ data: {
    lessonId: l3_3.id,
    title:    "Docker Assessment",
    passMark: 70,
    timeLimit: 15,
  }});
  await prisma.question.createMany({ data: [
    {
      quizId: quiz5.id, order: 1, points: 1,
      text: "What is the command to build a Docker image from a Dockerfile in the current directory?",
      options: opts([
        { text: "docker create ." },
        { text: "docker build -t my-image .", correct: true },
        { text: "docker run -b ." },
        { text: "docker make ." },
      ]),
    },
    {
      quizId: quiz5.id, order: 2, points: 1,
      text: "What does the -p 8080:80 flag do in docker run?",
      options: opts([
        { text: "Limits CPU to 80% of 8080 MHz" },
        { text: "Maps host port 8080 to container port 80", correct: true },
        { text: "Sets the container name to 8080:80" },
        { text: "Exposes port 80 to the internet" },
      ]),
    },
    {
      quizId: quiz5.id, order: 3, points: 1,
      text: "What is the main advantage of using COPY package*.json ./ before COPY . . in a Dockerfile?",
      options: opts([
        { text: "It makes the image smaller" },
        { text: "It enables Docker layer caching for node_modules — only reinstalls when dependencies change", correct: true },
        { text: "It is required by npm" },
        { text: "It runs npm install automatically" },
      ]),
    },
    {
      quizId: quiz5.id, order: 4, points: 1,
      text: "Which of the following best describes the difference between a Docker image and a container?",
      options: opts([
        { text: "They are the same thing with different names" },
        { text: "An image is a read-only blueprint; a container is a running instance of an image", correct: true },
        { text: "A container is stored on Docker Hub; an image runs locally" },
        { text: "Images contain data; containers contain code" },
      ]),
    },
  ]});

  const quiz6 = await prisma.quiz.create({ data: {
    lessonId: l3_6.id,
    title:    "Kubernetes & DevOps Assessment",
    passMark: 70,
    timeLimit: 20,
  }});
  await prisma.question.createMany({ data: [
    {
      quizId: quiz6.id, order: 1, points: 2,
      text: "In Kubernetes, what is the smallest deployable unit?",
      options: opts([
        { text: "Container" }, { text: "Pod", correct: true },
        { text: "Deployment" }, { text: "Node" },
      ]),
    },
    {
      quizId: quiz6.id, order: 2, points: 2,
      text: "What does a Kubernetes Deployment provide over running pods directly?",
      options: opts([
        { text: "Lower latency" },
        { text: "Direct internet access" },
        { text: "Automated rolling updates, rollbacks, and self-healing", correct: true },
        { text: "Cheaper cloud costs" },
      ]),
    },
    {
      quizId: quiz6.id, order: 3, points: 2,
      text: "What is etcd used for in the Kubernetes control plane?",
      options: opts([
        { text: "Running application workloads" },
        { text: "Serving as a distributed key-value store for all cluster state", correct: true },
        { text: "Load balancing traffic between nodes" },
        { text: "Building container images" },
      ]),
    },
    {
      quizId: quiz6.id, order: 4, points: 2,
      text: "Which kubectl command rolls back a deployment to the previous version?",
      options: opts([
        { text: "kubectl revert deploy/my-app" },
        { text: "kubectl undo deploy/my-app" },
        { text: "kubectl rollout undo deploy/my-app", correct: true },
        { text: "kubectl reset deploy/my-app" },
      ]),
    },
  ]});

  console.log("  ✓ Course 3 created (6 lessons, 2 quizzes)\n");

  // ── 7. Enrollments & Reviews ──────────────────────────────────────────────

  console.log("Creating enrollments & reviews…");

  await prisma.enrollment.createMany({ data: [
    // Arjun (PRO) — enrolled in React & Python courses
    { userId: studentArjun.id,  courseId: course1.id },
    { userId: studentArjun.id,  courseId: course2.id },
    // Sneha (BASIC) — enrolled in React course
    { userId: studentSneha.id,  courseId: course1.id },
    // Anjali (PRO) — enrolled in all 3
    { userId: studentAnjali.id, courseId: course1.id },
    { userId: studentAnjali.id, courseId: course2.id },
    { userId: studentAnjali.id, courseId: course3.id },
    // Vikram (FREE, STUDENT) — DevOps course (can access free lessons only)
    { userId: studentVikram.id, courseId: course3.id },
  ]});

  await prisma.review.createMany({ data: [
    {
      userId: studentArjun.id,  courseId: course1.id, rating: 5,
      comment: "Absolutely fantastic course. Rahul explains React in a way that finally made hooks click for me. The Next.js section on Server Components is the best I've found anywhere.",
    },
    {
      userId: studentSneha.id,  courseId: course1.id, rating: 4,
      comment: "Great content and well-structured. I went from knowing nothing about React to building a portfolio site. Would love more advanced project examples.",
    },
    {
      userId: studentAnjali.id, courseId: course1.id, rating: 5,
      comment: "I've taken React courses before but this one finally made everything click together. The Context API lesson alone was worth the price.",
    },
    {
      userId: studentArjun.id,  courseId: course2.id, rating: 5,
      comment: "Priya's teaching style is phenomenal. The data cleaning section saved me hours at work the very next day. Highly recommended for anyone entering data science.",
    },
    {
      userId: studentAnjali.id, courseId: course2.id, rating: 4,
      comment: "The ML section is beginner-friendly and very practical. I would've liked to see more on deep learning, but overall a solid foundation course.",
    },
    {
      userId: studentAnjali.id, courseId: course3.id, rating: 5,
      comment: "Amit knows his stuff inside out. The Kubernetes section goes deeper than any YouTube tutorial and the hands-on labs are excellent. Essential for any backend engineer.",
    },
    {
      userId: studentVikram.id, courseId: course3.id, rating: 4,
      comment: "The Docker fundamentals module is free and extremely well-made. The paid K8s section is even better. Finally understand how our production cluster is structured.",
    },
  ]});

  console.log("  ✓ Enrollments & reviews created\n");

  // ── 8. Notifications ──────────────────────────────────────────────────────

  console.log("Creating notifications…");

  await prisma.notification.createMany({ data: [
    {
      userId: studentArjun.id, type: "PURCHASE", read: false,
      title: "Pro Plan Activated! 🎉",
      body:  "Welcome to Coachnest Pro. You now have unlimited access to every course. Start learning now!",
      link:  "/courses",
    },
    {
      userId: studentArjun.id, type: "COURSE_UPDATE", read: false,
      title: "New lesson in React Masterclass",
      body:  "Rahul just added 'Advanced Patterns with Server Actions' — check it out!",
      link:  `/courses/${course1.id}`,
    },
    {
      userId: studentSneha.id, type: "PURCHASE", read: true,
      title: "Basic Plan Activated!",
      body:  "Welcome to Coachnest Basic. Access up to 5 courses. Start learning now!",
      link:  "/courses",
    },
    {
      userId: studentAnjali.id, type: "PURCHASE", read: false,
      title: "Pro Plan Activated! 🎉",
      body:  "Welcome to Coachnest Pro. Unlimited access is now yours!",
      link:  "/courses",
    },
    {
      userId: studentAnjali.id, type: "REVIEW", read: true,
      title: "Your review was helpful!",
      body:  "10 learners found your review of 'Modern React & Next.js Masterclass' helpful.",
      link:  `/courses/${course1.id}`,
    },
  ]});

  console.log("  ✓ Notifications created\n");

  // ── 9. Blogs ──────────────────────────────────────────────────────────────

  console.log("Creating blog posts…");

  await prisma.blog.createMany({ data: [
    {
      authorId:  instructorRahul.id,
      title:     "React Server Components: The End of useEffect for Data Fetching?",
      slug:      "react-server-components-end-of-useeffect",
      status:    ContentStatus.PUBLISHED,
      tags:      "React,Next.js,Performance",
      readTime:  7,
      excerpt:   "Server Components fundamentally change how we think about data fetching in React. Are the days of useEffect + fetch finally over?",
      thumbnail: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&auto=format",
      content: `# React Server Components: The End of useEffect for Data Fetching?

Since React 18 and Next.js 13 introduced Server Components, I've been rebuilding the way I think about data fetching. The short answer: **yes, for the majority of use cases, useEffect-based fetching is now a code smell**.

## The Old Way

For years, the pattern for data fetching in React was:

\`\`\`jsx
function CourseList() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/courses")
      .then(r => r.json())
      .then(data => {
        setCourses(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <Spinner />;
  return courses.map(c => <CourseCard key={c.id} course={c} />);
}
\`\`\`

This works, but it has real problems:
- Shows a loading spinner on every page visit
- No caching by default
- Data isn't available at the time of server render (bad for SEO)
- The component re-renders twice: once with empty state, once with data

## The New Way: Server Components

\`\`\`tsx
// app/courses/page.tsx
import { prisma } from "@/lib/prisma";

export default async function CoursesPage() {
  // This runs on the server — no useEffect, no loading state
  const courses = await prisma.course.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main>
      {courses.map(c => <CourseCard key={c.id} course={c} />)}
    </main>
  );
}
\`\`\`

The page renders fully on the server with all data in place. Zero JavaScript for the fetching logic is shipped to the browser.

## When to Still Use useEffect

Server Components can't replace all data fetching. Use client-side fetching (or libraries like React Query) when:

1. **Real-time data** — stock prices, live scores
2. **User-triggered fetches** — search results as you type
3. **Mutations** — submitting forms
4. **Data that changes without a page reload** — notifications polling

## Performance Impact

In a benchmark I ran on a course listing page with 40 items:

| Approach              | Time to First Byte | Largest Contentful Paint |
|-----------------------|:------------------:|:------------------------:|
| useEffect + API Route | 220ms              | 1,840ms                  |
| Server Component      | 180ms              | 390ms                    |

The LCP improvement is dramatic because the HTML arrives pre-populated.

## Conclusion

Server Components are not a replacement for all client-side fetching — but for the 80% of data fetching that is "get this data and render it on page load", they are strictly better. Migrate your useEffect fetches today.`,
    },
    {
      authorId:  instructorPriya.id,
      title:     "5 Pandas Tricks That Saved Me 3 Hours Every Week",
      slug:      "pandas-tricks-productivity",
      status:    ContentStatus.PUBLISHED,
      tags:      "Python,Pandas,Data Science",
      readTime:  5,
      excerpt:   "After three years of daily Pandas usage, here are the operations I use most that most beginners don't know about.",
      thumbnail: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=800&auto=format",
      content: `# 5 Pandas Tricks That Saved Me 3 Hours Every Week

I've been doing data analysis with Pandas since 2021. After learning these five patterns, I stopped dreading the "data wrangling" phase of every project.

## 1. pipe() for Readable Transformation Chains

Instead of nested function calls or intermediate variables, use \`pipe()\`:

\`\`\`python
# ❌ Hard to read
result = normalize(drop_nulls(filter_outliers(df)))

# ✅ Readable pipeline
result = (
    df
    .pipe(filter_outliers)
    .pipe(drop_nulls)
    .pipe(normalize)
)
\`\`\`

## 2. assign() for Clean Column Creation

\`\`\`python
# ❌ Mutates df in-place — hard to undo
df["revenue"] = df["price"] * df["quantity"]
df["profit"]  = df["revenue"] - df["cost"]

# ✅ Returns a new DataFrame — chainable, safe
result = df.assign(
    revenue = lambda x: x["price"] * x["quantity"],
    profit  = lambda x: x["revenue"] - x["cost"],  # uses the new revenue column!
)
\`\`\`

## 3. query() for Readable Filters

\`\`\`python
# ❌ Verbose boolean indexing
top = df[(df["score"] > 80) & (df["age"] < 30) & (df["country"] == "IN")]

# ✅ SQL-style query
top = df.query("score > 80 and age < 30 and country == 'IN'")

# You can even reference Python variables with @
threshold = 80
top = df.query("score > @threshold")
\`\`\`

## 4. pd.cut() and pd.qcut() for Binning

\`\`\`python
# Divide scores into grade bands
df["grade"] = pd.cut(
    df["score"],
    bins=[0, 50, 70, 85, 100],
    labels=["F", "C", "B", "A"],
)

# Divide into quantile-based groups (equal size)
df["tier"] = pd.qcut(df["revenue"], q=4, labels=["Low", "Mid", "High", "Top"])
\`\`\`

## 5. .style for Quick EDA Reports

When sharing analysis with non-technical stakeholders:

\`\`\`python
summary = df.groupby("category")["revenue"].agg(["sum", "mean", "count"])

styled = (
    summary.style
    .background_gradient(subset=["sum"], cmap="Greens")
    .format({"sum": "₹{:,.0f}", "mean": "₹{:,.0f}"})
    .set_caption("Revenue by Category")
)
# Display in Jupyter: styled
# Export to HTML: styled.to_html("report.html")
\`\`\`

These five patterns alone cut my daily wrangling time in half. The key insight: Pandas is most powerful when you chain operations rather than writing imperative loops.`,
    },
    {
      authorId:  instructorAmit.id,
      title:     "Docker Compose vs Kubernetes: When to Use Which",
      slug:      "docker-compose-vs-kubernetes",
      status:    ContentStatus.PUBLISHED,
      tags:      "Docker,Kubernetes,DevOps",
      readTime:  6,
      excerpt:   "A practical decision framework for choosing between Docker Compose and Kubernetes based on team size, traffic, and complexity.",
      thumbnail: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=800&auto=format",
      content: `# Docker Compose vs Kubernetes: When to Use Which

The number one question I get from junior DevOps engineers: "Should I use Docker Compose or Kubernetes?" The answer is almost always obvious once you understand what each tool is designed for.

## What They Have in Common

Both tools:
- Define multi-container applications as code (YAML)
- Create private networks between services
- Handle container lifecycle (start, stop, restart)
- Mount volumes for persistent storage

## Docker Compose — The Right Choice For

**Local development:**

\`\`\`yaml
# docker-compose.yml
services:
  app:
    build: .
    ports: ["3000:3000"]
    environment:
      DATABASE_URL: postgresql://postgres:secret@db:5432/myapp
    depends_on: [db, redis]
    volumes:
      - .:/app               # Hot reload in development

  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: secret

  redis:
    image: redis:7-alpine
\`\`\`

Start with one command: \`docker compose up\`.

**When to choose Compose:**
- ✅ Local dev environments
- ✅ Simple staging environments (single server)
- ✅ Teams of 1–5 engineers
- ✅ Apps with < 10 services
- ✅ Predictable, low-variable traffic

## Kubernetes — The Right Choice For

**Production at scale:**

\`\`\`yaml
# deployment.yaml (just one of ~5 files you'll need)
apiVersion: apps/v1
kind: Deployment
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: app
        image: my-app:1.5
        resources:
          requests: { cpu: "200m", memory: "256Mi" }
          limits:   { cpu: "500m", memory: "512Mi" }
\`\`\`

**When to choose Kubernetes:**
- ✅ Multiple servers / regions
- ✅ Auto-scaling requirements (traffic spikes)
- ✅ Zero-downtime deployments are critical
- ✅ Teams of 5+ with dedicated platform engineers
- ✅ Multiple environments (dev, staging, prod) with the same config
- ✅ Microservices with 10+ services

## The Decision Framework

| Criteria                          | Compose | Kubernetes |
|-----------------------------------|:-------:|:----------:|
| Setup complexity                  | Low     | High       |
| Learning curve                    | Easy    | Steep      |
| Auto-scaling                      | ❌      | ✅         |
| Multi-server (HA)                 | ❌      | ✅         |
| Rolling deployments               | Manual  | Built-in   |
| Secrets management                | Basic   | Advanced   |
| Monitoring & observability        | Manual  | Ecosystem  |
| Suitable for solo/small teams     | ✅      | ❌         |

## My Recommendation

Start with **Docker Compose** (even in production) until you hit one of these limits:
1. You need to run on multiple servers
2. You need auto-scaling
3. A single deployment causes downtime

At that point, **and only at that point**, move to Kubernetes. Many successful startups run on Compose with a single beefy server until ₹10 crore in ARR.

Don't optimise for problems you don't have yet.`,
    },
  ]});

  console.log("  ✓ Blog posts created (3)\n");

  // ── 10. Game Profiles ─────────────────────────────────────────────────────

  console.log("Creating game profiles…");

  await prisma.userGameProfile.createMany({ data: [
    { userId: studentArjun.id,  xp: 350, level: 4, streak: 5, longestStreak: 12, lastActiveDate: new Date() },
    { userId: studentSneha.id,  xp: 150, level: 2, streak: 2, longestStreak:  5, lastActiveDate: new Date() },
    { userId: studentAnjali.id, xp: 500, level: 5, streak: 8, longestStreak: 20, lastActiveDate: new Date() },
    { userId: studentRavi.id,   xp:  50, level: 1, streak: 1, longestStreak:  1, lastActiveDate: new Date() },
    { userId: studentVikram.id, xp: 100, level: 2, streak: 0, longestStreak:  3, lastActiveDate: new Date() },
  ]});

  console.log("  ✓ Game profiles created\n");

  // ── 11. Platform Features ─────────────────────────────────────────────────

  console.log("Creating platform features…");

  await prisma.platformFeature.upsert({
    where:  { slug: "community" },
    update: {},
    create: {
      name:        "Community Access",
      slug:        "community",
      description: "Join the full community experience — post in discussion forums, create and join study groups, submit work for peer review, and participate in the activity feed.",
      price:       499,
      isActive:    true,
    },
  });

  console.log("  ✓ Platform features created (community)\n");

  // ── Done ──────────────────────────────────────────────────────────────────

  console.log("═══════════════════════════════════════════════════");
  console.log("  ✅  Seed complete!");
  console.log("═══════════════════════════════════════════════════");
  console.log("");
  console.log("  Accounts (password: Password123!)");
  console.log("  ─────────────────────────────────────────────────");
  console.log("  admin@coachnest.com    → Admin");
  console.log("  rahul@coachnest.com    → Instructor (React / Next.js)");
  console.log("  priya@coachnest.com    → Instructor (Python / ML)");
  console.log("  amit@coachnest.com     → Instructor (DevOps)");
  console.log("  arjun@example.com      → Student (PRO)");
  console.log("  sneha@example.com      → Student (BASIC)");
  console.log("  ravi@example.com       → Student (FREE)");
  console.log("  anjali@example.com     → Student (PRO)");
  console.log("  vikram@example.com     → Student (FREE)");
  console.log("");
  console.log("  Courses");
  console.log("  ─────────────────────────────────────────────────");
  console.log("  1. Modern React & Next.js Masterclass  (9 lessons)");
  console.log("  2. Python for Data Science & ML         (9 lessons)");
  console.log("  3. DevOps Essentials: Docker → K8s     (6 lessons)");
  console.log("  Total: 24 lessons, 6 quizzes, 3 blogs");
  console.log("═══════════════════════════════════════════════════\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
