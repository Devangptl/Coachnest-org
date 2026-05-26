# Coachnest - Modern Learning Platform

A full-stack online education platform built with Next.js 15, featuring course management, gamification, community features, and payment integration.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [Authentication](#authentication)
- [API Reference](#api-reference)
- [Pages & Routes](#pages--routes)
- [Components](#components)
- [Services & Business Logic](#services--business-logic)
- [Gamification System](#gamification-system)
- [Payment Integration](#payment-integration)
- [Community Features](#community-features)
- [Admin Panel](#admin-panel)
- [Email System](#email-system)
- [Deployment](#deployment)

---

## Overview

Coachnest is a comprehensive online learning platform (v0.2.0) that supports:

- **Course creation & management** — instructors can create structured courses with sections, lessons, videos, and quizzes
- **Student learning** — progress tracking, lesson completion, quiz attempts, and certificate generation
- **Gamification** — XP points, badges, levels, streaks, and a global leaderboard
- **Community** — discussion forums, study groups, peer review, and activity feeds
- **Payments** — Stripe-powered course purchases with coupon support and refund management
- **Admin panel** — full control over students, courses, orders, analytics, and content
- **Blog** — marketing content with full-text search

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15.3.0 (App Router) |
| Language | TypeScript 5 (strict mode) |
| UI | React 19, Tailwind CSS 3.4, Radix UI, Framer Motion |
| ORM | Prisma 5.16 |
| Database | MySQL 8.0+ |
| Auth | JWT via `jose` (Edge-compatible) |
| Payments | Stripe 21 |
| Email | Resend 3.4 |
| Charts | Recharts 2.12 |
| PDF | @react-pdf/renderer + pdf-lib |
| Validation | Zod 3.23 |
| Icons | Lucide React |
| Notifications | React Hot Toast |
| Tours | React Joyride |

---

## Project Structure

```
learning/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Auth pages (login, signup)
│   ├── admin/                  # Admin dashboard & management pages
│   ├── api/                    # API route handlers
│   ├── blog/                   # Blog listing & post pages
│   ├── community/              # Forums, groups, peer review, feed
│   ├── courses/                # Course catalog & lesson player
│   ├── dashboard/              # Student dashboard pages
│   ├── legal/                  # Policy pages
│   └── page.tsx                # Landing page
│
├── components/                 # Reusable React components
│   ├── landing/                # Landing page specific components
│   ├── ui/                     # Primitive UI components (shadcn-style)
│   └── contact/                # Contact form
│
├── lib/                        # Utilities & core logic
│   ├── auth.ts                 # JWT session management
│   ├── prisma.ts               # Prisma client singleton
│   ├── stripe.ts               # Stripe client wrapper
│   ├── email.ts                # Email templates via Resend
│   ├── gamification.ts         # XP & badge awarding
│   ├── badges.ts               # Badge definitions & level system
│   ├── pdf.tsx                 # Certificate PDF generation
│   └── utils.ts                # Shared utilities (cn, formatDate, etc.)
│
├── services/                   # Business logic layer
│   ├── analytics.service.ts
│   ├── certificate.service.ts
│   ├── coupon.service.ts
│   ├── enrollment.service.ts
│   ├── order.service.ts
│   ├── payment.service.ts
│   ├── quiz.service.ts
│   └── recommendation.service.ts
│
├── types/
│   └── index.ts                # Shared TypeScript types
│
├── prisma/
│   ├── schema.prisma           # Database schema
│   ├── seed.ts                 # Main seed script
│   └── seed-blogs.ts           # Blog seed data
│
└── middleware.ts               # Route protection (Edge middleware)
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- MySQL 8.0+
- A Stripe account (test mode is fine)
- A Resend account (for emails)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd learning

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Fill in your values (see Environment Variables section)

# Push the database schema
npm run db:push

# (Optional) Seed the database
npm run db:seed
npm run db:seed:blogs

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`.

### Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production (`prisma generate` + `next build`) |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:push` | Push schema changes to database |
| `npm run db:studio` | Open Prisma Studio (database GUI) |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:seed` | Seed database with sample data |
| `npm run db:seed:blogs` | Seed blog posts |
| `npm run db:migrate` | Run Prisma migrations |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```env
# Database
DATABASE_URL=mysql://root:password@localhost:3306/learning_platform

# Auth
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (Resend)
RESEND_API_KEY=re_...
EMAIL_FROM=Coachnest <noreply@yourdomain.com>

# Cloudinary (image uploads)
CLOUDINARY_URL=cloudinary://...
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=...
```

---

## Database

### Schema Overview

The database uses MySQL 8.0+ with Prisma ORM. The schema contains 25+ models organized into these domains:

**Users & Organizations**
| Model | Description |
|---|---|
| `User` | Core user record with `STUDENT`, `INSTRUCTOR`, or `ADMIN` role |
| `Organization` | Multi-tenant organization support |
| `OrganizationMember` | User-to-organization membership with role |

**Content**
| Model | Description |
|---|---|
| `Course` | Course metadata, pricing, status (`DRAFT`/`PUBLISHED`/`ARCHIVED`) |
| `Section` | Ordered sections within a course |
| `Lesson` | Individual lessons (`VIDEO`, `TEXT`, or `QUIZ` type) |
| `Category` | Course categories |
| `Tag` | Searchable tags |
| `Blog` | Blog posts with full-text search |

**Learning & Assessment**
| Model | Description |
|---|---|
| `Enrollment` | Student-course enrollment record |
| `LessonProgress` | Per-lesson completion tracking per student |
| `Quiz` | Quiz attached to a lesson |
| `Question` | Quiz questions (options stored as JSON) |
| `QuizAttempt` | Student quiz submission with score |
| `Highlight` | Text highlights / notes within a lesson |
| `Certificate` | Course completion certificate |

**Payments**
| Model | Description |
|---|---|
| `Order` | Purchase order (`PENDING`, `PAID`, `FAILED`, `REFUNDED`) |
| `Coupon` | Discount codes (percentage or fixed amount) |
| `CouponUse` | Coupon redemption history |
| `Subscription` | Subscription plan (`FREE`, `BASIC`, `PRO`, `ENTERPRISE`) |
| `Payout` | Instructor payout records |

**Engagement**
| Model | Description |
|---|---|
| `Review` | Course review with star rating |
| `Wishlist` | Saved (wishlisted) courses |
| `Notification` | User notifications |

**Community**
| Model | Description |
|---|---|
| `ForumThread` | Discussion forum thread |
| `ForumReply` | Thread reply (supports nested replies) |
| `ForumVote` | Upvote/downvote on replies |
| `StudyGroup` | Student study group |
| `StudyGroupMember` | Group membership |
| `GroupNote` | Collaborative group note |
| `PeerReviewAssignment` | Peer review task |
| `PeerReview` | Peer feedback with rating |
| `ActivityFeedEvent` | Event in activity feed |

**Gamification**
| Model | Description |
|---|---|
| `UserGameProfile` | XP, level, and streak data per user |
| `UserBadge` | Badges earned by a user |
| `XpEvent` | XP award history |

**Other**
| Model | Description |
|---|---|
| `ContactMessage` | Contact form submission |

### Enums

```
Role:           STUDENT | INSTRUCTOR | ADMIN
PlanType:       FREE | BASIC | PRO | ENTERPRISE
OrderStatus:    PENDING | PAID | FAILED | REFUNDED
LessonType:     VIDEO | TEXT | QUIZ
ContentStatus:  DRAFT | PUBLISHED | ARCHIVED | PENDING_REVIEW
DiscountType:   PERCENTAGE | FIXED
NotifType:      COURSE_UPDATE | PURCHASE | REVIEW | REMINDER | OFFER | SYSTEM | FORUM_REPLY | GROUP_INVITE | PEER_REVIEW | ACTIVITY
GroupRole:      MEMBER | ADMIN
```

---

## Authentication

Authentication is handled with JWT tokens using the `jose` library, which is compatible with both Edge Runtime and Node.js.

**Session lifecycle:**
1. On login/signup, a JWT is signed with `JWT_SECRET` and stored in an HTTP-only cookie (`session`).
2. Middleware (`middleware.ts`) validates the cookie on every request to protected routes.
3. API routes call `getSession()` or `getSessionFromRequest()` from `lib/auth.ts` to read the current user.

**Key functions in `lib/auth.ts`:**
```ts
signToken(payload)            // Sign a new JWT
verifyToken(token)            // Verify and decode a JWT
setSessionCookie(res, token)  // Write JWT to cookie
getSession()                  // Read session from cookie (server components)
getSessionFromRequest(req)    // Read session from request headers (API routes)
```

**Protected routes (middleware.ts):**
- `/dashboard/*` — requires any authenticated user
- `/admin/*` — requires `INSTRUCTOR` or `ADMIN` role
- `/login`, `/signup` — redirects to `/dashboard` if already logged in

---

## API Reference

All API routes live under `/app/api/`. They return JSON and use standard HTTP methods.

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/signup` | Register a new user |
| POST | `/api/auth/login` | Log in and receive session cookie |
| POST | `/api/auth/logout` | Clear session cookie |
| GET | `/api/auth/me` | Get currently authenticated user |

### Courses

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/courses` | List all published courses |
| GET | `/api/courses/[id]` | Get single course with sections & lessons |
| POST | `/api/courses` | Create a course (admin) |
| PUT | `/api/courses/[id]` | Update a course (admin) |
| DELETE | `/api/courses/[id]` | Delete a course (admin) |

### Lessons

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/lessons` | List lessons |
| GET | `/api/lessons/[id]` | Get lesson detail |
| POST | `/api/lessons` | Create lesson |
| PUT | `/api/lessons/[id]` | Update lesson |
| DELETE | `/api/lessons/[id]` | Delete lesson |

### Enrollments

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/enrollments` | Enroll in a course |
| GET | `/api/enrollments` | Get current user's enrollments |
| GET | `/api/admin/enrollments` | All enrollments (admin) |

### Progress & Highlights

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/progress` | Get user's lesson progress |
| PUT | `/api/progress` | Mark lesson complete / update progress |
| POST | `/api/highlights` | Create text highlight or note |
| GET | `/api/highlights/[id]` | Get highlights for a lesson |
| DELETE | `/api/highlights/[id]` | Delete a highlight |

### Quizzes

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/quizzes` | List quizzes |
| GET | `/api/quizzes/[id]` | Get quiz with questions |
| POST | `/api/quizzes/[id]/attempt` | Submit quiz answers |
| GET | `/api/quiz-history` | Get user's quiz attempt history |
| POST | `/api/admin/quizzes` | Create quiz (admin) |
| GET | `/api/admin/quizzes/[id]/analytics` | Quiz performance analytics (admin) |
| GET | `/api/admin/quizzes/[id]/attempts` | All attempts for a quiz (admin) |

### Reviews

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/reviews` | Get reviews for a course |
| POST | `/api/reviews` | Submit a course review |
| PUT | `/api/reviews/[id]` | Update a review |
| DELETE | `/api/reviews/[id]` | Delete a review |

### Wishlist

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/wishlist` | Get user's wishlist |
| POST | `/api/wishlist` | Add course to wishlist |
| DELETE | `/api/wishlist/[courseId]` | Remove course from wishlist |

### Payments & Orders

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/payments/create-order` | Create a Stripe checkout session |
| GET | `/api/payments/verify` | Verify payment status after redirect |
| POST | `/api/payments/webhook` | Handle Stripe webhook events |
| GET | `/api/admin/orders` | List all orders (admin) |
| GET | `/api/admin/orders/[id]` | Get order details (admin) |
| POST | `/api/admin/orders/[id]/refund` | Issue a refund (admin) |

### Coupons

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/coupons/validate` | Validate a coupon code |
| GET | `/api/admin/coupons` | List coupons (admin) |
| POST | `/api/admin/coupons` | Create coupon (admin) |
| PUT | `/api/admin/coupons/[id]` | Update coupon (admin) |
| DELETE | `/api/admin/coupons/[id]` | Delete coupon (admin) |
| GET | `/api/admin/coupons/[id]/usage` | Get coupon usage stats (admin) |

### Certificates

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/certificates/[courseId]` | Download PDF certificate for completed course |
| GET | `/api/admin/certificates` | List all certificates (admin) |

### Gamification

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/gamification/profile` | Get user's XP, level, badges, streak |
| GET | `/api/gamification/leaderboard` | Get global XP leaderboard |

### Community

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/community/forums` | List forum threads |
| POST | `/api/community/forums` | Create a forum thread |
| GET | `/api/community/forums/[id]` | Get thread with replies |
| PUT | `/api/community/forums/[id]` | Update thread |
| DELETE | `/api/community/forums/[id]` | Delete thread |
| POST | `/api/community/forums/[id]/replies` | Post a reply |
| POST | `/api/community/forums/[id]/vote` | Vote on a reply |
| GET | `/api/community/groups` | List study groups |
| POST | `/api/community/groups` | Create a study group |
| GET | `/api/community/groups/[id]` | Get group detail |
| POST | `/api/community/groups/[id]/join` | Join a group |
| POST | `/api/community/groups/[id]/leave` | Leave a group |
| POST | `/api/community/groups/[id]/notes` | Add a group note |
| GET | `/api/community/groups/[id]/progress` | Get group member progress |
| GET | `/api/community/peer-review` | List peer review assignments |
| POST | `/api/community/peer-review` | Submit work for peer review |
| POST | `/api/community/peer-review/[id]/review` | Submit peer review feedback |
| GET | `/api/community/feed` | Get activity feed |

### Blogs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/blogs` | List blog posts |
| POST | `/api/blogs` | Create blog post (admin) |
| GET | `/api/blogs/[id]` | Get blog post |
| PUT | `/api/blogs/[id]` | Update blog post (admin) |
| DELETE | `/api/blogs/[id]` | Delete blog post (admin) |

### Profile & Notifications

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/profile` | Get user profile |
| PUT | `/api/profile` | Update profile |
| POST | `/api/profile/password` | Change password |
| GET | `/api/notifications` | Get user notifications |
| PUT | `/api/notifications/[id]` | Mark notification as read |
| POST | `/api/user/tour-status` | Update onboarding tour completion |

### Admin — Students

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/students` | List all students |
| GET | `/api/admin/students/[id]` | Get student detail |
| PUT | `/api/admin/students/[id]` | Update student (admin) |
| DELETE | `/api/admin/students/[id]` | Delete student |
| GET | `/api/admin/students/[id]/profile` | Detailed student profile |
| POST | `/api/admin/students/[id]/send-notification` | Send notification to student |

### Search & Analytics

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/search` | Full-text search across courses and blogs |
| GET | `/api/analytics/admin` | Admin-level analytics data |

---

## Pages & Routes

### Public Pages

| Route | Description |
|---|---|
| `/` | Landing page with hero, features, stats, testimonials, FAQ |
| `/about` | About page |
| `/pricing` | Pricing plans |
| `/careers` | Careers listing |
| `/press` | Press & media |
| `/contact` | Contact form |
| `/search` | Course search |
| `/courses` | Course catalog with filtering and sorting |
| `/courses/[id]` | Course detail, lesson player, reviews |
| `/blog` | Blog listing |
| `/blog/[slug]` | Blog post detail |
| `/legal/terms-of-service` | Terms of service |
| `/legal/privacy-policy` | Privacy policy |
| `/legal/cookie-policy` | Cookie policy |
| `/legal/refund-policy` | Refund policy |

### Auth Pages

| Route | Description |
|---|---|
| `/login` | Login form |
| `/signup` | Registration form |

### Student Dashboard (requires auth)

| Route | Description |
|---|---|
| `/dashboard` | Overview of enrolled courses and recent activity |
| `/dashboard/achievements` | Earned badges, XP, and leaderboard |
| `/dashboard/certificates` | Download completion certificates |
| `/dashboard/notifications` | All user notifications |
| `/dashboard/orders` | Purchase history |
| `/dashboard/profile` | Edit profile and change password |
| `/dashboard/quizzes` | Quiz attempt history and scores |
| `/dashboard/wishlist` | Saved courses |

### Community (requires auth)

| Route | Description |
|---|---|
| `/community` | Community hub overview |
| `/community/feed` | Activity feed |
| `/community/forums` | Forum thread listing |
| `/community/forums/[id]` | Forum thread with replies |
| `/community/groups` | Study groups listing |
| `/community/groups/[id]` | Group detail, members, notes |
| `/community/peer-review` | Peer review assignments |
| `/community/peer-review/[id]` | Review submission detail |

### Admin Panel (requires INSTRUCTOR or ADMIN role)

| Route | Description |
|---|---|
| `/admin` | Dashboard overview with key metrics |
| `/admin/analytics` | Detailed analytics and charts |
| `/admin/courses` | Course listing and management |
| `/admin/courses/[id]/edit` | Course and lesson editor |
| `/admin/students` | Student management |
| `/admin/students/[id]` | Student detail and progress |
| `/admin/enrollments` | Enrollment tracking |
| `/admin/orders` | Payment orders and refunds |
| `/admin/quizzes` | Quiz management |
| `/admin/quizzes/[id]/edit` | Quiz editor with questions |
| `/admin/coupons` | Discount coupon management |
| `/admin/blogs` | Blog post CRUD |
| `/admin/blogs/[id]/edit` | Blog editor |
| `/admin/certificates` | Certificate management |
| `/admin/messages` | Contact message inbox |
| `/admin/messages/[id]` | Message detail and reply |

---

## Components

### Layout Components

| Component | Description |
|---|---|
| `Navbar` | Server wrapper for the top navigation bar |
| `NavbarClient` | Interactive navbar with auth menu, theme toggle |
| `Footer` | Site footer with links |
| `DashboardSidebar` | Student dashboard side navigation |
| `AdminSidebar` | Admin panel side navigation |

### Card Components

| Component | Description |
|---|---|
| `CourseCard` | Course preview card with thumbnail, price, rating |
| `BlogCard` | Blog post preview card |
| `CertificateCard` | Certificate display card |
| `ReviewCard` | Course review display |
| `PricingCard` | Pricing plan card |
| `GlassCard` | Glassmorphism-styled card container |

### Form & Input Components

| Component | Description |
|---|---|
| `ReviewForm` | Course review submission form |
| `ContactForm` | Contact page form |
| `MarkdownEditor` | Rich text / markdown content editor |

### Feedback & Display

| Component | Description |
|---|---|
| `RatingStars` | Interactive or display star rating |
| `ProgressBar` | Course completion progress bar |
| `XpProgressBar` | XP/level progress bar for gamification |
| `NotificationBell` | Notification icon with unread count badge |
| `QuizPlayer` | Full quiz interface with timer, flagging, and review |

### Interactive

| Component | Description |
|---|---|
| `WishlistButton` | Toggle add/remove from wishlist |
| `LogoutButton` | Logout with session clearing |
| `LessonList` | Sidebar lesson navigator |

### Onboarding Tours

| Component | Description |
|---|---|
| `OnboardingTour` | Step-by-step guided tour for the student dashboard |
| `CommunityTour` | Guided tour for the community section |

### Providers

| Component | Description |
|---|---|
| `ThemeProvider` | Dark / light mode theme context |
| `ToasterProvider` | React Hot Toast notification provider |

### Landing Page Components (`components/landing/`)

| Component | Description |
|---|---|
| `HeroBackground` | Animated gradient background |
| `HeroShowcase` | Hero section with animated elements |
| `RotatingWords` | Cycling word animation |
| `AnimatedCounter` | Animated number counter |
| `FadeInSection` | Scroll-triggered fade-in wrapper |
| `StaggerChildren` | Stagger animation for lists |
| `TestimonialCard` | Student testimonial card |
| `FAQItem` | Accordion FAQ item |
| `FloatingParticles` | Particle animation background |
| `CompareSection` | Feature comparison table |

### UI Primitives (`components/ui/`)

Thin wrappers around Radix UI primitives, styled with Tailwind:
`Button`, `Input`, `Dialog`, `Dropdown`, `Select`, `Tabs`, `Tooltip`, `Progress`, and more.

---

## Services & Business Logic

The `services/` directory contains the business logic layer that sits between API routes and the database.

| Service | Responsibilities |
|---|---|
| `analytics.service.ts` | Aggregate dashboard analytics queries (revenue, enrollments, active students) |
| `certificate.service.ts` | Certificate generation, validation, and retrieval |
| `coupon.service.ts` | Coupon code validation, discount calculation, and usage tracking |
| `enrollment.service.ts` | Enrollment queries, progress aggregation, and completion detection |
| `order.service.ts` | Order filtering, revenue analytics, and refund processing |
| `payment.service.ts` | Payment status checks and Stripe webhook event handling |
| `quiz.service.ts` | Quiz management, attempt scoring, and analytics |
| `recommendation.service.ts` | Course recommendation logic based on enrollments and tags |

### Key Utilities (`lib/`)

| File | Key Exports |
|---|---|
| `auth.ts` | `signToken`, `verifyToken`, `setSessionCookie`, `getSession`, `getSessionFromRequest` |
| `prisma.ts` | `prisma` — singleton Prisma client |
| `stripe.ts` | `getStripe`, `verifyWebhookSignature` |
| `email.ts` | `sendWelcomeEmail`, `sendPurchaseEmail`, `sendCourseUpdateEmail` |
| `gamification.ts` | `awardXp`, `grantBadge`, `updateStreak` |
| `badges.ts` | `BADGE_MAP`, `getLevelForXp` |
| `pdf.tsx` | Certificate PDF generation with `@react-pdf/renderer` |
| `utils.ts` | `cn`, `formatDate`, `calcProgress`, `truncate` |

---

## Gamification System

The gamification system rewards students with XP, badges, and streak tracking.

### XP Events

XP is awarded automatically when students complete key actions. Awards are logged to the `XpEvent` table and totals are stored on `UserGameProfile`.

### Levels

XP thresholds determine a student's level. The `getLevelForXp(xp)` function (in `lib/badges.ts`) maps total XP to a level number.

### Badges

Badges are defined in `BADGE_MAP` (`lib/badges.ts`) and awarded via `grantBadge()` in `lib/gamification.ts`. They are stored in the `UserBadge` table. Badge data is displayed on the `/dashboard/achievements` page.

### Streaks

Daily learning streaks are tracked via `updateStreak()`. The current and longest streaks are stored on `UserGameProfile`.

### Leaderboard

The `/api/gamification/leaderboard` endpoint returns users sorted by total XP, and is displayed on the achievements page.

---

## Payment Integration

Payments are handled via Stripe.

### Purchase Flow

1. Student clicks "Enroll" on a course detail page.
2. The frontend calls `POST /api/payments/create-order`, which creates a Stripe Checkout Session and returns its URL.
3. The student is redirected to Stripe's hosted checkout page.
4. After payment, Stripe redirects the student back to `/api/payments/verify?session_id=...` which confirms payment and creates an `Enrollment` + `Order` record.
5. Stripe also fires a webhook to `POST /api/payments/webhook`, which handles asynchronous events (e.g., payment success, refund).

### Coupons

A coupon code can be applied before checkout. `POST /api/coupons/validate` checks validity (expiry, usage limits) and returns the discounted price. The discount is then passed to the Stripe session.

### Refunds

Admins can issue refunds from the `/admin/orders/[id]` page, which calls `POST /api/admin/orders/[id]/refund`. This initiates a Stripe refund and sets `Order.status` to `REFUNDED`.

---

## Community Features

### Discussion Forums

- Students can create forum threads and post replies.
- Replies support up/downvoting.
- Threads and replies can be edited or deleted by the author or an admin.

### Study Groups

- Students can create or join study groups.
- Groups have a member list, group notes, and a shared progress view.
- Groups have `MEMBER` and `ADMIN` roles.

### Peer Review

- Students can submit work for peer review.
- Other students are assigned to review submissions and provide ratings and feedback.

### Activity Feed

- Key events (badge earned, course completed, quiz passed, etc.) are logged to `ActivityFeedEvent` and displayed in the `/community/feed` page.

---

## Admin Panel

The admin panel is accessible at `/admin` and is restricted to users with the `INSTRUCTOR` or `ADMIN` role.

### Capabilities

| Section | Capabilities |
|---|---|
| Overview | Key metrics: total students, revenue, enrollments, active courses |
| Analytics | Revenue charts, enrollment trends, quiz pass rates |
| Courses | Create, edit, publish, archive, and delete courses; manage sections and lessons |
| Students | View, edit, send notifications, and delete student accounts |
| Enrollments | View and manage all course enrollments |
| Orders | View all orders, issue refunds |
| Quizzes | Create and edit quizzes; view attempt analytics |
| Coupons | Create discount codes (percentage or fixed), set expiry and usage limits |
| Blogs | Create, edit, and publish blog posts |
| Certificates | View all issued certificates |
| Messages | View and reply to contact form submissions |

---

## Email System

Emails are sent via [Resend](https://resend.com). Templates are defined in `lib/email.ts`.

| Function | Trigger |
|---|---|
| `sendWelcomeEmail(user)` | On signup |
| `sendPurchaseEmail(user, course, order)` | On successful payment |
| `sendCourseUpdateEmail(user, course)` | When an enrolled course is updated |

In development, if a `DEV_EMAIL_OVERRIDE` environment variable is set, all emails are redirected to that address.

---

## Deployment

The project is configured for deployment on [Vercel](https://vercel.com) (`.vercel/` config is present).

### Build Command

```bash
npm run build
# Runs: prisma generate && next build
```

### Production Checklist

- [ ] Set all environment variables in Vercel project settings
- [ ] Provision a MySQL 8.0+ database (e.g., PlanetScale, Railway, AWS RDS)
- [ ] Set `DATABASE_URL` to the production connection string
- [ ] Set `JWT_SECRET` to a long, random string
- [ ] Configure Stripe webhook endpoint to point to `https://yourdomain.com/api/payments/webhook`
- [ ] Set `STRIPE_WEBHOOK_SECRET` from Stripe dashboard
- [ ] Configure `RESEND_API_KEY` and a verified `EMAIL_FROM` domain
- [ ] Set `NEXT_PUBLIC_APP_URL` to your production URL
- [ ] Run `prisma migrate deploy` on the production database

### Image Optimization

`next.config.ts` is configured to accept images from:
- `images.unsplash.com`
- `res.cloudinary.com`
- `uploadthing.com` (and its CDN)

Add additional domains to the `images.remotePatterns` array in `next.config.ts` as needed.

---

## License

Private — all rights reserved.
