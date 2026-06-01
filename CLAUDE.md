# Coachnest — Claude Code Guide

## Project Overview

**Coachnest** (`coachnest` v0.2.0) is a full-stack online learning platform. It supports three user roles — Student, Instructor, and Admin — each with their own portal. Core capabilities: course creation/delivery, Razorpay payments with dynamic revenue splits, gamification engine, community tools (forums, groups, peer review), and a blog.

---

## Tech Stack (Actual)

| Concern | Technology |
|---|---|
| Framework | Next.js 16.2.6 (App Router, RSC) |
| Language | TypeScript 5 (strict) |
| UI | React 19, Tailwind CSS 3.4, Radix UI, Framer Motion 11 |
| ORM | Prisma 5.16 |
| Database | PostgreSQL via Supabase (pooled + direct) |
| Auth | Supabase Auth (`@supabase/ssr` v0.10) |
| Payments | Razorpay 2.9.6 (NOT Stripe) |
| Email | Resend 3.4 |
| File Storage | Cloudinary |
| PDF | @react-pdf/renderer 4.3.2 + pdf-lib |
| Charts | Recharts 2.12 |
| Validation | Zod 3.23 |
| Real-time | Supabase Realtime channels |

> **Note:** The README and docs/ARCHITECTURE.md reference Stripe and MySQL — these are outdated. The live stack uses **Razorpay** and **PostgreSQL via Supabase**.

---

## Development Commands

```bash
npm run dev          # Start dev server on :3000
npm run build        # prisma generate && next build
npm run lint         # ESLint (next lint)

# Database
npm run db:push      # Push schema changes (no migration file)
npm run db:migrate   # Run prisma migrate dev (creates migration)
npm run db:generate  # Regenerate Prisma client only
npm run db:studio    # Open Prisma Studio GUI
npm run db:seed      # Seed with demo data
npm run db:seed:blogs        # Seed blog posts
npm run db:seed:nextjs       # Seed a Next.js course
npm run db:seed:emails       # Seed email templates
```

---

## Environment Variables

Required in `.env.local`:

```
# Database (Supabase)
DATABASE_URL=           # Pooled connection (port 6543, PgBouncer)
DIRECT_URL=             # Direct connection (port 5432, for migrations)

# Auth
JWT_SECRET=             # 32-byte hex secret

# App
NEXT_PUBLIC_APP_URL=    # e.g. http://localhost:3000
NEXT_PUBLIC_APP_ORIGIN= # Canonical URL for emails/OG tags

# Razorpay
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
NEXT_PUBLIC_RAZORPAY_KEY_ID=
RAZORPAY_WEBHOOK_SECRET=

# Email
RESEND_API_KEY=
EMAIL_FROM=

# Cloudinary
CLOUDINARY_URL=         # or split vars
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

---

## Project Structure

```
learnhub/
├── app/                     # Next.js App Router
│   ├── (auth)/              # Login, signup, password reset
│   ├── admin/               # Admin dashboard (23 pages)
│   ├── api/                 # REST API route handlers (50+ routes)
│   ├── blog/                # Blog listing & detail
│   ├── checkout/            # Razorpay checkout flow
│   ├── classes/             # Group-based learning
│   ├── community/           # Forums, groups, peer review, feed
│   ├── courses/             # Course catalog & lesson player
│   ├── dashboard/           # Student portal
│   ├── instructor/          # Instructor analytics & course mgmt
│   ├── instructors/         # Public instructor directory
│   ├── books/               # Digital book marketplace
│   ├── playlists/           # Curated course collections
│   ├── search/              # Global search
│   └── page.tsx             # Landing page
├── components/              # 70+ reusable React components
│   ├── admin/               # Admin UI components
│   ├── checkout/            # Payment form
│   ├── community/           # Forums, groups UI
│   ├── landing/             # Landing page sections
│   ├── ui/                  # Radix UI primitives
│   └── *.tsx                # Navbar, Footer, Sidebar, etc.
├── services/                # Business logic layer (20 services)
├── lib/                     # Core utilities
│   ├── auth.ts              # Supabase session helpers
│   ├── gamification.ts      # XP, badges, streaks
│   ├── email.ts             # Resend templates
│   ├── pdf.tsx              # Certificate PDF rendering
│   ├── razorpay.ts          # Razorpay client
│   ├── supabase/            # Supabase clients (server, client, middleware)
│   └── feature-access.ts    # Feature purchase validation
├── hooks/                   # Custom React hooks
├── types/                   # Shared TypeScript types
├── prisma/
│   ├── schema.prisma        # Database schema (25+ models)
│   └── seed*.ts             # Seed scripts
├── docs/
│   ├── ARCHITECTURE.md      # System architecture (may reference old stack)
│   └── API.md               # REST API reference
├── middleware.ts             # Edge middleware (auth + route protection)
└── next.config.ts           # Image domains, PDF exclusions, security headers
```

---

## Architecture Patterns

### Layer Architecture

```
Browser
  │
Next.js Edge Middleware  ← session refresh + route protection
  │
  ├── Server Components (RSC)   ← data fetching, initial render
  ├── Client Components ('use client')  ← interactivity, real-time
  └── API Route Handlers (app/api/)    ← REST endpoints
          │
          ├── Services (services/)     ← business logic, DB queries
          ├── Lib (lib/)               ← auth, payments, email, gamification
          └── Prisma ORM               ← type-safe PostgreSQL access
```

### Key Patterns

- **Server Components**: Use for data fetching pages. Import `prisma` directly or call service functions.
- **Client Components**: Add `'use client'` only when needed (hooks, event handlers, browser APIs).
- **API Routes**: All in `app/api/`. Use `lib/auth.ts` helpers to get the session, then call service layer.
- **Services**: Thin wrappers around Prisma queries. Business logic lives here, not in API routes.
- **Zod**: Validate all API request bodies at the route handler level before passing to services.

### Authentication Flow

1. **Supabase Auth** handles session tokens via cookies (HTTP-only, `@supabase/ssr`).
2. **Middleware** (`middleware.ts`) refreshes the token on every request and enforces route guards.
3. **Role-based guards**: `/admin` → ADMIN only; `/instructor` → INSTRUCTOR + ADMIN; `/dashboard` → all authenticated.
4. **API routes**: Call `createClient()` from `lib/supabase/server.ts`, then `supabase.auth.getUser()`.

---

## Database Schema

**Key models** (25+ total in `prisma/schema.prisma`):

| Domain | Models |
|---|---|
| Users | User, Organization, OrganizationMember, InstructorWallet |
| Content | Course, Section, Lesson, Category, Tag, Blog, Playlist, Book |
| Learning | Enrollment, LessonProgress, Quiz, Question, QuizAttempt, Certificate |
| Payments | Order, Coupon, CouponUse, PayoutRequest, RefundRequest, WalletTransaction |
| Community | ForumThread, ForumReply, ForumVote, StudyGroup, StudyGroupMember, PeerReview |
| Gamification | UserGameProfile, UserBadge, XpEvent |
| Engagement | Review, Wishlist, Notification |

**Key enums**: `Role` (STUDENT, INSTRUCTOR, ADMIN), `AdminSubRole` (SUPER_ADMIN, CONTENT_ADMIN, USER_ADMIN, FINANCE_ADMIN, SUPPORT), `LessonType` (VIDEO, TEXT, QUIZ), `ContentStatus` (DRAFT, PUBLISHED, ARCHIVED, PENDING_REVIEW), `OrderStatus` (PENDING, PAID, FAILED, REFUNDED).

---

## Role & Permission System

- **STUDENT**: Default role. Access to `/dashboard`, course enrollment, community.
- **INSTRUCTOR**: Can create/manage courses, view `/instructor` analytics. ADMIN can also visit instructor routes.
- **ADMIN**: Full access to `/admin`. Sub-roles scoped to specific admin sections (see `lib/admin-permissions.ts`).
- Middleware enforces redirects: STUDENT → `/dashboard`, INSTRUCTOR → `/instructor`, unauthorized → `/login`.

---

## Payment System (Razorpay)

- Courses and books purchased via Razorpay checkout (`lib/razorpay.ts`, `services/payment.service.ts`).
- Revenue split is dynamic based on `salesSource`: ORGANIC (90% instructor), COUPON/REFERRAL/ADS (70%).
- Instructor payouts via Razorpay Route — same API keys, no separate setup.
- Webhook endpoint: `app/api/razorpay/webhook/` — handles `payment.captured`, `order.paid`, `payment.failed`.
- Refund eligibility in `services/refund.service.ts`.

---

## Gamification Engine

- Defined in `lib/gamification.ts` and `lib/badges.ts`.
- **XP Events**: Awarded for lesson completion, quiz pass, streak, review, forum activity, etc.
- **Badges**: 12 badge types (e.g., FIRST_LESSON, QUIZ_MASTER, STREAK_7, etc.).
- **Levels**: 7 levels mapped to XP thresholds.
- **Streaks**: Daily login/activity tracking on `UserGameProfile`.
- **Leaderboard**: Global ranking via `app/api/gamification/` endpoints.

---

## Community Features

- **Forums**: Threaded replies with upvotes (`ForumThread`, `ForumReply`, `ForumVote`).
- **Study Groups**: Private groups with invite codes (`StudyGroup`, `StudyGroupMember`).
- **Peer Review**: Assignment-based review system (`PeerReviewAssignment`, `PeerReview`).
- **Activity Feed**: Real-time event feed using Supabase Realtime + `ActivityFeedEvent`.

---

## Email System

- **Provider**: Resend (`lib/email.ts`).
- **Templates**: Welcome, purchase confirmation, course update notifications.
- Triggered from API routes after relevant actions (signup, order paid, etc.).
- `EMAIL_FROM` env var controls the sender address.

---

## Conventions

- **File naming**: kebab-case for files, PascalCase for components.
- **Imports**: Use `@/` alias for root-relative imports (e.g., `@/lib/auth`, `@/components/ui/button`).
- **No comments** unless the WHY is non-obvious.
- **TypeScript strict mode** — no `any`, use Zod for runtime validation.
- **Tailwind only** — no CSS modules or styled-components; use `cn()` from `lib/utils.ts` for conditional classes.
- **Radix UI primitives** in `components/ui/` — extend these rather than creating raw HTML elements.
- **Error handling**: API routes return `{ error: string }` with appropriate HTTP status codes. Client components use `react-hot-toast` for user-facing errors.
- **Server/Client boundary**: Keep data fetching in Server Components; pass data down as props to Client Components.

---

## Common Tasks

### Add a new API route
Create `app/api/<resource>/route.ts`. Get session: `const supabase = createClient(); const { data: { user } } = await supabase.auth.getUser()`. Validate body with Zod, call service layer, return `NextResponse.json(...)`.

### Add a new page
Create `app/<path>/page.tsx` (Server Component by default). For protected pages, rely on middleware — no need to re-check auth in the page itself.

### Modify the database schema
1. Edit `prisma/schema.prisma`
2. Run `npm run db:migrate` (creates migration file + updates DB)
3. Run `npm run db:generate` if only regenerating the client

### Add a new service
Create `services/<name>.service.ts`. Import `prisma` from `@/lib/prisma` (or wherever the singleton is). Export named async functions — no classes.
