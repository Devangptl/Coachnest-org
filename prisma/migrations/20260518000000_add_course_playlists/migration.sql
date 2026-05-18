-- CreateEnum
CREATE TYPE "PlaylistVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateTable
CREATE TABLE "course_playlists" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "coverImage" TEXT,
    "visibility" "PlaylistVisibility" NOT NULL DEFAULT 'PUBLIC',
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_playlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_playlist_items" (
    "id" TEXT NOT NULL,
    "playlistId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_playlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_playlist_follows" (
    "userId" TEXT NOT NULL,
    "playlistId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_playlist_follows_pkey" PRIMARY KEY ("userId","playlistId")
);

-- CreateIndex
CREATE UNIQUE INDEX "course_playlists_slug_key" ON "course_playlists"("slug");

-- CreateIndex
CREATE INDEX "course_playlists_ownerId_idx" ON "course_playlists"("ownerId");

-- CreateIndex
CREATE INDEX "course_playlists_visibility_createdAt_idx" ON "course_playlists"("visibility", "createdAt");

-- CreateIndex
CREATE INDEX "course_playlist_items_playlistId_order_idx" ON "course_playlist_items"("playlistId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "course_playlist_items_playlistId_courseId_key" ON "course_playlist_items"("playlistId", "courseId");

-- CreateIndex
CREATE INDEX "course_playlist_follows_playlistId_idx" ON "course_playlist_follows"("playlistId");

-- AddForeignKey
ALTER TABLE "course_playlists" ADD CONSTRAINT "course_playlists_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_playlist_items" ADD CONSTRAINT "course_playlist_items_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "course_playlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_playlist_items" ADD CONSTRAINT "course_playlist_items_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_playlist_follows" ADD CONSTRAINT "course_playlist_follows_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_playlist_follows" ADD CONSTRAINT "course_playlist_follows_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "course_playlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

