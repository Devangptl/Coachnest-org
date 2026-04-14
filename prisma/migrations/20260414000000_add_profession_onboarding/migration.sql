-- CreateTable: Profession
CREATE TABLE "professions" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'orange',
    "courseKeywords" TEXT[],
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "professions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: UserProfession
CREATE TABLE "user_professions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "professionId" TEXT,
    "customName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_professions_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Add hasCompletedOnboarding to users
ALTER TABLE "users" ADD COLUMN "hasCompletedOnboarding" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "professions_slug_key" ON "professions"("slug");

-- CreateIndex: prevent duplicate standard professions per user
CREATE UNIQUE INDEX "user_professions_userId_professionId_key" ON "user_professions"("userId", "professionId");

-- AddForeignKey
ALTER TABLE "user_professions" ADD CONSTRAINT "user_professions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_professions" ADD CONSTRAINT "user_professions_professionId_fkey"
    FOREIGN KEY ("professionId") REFERENCES "professions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default professions
INSERT INTO "professions" ("id", "slug", "name", "description", "icon", "color", "courseKeywords", "isDefault", "isActive", "order", "updatedAt") VALUES
  (gen_random_uuid()::text, 'developer',     'Developer',      'Build software, apps, and digital products',             'Code',        'blue',   ARRAY['programming','web-development','software','javascript','python','backend','frontend'], true, true, 1, NOW()),
  (gen_random_uuid()::text, 'designer',      'Designer',       'Create visual identities, UI/UX, and digital art',       'Palette',     'purple', ARRAY['design','ui-ux','graphic-design','figma','photoshop','illustration'], true, true, 2, NOW()),
  (gen_random_uuid()::text, 'teacher',       'Teacher',        'Educate, mentor, and inspire the next generation',       'GraduationCap','green', ARRAY['education','teaching','pedagogy','curriculum','online-teaching'], true, true, 3, NOW()),
  (gen_random_uuid()::text, 'student',       'Student',        'Currently in school or university, building foundations','BookOpen',    'orange', ARRAY['fundamentals','beginner','study-skills','productivity','mathematics'], true, true, 4, NOW()),
  (gen_random_uuid()::text, 'business-owner','Business Owner', 'Run or scale your own business or startup',              'Briefcase',   'amber',  ARRAY['business','entrepreneurship','marketing','finance','management','startup'], true, true, 5, NOW()),
  (gen_random_uuid()::text, 'freelancer',    'Freelancer',     'Work independently on projects for multiple clients',    'Laptop',      'teal',   ARRAY['freelancing','productivity','marketing','communication','portfolio'], true, true, 6, NOW());
