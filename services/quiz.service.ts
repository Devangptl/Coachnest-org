/**
 * Quiz Service — quiz management and assessment queries for admin dashboard.
 * All methods return plain serializable objects (safe to pass to Client Components).
 */
import { prisma } from "@/lib/prisma";
import { parseISO, startOfDay, endOfDay } from "date-fns";

// ─── Quizzes List with Attempt Stats ───────────────────────────────────────

export async function getQuizzesList() {
  const quizzes = await prisma.quiz.findMany({
    include: {
      lesson: {
        select: {
          id: true,
          title: true,
          order: true,
          course: { select: { id: true, title: true, createdAt: true } },
        },
      },
      questions: { select: { id: true } },
      attempts: { select: { score: true, passed: true } },
    },
    orderBy: { title: "asc" },
  });

  return quizzes.map((quiz) => {
    const avgScore =
      quiz.attempts.length > 0
        ? Math.round(
            quiz.attempts.reduce((sum, a) => sum + a.score, 0) / quiz.attempts.length
          )
        : 0;
    const passRate =
      quiz.attempts.length > 0
        ? Math.round(
            (quiz.attempts.filter((a) => a.passed).length / quiz.attempts.length) * 100
          )
        : 0;

    return {
      id: quiz.id,
      title: quiz.lesson.title,
      lessonId: quiz.lesson.id,
      courseTitle: quiz.lesson.course.title,
      courseId: quiz.lesson.course.id,
      questionCount: quiz.questions.length,
      passMark: quiz.passMark,
      timeLimit: quiz.timeLimit,
      attemptCount: quiz.attempts.length,
      avgScore,
      passRate,
      createdAt: quiz.lesson.course.createdAt,
    };
  });
}

// ─── Single Quiz Details ───────────────────────────────────────────────────

export async function getQuizDetails(quizId: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      lesson: {
        select: {
          id: true,
          title: true,
          course: { select: { id: true, title: true } },
        },
      },
      questions: {
        select: {
          id: true,
          text: true,
          options: true,
          order: true,
          points: true,
        },
        orderBy: { order: "asc" },
      },
      attempts: { select: { id: true } },
    },
  });

  if (!quiz) return null;

  return {
    id: quiz.id,
    title: quiz.lesson.title,
    lessonId: quiz.lesson.id,
    courseTitle: quiz.lesson.course.title,
    courseId: quiz.lesson.course.id,
    passMark: quiz.passMark,
    timeLimit: quiz.timeLimit,
    questionCount: quiz.questions.length,
    attemptCount: quiz.attempts.length,
    questions: quiz.questions,
  };
}

// ─── Quiz Attempts ────────────────────────────────────────────────────────

export async function getQuizAttempts(
  quizId: string,
  filters?: {
    studentId?: string;
    dateFrom?: string;
    dateTo?: string;
  }
) {
  const where: any = { quizId };

  if (filters?.studentId) {
    where.userId = filters.studentId;
  }

  if (filters?.dateFrom) {
    where.createdAt = { gte: startOfDay(parseISO(filters.dateFrom)) };
  }

  if (filters?.dateTo) {
    const dateFilter = where.createdAt?.gte
      ? { gte: where.createdAt.gte, lte: endOfDay(parseISO(filters.dateTo)) }
      : { lte: endOfDay(parseISO(filters.dateTo)) };
    where.createdAt = dateFilter;
  }

  const attempts = await prisma.quizAttempt.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true } },
      quiz: { select: { id: true, title: true, passMark: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return attempts.map((attempt) => ({
    id: attempt.id,
    studentId: attempt.user.id,
    studentName: attempt.user.name,
    studentEmail: attempt.user.email,
    score: attempt.score,
    passed: attempt.passed,
    timeTaken: attempt.timeTaken,
    answers: attempt.answers,
    createdAt: attempt.createdAt,
  }));
}

// ─── Quiz Analytics ───────────────────────────────────────────────────────

export async function getQuizAnalytics(quizId: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: { select: { id: true, text: true, points: true, options: true } },
      attempts: {
        select: {
          id: true,
          score: true,
          passed: true,
          timeTaken: true,
          answers: true,
        },
      },
    },
  });

  if (!quiz || quiz.attempts.length === 0) {
    return {
      totalAttempts: 0,
      avgScore: 0,
      passRate: 0,
      avgTimeTaken: 0,
      scoreDistribution: [],
      questionAnalytics: [],
    };
  }

  const totalAttempts = quiz.attempts.length;
  const avgScore = Math.round(
    quiz.attempts.reduce((sum, a) => sum + a.score, 0) / totalAttempts
  );
  const passRate = Math.round(
    (quiz.attempts.filter((a) => a.passed).length / totalAttempts) * 100
  );
  const avgTimeTaken =
    quiz.attempts.reduce((sum, a) => sum + (a.timeTaken || 0), 0) / totalAttempts;

  // Score distribution (score is already a percentage 0-100)
  const buckets = [0, 0, 0, 0, 0]; // 0-20%, 20-40%, 40-60%, 60-80%, 80-100%
  quiz.attempts.forEach((attempt) => {
    const bucketIndex = Math.min(Math.floor(attempt.score / 20), 4);
    buckets[bucketIndex]++;
  });

  const scoreDistribution = [
    { range: "0-20%", count: buckets[0] },
    { range: "20-40%", count: buckets[1] },
    { range: "40-60%", count: buckets[2] },
    { range: "60-80%", count: buckets[3] },
    { range: "80-100%", count: buckets[4] },
  ];

  // Question-level analytics
  // Answer format: { [questionId]: optionId } — compare with correct option
  const questionAnalytics = quiz.questions.map((question) => {
    const opts = question.options as unknown as Array<{ id: string; text: string; isCorrect: boolean }>;
    const correctOpt = opts?.find((o) => o.isCorrect);
    let correctCount = 0;
    quiz.attempts.forEach((attempt) => {
      const answers = attempt.answers as Record<string, string>;
      if (answers && correctOpt && answers[question.id] === correctOpt.id) {
        correctCount++;
      }
    });

    return {
      id: question.id,
      text: question.text,
      points: question.points,
      attempts: totalAttempts,
      correctCount,
      correctPercentage: Math.round((correctCount / totalAttempts) * 100),
      difficulty: 100 - Math.round((correctCount / totalAttempts) * 100),
    };
  });

  return {
    totalAttempts,
    avgScore,
    passRate,
    avgTimeTaken: Math.round(avgTimeTaken),
    scoreDistribution,
    questionAnalytics,
  };
}

// ─── Create Quiz ──────────────────────────────────────────────────────────

export async function createQuiz(data: {
  lessonId: string;
  title: string;
  passMark: number;
  timeLimit?: number;
  questions: Array<{
    text: string;
    options: Array<{ text: string; correct: boolean }>;
    points: number;
    order: number;
  }>;
}) {
  const quiz = await prisma.quiz.create({
    data: {
      lessonId: data.lessonId,
      title: data.title,
      passMark: data.passMark,
      timeLimit: data.timeLimit,
    },
  });

  // Create questions with properly formatted options (id + isCorrect)
  for (const q of data.questions) {
    await prisma.question.create({
      data: {
        quizId: quiz.id,
        text: q.text,
        options: q.options.map((o) => ({
          id: crypto.randomUUID(),
          text: o.text,
          isCorrect: o.correct,
        })),
        points: q.points,
        order: q.order,
      },
    });
  }

  return quiz;
}

// ─── Update Quiz ──────────────────────────────────────────────────────────

export async function updateQuiz(
  quizId: string,
  data: {
    title?: string;
    passMark?: number;
    timeLimit?: number | null;
    questions?: Array<{
      text: string;
      options: Array<{ text: string; correct: boolean }>;
      points: number;
      order: number;
    }>;
  }
) {
  const update: any = {};
  if (data.title !== undefined) update.title = data.title;
  if (data.passMark !== undefined) update.passMark = data.passMark;
  if (data.timeLimit !== undefined) update.timeLimit = data.timeLimit;

  const quiz = await prisma.quiz.update({
    where: { id: quizId },
    data: update,
  });

  // If questions are provided, replace all existing questions
  if (data.questions) {
    await prisma.question.deleteMany({ where: { quizId } });
    for (const q of data.questions) {
      await prisma.question.create({
        data: {
          quizId,
          text: q.text,
          options: q.options.map((o) => ({
            id: crypto.randomUUID(),
            text: o.text,
            isCorrect: o.correct,
          })),
          order: q.order,
          points: q.points,
        },
      });
    }
  }

  return quiz;
}

// ─── Get Quiz by Lesson ID (admin, includes correct answers) ────────────

export async function getQuizByLessonId(lessonId: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { lessonId },
    include: {
      questions: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!quiz) return null;

  return {
    id: quiz.id,
    title: quiz.title,
    passMark: quiz.passMark,
    timeLimit: quiz.timeLimit,
    questions: quiz.questions.map((q) => ({
      id: q.id,
      text: q.text,
      options: q.options as Array<{ id: string; text: string; isCorrect: boolean }>,
      points: q.points,
      order: q.order,
    })),
  };
}

// ─── Delete Quiz ──────────────────────────────────────────────────────────

export async function deleteQuiz(quizId: string) {
  // Delete questions first (cascade in schema, but explicit here for safety)
  await prisma.question.deleteMany({ where: { quizId } });

  // Delete attempts
  await prisma.quizAttempt.deleteMany({ where: { quizId } });

  // Delete quiz
  return prisma.quiz.delete({
    where: { id: quizId },
  });
}

// ─── Add Question to Quiz ──────────────────────────────────────────────────

export async function addQuestion(
  quizId: string,
  data: {
    text: string;
    options: any[];
    points: number;
    order: number;
  }
) {
  return prisma.question.create({
    data: {
      quizId,
      text: data.text,
      options: data.options,
      points: data.points,
      order: data.order,
    },
  });
}

// ─── Update Question ──────────────────────────────────────────────────────

export async function updateQuestion(
  questionId: string,
  data: {
    text?: string;
    options?: any[];
    points?: number;
    order?: number;
  }
) {
  const update: any = {};
  if (data.text !== undefined) update.text = data.text;
  if (data.options !== undefined) update.options = data.options;
  if (data.points !== undefined) update.points = data.points;
  if (data.order !== undefined) update.order = data.order;

  return prisma.question.update({
    where: { id: questionId },
    data: update,
  });
}

// ─── Delete Question ──────────────────────────────────────────────────────

export async function deleteQuestion(questionId: string) {
  return prisma.question.delete({
    where: { id: questionId },
  });
}
