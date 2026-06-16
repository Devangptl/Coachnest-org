-- Extend the OrgRole enum with the finer-grained RBAC roles.
-- New enum values must be added in their own migration (transaction) so the
-- following data-backfill migration can reference them.
ALTER TYPE "OrgRole" ADD VALUE IF NOT EXISTS 'ORG_OWNER';
ALTER TYPE "OrgRole" ADD VALUE IF NOT EXISTS 'ORG_MANAGER';
ALTER TYPE "OrgRole" ADD VALUE IF NOT EXISTS 'ORG_TA';
ALTER TYPE "OrgRole" ADD VALUE IF NOT EXISTS 'ORG_OBSERVER';
