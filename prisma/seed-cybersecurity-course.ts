/**
 * Complete Cybersecurity Bootcamp
 * CLI seed wrapper. Runs the same idempotent upsert path as the admin
 * "Seed Cybersecurity Course" button by reusing lib/cybersecurity-course-seed.ts.
 *
 * Run:  npm run db:seed:cybersecurity
 */
import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  getCybersecurityCourseSeed,
  buildOptions,
} from "../lib/cybersecurity-course-seed";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const INSTRUCTOR_ID =
  process.env.CYBERSECURITY_SEED_INSTRUCTOR_ID ??
  "36aa2cdf-7a37-4ec2-8ca4-f887586d5e7a";

async function main() {
  console.log("\n🛡️  Cybersecurity course seed starting…\n");

  const instructor = await prisma.user.findUnique({
    where: { id: INSTRUCTOR_ID },
    select: { id: true, name: true, email: true },
  });
  if (!instructor) {
    throw new Error(
      `Instructor ${INSTRUCTOR_ID} not found. Create the user first or set CYBERSECURITY_SEED_INSTRUCTOR_ID.`,
    );
  }
  console.log(`  ✓ Instructor: ${instructor.name ?? instructor.email}`);

  const seed = getCybersecurityCourseSeed();

  const category = await prisma.category.upsert({
    where: { slug: seed.category.slug },
    update: {
      name: seed.category.name,
      icon: seed.category.icon,
      color: seed.category.color,
    },
    create: seed.category,
  });

  const tags = await Promise.all(
    seed.tags.map((t) =>
      prisma.tag.upsert({
        where: { slug: t.slug },
        update: { name: t.name },
        create: t,
      }),
    ),
  );

  const allLessons = seed.modules.flatMap((m) => m.lessons);
  const totalLessons = allLessons.length;
  const totalDuration = allLessons.reduce((sum, l) => sum + (l.duration ?? 0), 0);

  const course = await prisma.course.upsert({
    where: { slug: seed.course.slug },
    update: {
      title: seed.course.title,
      description: seed.course.description,
      shortDesc: seed.course.shortDesc,
      thumbnail: seed.course.thumbnail,
      previewVideo: seed.course.previewVideo,
      status: "PUBLISHED",
      price: seed.course.price,
      discountPrice: seed.course.discountPrice,
      isFree: seed.course.isFree,
      level: seed.course.level,
      language: seed.course.language,
      totalDuration,
      totalLessons,
      categoryId: category.id,
      createdById: instructor.id,
    },
    create: {
      title: seed.course.title,
      slug: seed.course.slug,
      description: seed.course.description,
      shortDesc: seed.course.shortDesc,
      thumbnail: seed.course.thumbnail,
      previewVideo: seed.course.previewVideo,
      status: "PUBLISHED",
      price: seed.course.price,
      discountPrice: seed.course.discountPrice,
      isFree: seed.course.isFree,
      level: seed.course.level,
      language: seed.course.language,
      totalDuration,
      totalLessons,
      categoryId: category.id,
      createdById: instructor.id,
    },
  });

  await prisma.lesson.deleteMany({ where: { courseId: course.id } });
  await prisma.section.deleteMany({ where: { courseId: course.id } });
  await prisma.courseTag.deleteMany({ where: { courseId: course.id } });
  await prisma.courseTag.createMany({
    data: tags.map((tag) => ({ courseId: course.id, tagId: tag.id })),
    skipDuplicates: true,
  });

  let lessonOrder = 0;
  let quizCount = 0;
  let questionCount = 0;

  for (let m = 0; m < seed.modules.length; m++) {
    const mod = seed.modules[m];
    const section = await prisma.section.create({
      data: { title: mod.title, order: m + 1, courseId: course.id },
    });

    for (const lesson of mod.lessons) {
      lessonOrder += 1;
      const created = await prisma.lesson.create({
        data: {
          courseId: course.id,
          sectionId: section.id,
          order: lessonOrder,
          title: lesson.title,
          description: lesson.description,
          type: lesson.type,
          isFree: lesson.isFree ?? false,
          duration: lesson.duration,
          content: lesson.type === "QUIZ" ? null : lesson.content,
        },
      });

      if (lesson.type === "QUIZ" && lesson.quiz) {
        const quiz = await prisma.quiz.create({
          data: {
            lessonId: created.id,
            title: lesson.quiz.title,
            passMark: lesson.quiz.passMark ?? 70,
            timeLimit: lesson.quiz.timeLimit ?? null,
          },
        });
        quizCount += 1;

        await prisma.question.createMany({
          data: lesson.quiz.questions.map((q, qi) => ({
            quizId: quiz.id,
            order: qi + 1,
            points: q.points ?? 1,
            text: q.text,
            options: buildOptions(q.options),
          })),
        });
        questionCount += lesson.quiz.questions.length;
      }
    }

    console.log(`  ✓ ${mod.title} (${mod.lessons.length} lessons)`);
  }

  console.log("\n═══════════════════════════════════════════════════");
  console.log("  ✅  Cybersecurity course seed complete!");
  console.log("═══════════════════════════════════════════════════");
  console.log(`  Course:    ${seed.course.title}`);
  console.log(`  Slug:      ${seed.course.slug}`);
  console.log(`  Chapters:  ${seed.modules.length}`);
  console.log(`  Lessons:   ${totalLessons}`);
  console.log(`  Quizzes:   ${quizCount}`);
  console.log(`  Questions: ${questionCount}`);
  console.log("═══════════════════════════════════════════════════\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
