/**
 * POST /api/admin/courses/seed-cybersecurity
 *
 * Seeds (or re-seeds) the full "Complete Cybersecurity Bootcamp" course —
 * category, tags, course, chapters (sections), lessons, and quizzes.
 *
 * Idempotent: the course is keyed by its unique slug. Re-running rebuilds
 * the curriculum (sections + lessons + quizzes) from scratch while keeping
 * the course row — so existing enrollments and reviews are preserved.
 *
 * Protected by admin session. The course is attributed to the instructor
 * whose user id is supplied (defaults to DEFAULT_INSTRUCTOR_ID); an
 * optional { instructorId } body overrides it.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  getCybersecurityCourseSeed,
  buildOptions,
} from "@/lib/cybersecurity-course-seed";

const DEFAULT_INSTRUCTOR_ID = "36aa2cdf-7a37-4ec2-8ca4-f887586d5e7a";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let instructorId = DEFAULT_INSTRUCTOR_ID;
  try {
    const body = await req.json().catch(() => ({}));
    if (body && typeof body.instructorId === "string" && body.instructorId.trim()) {
      instructorId = body.instructorId.trim();
    }
  } catch {
    /* empty body is fine — use default */
  }

  try {
    const seed = getCybersecurityCourseSeed();

    const instructor = await prisma.user.findUnique({
      where: { id: instructorId },
      select: { id: true, name: true },
    });
    if (!instructor) {
      return NextResponse.json(
        {
          error: `Instructor with id "${instructorId}" was not found. Pass a valid "instructorId" in the request body, or create the user first.`,
        },
        { status: 400 },
      );
    }

    const category = await prisma.category.upsert({
      where: { slug: seed.category.slug },
      update: {
        name: seed.category.name,
        icon: seed.category.icon,
        color: seed.category.color,
      },
      create: {
        name: seed.category.name,
        slug: seed.category.slug,
        icon: seed.category.icon,
        color: seed.category.color,
      },
    });

    const tags = await Promise.all(
      seed.tags.map((t) =>
        prisma.tag.upsert({
          where: { slug: t.slug },
          update: { name: t.name },
          create: { name: t.name, slug: t.slug },
        }),
      ),
    );

    const allLessons = seed.modules.flatMap((m) => m.lessons);
    const totalLessons = allLessons.length;
    const totalDuration = allLessons.reduce(
      (sum, l) => sum + (l.duration ?? 0),
      0,
    );

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
        const createdLesson = await prisma.lesson.create({
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
              lessonId: createdLesson.id,
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
    }

    return NextResponse.json({
      success: true,
      message: `Seeded "${seed.course.title}" — ${seed.modules.length} chapters, ${totalLessons} lessons, ${quizCount} quizzes (${questionCount} questions). Attributed to ${instructor.name}.`,
      course: { id: course.id, slug: course.slug },
      stats: {
        modules: seed.modules.length,
        lessons: totalLessons,
        quizzes: quizCount,
        questions: questionCount,
        totalDuration,
      },
    });
  } catch (err) {
    console.error("[POST /api/admin/courses/seed-cybersecurity]", err);
    return NextResponse.json(
      { error: "Failed to seed the Cybersecurity course." },
      { status: 500 },
    );
  }
}
