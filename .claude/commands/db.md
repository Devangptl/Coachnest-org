# db — Database Operations

Common database tasks for Coachnest (PostgreSQL via Supabase + Prisma).

## Schema Changes

**Modify schema and create a migration:**
```bash
# 1. Edit prisma/schema.prisma
# 2. Create migration + apply to DB
npm run db:migrate

# OR push without a migration file (dev only):
npm run db:push
```

**Regenerate Prisma client after schema change:**
```bash
npm run db:generate
```

## Seeding

```bash
npm run db:seed              # Full demo data (users, courses, enrollments)
npm run db:seed:blogs        # Blog posts only
npm run db:seed:nextjs       # A sample Next.js course
npm run db:seed:emails       # Email templates
```

## Inspection

**Open Prisma Studio (GUI table browser):**
```bash
npm run db:studio
```

**Quick schema summary:**
```bash
grep -E "^model " prisma/schema.prisma
```

**Check migration history:**
```bash
npx prisma migrate status
```

## Production

```bash
npx prisma migrate deploy     # Apply pending migrations (production-safe)
```

> Never run `migrate dev` or `db:push` against production — use `migrate deploy` only.

## Connection Details

- `DATABASE_URL` — pooled connection via PgBouncer (port 6543), used by the app at runtime.
- `DIRECT_URL` — direct connection (port 5432), used by Prisma migrations.
- Both are in `.env.local`. See `.env.example` for the format.

## Troubleshooting

- **`P1001` / can't reach database**: Check `DATABASE_URL` is set and Supabase project is not paused.
- **Migration drift**: Run `npx prisma migrate status` to see what's out of sync.
- **Type errors after schema change**: Run `npm run db:generate` to regenerate the Prisma client.
