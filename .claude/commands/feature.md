# feature — Add a New Feature

Checklist for adding a new feature to Coachnest. Adapt based on whether the feature needs an API route, a database change, or UI only.

## 1. Plan

- Which user role(s) does this affect? (STUDENT / INSTRUCTOR / ADMIN)
- Does it need a new database model or columns? → start with `prisma/schema.prisma`
- Does it need a new API route? → `app/api/<resource>/route.ts`
- Does it need new UI? → `app/<path>/page.tsx` or a component in `components/`

## 2. Database (if needed)

```bash
# Edit prisma/schema.prisma, then:
npm run db:migrate       # creates migration + updates DB
npm run db:generate      # regenerate Prisma client
```

## 3. Service Layer (if needed)

Create or update `services/<name>.service.ts`:
- Import `prisma` from `@/lib/prisma`
- Export named async functions (no classes)
- Keep DB queries here, not in route handlers

## 4. API Route (if needed)

Create `app/api/<resource>/route.ts`:
```ts
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // ... call service layer
}
```

## 5. Page or Component

- **Server Component** (default): fetch data directly, pass as props
- **Client Component**: add `'use client'`, use hooks and event handlers
- Use `@/components/ui/*` primitives (Radix UI)
- Use `cn()` from `@/lib/utils` for conditional Tailwind classes

## 6. Auth & Role Guard

- Route-level: middleware handles it automatically for `/admin`, `/instructor`, `/dashboard`
- API-level: always call `supabase.auth.getUser()` and check role from DB if needed
- Admin sub-role check: use `canAccessAdminPath()` from `lib/admin-permissions.ts`

## 7. Gamification (if relevant)

Award XP after key actions using `lib/gamification.ts`:
```ts
import { awardXp } from "@/lib/gamification";
await awardXp(userId, "LESSON_COMPLETE", prisma);
```

## 8. Email Notification (if relevant)

Send via Resend using helpers in `lib/email.ts`. Always fire-and-forget (don't await in the user-facing path if latency matters).

## 9. Checklist Before Committing

- [ ] TypeScript compiles: `npx tsc --noEmit`
- [ ] Lint passes: `npm run lint`
- [ ] New DB columns have sensible defaults or are nullable
- [ ] API routes validate request body with Zod
- [ ] No secrets or `.env` values hardcoded
