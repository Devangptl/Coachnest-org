# Coachnest — Architecture

## Table of Contents

- [System Overview](#system-overview)
- [Tech Stack](#tech-stack)
- [Directory Layout](#directory-layout)
- [Layer Architecture](#layer-architecture)
- [Authentication & Authorization](#authentication--authorization)
- [Database Design](#database-design)
- [Payment & Revenue System](#payment--revenue-system)
- [Gamification Engine](#gamification-engine)
- [Community Features](#community-features)
- [Email System](#email-system)
- [File Upload Pipeline](#file-upload-pipeline)
- [Real-Time Features](#real-time-features)
- [Feature Access Control](#feature-access-control)
- [Deployment & Configuration](#deployment--configuration)

---

## System Overview

Coachnest is a full-stack online learning platform built on **Next.js 15 App Router**. It supports three distinct user roles (Student, Instructor, Admin), each with their own portal. The platform handles course creation and delivery, Stripe payments with dynamic revenue splits, a gamification engine, community tools, and blog/marketing content.

```
Browser / Mobile
      │
      ▼
Next.js Edge Middleware  ← session refresh + route protection
      │
      ├── Server Components (RSC)  ← data fetching, page rendering
      ├── Client Components        ← interactivity, real-time UI
      └── Route Handlers (API)     ← REST endpoints
              │
              ├── Services Layer   ← business logic
              ├── Lib Utilities    ← auth, email, payments, gamification
              └── Prisma ORM       ← type-safe DB access
                        │
                        ▼
              PostgreSQL (Supabase)
```

---

## Tech Stack

| Concern | Technology |
|---|---|
| Framework | Next.js 15.3 (App Router, RSC) |
| Language | TypeScript 5 (strict) |
| UI | React 19, Tailwind CSS 3.4, Radix UI, Framer Motion 11 |
| ORM | Prisma 5.16 |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth (JWT, `@supabase/ssr`) |
| Payments | Stripe 21 |
| Email | Resend 3.4 |
| File Storage | Cloudinary |
| PDF | @react-pdf/renderer + pdf-lib |
| Charts | Recharts 2.12 |
| Validation | Zod 3.23 |
| Animations | Framer Motion 11 |
| Real-time | Supabase Realtime channels |
| Onboarding tours | React Joyride 3 |
| Toast notifications | React Hot Toast |

---

## Directory Layout

```
learnhub/
├── app/                   # Next.js App Router
│   ├── (auth)/            # Auth pages (login, signup, password reset)
│   ├── api/               # REST API route handlers
│   │   ├── auth/          # signup, login, logout, me
│   │   ├── courses/       # course CRUD
│   │   ├── lessons/       # lesson CRUD
│   │   ├── sections/      # section management
│   │   ├── enrollments/   # enrollment logic
│   │   ├── progress/      # lesson progress tracking
│   │   ├── quizzes/       # quiz management + attempts
│   │   ├── payments/      # Stripe checkout + webhook
│   │   ├── billing/       # subscription + payment methods
│   │   ├── refunds/       # refund eligibility + requests
│   │   ├── coupons/       # coupon validation
│   │   ├── certificates/  # PDF cert generation
│   │   ├── gamification/  # XP profile + leaderboard
│   │   ├── community/     # forums, groups, peer review, feed
│   │   ├── instructor/    # instructor-scoped endpoints
│   │   ├── admin/         # admin-only endpoints
│   │   ├── blogs/         # blog CRUD
│   │   ├── search/        # full-text course search
│   │   ├── upload/        # Cloudinary file upload
│   │   ├── media/         # media library
│   │   ├── notifications/ # in-app notifications
│   │   ├── reviews/       # course reviews
│   │   ├── highlights/    # text annotation
│   │   ├── wishlist/      # saved courses
│   │   ├── features/      # platform add-ons
│   │   ├── recommendations/ # course recommendations
│   │   ├── onboarding/    # onboarding flow
│   │   └── referrals/     # referral link tracking
│   ├── dashboard/         # Student portal
│   ├── instructor/        # Instructor portal
│   ├── admin/             # Admin panel
│   ├── community/         # Community hub
│   ├── courses/           # Public course catalog + lesson player
│   ├── blog/              # Blog listing + posts
│   ├── checkout/          # Stripe checkout pages
│   └── ...                # landing, legal, onboarding, etc.
├── components/            # Shared React components
├── lib/                   # Core utilities (auth, payments, email, gamification)
├── services/              # Business logic modules
├── hooks/                 # Custom React hooks
├── types/                 # Shared TypeScript types
├── prisma/                # Schema, migrations, seed scripts
└── middleware.ts           # Edge middleware
```

---

## Layer Architecture

### 1. Edge Middleware (`middleware.ts`)

Runs on every request before any rendering. Responsibilities:

- Refreshes the Supabase session JWT (keeps it alive on each request)
- Reads the user's role from `auth.users.app_metadata`
- Enforces route protection:
  - `/dashboard`, `/community` → any authenticated user
  - `/instructor/*` → INSTRUCTOR or ADMIN role
  - `/admin/*` → ADMIN role only
- Redirects unauthenticated users to `/login`
- Redirects authenticated users away from auth pages
- Supports `NEXT_PUBLIC_LAUNCH_MODE` to show a coming-soon page

### 2. Server Components (RSC)

Used for all page-level components. They fetch data directly from Prisma on the server — no API round-trip needed. Data is rendered as HTML and streamed to the browser.

### 3. Route Handlers (`app/api/`)

Thin HTTP handlers. Each handler:

1. Parses the request (query params, JSON body, form data)
2. Validates with Zod
3. Calls `getSession()` for auth-gated routes
4. Delegates to a **service** or a direct Prisma query for simple operations
5. Returns `NextResponse.json()`

Route handlers do not contain business logic — that lives in services.

### 4. Services (`services/`)

Reusable business logic called from route handlers and sometimes server components.

| Service | Responsibility |
|---|---|
| `payment.service.ts` | Stripe session creation, webhook handling, revenue split |
| `order.service.ts` | Order filtering, revenue analytics |
| `enrollment.service.ts` | Enrollment queries, progress aggregation |
| `quiz.service.ts` | Quiz management, attempt scoring, analytics |
| `certificate.service.ts` | Certificate generation and retrieval |
| `coupon.service.ts` | Coupon validation and discount calculation |
| `recommendation.service.ts` | Profession-based course recommendations |
| `analytics.service.ts` | Dashboard analytics aggregation |
| `instructor.service.ts` | Instructor-specific queries |
| `feature.service.ts` | Platform feature access logic |
| `subscription.service.ts` | Subscription plan management |
| `refund.service.ts` | Refund request processing and financial calculations |

### 5. Lib (`lib/`)

Singleton clients and pure utility functions:

- `lib/prisma.ts` — Prisma client singleton (avoids connection pool exhaustion in dev)
- `lib/auth.ts` — `getSession()` helper (memoized per-request, returns `SessionPayload`)
- `lib/gamification.ts` — `awardXp()`, `grantBadge()`, `updateStreak()`
- `lib/badges.ts` — Badge definitions (`BADGE_MAP`, `LEVELS`, `getLevelForXp()`)
- `lib/email.ts` — Resend email templates (welcome, purchase, course update)
- `lib/pdf.tsx` — Certificate PDF layout with @react-pdf/renderer
- `lib/stripe.ts` — Server-side Stripe client
- `lib/stripe-client.ts` — Client-side Stripe loader (lazy)
- `lib/cloudinary.ts` — Cloudinary upload utilities
- `lib/notifications.ts` — `createNotification()` helper
- `lib/feature-access.ts` — Feature access checking
- `lib/supabase/` — Supabase client setup for server, client, middleware

---

## Authentication & Authorization

### Auth Provider

Supabase Auth issues and manages JWTs. User metadata is stored in two Supabase fields:

| Field | Contents |
|---|---|
| `auth.users.app_metadata` | `{ role: "STUDENT" \| "INSTRUCTOR" \| "ADMIN" }` |
| `auth.users.user_metadata` | `{ name, avatar }` |

### Session Flow

```
1. User signs up / logs in via POST /api/auth/signup or /login
2. Supabase creates user + sets app_metadata.role
3. Supabase sets an HttpOnly session cookie
4. Edge middleware reads cookie → refreshes token → attaches user to request
5. Route handlers call getSession() → reads from Supabase server client
6. SessionPayload = { userId, email, role, name, avatar }
```

### Role-Based Access Control

Three roles control what users can see and do:

| Role | Portals | Capabilities |
|---|---|---|
| STUDENT | `/dashboard`, `/community` | Enroll, learn, review, community participation |
| INSTRUCTOR | `/instructor`, `/community` | Create courses, view analytics, manage earnings |
| ADMIN | `/admin`, all portals | Full platform management, approve courses, manage payouts |

Role checks happen at two levels:
1. **Middleware** — blocks wrong-role routes at the Edge before any rendering
2. **Route Handlers** — `getSession()` re-checks role before mutating data

### Password Reset Flow

```
POST /api/auth/forgot-password → Supabase sends reset email
User clicks link → /reset-password page
POST /api/auth/reset-password → Supabase updates password
```

---

## Database Design

### Database: PostgreSQL via Supabase, ORM: Prisma 5.16

The schema (`prisma/schema.prisma`, 1,113 lines) is organized into six domains:

### Domain: Users & Organizations
```
User (STUDENT | INSTRUCTOR | ADMIN)
  ├── Organization (multi-tenant grouping)
  ├── OrganizationMember
  ├── Subscription (FREE | BASIC | PRO | ENTERPRISE)
  ├── InstructorWallet
  └── UserGameProfile (XP, level, streak)
```

### Domain: Content
```
Course (DRAFT | PUBLISHED | ARCHIVED)
  ├── Section (ordered)
  │   └── Lesson (VIDEO | TEXT | QUIZ, optional drip publishAt)
  │       └── Quiz
  │           └── Question (options as JSON)
  ├── Category
  └── Tag (via CourseTag join)
```

### Domain: Learning
```
Enrollment (student ↔ course, lastLessonId)
  └── LessonProgress (completed, watchedSecs)
QuizAttempt (score, passed, answers as JSON)
Highlight (text annotation on lesson content)
Certificate (completion record)
```

### Domain: Payments
```
Order (PENDING | PAID | FAILED | REFUNDED)
  ├── saleSource: ORGANIC | REFERRAL | COUPON | ADS
  ├── instructorRevenue, platformRevenue (audit fields)
  └── LedgerEntry (PURCHASE | PLATFORM_FEE | INSTRUCTOR_EARNING | REFUND | ...)
Coupon (PERCENTAGE | FIXED discount)
  └── CouponUse (redemption history)
RefundRequest (PENDING → PROCESSING → PROCESSED | REJECTED | FAILED)
PayoutRequest (instructor payout to bank)
WalletTransaction (CREDIT | DEBIT | PAYOUT_REQUEST | PAYOUT_PROCESSED)
```

### Domain: Community
```
ForumThread (course/lesson-scoped)
  └── ForumReply (nested, with ForumVote ±1)
StudyGroup (invite code, approval toggle)
  ├── StudyGroupMember (MEMBER | ADMIN)
  ├── GroupJoinRequest (PENDING | APPROVED | REJECTED)
  └── GroupNote (collaborative)
PeerReviewAssignment
  └── PeerReview (rubricScores as JSON)
ActivityFeedEvent
```

### Domain: Gamification
```
UserGameProfile (xp, level, streak, longestStreak, lastActiveDate)
UserBadge (badgeKey, earnedAt)
XpEvent (action, xpAmount, meta JSON)
```

### Key Design Decisions

- **Soft deletes** — not used; deleted records are hard-deleted to keep the schema clean
- **JSON fields** — used for quiz question options, rubric scores, and quiz attempt answers to avoid over-normalizing
- **Full-text search** — enabled on `Blog` model via PostgreSQL
- **Drip content** — `Lesson.publishAt` allows scheduling future lesson visibility
- **Financial immutability** — `LedgerEntry` rows are never updated, only appended
- **Referral tracking** — `ReferralLink` + `Order.saleSource = REFERRAL` for revenue attribution

---

## Payment & Revenue System

### Checkout Flow

```
Student clicks "Enroll"
      │
      ▼
POST /api/payments/create-payment-intent
  → validates coupon / referral code
  → calculates final price
  → creates Stripe Checkout Session
  → creates Order (status: PENDING)
      │
      ▼
Stripe Checkout (hosted page)
      │
  ┌───┴────────────────────┐
  │ Success                │ Failure
  ▼                        ▼
POST /api/payments/verify  /checkout/cancel
  → confirms session paid
  → creates Enrollment
  → credits InstructorWallet
  → creates LedgerEntries
  → sends purchase email
  → triggers gamification XP
      │
      ▼
POST /api/payments/webhook  (async, Stripe → server)
  → handles late events / edge cases
```

### Revenue Split Logic

The split is determined by `Order.saleSource`:

| Source | Instructor Cut | Platform Cut |
|---|---|---|
| ORGANIC | 70–80% (per course setting) | 20–30% |
| COUPON (instructor's own) | 85% | 15% |
| REFERRAL (instructor's link) | 90% | 10% |
| ADS | Course base setting | Course base setting |

The exact percentages are stored immutably on each `Order` row (`instructorPercent`, `instructorRevenue`, `platformRevenue`) so historical data is never affected by configuration changes.

### Refund System

```
Student → POST /api/refunds (with orderId)
  → refund.service checks eligibility (progress %, time since purchase)
  → stores RefundRequest with snapshot of progressPercent, refundAmount,
    instructorLoss, platformLoss
  → status: PENDING

Admin → POST /api/admin/refunds/[id]/approve
  → refund.service processes Stripe refund
  → reverses LedgerEntries (REFUND_REVERSAL_*)
  → debits InstructorWallet
  → status: PROCESSED
```

### Subscription Plans

Instructors and Admins can subscribe to platform plans (FREE / BASIC / PRO / ENTERPRISE) via Stripe Subscriptions. Students purchase individual courses. The billing portal at `/api/billing` returns different data shapes depending on the requester's role.

---

## Gamification Engine

All gamification logic lives in `lib/gamification.ts` and `lib/badges.ts`.

### XP Awards

| Action | XP Granted |
|---|---|
| `LESSON_COMPLETE` | 50 XP |
| `QUIZ_PASS` | 100 XP |
| `QUIZ_PERFECT_BONUS` | +50 XP (on top of QUIZ_PASS) |
| `DAILY_STREAK_BASE` | 10 + (streak × 2) XP |

Each award creates an `XpEvent` row (immutable log) and updates `UserGameProfile.xp`.

### Levels

| Level | Title | XP Required |
|---|---|---|
| 1 | Novice | 0 |
| 2 | Learner | 500 |
| 3 | Explorer | 1,500 |
| 4 | Scholar | 3,500 |
| 5 | Expert | 7,500 |
| 6 | Master | 15,000 |
| 7 | Legend | 30,000 |

`getLevelForXp(xp)` in `lib/badges.ts` determines the current level from total XP.

### Badges (12 total)

| Key | Trigger | Bonus XP |
|---|---|---|
| `first_lesson` | First lesson completed | 25 |
| `lessons_5` | 5 lessons completed | 50 |
| `lessons_25` | 25 lessons completed | 150 |
| `lessons_50` | 50 lessons completed | 300 |
| `quiz_first` | First quiz attempted | 25 |
| `quiz_pass` | First quiz passed | 50 |
| `quiz_perfect` | First 100% quiz score | 100 |
| `streak_3` | 3-day streak | 30 |
| `streak_7` | 7-day streak | 75 |
| `streak_30` | 30-day streak | 300 |
| `level_2` | Reached Level 2 | 0 |
| `level_5` | Reached Level 5 | 0 |

`grantBadge()` is idempotent — duplicate grants are silently ignored via `upsert`.

### Daily Streaks

`updateStreak(userId)` is called on lesson completion:
- If `lastActiveDate` is yesterday → streak increments
- If `lastActiveDate` is today → no change (already active today)
- Otherwise → streak resets to 1

`longestStreak` is updated whenever the current streak exceeds it.

---

## Community Features

All community features require the `community` platform feature access (checked in route handlers via `lib/feature-access.ts`).

### Forums

- `ForumThread` scoped to a course or lesson (optional)
- `ForumReply` can be nested (parentId)
- `ForumVote` records upvote (+1) or downvote (-1) per user per thread/reply
- Sorted by: recent, popular (by vote count)

### Study Groups

- Groups have an invite code, optional max member cap, and public/private toggle
- `requiresApproval` → join requests go through `GroupJoinRequest` (PENDING → APPROVED/REJECTED)
- Members can hold MEMBER or ADMIN roles within the group
- Groups support shared `GroupNote` documents (collaborative text)

### Peer Review

- A student submits a `PeerReviewAssignment` (title, content, optional course/lesson link)
- Other students in the review queue submit `PeerReview` entries with a 1–5 rating and `rubricScores` (JSON)
- Authors and reviewers see their own submission tabs separately

### Activity Feed

- `ActivityFeedEvent` rows are created when significant community events happen (post, join, review, etc.)
- `GET /api/community/feed` returns paginated events, cached for 30s

---

## Email System

Email is sent via **Resend** (`lib/email.ts`). Email templates are React components rendered server-side to HTML.

### Triggered Emails

| Event | Template |
|---|---|
| New user signup | Welcome email with getting-started guide |
| Course purchase | Purchase confirmation with course details |
| Course update by instructor | Enrolled-student notification |
| Contact form reply (admin) | Reply delivered to submitter |

`EMAIL_FROM` env var controls the sender address. Resend requires a verified domain.

---

## File Upload Pipeline

### Images (Courses, Blogs, Avatars)

```
Client → POST /api/upload (multipart/form-data)
  → Route handler validates file type (image only) + size (≤1 MB)
  → lib/cloudinary.ts uploads to Cloudinary
  → Creates MediaAsset row in DB (tracks publicId, bytes, folder)
  → Returns { url, publicId, width, height, format }
```

Folders: `avatars`, `courses`, `blogs`, `misc`. Per-user storage limit: 100 MB total.

### Avatar Upload

Separate endpoint `POST /api/upload/avatar` (1 MB limit, all roles). Updates `User.avatar` directly.

### Video Lessons

Videos are stored externally (YouTube/Vimeo embed URLs or Cloudinary video URLs) and referenced in `Lesson.content`. No server-side video transcoding is done in-platform.

### PDF Certificates

Generated on-demand server-side:
```
GET /api/certificates/[courseId]
  → Validates course completion (all lessons done)
  → Renders <CertificatePDF> React component via @react-pdf/renderer
  → Returns PDF stream with Content-Disposition: attachment
```

---

## Real-Time Features

Real-time is provided by **Supabase Realtime** channels.

- `hooks/useRealtimeChannel.ts` — subscribes to a named channel
- Used for: leaderboard live updates, study group activity
- Channels are set up in `lib/realtime/`

The platform does not use WebSockets directly — all real-time is mediated through Supabase's Postgres changes + broadcast channels.

---

## Feature Access Control

Some platform capabilities are sold as add-ons (`PlatformFeature` model). Examples: community access, advanced analytics.

```
lib/feature-access.ts → checkFeatureAccess(userId, featureSlug)
  → queries FeaturePurchase for active access
  → returns boolean

Route handlers wrap actions with feature checks before proceeding.
```

Users can purchase features via `POST /api/features/[featureId]/purchase` → Stripe Checkout.

---

## Deployment & Configuration

### Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Supabase PostgreSQL pooled connection (Prisma runtime) |
| `DIRECT_URL` | Supabase direct connection (Prisma migrations) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (seed scripts only) |
| `JWT_SECRET` | Session signing secret |
| `NEXT_PUBLIC_APP_URL` | Canonical app domain (e.g. https://coachnest.com) |
| `STRIPE_SECRET_KEY` | Stripe server key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe client key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_PRICE_BASIC` | Stripe Price ID for Basic plan |
| `STRIPE_PRICE_PRO` | Stripe Price ID for Pro plan |
| `STRIPE_PRICE_ENTERPRISE` | Stripe Price ID for Enterprise plan |
| `RESEND_API_KEY` | Resend email API key |
| `EMAIL_FROM` | Sender address (must be on verified Resend domain) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `NEXT_PUBLIC_LAUNCH_MODE` | Set `"true"` to show coming-soon landing page |

### Build & Database Commands

```bash
npm run dev          # Start development server
npm run build        # prisma generate + next build
npm run db:push      # Push schema changes to DB (no migration)
npm run db:migrate   # Run migrations
npm run db:seed      # Seed with demo data (admin/instructors/students/courses)
npm run db:seed:blogs # Seed blog posts
```

### Deployment Target

Configured for **Vercel**. Key `next.config.ts` settings:

- **Image domains** — Unsplash, Cloudinary whitelisted for `next/image`
- **PDF libraries** excluded from webpack server bundle (server-side only)
- **Tree-shaking** — `lucide-react`, `recharts`, `date-fns` are tree-shaken
- **Security headers** — DNS prefetch control, CSP frame-ancestors, Referrer-Policy, X-Content-Type-Options
- **Static asset caching** — 1-year cache for `/_next/static/*`

### Stripe Webhook Setup

Point the Stripe webhook to `https://<your-domain>/api/payments/webhook`. Subscribe to at minimum:
- `checkout.session.completed`
- `payment_intent.payment_failed`

The webhook handler verifies the `STRIPE_WEBHOOK_SECRET` signature before processing.

### Database Setup (Production)

```bash
# 1. Set DATABASE_URL and DIRECT_URL to production Supabase URLs
# 2. Run migrations
npx prisma migrate deploy
# 3. Generate client
npx prisma generate
# 4. (Optional) seed initial admin user
npm run db:seed
```
