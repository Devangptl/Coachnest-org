# dev — Start & Validate Dev Environment

Start the Coachnest development server and validate the environment is ready.

## Steps

1. **Check environment file exists**

```bash
ls .env.local 2>/dev/null || echo "MISSING .env.local — copy .env.example and fill in values"
```

2. **Ensure Prisma client is up-to-date**

```bash
npm run db:generate
```

3. **Run type check** (non-blocking)

```bash
npx tsc --noEmit 2>&1 | head -40
```

4. **Run linter** (non-blocking)

```bash
npm run lint 2>&1 | tail -20
```

5. **Start dev server**

```bash
npm run dev
```

The app will be available at http://localhost:3000.

## Notes

- If the database schema has changed, run `npm run db:migrate` before starting.
- If you see `PrismaClientInitializationError`, check that `DATABASE_URL` is set correctly in `.env.local`.
- If Supabase auth is failing, verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Admin user credentials for local dev can be set via `npm run db:seed`.
