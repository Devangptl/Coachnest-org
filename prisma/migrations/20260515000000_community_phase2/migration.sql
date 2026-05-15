-- Migration: Community Phase 2
-- Adds: best-answer (accepted reply) on threads, emoji reactions on
-- replies, and per-user thread bookmarks.
--
-- Safe to apply on a populated database:
--   * forum_threads."acceptedReplyId" is added NULLable with no default,
--     so existing rows are unaffected.
--   * forum_reactions / forum_bookmarks are brand-new tables.
-- No data backfill required.

-- ─── forum_threads: accepted reply (best answer) ──────────────────────────────

ALTER TABLE "forum_threads"
  ADD COLUMN "acceptedReplyId" TEXT;

CREATE UNIQUE INDEX "forum_threads_acceptedReplyId_key"
  ON "forum_threads" ("acceptedReplyId");

ALTER TABLE "forum_threads"
  ADD CONSTRAINT "forum_threads_acceptedReplyId_fkey"
  FOREIGN KEY ("acceptedReplyId") REFERENCES "forum_replies" ("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── forum_reactions ──────────────────────────────────────────────────────────

CREATE TABLE "forum_reactions" (
  "id"        TEXT         NOT NULL,
  "userId"    TEXT         NOT NULL,
  "replyId"   TEXT         NOT NULL,
  "emoji"     TEXT         NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "forum_reactions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "forum_reactions_userId_replyId_emoji_key"
    UNIQUE ("userId", "replyId", "emoji")
);

CREATE INDEX "forum_reactions_replyId_idx" ON "forum_reactions" ("replyId");

ALTER TABLE "forum_reactions"
  ADD CONSTRAINT "forum_reactions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE;

ALTER TABLE "forum_reactions"
  ADD CONSTRAINT "forum_reactions_replyId_fkey"
  FOREIGN KEY ("replyId") REFERENCES "forum_replies" ("id") ON DELETE CASCADE;

-- ─── forum_bookmarks ──────────────────────────────────────────────────────────

CREATE TABLE "forum_bookmarks" (
  "id"        TEXT         NOT NULL,
  "userId"    TEXT         NOT NULL,
  "threadId"  TEXT         NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "forum_bookmarks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "forum_bookmarks_userId_threadId_key"
    UNIQUE ("userId", "threadId")
);

CREATE INDEX "forum_bookmarks_userId_idx" ON "forum_bookmarks" ("userId");

ALTER TABLE "forum_bookmarks"
  ADD CONSTRAINT "forum_bookmarks_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE;

ALTER TABLE "forum_bookmarks"
  ADD CONSTRAINT "forum_bookmarks_threadId_fkey"
  FOREIGN KEY ("threadId") REFERENCES "forum_threads" ("id") ON DELETE CASCADE;
