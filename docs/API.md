# Coachnest — API Reference

## Overview

All API routes are served under `/api/`. Requests and responses use JSON unless noted (file uploads use `multipart/form-data`, certificate downloads return a PDF stream).

### Base URL

```
https://<your-domain>/api
```

### Authentication

Most mutation routes require an active session. Authentication is cookie-based (Supabase JWT). After login, the browser receives an HttpOnly session cookie that is automatically sent on subsequent requests.

Routes that require authentication return `401` when the session is missing or expired.

### Role Abbreviations

- **Any** — any authenticated user regardless of role
- **Student** — STUDENT role
- **Instructor** — INSTRUCTOR role
- **Admin** — ADMIN role
- **Ins/Admin** — INSTRUCTOR or ADMIN
- **Public** — no authentication required

### Common Error Codes

| Status | Meaning |
|---|---|
| 400 | Bad request — missing or invalid fields |
| 401 | Unauthorized — no valid session |
| 402 | Payment required — course requires purchase |
| 403 | Forbidden — insufficient role |
| 404 | Not found |
| 409 | Conflict — duplicate resource (email, slug, etc.) |
| 413 | Payload too large — file exceeds size limit |
| 415 | Unsupported media type — not an image |
| 422 | Unprocessable — business rule violation |
| 500 | Internal server error |

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Courses](#2-courses)
3. [Sections](#3-sections)
4. [Lessons](#4-lessons)
5. [Quizzes](#5-quizzes)
6. [Enrollments](#6-enrollments)
7. [Progress](#7-progress)
8. [Reviews](#8-reviews)
9. [Highlights](#9-highlights)
10. [Certificates](#10-certificates)
11. [Payments & Billing](#11-payments--billing)
12. [Refunds](#12-refunds)
13. [Coupons](#13-coupons)
14. [Gamification](#14-gamification)
15. [Community — Forums](#15-community--forums)
16. [Community — Study Groups](#16-community--study-groups)
17. [Community — Peer Review](#17-community--peer-review)
18. [Community — Activity Feed](#18-community--activity-feed)
19. [Blog](#19-blog)
20. [Search](#20-search)
21. [Recommendations](#21-recommendations)
22. [Wishlist](#22-wishlist)
23. [Notifications](#23-notifications)
24. [Profile & Password](#24-profile--password)
25. [Upload & Media](#25-upload--media)
26. [Categories & Tags](#26-categories--tags)
27. [Professions & Onboarding](#27-professions--onboarding)
28. [Features (Add-ons)](#28-features-add-ons)
29. [Waitlist](#29-waitlist)
30. [Admin — Students](#30-admin--students)
31. [Admin — Enrollments](#31-admin--enrollments)
32. [Admin — Orders](#32-admin--orders)
33. [Admin — Revenue](#33-admin--revenue)
34. [Admin — Refunds](#34-admin--refunds)
35. [Admin — Coupons](#35-admin--coupons)
36. [Admin — Quizzes](#36-admin--quizzes)
37. [Admin — Courses](#37-admin--courses)
38. [Admin — Instructors](#38-admin--instructors)
39. [Admin — Payouts](#39-admin--payouts)
40. [Admin — Contact Messages](#40-admin--contact-messages)
41. [Admin — Features](#41-admin--features)
42. [Instructor Routes](#42-instructor-routes)
43. [Referrals](#43-referrals)
44. [Miscellaneous](#44-miscellaneous)

---

## 1. Authentication

### `POST /api/auth/signup`

Register a new user.

**Auth:** Public

**Request body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "Password123!",
  "role": "STUDENT"
}
```

`role` is optional — defaults to `STUDENT`. Pass `"INSTRUCTOR"` to register as an instructor.

**Response `201`:**
```json
{ "message": "Account created.", "userId": "uuid" }
```

**Errors:** `400` (missing fields), `409` (email already exists)

---

### `POST /api/auth/login`

Log in and set session cookie.

**Auth:** Public

**Request body:**
```json
{ "email": "jane@example.com", "password": "Password123!" }
```

**Response `200`:**
```json
{ "message": "Logged in.", "role": "STUDENT" }
```

**Errors:** `400` (missing fields), `401` (invalid credentials)

---

### `POST /api/auth/logout`

Clear the session cookie.

**Auth:** Public (clears regardless)

**Response `200`:**
```json
{ "message": "Logged out." }
```

---

### `GET /api/auth/me`

Get the currently authenticated user.

**Auth:** Any

**Response `200`:**
```json
{
  "user": {
    "userId": "uuid",
    "email": "jane@example.com",
    "name": "Jane Doe",
    "role": "STUDENT",
    "avatar": "https://..."
  }
}
```

**Errors:** `401`

---

### `POST /api/auth/forgot-password`

Send a password reset email.

**Auth:** Public

**Request body:**
```json
{ "email": "jane@example.com" }
```

**Response `200`:**
```json
{ "message": "If that email exists, a reset link was sent." }
```

---

## 2. Courses

### `GET /api/courses`

List all published courses.

**Auth:** Public

**Response `200`:**
```json
{
  "courses": [
    {
      "id": "uuid",
      "title": "Intro to Python",
      "slug": "intro-to-python",
      "description": "...",
      "price": 49.99,
      "discountPrice": null,
      "isFree": false,
      "level": "BEGINNER",
      "language": "English",
      "thumbnail": "https://...",
      "createdBy": { "id": "uuid", "name": "Alice" },
      "category": { "id": "uuid", "name": "Programming" },
      "_count": { "enrollments": 120, "lessons": 30 },
      "avgRating": 4.7,
      "totalReviews": 45
    }
  ]
}
```

---

### `POST /api/courses`

Create a new course.

**Auth:** Ins/Admin

**Request body:**
```json
{
  "title": "Advanced React",
  "description": "Full description...",
  "shortDesc": "Quick summary",
  "thumbnail": "https://cloudinary.com/...",
  "previewVideo": "https://youtube.com/...",
  "price": 79.99,
  "discountPrice": 49.99,
  "isFree": false,
  "level": "ADVANCED",
  "language": "English",
  "categoryId": "uuid",
  "instructorRevenuePercent": 75,
  "tagNames": ["react", "typescript"]
}
```

`published` defaults to `false` (draft).

**Response `201`:**
```json
{ "course": { "id": "uuid", "title": "Advanced React", ... } }
```

---

### `GET /api/courses/[id]`

Get a single course with sections and lessons.

**Auth:** Public

**Response `200`:**
```json
{
  "course": {
    "id": "uuid",
    "title": "...",
    "sections": [
      {
        "id": "uuid",
        "title": "Getting Started",
        "order": 1,
        "lessons": [
          { "id": "uuid", "title": "Welcome", "type": "VIDEO", "isFree": true, "order": 1 }
        ]
      }
    ],
    "createdBy": { "id": "uuid", "name": "Alice" },
    "category": { ... },
    "_count": { "enrollments": 120 }
  }
}
```

---

### `PATCH /api/courses/[id]`

Update a course.

**Auth:** Ins/Admin (must own course or be Admin)

**Request body:** Any subset of course fields:
```json
{
  "title": "Updated Title",
  "price": 59.99,
  "published": true,
  "tagNames": ["react", "hooks"]
}
```

**Response `200`:**
```json
{ "course": { ... } }
```

---

### `DELETE /api/courses/[id]`

Delete a course.

**Auth:** Ins/Admin (must own course or be Admin)

**Response `200`:**
```json
{ "message": "Course deleted." }
```

---

## 3. Sections

### `POST /api/sections`

Add a section (chapter) to a course.

**Auth:** Ins/Admin

**Request body:**
```json
{ "courseId": "uuid", "title": "Module 1: Foundations" }
```

**Response `201`:**
```json
{ "section": { "id": "uuid", "title": "Module 1: Foundations", "order": 1 } }
```

---

### `PATCH /api/sections/[id]`

Update a section (title, order).

**Auth:** Ins/Admin

**Request body:**
```json
{ "title": "Module 1: Foundations (Updated)", "order": 2 }
```

**Response `200`:**
```json
{ "section": { ... } }
```

---

### `DELETE /api/sections/[id]`

Delete a section and all its lessons.

**Auth:** Ins/Admin

**Response `200`:**
```json
{ "message": "Section deleted." }
```

---

## 4. Lessons

### `GET /api/lessons`

List lessons (used by admin/instructor course editors).

**Auth:** Ins/Admin

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `courseId` | string | Filter by course |
| `noQuiz` | boolean | Exclude lessons that already have a quiz |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Introduction",
      "type": "VIDEO",
      "courseId": "uuid",
      "courseTitle": "Advanced React",
      "hasQuiz": false,
      "order": 1
    }
  ]
}
```

---

### `POST /api/lessons`

Create a lesson within a course section.

**Auth:** Ins/Admin

**Request body:**
```json
{
  "courseId": "uuid",
  "sectionId": "uuid",
  "title": "Setting up the environment",
  "type": "VIDEO",
  "content": "https://youtube.com/watch?v=...",
  "description": "In this lesson we...",
  "order": 1,
  "duration": 900,
  "isFree": false
}
```

`type` is one of `VIDEO`, `TEXT`, `QUIZ`. `duration` is in seconds.

**Response `201`:**
```json
{ "lesson": { "id": "uuid", ... } }
```

---

### `PATCH /api/lessons/[id]`

Update a lesson.

**Auth:** Ins/Admin

**Request body:** Any subset of lesson fields.

**Response `200`:**
```json
{ "lesson": { ... } }
```

---

### `DELETE /api/lessons/[id]`

Delete a lesson.

**Auth:** Ins/Admin

**Response `200`:**
```json
{ "message": "Lesson deleted." }
```

---

## 5. Quizzes

### `GET /api/quizzes`

Get a quiz for a lesson.

**Auth:** Public (but `isCorrect` stripped for non-admin/instructor)

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `lessonId` | string | Required — the lesson's quiz |

**Response `200`:**
```json
{
  "quiz": {
    "id": "uuid",
    "title": "Python Basics Quiz",
    "passMark": 70,
    "timeLimit": 600,
    "questions": [
      {
        "id": "uuid",
        "text": "What is a list in Python?",
        "order": 1,
        "points": 1,
        "options": [
          { "id": "uuid", "text": "An ordered collection", "isCorrect": false },
          { "id": "uuid", "text": "A mutable sequence", "isCorrect": true }
        ]
      }
    ]
  }
}
```

Note: `isCorrect` is omitted for students.

---

### `POST /api/quizzes`

Create a quiz for a lesson.

**Auth:** Ins/Admin

**Request body:**
```json
{
  "lessonId": "uuid",
  "title": "Module 1 Quiz",
  "passMark": 70,
  "timeLimit": 600,
  "questions": [
    {
      "text": "What does JSX stand for?",
      "order": 1,
      "points": 1,
      "options": [
        { "text": "JavaScript XML", "isCorrect": true },
        { "text": "Java Syntax Extension", "isCorrect": false }
      ]
    }
  ]
}
```

**Response `201`:**
```json
{ "quiz": { "id": "uuid", ... } }
```

---

### `POST /api/quizzes/[id]/attempt`

Submit a quiz attempt.

**Auth:** Any

**Request body:**
```json
{
  "answers": {
    "questionId1": "selectedOptionId",
    "questionId2": "selectedOptionId"
  },
  "timeTaken": 245
}
```

**Response `200`:**
```json
{
  "attempt": { "id": "uuid", "score": 85, "passed": true },
  "score": 85,
  "passed": true,
  "passMark": 70,
  "xpGained": 100,
  "feedback": [
    { "questionId": "uuid", "correct": true, "correctOptionId": "uuid" }
  ]
}
```

---

### `GET /api/quiz-history`

Get the current user's quiz attempt history.

**Auth:** Any

**Response `200`:**
```json
{
  "data": [
    {
      "quizId": "uuid",
      "lessonTitle": "Introduction Quiz",
      "courseTitle": "Python Basics",
      "attempts": [ { "score": 85, "passed": true, "createdAt": "..." } ],
      "bestScore": 85,
      "attemptCount": 2,
      "hasPassed": true,
      "lastAttempt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

---

## 6. Enrollments

### `GET /api/enrollments`

Get the current user's enrollments with progress.

**Auth:** Any

**Response `200`:**
```json
{
  "enrollments": [
    {
      "id": "uuid",
      "courseId": "uuid",
      "course": { "title": "Python Basics", "thumbnail": "...", ... },
      "progress": 65,
      "lastLessonId": "uuid",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### `POST /api/enrollments`

Enroll in a free course (paid courses use the payment flow).

**Auth:** Student

**Request body:**
```json
{ "courseId": "uuid" }
```

**Response `201`:**
```json
{ "enrollment": { "id": "uuid", "courseId": "uuid", ... } }
```

**Errors:** `402` (course requires payment), `403` (not a student), `404` (course not found), `409` (already enrolled)

---

## 7. Progress

### `POST /api/progress`

Mark a lesson as complete (or update watch progress).

**Auth:** Any

**Request body:**
```json
{
  "lessonId": "uuid",
  "completed": true,
  "watchedSecs": 840
}
```

**Response `200`:**
```json
{
  "progress": { "id": "uuid", "lessonId": "uuid", "completed": true, "watchedSecs": 840 },
  "xpGained": 50
}
```

XP is only awarded once per lesson (first completion).

---

### `GET /api/me/course-access/[courseId]`

Check if the current user is enrolled and get completed lessons.

**Auth:** Optional (unauthenticated returns `isEnrolled: false`)

**Response `200`:**
```json
{
  "isEnrolled": true,
  "completedLessonIds": ["uuid1", "uuid2"]
}
```

---

## 8. Reviews

### `GET /api/reviews`

Get reviews for a course.

**Auth:** Public

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `courseId` | string | Required |

**Response `200`:**
```json
{
  "reviews": [
    {
      "id": "uuid",
      "rating": 5,
      "comment": "Excellent course!",
      "createdAt": "...",
      "user": { "id": "uuid", "name": "Jane", "avatar": "..." }
    }
  ],
  "avgRating": 4.7,
  "total": 45
}
```

---

### `POST /api/reviews`

Submit a course review. User must be enrolled.

**Auth:** Any

**Request body:**
```json
{
  "courseId": "uuid",
  "rating": 5,
  "comment": "Excellent course!"
}
```

**Response `201`:**
```json
{ "review": { "id": "uuid", "rating": 5, ... } }
```

**Errors:** `403` (not enrolled), `409` (already reviewed)

---

## 9. Highlights

Text annotations saved within a lesson.

### `GET /api/highlights`

**Auth:** Any

**Query parameters:** `lessonId` (required)

**Response `200`:**
```json
{
  "highlights": [
    {
      "id": "uuid",
      "text": "selected text",
      "blockIndex": 2,
      "startOffset": 14,
      "endOffset": 40,
      "color": "#FFEB3B",
      "note": "Remember this!",
      "createdAt": "..."
    }
  ]
}
```

---

### `POST /api/highlights`

**Auth:** Any

**Request body:**
```json
{
  "lessonId": "uuid",
  "text": "selected text",
  "blockIndex": 2,
  "startOffset": 14,
  "endOffset": 40,
  "color": "#FFEB3B",
  "note": "Remember this!"
}
```

**Response `201`:**
```json
{ "highlight": { "id": "uuid", ... } }
```

---

### `PATCH /api/highlights/[id]`

Update color or note. Only the owner can update.

**Auth:** Any (owner only)

**Request body:**
```json
{ "color": "#4CAF50", "note": "Updated note" }
```

**Response `200`:**
```json
{ "highlight": { ... } }
```

---

### `DELETE /api/highlights/[id]`

**Auth:** Any (owner only)

**Response `200`:**
```json
{ "success": true }
```

---

## 10. Certificates

### `GET /api/certificates/[courseId]`

Generate and download a completion certificate as PDF.

**Auth:** Any

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `userId` | string | Optional — Ins/Admin can generate for other users |

**Response:** PDF stream with `Content-Disposition: attachment; filename="certificate.pdf"`

**Errors:** `403` (course not completed), `404` (course or enrollment not found)

---

### `GET /api/admin/certificates`

List all issued certificates.

**Auth:** Ins/Admin

**Query parameters:** `search?` (student name or course title)

**Response `200`:**
```json
{
  "certificates": [
    {
      "id": "uuid",
      "studentName": "Jane Doe",
      "courseName": "Python Basics",
      "issuedAt": "2024-01-20T00:00:00Z"
    }
  ]
}
```

---

## 11. Payments & Billing

### `POST /api/payments/create-payment-intent`

Create a Stripe Checkout session for a course purchase.

**Auth:** Any

**Request body:**
```json
{
  "courseId": "uuid",
  "couponCode": "SAVE20",
  "referralCode": "REF-ABC123",
  "paymentMethodType": "card"
}
```

**Response `200`:**
```json
{
  "clientSecret": "cs_test_...",
  "orderId": "uuid",
  "amount": 3999,
  "courseName": "Advanced React"
}
```

Amount is in the smallest currency unit (cents for USD).

---

### `POST /api/payments/verify`

Verify a completed Stripe checkout and finalize enrollment.

**Auth:** Any

**Request body:**
```json
{ "sessionId": "cs_test_..." }
```

**Response `200`:**
```json
{
  "success": true,
  "enrollmentId": "uuid",
  "courseId": "uuid",
  "courseName": "Advanced React"
}
```

---

### `POST /api/payments/webhook`

Stripe webhook endpoint. Requires valid `Stripe-Signature` header.

**Auth:** Stripe signature verification (not user auth)

**Request:** Raw Stripe event payload

**Response `200`:**
```json
{ "received": true }
```

---

### `GET /api/billing`

Get billing information. Response shape differs by role.

**Auth:** Any

**Response for STUDENT `200`:**
```json
{
  "accessModel": "purchase",
  "orders": [
    {
      "id": "uuid",
      "courseName": "Python Basics",
      "amount": 4999,
      "status": "PAID",
      "createdAt": "..."
    }
  ],
  "summary": { "totalSpent": 4999, "courseCount": 1 },
  "invoices": [],
  "paymentMethod": null
}
```

**Response for INSTRUCTOR/ADMIN `200`:**
```json
{
  "accessModel": "subscription",
  "currentPlan": "PRO",
  "invoices": [ { "id": "...", "amount": 2999, "status": "paid", "date": "..." } ],
  "paymentMethod": { "brand": "visa", "last4": "4242", "expMonth": 12, "expYear": 2026 },
  "upcomingAmount": 2999
}
```

---

### `POST /api/billing/subscribe`

Subscribe to a platform plan (INSTRUCTOR/ADMIN).

**Auth:** Ins/Admin

**Request body:**
```json
{ "priceId": "price_xxx", "paymentMethodId": "pm_xxx" }
```

---

### `GET /api/billing/payment-methods`

List saved payment methods.

**Auth:** Any

---

### `POST /api/billing/payment-methods`

Add a payment method via SetupIntent.

**Auth:** Any

---

### `DELETE /api/billing/payment-methods/[id]`

Remove a payment method.

**Auth:** Any (owner only)

---

## 12. Refunds

### `GET /api/refunds/eligibility`

Check if an order is eligible for a refund.

**Auth:** Any

**Query parameters:** `orderId` (required)

**Response `200`:**
```json
{
  "data": {
    "isEligible": true,
    "refundAmount": 3999,
    "progressPercent": 15,
    "completedLessons": 3,
    "totalLessons": 20,
    "reason": null
  }
}
```

When not eligible, `reason` explains why (e.g. `"Progress exceeds refund threshold"`, `"Refund window expired"`).

---

### `GET /api/refunds`

List the current user's refund requests.

**Auth:** Any

**Query parameters:** `status?` (`PENDING` | `PROCESSING` | `PROCESSED` | `REJECTED` | `FAILED`)

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "orderId": "uuid",
      "courseName": "Python Basics",
      "status": "PENDING",
      "refundAmount": 3999,
      "progressPercent": 15,
      "createdAt": "..."
    }
  ]
}
```

---

### `POST /api/refunds`

Submit a refund request.

**Auth:** Any

**Request body:**
```json
{ "orderId": "uuid", "reason": "Course content doesn't match description" }
```

**Response `201`:**
```json
{
  "message": "Refund request submitted.",
  "data": { "id": "uuid", "status": "PENDING", ... }
}
```

**Errors:** `422` (not eligible)

---

### `GET /api/refunds/[id]`

Get details of a specific refund request.

**Auth:** Any (owner only)

**Response `200`:**
```json
{
  "data": {
    "id": "uuid",
    "status": "PENDING",
    "refundAmount": 3999,
    "instructorLoss": 2799,
    "platformLoss": 1200,
    "progressPercent": 15,
    "completedLessons": 3,
    "adminNotes": null,
    "createdAt": "..."
  }
}
```

---

## 13. Coupons

### `POST /api/coupons/validate`

Validate a coupon code before purchase.

**Auth:** Any

**Request body:**
```json
{ "code": "SAVE20", "courseId": "uuid" }
```

**Response `200`:**
```json
{
  "id": "uuid",
  "code": "SAVE20",
  "discountType": "PERCENTAGE",
  "discount": 20,
  "description": "20% off selected courses"
}
```

**Errors:** `404` (code not found), `422` (expired, used up, or not valid for this course)

---

## 14. Gamification

### `GET /api/gamification/profile`

Get the current user's gamification profile.

**Auth:** Any

**Response `200`:**
```json
{
  "profile": {
    "xp": 1750,
    "level": 3,
    "levelTitle": "Explorer",
    "nextLevelXp": 3500,
    "streak": 5,
    "longestStreak": 12,
    "badges": [
      { "key": "first_lesson", "earnedAt": "2024-01-10T..." },
      { "key": "quiz_pass", "earnedAt": "2024-01-12T..." }
    ]
  }
}
```

---

### `GET /api/gamification/leaderboard`

Get the global XP leaderboard.

**Auth:** Public

**Response `200`:**
```json
{
  "leaderboard": [
    { "rank": 1, "userId": "uuid", "name": "Alice", "avatar": "...", "xp": 15200, "level": 6 },
    { "rank": 2, "userId": "uuid", "name": "Bob", "avatar": "...", "xp": 12800, "level": 5 }
  ]
}
```

---

## 15. Community — Forums

### `GET /api/community/forums`

List forum threads.

**Auth:** Public

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `courseId` | string | Filter by course |
| `lessonId` | string | Filter by lesson |
| `sort` | string | `recent` (default) or `popular` |
| `page` | number | Default 1 |

**Response `200`:**
```json
{
  "threads": [
    {
      "id": "uuid",
      "title": "Question about async/await",
      "body": "...",
      "author": { "id": "uuid", "name": "Jane", "avatar": "..." },
      "voteScore": 5,
      "replyCount": 3,
      "createdAt": "..."
    }
  ],
  "total": 42,
  "page": 1,
  "totalPages": 5
}
```

---

### `POST /api/community/forums`

Create a forum thread. Requires Community feature access.

**Auth:** Any

**Request body:**
```json
{
  "title": "How do I handle async errors?",
  "body": "I'm trying to...",
  "courseId": "uuid",
  "lessonId": "uuid"
}
```

**Response `201`:**
```json
{ "thread": { "id": "uuid", ... } }
```

---

### `GET /api/community/forums/[id]`

Get a thread with its replies.

**Auth:** Public

**Response `200`:**
```json
{
  "thread": {
    "id": "uuid",
    "title": "...",
    "body": "...",
    "author": { ... },
    "voteScore": 5,
    "replies": [
      { "id": "uuid", "body": "...", "author": { ... }, "voteScore": 2 }
    ]
  }
}
```

---

### `POST /api/community/forums/[id]/replies`

Post a reply to a thread.

**Auth:** Any

**Request body:**
```json
{ "body": "You can use try/catch with async functions...", "parentId": null }
```

`parentId` enables nested replies.

**Response `201`:**
```json
{ "reply": { "id": "uuid", ... } }
```

---

### `POST /api/community/forums/[id]/vote`

Upvote or downvote a thread.

**Auth:** Any

**Request body:**
```json
{ "value": 1 }
```

`value` is `1` (upvote) or `-1` (downvote). Toggling the same value removes the vote.

**Response `200`:**
```json
{ "voteScore": 6 }
```

---

## 16. Community — Study Groups

### `GET /api/community/groups`

List study groups.

**Auth:** Public

**Query parameters:** `courseId?`, `page?`

**Response `200`:**
```json
{
  "groups": [
    {
      "id": "uuid",
      "name": "Python Study Crew",
      "description": "...",
      "isPublic": true,
      "requiresApproval": false,
      "memberCount": 12,
      "maxMembers": 20,
      "inviteCode": "ABC123",
      "course": { "id": "uuid", "title": "Python Basics" }
    }
  ],
  "total": 8,
  "page": 1,
  "totalPages": 1
}
```

---

### `POST /api/community/groups`

Create a study group. Requires Community feature access.

**Auth:** Any

**Request body:**
```json
{
  "name": "Advanced React Study Group",
  "description": "Weekly sessions on React patterns",
  "courseId": "uuid",
  "maxMembers": 15,
  "isPublic": true,
  "requiresApproval": false
}
```

**Response `201`:**
```json
{ "group": { "id": "uuid", "inviteCode": "XYZ789", ... } }
```

---

### `GET /api/community/groups/[id]`

Get group details with members.

**Auth:** Public

---

### `POST /api/community/groups/[id]/join`

Join a group (or submit a join request if `requiresApproval` is true).

**Auth:** Any

**Response `200`:**
```json
{ "status": "joined" }
```
or
```json
{ "status": "pending_approval" }
```

---

### `POST /api/community/groups/[id]/leave`

Leave a group.

**Auth:** Any

**Response `200`:**
```json
{ "success": true }
```

---

## 17. Community — Peer Review

### `GET /api/community/peer-review`

List peer review assignments. Requires Community feature access.

**Auth:** Any

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `tab` | string | `submissions` (my work) or `review-queue` (others' work to review) |
| `page` | number | Default 1 |

**Response `200`:**
```json
{
  "assignments": [
    {
      "id": "uuid",
      "title": "My React project",
      "content": "...",
      "author": { "id": "uuid", "name": "Jane" },
      "reviewCount": 2,
      "avgRating": 4.5,
      "course": { "id": "uuid", "title": "Advanced React" }
    }
  ],
  "total": 10,
  "page": 1,
  "totalPages": 2
}
```

---

### `POST /api/community/peer-review`

Submit work for peer review. Requires Community feature access.

**Auth:** Any

**Request body:**
```json
{
  "title": "My React project submission",
  "content": "Here is my implementation...",
  "courseId": "uuid",
  "lessonId": "uuid"
}
```

**Response `201`:**
```json
{ "assignment": { "id": "uuid", ... } }
```

---

### `POST /api/community/peer-review/[id]/review`

Submit a peer review for someone's work.

**Auth:** Any

**Request body:**
```json
{
  "feedback": "Great use of hooks! Consider extracting...",
  "rating": 4,
  "rubricScores": { "clarity": 5, "correctness": 4, "design": 3 }
}
```

**Response `201`:**
```json
{ "review": { "id": "uuid", "rating": 4, ... } }
```

---

## 18. Community — Activity Feed

### `GET /api/community/feed`

Get the community activity feed.

**Auth:** Public

**Query parameters:** `page?`

**Response `200`:**
```json
{
  "events": [
    {
      "id": "uuid",
      "type": "LESSON_COMPLETE",
      "user": { "id": "uuid", "name": "Alice", "avatar": "..." },
      "meta": { "lessonTitle": "Intro to Hooks", "courseTitle": "Advanced React" },
      "createdAt": "..."
    }
  ],
  "total": 150,
  "page": 1,
  "totalPages": 15
}
```

Cached: 30s max-age, 60s stale-while-revalidate.

---

## 19. Blog

### `GET /api/blogs`

List published blog posts with cursor-based pagination.

**Auth:** Public

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `q` | string | Full-text search |
| `tag` | string | Filter by tag |
| `cursor` | string | Pagination cursor |
| `limit` | number | 1–30, default 9 |

**Response `200`:**
```json
{
  "blogs": [
    {
      "id": "uuid",
      "title": "Getting Started with TypeScript",
      "slug": "getting-started-typescript",
      "excerpt": "...",
      "thumbnail": "...",
      "tags": ["typescript", "javascript"],
      "author": { "id": "uuid", "name": "Alice" },
      "publishedAt": "2024-01-10T..."
    }
  ],
  "nextCursor": "uuid-of-last-item"
}
```

---

### `POST /api/blogs`

Create a blog post.

**Auth:** Ins/Admin

**Request body:**
```json
{
  "title": "5 React Patterns You Should Know",
  "slug": "5-react-patterns",
  "excerpt": "Short summary...",
  "content": "Full markdown/HTML content...",
  "thumbnail": "https://...",
  "tags": ["react", "patterns"],
  "published": true
}
```

**Response `201`:**
```json
{ "blog": { "id": "uuid", "slug": "5-react-patterns", ... } }
```

---

### `GET /api/blogs/[id]`

Get a blog post by ID or slug.

**Auth:** Public

---

### `PATCH /api/blogs/[id]`

Update a blog post.

**Auth:** Ins/Admin (owner or Admin)

**Request body:** Any subset of blog fields.

---

### `DELETE /api/blogs/[id]`

Delete a blog post.

**Auth:** Ins/Admin

**Response `200`:**
```json
{ "success": true }
```

---

## 20. Search

### `GET /api/search`

Full-text course search with filters.

**Auth:** Public

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `q` | string | Search query |
| `category` | string | Category slug or ID |
| `level` | string | `BEGINNER`, `INTERMEDIATE`, or `ADVANCED` |
| `minPrice` | number | Minimum price |
| `maxPrice` | number | Maximum price |
| `sort` | string | `popular`, `newest`, `price_asc`, `price_desc` |
| `page` | number | Default 1 |
| `limit` | number | Default 12, max 24 |

**Response `200`:**
```json
{
  "courses": [
    {
      "id": "uuid",
      "title": "Python Basics",
      "avgRating": 4.7,
      "enrollmentCount": 120,
      ...
    }
  ],
  "total": 48,
  "page": 1,
  "totalPages": 4
}
```

---

## 21. Recommendations

### `GET /api/recommendations`

Get personalized course recommendations based on the user's professions.

**Auth:** Any

**Query parameters:** `limit?` (default 6, max 20)

**Response `200`:**
```json
{
  "courses": [ { "id": "uuid", "title": "...", ... } ],
  "basedOn": ["Python", "Data Science"],
  "isPersonalized": true
}
```

Falls back to top-enrolled courses when the user has no professions set.

---

## 22. Wishlist

### `GET /api/wishlist`

**Auth:** Any

**Response `200`:**
```json
{
  "wishlist": [
    { "id": "uuid", "course": { "id": "uuid", "title": "...", "price": 49.99, ... } }
  ]
}
```

---

### `POST /api/wishlist`

**Auth:** Any

**Request body:**
```json
{ "courseId": "uuid" }
```

**Response `200`:**
```json
{ "success": true }
```

---

### `DELETE /api/wishlist`

**Auth:** Any

**Query parameters:** `courseId` (required)

**Response `200`:**
```json
{ "success": true }
```

---

## 23. Notifications

### `GET /api/notifications`

**Auth:** Any

**Query parameters:** `limit?` (default 20, max 50)

**Response `200`:**
```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "PURCHASE",
      "message": "Your enrollment in Python Basics is confirmed.",
      "isRead": false,
      "createdAt": "..."
    }
  ],
  "unread": 3
}
```

---

### `PATCH /api/notifications`

Mark all notifications as read.

**Auth:** Any

**Response `200`:**
```json
{ "success": true }
```

---

### `PATCH /api/notifications/[id]`

Mark a single notification as read.

**Auth:** Any

**Response `200`:**
```json
{ "success": true }
```

---

## 24. Profile & Password

### `GET /api/profile`

**Auth:** Any

**Response `200`:**
```json
{
  "user": {
    "id": "uuid",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "avatar": "https://...",
    "bio": "Software engineer...",
    "headline": "Full-stack Developer",
    "website": "https://janedoe.com",
    "role": "STUDENT",
    "createdAt": "...",
    "_count": { "enrollments": 5, "reviews": 3 }
  }
}
```

---

### `PUT /api/profile`

Update profile information.

**Auth:** Any

**Request body:**
```json
{
  "name": "Jane Smith",
  "bio": "Updated bio...",
  "headline": "Senior Developer",
  "website": "https://janesmith.com",
  "avatar": "https://cloudinary.com/..."
}
```

**Response `200`:**
```json
{ "user": { ... }, "message": "Profile updated." }
```

**Validation:** `website` must start with `http://` or `https://`.

---

### `POST /api/profile/password`

Change the current user's password.

**Auth:** Any

**Request body:**
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword456!"
}
```

**Response `200`:**
```json
{ "message": "Password updated." }
```

**Errors:** `401` (current password incorrect)

---

## 25. Upload & Media

### `POST /api/upload`

Upload an image to Cloudinary.

**Auth:** Ins/Admin

**Content-Type:** `multipart/form-data`

| Field | Type | Description |
|---|---|---|
| `file` | File | Required. Image only. Max 1 MB. |
| `folder` | string | `avatars`, `courses`, `blogs`, or `misc` (default) |

**Response `201`:**
```json
{
  "id": "uuid",
  "url": "https://res.cloudinary.com/...",
  "publicId": "courses/abc123",
  "folder": "courses",
  "filename": "thumbnail.jpg",
  "bytes": 204800,
  "width": 1280,
  "height": 720,
  "format": "jpg",
  "createdAt": "..."
}
```

**Errors:** `413` (file too large), `415` (not an image), `422` (user storage limit exceeded — 100 MB total)

---

### `POST /api/upload/avatar`

Upload and set an avatar image.

**Auth:** Any (all roles)

**Content-Type:** `multipart/form-data`

| Field | Type | Description |
|---|---|---|
| `file` | File | Required. Image only. Max 1 MB. |

**Response `200`:**
```json
{ "url": "https://res.cloudinary.com/...", "publicId": "avatars/abc123" }
```

---

### `GET /api/media`

List uploaded media assets.

**Auth:** Ins/Admin

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `folder` | string | Filter by folder |
| `cursor` | string | Pagination cursor |
| `limit` | number | Default 40, max 100 |

**Response `200`:**
```json
{
  "assets": [
    { "id": "uuid", "url": "...", "publicId": "...", "folder": "courses", "bytes": 204800, "format": "jpg" }
  ],
  "nextCursor": "abc123"
}
```

---

### `DELETE /api/media/[id]`

Delete a media asset (removes from Cloudinary + DB).

**Auth:** Ins/Admin (owner or Admin)

---

## 26. Categories & Tags

### `GET /api/categories`

List course categories ordered by number of courses.

**Auth:** Public

**Response `200`:**
```json
[
  { "id": "uuid", "name": "Programming", "slug": "programming", "_count": { "courses": 24 } },
  { "id": "uuid", "name": "Design", "slug": "design", "_count": { "courses": 12 } }
]
```

---

## 27. Professions & Onboarding

### `GET /api/professions`

List available profession options.

**Auth:** Public

**Response `200`:**
```json
{
  "professions": [
    { "id": "uuid", "slug": "software-engineer", "name": "Software Engineer", "icon": "💻", "color": "#3B82F6", "isDefault": true }
  ]
}
```

---

### `GET /api/onboarding`

Get onboarding state for the current user.

**Auth:** Any

**Response `200`:**
```json
{
  "hasCompletedOnboarding": false,
  "professions": [
    { "id": "uuid", "name": "Software Engineer", ... }
  ]
}
```

---

### `PUT /api/onboarding`

Save onboarding selections and optionally mark onboarding complete.

**Auth:** Any

**Request body:**
```json
{
  "professionIds": ["uuid1", "uuid2"],
  "customNames": ["Machine Learning"],
  "instructorIds": ["uuid1"],
  "complete": true
}
```

**Response `200`:**
```json
{ "message": "Professions saved." }
```

---

### `GET /api/onboarding/instructors`

List featured instructors for the onboarding "follow instructors" step.

**Auth:** Public

---

## 28. Features (Add-ons)

### `GET /api/features`

List available platform add-on features.

**Auth:** Public (optional — includes `hasAccess` if authenticated)

**Response `200`:**
```json
{
  "features": [
    {
      "id": "uuid",
      "name": "Community Access",
      "slug": "community",
      "description": "Join forums, study groups, and peer review.",
      "price": 999,
      "hasAccess": true
    }
  ]
}
```

---

### `GET /api/features/[featureId]/access`

Check access to a specific feature.

**Auth:** Any

**Response `200`:**
```json
{ "hasAccess": true }
```

---

### `POST /api/features/[featureId]/purchase`

Start a Stripe checkout to purchase a platform feature.

**Auth:** Any

**Response `200`:**
```json
{ "checkoutUrl": "https://checkout.stripe.com/..." }
```

---

## 29. Waitlist

### `POST /api/waitlist`

Join the launch waitlist (used when `NEXT_PUBLIC_LAUNCH_MODE=true`).

**Auth:** Public

**Request body:**
```json
{ "email": "jane@example.com" }
```

**Response `201`:**
```json
{ "success": true }
```

**Errors:** `409` (already on waitlist)

---

### `GET /api/waitlist`

List all waitlist entries.

**Auth:** Admin

**Response `200`:**
```json
{ "entries": [ { "id": "uuid", "email": "jane@example.com", "createdAt": "..." } ], "total": 142 }
```

---

## 30. Admin — Students

### `GET /api/admin/students`

List all students on the platform.

**Auth:** Ins/Admin

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `search` | string | Name or email search |
| `sort` | string | `newest`, `oldest`, `name` |

**Response `200`:**
```json
{
  "students": [
    {
      "id": "uuid",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "avatar": "...",
      "headline": "Developer",
      "createdAt": "...",
      "_count": { "enrollments": 5, "reviews": 2 }
    }
  ]
}
```

---

### `GET /api/admin/students/[id]`

Get a student's full profile with enrollments.

**Auth:** Ins/Admin

---

## 31. Admin — Enrollments

### `GET /api/admin/enrollments`

List all enrollments with filters.

**Auth:** Admin

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `courseId` | string | Filter by course |
| `status` | string | Filter by status |
| `dateFrom` | string | ISO date start |
| `dateTo` | string | ISO date end |
| `search` | string | Student name/email |

**Response `200`:**
```json
{ "data": [ { "id": "uuid", "student": { ... }, "course": { ... }, "progress": 40, "createdAt": "..." } ] }
```

---

## 32. Admin — Orders

### `GET /api/admin/orders`

List all orders with filters.

**Auth:** Admin

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `status` | string | `PENDING`, `PAID`, `FAILED`, `REFUNDED` |
| `dateFrom` | string | ISO date start |
| `dateTo` | string | ISO date end |
| `minAmount` | number | Min amount in cents |
| `maxAmount` | number | Max amount in cents |
| `courseId` | string | Filter by course |
| `search` | string | Student name/email |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "amount": 4999,
      "currency": "usd",
      "status": "PAID",
      "saleSource": "ORGANIC",
      "instructorRevenue": 3499,
      "platformRevenue": 1500,
      "student": { "id": "uuid", "name": "Jane" },
      "course": { "id": "uuid", "title": "Python Basics" },
      "createdAt": "..."
    }
  ]
}
```

---

## 33. Admin — Revenue

### `GET /api/admin/revenue`

Get revenue analytics for a date range.

**Auth:** Admin

**Query parameters:** `from?`, `to?` (ISO date strings)

**Response `200`:**
```json
{
  "period": { "from": "2024-01-01", "to": "2024-01-31" },
  "summary": {
    "totalRevenue": 150000,
    "platformRevenue": 37500,
    "instructorRevenue": 112500,
    "orderCount": 30,
    "refundCount": 2,
    "refundAmount": 9998
  },
  "topInstructors": [
    { "id": "uuid", "name": "Alice", "revenue": 52000, "courseCount": 3 }
  ],
  "topCourses": [
    { "id": "uuid", "title": "Python Basics", "revenue": 24995, "enrollments": 5 }
  ],
  "topFeatures": [
    { "slug": "community", "revenue": 4995, "purchaseCount": 5 }
  ]
}
```

---

## 34. Admin — Refunds

### `GET /api/admin/refunds`

List all refund requests.

**Auth:** Admin

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `status` | string | `PENDING`, `PROCESSING`, `PROCESSED`, `REJECTED`, `FAILED` |
| `search` | string | Student name/email |
| `dateFrom` | string | ISO date |
| `dateTo` | string | ISO date |
| `courseId` | string | Filter by course |
| `limit` | number | Pagination |
| `offset` | number | Pagination |

**Response `200`:**
```json
{
  "data": [ { "id": "uuid", "status": "PENDING", "refundAmount": 3999, "student": { ... }, "course": { ... } } ],
  "total": 12,
  "stats": { "pending": 5, "processing": 2, "processed": 3, "rejected": 2 }
}
```

---

### `POST /api/admin/refunds/[id]/approve`

Approve a refund request and trigger the Stripe refund.

**Auth:** Admin

**Response `200`:**
```json
{ "message": "Refund approved and processed.", "data": { "id": "uuid", "status": "PROCESSED" } }
```

---

### `POST /api/admin/refunds/[id]/reject`

Reject a refund request.

**Auth:** Admin

**Request body:**
```json
{ "adminNotes": "Refund window has expired." }
```

**Response `200`:**
```json
{ "message": "Refund rejected.", "data": { "id": "uuid", "status": "REJECTED" } }
```

---

## 35. Admin — Coupons

### `GET /api/admin/coupons`

**Auth:** Admin

**Response `200`:**
```json
{
  "coupons": [
    {
      "id": "uuid",
      "code": "SAVE20",
      "discountType": "PERCENTAGE",
      "discount": 20,
      "maxUses": 100,
      "usedCount": 34,
      "expiresAt": "2024-12-31T...",
      "courseId": null
    }
  ]
}
```

---

### `POST /api/admin/coupons`

**Auth:** Admin

**Request body:**
```json
{
  "code": "LAUNCH50",
  "discountType": "PERCENTAGE",
  "discount": 50,
  "maxUses": 200,
  "expiresAt": "2024-06-30T00:00:00Z",
  "courseId": null
}
```

---

### `PUT /api/admin/coupons/[id]`

Update a coupon.

**Auth:** Admin

---

### `DELETE /api/admin/coupons/[id]`

Delete a coupon.

**Auth:** Admin

**Response `200`:**
```json
{ "message": "Coupon deleted." }
```

---

## 36. Admin — Quizzes

### `GET /api/admin/quizzes`

List all quizzes.

**Auth:** Admin

**Response `200`:**
```json
{
  "data": [
    { "id": "uuid", "title": "Module 1 Quiz", "lessonTitle": "Intro", "courseTitle": "Python Basics", "questionCount": 10, "passMark": 70 }
  ]
}
```

---

### `GET /api/admin/quizzes/[id]`

Get a quiz with full questions and options.

**Auth:** Admin

---

### `PUT /api/admin/quizzes/[id]`

Replace a quiz (questions and options) entirely.

**Auth:** Admin

---

### `DELETE /api/admin/quizzes/[id]`

Delete a quiz.

**Auth:** Admin

---

## 37. Admin — Courses

### `GET /api/admin/courses/pending`

List courses pending admin review.

**Auth:** Admin

---

### `POST /api/admin/courses/[id]/approve`

Publish a course.

**Auth:** Admin

---

### `POST /api/admin/courses/[id]/reject`

Reject a course (sends back to draft).

**Auth:** Admin

**Request body:**
```json
{ "reason": "Missing prerequisites section." }
```

---

## 38. Admin — Instructors

### `GET /api/admin/instructors`

List all instructors.

**Auth:** Admin

**Response `200`:**
```json
{
  "instructors": [
    { "id": "uuid", "name": "Alice", "email": "alice@example.com", "courseCount": 3, "totalStudents": 280 }
  ]
}
```

---

### `POST /api/admin/instructors/[id]/role`

Change a user's role.

**Auth:** Admin

**Request body:**
```json
{ "role": "STUDENT" }
```

---

## 39. Admin — Payouts

### `GET /api/admin/payouts`

List all instructor payout requests.

**Auth:** Admin

---

### `POST /api/admin/payouts/[id]`

Approve and process a payout request.

**Auth:** Admin

---

## 40. Admin — Contact Messages

### `GET /api/contact`

List contact form messages.

**Auth:** Ins/Admin

**Query parameters:** `status?` (`UNREAD` | `READ` | `REPLIED`), `search?`

**Response `200`:**
```json
{
  "messages": [ { "id": "uuid", "name": "Bob", "email": "bob@example.com", "subject": "...", "message": "...", "status": "UNREAD", "createdAt": "..." } ],
  "statusCounts": { "UNREAD": 5, "READ": 12, "REPLIED": 30 }
}
```

---

### `GET /api/admin/contact/[id]`

Get a single contact message.

**Auth:** Ins/Admin

---

### `POST /api/admin/contact/[id]/reply`

Reply to a contact message (sends email via Resend).

**Auth:** Ins/Admin

**Request body:**
```json
{ "replyMessage": "Thank you for reaching out..." }
```

---

## 41. Admin — Features

### `GET /api/admin/features`

List platform add-on features.

**Auth:** Admin

---

### `POST /api/admin/features`

Create a platform add-on feature.

**Auth:** Admin

**Request body:**
```json
{
  "name": "Community Access",
  "slug": "community",
  "description": "Join forums, study groups, and peer review.",
  "price": 999,
  "isActive": true
}
```

**Response `201`:**
```json
{ "feature": { "id": "uuid", ... } }
```

---

### `PATCH /api/admin/features/[id]`

Update a feature.

**Auth:** Admin

---

### `DELETE /api/admin/features/[id]`

Delete a feature.

**Auth:** Admin

---

## 42. Instructor Routes

### `GET /api/instructor/courses`

Get all courses created by the current instructor.

**Auth:** Instructor

---

### `GET /api/instructor/analytics`

Get enrollment and revenue analytics for the instructor.

**Auth:** Instructor

**Response `200`:**
```json
{
  "totalStudents": 280,
  "totalRevenue": 112500,
  "enrollmentsByMonth": [ { "month": "2024-01", "count": 35 } ],
  "revenueByMonth": [ { "month": "2024-01", "amount": 17500 } ],
  "topCourses": [ { "id": "uuid", "title": "...", "students": 120, "revenue": 59880 } ]
}
```

---

### `GET /api/instructor/earnings`

Get earnings summary and per-course breakdown.

**Auth:** Instructor

**Response `200`:**
```json
{
  "totalEarnings": 112500,
  "pendingEarnings": 8500,
  "availableBalance": 104000,
  "courses": [
    { "id": "uuid", "title": "Python Basics", "earnings": 59880 }
  ]
}
```

---

### `GET /api/instructor/students`

List students enrolled in the instructor's courses.

**Auth:** Instructor

---

### `GET /api/instructor/wallet`

Get wallet balance and transaction history.

**Auth:** Instructor

**Response `200`:**
```json
{
  "balance": 104000,
  "totalEarned": 112500,
  "totalWithdrawn": 8500,
  "transactions": [
    { "id": "uuid", "type": "CREDIT", "amount": 3499, "description": "Sale: Python Basics", "createdAt": "..." }
  ]
}
```

---

### `GET /api/instructor/referrals`

Get referral links and performance stats.

**Auth:** Instructor

**Response `200`:**
```json
{
  "links": [
    { "id": "uuid", "code": "REF-ABC123", "courseId": "uuid", "clicks": 45, "conversions": 8 }
  ],
  "totalClicks": 45,
  "totalConversions": 8
}
```

---

### `POST /api/instructor/payout-requests`

Request a payout from the instructor wallet.

**Auth:** Instructor

**Request body:**
```json
{
  "amount": 50000,
  "bankDetails": {
    "accountName": "Alice Smith",
    "accountNumber": "****4321",
    "routingNumber": "****1234",
    "bankName": "Chase"
  }
}
```

---

### `GET /api/instructor/refunds`

List refund requests for the instructor's courses.

**Auth:** Instructor

---

## 43. Referrals

### `GET /api/referrals/track`

Track a referral link click and redirect to the target course.

**Auth:** Public

**Query parameters:** `code` (required), `courseId?`

**Response:** `302` redirect to course page with referral cookie set.

---

## 44. Miscellaneous

### `POST /api/contact`

Submit a contact form message.

**Auth:** Public

**Request body:**
```json
{
  "name": "Bob Jones",
  "email": "bob@example.com",
  "subject": "Question about courses",
  "message": "I wanted to ask..."
}
```

**Response `201`:**
```json
{ "success": true, "id": "uuid" }
```

---

### `GET /api/me/course-access/[courseId]`

Check enrollment status and completed lessons for a course.

**Auth:** Optional

---

### `POST /api/user/tour-status`

Record whether the user has completed an onboarding tour.

**Auth:** Any

**Request body:**
```json
{ "type": "dashboard", "status": true }
```

`type` is `"dashboard"` or `"community"`.

**Response `200`:**
```json
{ "success": true }
```

---

### `POST /api/community/forums/[id]/replies/[replyId]/vote`

Vote on a forum reply.

**Auth:** Any

**Request body:**
```json
{ "value": 1 }
```

`value` is `1` (upvote) or `-1` (downvote).

---

### `GET /api/analytics/admin`

Top-level platform analytics (alias for admin analytics).

**Auth:** Admin
