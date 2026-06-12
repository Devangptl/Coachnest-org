-- CreateEnum
CREATE TYPE "WhiteboardScope" AS ENUM ('LIVE_CLASS', 'COURSE', 'LESSON', 'ASSIGNMENT', 'STUDENT_NOTE', 'GROUP_PROJECT', 'STANDALONE');

-- CreateEnum
CREATE TYPE "WhiteboardRole" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');

-- CreateTable
CREATE TABLE "whiteboards" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Untitled whiteboard',
    "scope" "WhiteboardScope" NOT NULL DEFAULT 'STANDALONE',
    "defaultRole" "WhiteboardRole" NOT NULL DEFAULT 'VIEWER',
    "ownerId" TEXT NOT NULL,
    "classId" TEXT,
    "courseId" TEXT,
    "lessonId" TEXT,
    "assignmentId" TEXT,
    "studyGroupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whiteboards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "whiteboards_ownerId_idx" ON "whiteboards"("ownerId");

-- CreateIndex
CREATE INDEX "whiteboards_scope_classId_idx" ON "whiteboards"("scope", "classId");

-- CreateIndex
CREATE INDEX "whiteboards_scope_courseId_idx" ON "whiteboards"("scope", "courseId");

-- CreateIndex
CREATE INDEX "whiteboards_scope_lessonId_idx" ON "whiteboards"("scope", "lessonId");

-- CreateIndex
CREATE INDEX "whiteboards_scope_assignmentId_idx" ON "whiteboards"("scope", "assignmentId");

-- CreateIndex
CREATE INDEX "whiteboards_scope_studyGroupId_idx" ON "whiteboards"("scope", "studyGroupId");

-- CreateTable
CREATE TABLE "whiteboard_pages" (
    "id" TEXT NOT NULL,
    "whiteboardId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Page 1',
    "order" INTEGER NOT NULL DEFAULT 0,
    "appState" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whiteboard_pages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "whiteboard_pages_whiteboardId_order_idx" ON "whiteboard_pages"("whiteboardId", "order");

-- CreateTable
CREATE TABLE "whiteboard_elements" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "elementId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whiteboard_elements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whiteboard_elements_pageId_elementId_key" ON "whiteboard_elements"("pageId", "elementId");

-- CreateIndex
CREATE INDEX "whiteboard_elements_pageId_isDeleted_idx" ON "whiteboard_elements"("pageId", "isDeleted");

-- CreateTable
CREATE TABLE "whiteboard_assets" (
    "id" TEXT NOT NULL,
    "whiteboardId" TEXT NOT NULL,
    "uploadedById" TEXT,
    "fileId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL DEFAULT 0,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whiteboard_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whiteboard_assets_whiteboardId_fileId_key" ON "whiteboard_assets"("whiteboardId", "fileId");

-- CreateIndex
CREATE INDEX "whiteboard_assets_whiteboardId_idx" ON "whiteboard_assets"("whiteboardId");

-- CreateTable
CREATE TABLE "whiteboard_collaborators" (
    "id" TEXT NOT NULL,
    "whiteboardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "WhiteboardRole" NOT NULL DEFAULT 'VIEWER',
    "invitedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whiteboard_collaborators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whiteboard_collaborators_whiteboardId_userId_key" ON "whiteboard_collaborators"("whiteboardId", "userId");

-- CreateIndex
CREATE INDEX "whiteboard_collaborators_userId_idx" ON "whiteboard_collaborators"("userId");

-- AddForeignKey
ALTER TABLE "whiteboards" ADD CONSTRAINT "whiteboards_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whiteboard_pages" ADD CONSTRAINT "whiteboard_pages_whiteboardId_fkey" FOREIGN KEY ("whiteboardId") REFERENCES "whiteboards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whiteboard_elements" ADD CONSTRAINT "whiteboard_elements_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "whiteboard_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whiteboard_assets" ADD CONSTRAINT "whiteboard_assets_whiteboardId_fkey" FOREIGN KEY ("whiteboardId") REFERENCES "whiteboards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whiteboard_collaborators" ADD CONSTRAINT "whiteboard_collaborators_whiteboardId_fkey" FOREIGN KEY ("whiteboardId") REFERENCES "whiteboards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whiteboard_collaborators" ADD CONSTRAINT "whiteboard_collaborators_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
