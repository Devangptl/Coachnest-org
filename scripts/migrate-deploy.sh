#!/usr/bin/env bash
# Apply any pending Prisma migrations to the database pointed at by
# DATABASE_URL / DIRECT_URL.
#
# Usage (local DB):
#   ./scripts/migrate-deploy.sh
#
# Usage (production DB — pass URLs inline so they aren't persisted):
#   DATABASE_URL="postgres://..." DIRECT_URL="postgres://..." \
#     ./scripts/migrate-deploy.sh
#
# What it does:
#   1. Verifies DATABASE_URL is set
#   2. Lists what migrate would apply (read-only status check)
#   3. Runs `prisma migrate deploy` — only forward migrations, never
#      reset/dev/db-push/raw SQL. Safe to run on production.

set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is not set." >&2
  echo "Export it (or pass inline) before running this script." >&2
  exit 1
fi

if [[ -z "${DIRECT_URL:-}" ]]; then
  echo "Note: DIRECT_URL not set — using DATABASE_URL for migrations."
  export DIRECT_URL="$DATABASE_URL"
fi

echo "→ Checking migration status…"
npx prisma migrate status || true   # status returns nonzero if drift; informational only

echo ""
echo "→ Applying pending migrations (prisma migrate deploy)…"
npx prisma migrate deploy

echo ""
echo "→ Regenerating Prisma client to match the new schema…"
npx prisma generate

echo ""
echo "✓ Done. Database is up to date."
