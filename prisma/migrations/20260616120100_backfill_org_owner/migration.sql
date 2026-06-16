-- Promote each organization's earliest-joined ORG_ADMIN (the registering
-- admin) to ORG_OWNER, so every existing org has exactly one owner.
WITH first_admin AS (
  SELECT DISTINCT ON ("organizationId") "organizationId", "userId"
  FROM "organization_members"
  WHERE "role" = 'ORG_ADMIN'
  ORDER BY "organizationId", "joinedAt" ASC, "userId" ASC
)
UPDATE "organization_members" m
SET "role" = 'ORG_OWNER'
FROM first_admin fa
WHERE m."organizationId" = fa."organizationId"
  AND m."userId" = fa."userId";
